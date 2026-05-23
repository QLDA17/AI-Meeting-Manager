import csv
import io
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from src.api import auth, models, schemas
from src.api.core.action_item_support import (
    action_item_assigned_to_user,
    action_item_manageable_by_user,
    action_item_manager_error_detail,
    action_item_visible_to_user,
    broadcast_action_item_deleted,
    broadcast_action_item_updated,
    require_action_item_manager_for_meeting,
    resolve_action_item_assignees,
    serialize_action_item_payload,
)
from src.api.core.admin_runtime import append_admin_audit_log
from src.api.crud import (
    create_action_item,
    create_glossary_suggestion,
    create_glossary_term,
    delete_action_item,
    delete_glossary_term,
    get_action_item_by_id,
    get_glossary_suggestion_by_id,
    get_glossary_suggestions,
    get_glossary_term_by_id,
    get_glossary_terms,
    update_action_item,
    update_glossary_suggestion,
    update_glossary_term,
)


def user_org_ids(user: models.User) -> List[str]:
    return [membership.organization_id for membership in user.user_organizations]


def meeting_participant_meeting_ids_for_user(db: Session, user: models.User):
    email = (user.email or "").lower()
    participant_filter = models.MeetingParticipant.user_id == user.id
    if email:
        participant_filter = or_(
            participant_filter,
            func.lower(models.MeetingParticipant.email) == email,
        )
    return db.query(models.MeetingParticipant.meeting_id).filter(
        participant_filter,
        or_(
            models.MeetingParticipant.invite_status.is_(None),
            models.MeetingParticipant.invite_status != "declined",
        ),
    )


def _normalize_space(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _normalize_key(value: Optional[str]) -> str:
    return _normalize_space(value).lower()


def _normalize_aliases(values: Optional[List[str]], canonical_term: Optional[str] = None) -> List[str]:
    normalized_term = _normalize_key(canonical_term)
    deduped: List[str] = []
    seen = set()
    for value in values or []:
        cleaned = _normalize_space(value)
        if not cleaned:
            continue
        key = _normalize_key(cleaned)
        if key == normalized_term or key in seen:
            continue
        seen.add(key)
        deduped.append(cleaned)
    return deduped


def _validate_glossary_payload(
    db: Session,
    payload: Dict[str, Any],
    organization_id: Optional[str],
    current_user: models.User,
    current_term_id: Optional[str] = None,
) -> Dict[str, Any]:
    term = _normalize_space(payload.get("term"))
    if not term:
        raise HTTPException(status_code=400, detail="Glossary term is required")
    aliases = _normalize_aliases(payload.get("aliases"), term)
    payload["term"] = term
    payload["aliases"] = aliases

    if "category" in payload:
        payload["category"] = _normalize_space(payload.get("category")) or None

    comparison_query = db.query(models.GlossaryTerm)
    if current_term_id:
        comparison_query = comparison_query.filter(models.GlossaryTerm.id != current_term_id)
    if organization_id:
        auth.require_org_admin(db, current_user, organization_id)
        comparison_query = comparison_query.filter(
            or_(
                models.GlossaryTerm.organization_id == organization_id,
                models.GlossaryTerm.organization_id.is_(None),
            )
        )
    else:
        if current_user.role != "system-admin":
            raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
        comparison_query = comparison_query.filter(models.GlossaryTerm.organization_id.is_(None))

    requested_keys = {_normalize_key(term), *[_normalize_key(alias) for alias in aliases]}
    for existing in comparison_query.all():
        existing_term_key = _normalize_key(existing.term)
        if existing_term_key == _normalize_key(term):
            raise HTTPException(status_code=409, detail=f"Glossary term '{term}' already exists")
        existing_keys = {existing_term_key, *[_normalize_key(alias) for alias in (existing.aliases or [])]}
        conflict = requested_keys.intersection(existing_keys)
        if conflict:
            conflict_value = sorted(conflict)[0]
            raise HTTPException(status_code=409, detail=f"Glossary alias conflict detected for '{conflict_value}'")
    return payload


def _scope_glossary_query(db: Session, current_user: models.User, organization_id: Optional[str]):
    if organization_id:
        auth.require_org_member(db, current_user, organization_id)
        return db.query(models.GlossaryTerm).filter(
            or_(
                models.GlossaryTerm.organization_id.is_(None),
                models.GlossaryTerm.organization_id == organization_id,
            )
        )

    query = db.query(models.GlossaryTerm)
    if current_user.role != "system-admin":
        query = query.filter(
            or_(
                models.GlossaryTerm.organization_id.is_(None),
                models.GlossaryTerm.organization_id.in_(user_org_ids(current_user)),
            )
        )
    return query


def list_glossary_categories_payload(
    organization_id: Optional[str],
    db: Session,
    current_user: models.User,
) -> List[str]:
    query = _scope_glossary_query(db, current_user, organization_id).filter(models.GlossaryTerm.category.isnot(None))
    rows = query.with_entities(models.GlossaryTerm.category).distinct().order_by(models.GlossaryTerm.category.asc()).all()
    return [row[0] for row in rows if row and row[0]]


def import_glossary_terms_payload(
    organization_id: str,
    items: List[Dict[str, Any]],
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryImportReport:
    auth.require_org_admin(db, current_user, organization_id)
    report = schemas.GlossaryImportReport()
    for index, raw_item in enumerate(items, start=1):
        row_number = raw_item.pop("_row", index)
        try:
            normalized_term = _normalize_key(raw_item.get("term"))
            existing = None
            for item in db.query(models.GlossaryTerm).filter(models.GlossaryTerm.organization_id == organization_id).all():
                if _normalize_key(item.term) == normalized_term:
                    existing = item
                    break
            payload = {
                "organization_id": organization_id,
                "term": raw_item.get("term"),
                "aliases": raw_item.get("aliases") or [],
                "category": raw_item.get("category"),
                "translation_vi": raw_item.get("translation_vi"),
                "translation_en": raw_item.get("translation_en"),
                "translation_ja": raw_item.get("translation_ja"),
                "translation_zh": raw_item.get("translation_zh"),
                "translation_ko": raw_item.get("translation_ko"),
                "is_active": raw_item.get("is_active", True),
            }
            payload = _validate_glossary_payload(
                db,
                payload,
                organization_id,
                current_user,
                current_term_id=existing.id if existing else None,
            )
            if existing:
                update_glossary_term(db, existing.id, payload)
                report.updated += 1
            else:
                create_glossary_term(db, payload, current_user.id)
                report.created += 1
        except HTTPException as exc:
            report.errors.append(schemas.GlossaryImportError(row=row_number, term=raw_item.get("term"), message=str(exc.detail)))
        except Exception as exc:
            report.errors.append(schemas.GlossaryImportError(row=row_number, term=raw_item.get("term"), message=str(exc)))
    report.skipped = len(report.errors)
    return report


def export_glossary_terms_payload(
    organization_id: str,
    db: Session,
    current_user: models.User,
) -> str:
    auth.require_org_admin(db, current_user, organization_id)
    terms = get_glossary_terms(db, organization_id=organization_id, limit=10000)
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "term",
            "aliases",
            "category",
            "translation_vi",
            "translation_en",
            "translation_ja",
            "translation_zh",
            "translation_ko",
            "is_active",
        ],
    )
    writer.writeheader()
    for term in terms:
        writer.writerow(
            {
                "term": term.term or "",
                "aliases": ";".join(term.aliases or []),
                "category": term.category or "",
                "translation_vi": term.translation_vi or "",
                "translation_en": term.translation_en or "",
                "translation_ja": term.translation_ja or "",
                "translation_zh": term.translation_zh or "",
                "translation_ko": term.translation_ko or "",
                "is_active": "true" if term.is_active else "false",
            }
        )
    return output.getvalue()


GLOSSARY_SUGGESTION_REJECT_COOLDOWN_DAYS = 7
_SUGGESTION_STOPWORDS = {
    "va", "và", "la", "là", "cua", "của", "cho", "voi", "với", "nhung", "những", "the", "this", "that",
    "trong", "ngoai", "ngoài", "mot", "một", "cac", "các", "dang", "đang", "duoc", "được", "from", "with",
}


def _detect_suggestion_type(term: str) -> str:
    if re.search(r"[A-Z]{2,}", term):
        return "ABBREVIATION"
    if re.search(r"[/-]", term):
        return "VARIANT_CLUSTER"
    if re.match(r"^[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2}$", term):
        return "PROPER_NOUN"
    return "UNKNOWN_TERM"


def _normalize_candidate(term: str) -> Optional[str]:
    cleaned = _normalize_space(term)
    if not cleaned:
        return None
    if len(cleaned) < 3:
        return None
    if _normalize_key(cleaned) in _SUGGESTION_STOPWORDS:
        return None
    return cleaned


def _existing_glossary_keys(db: Session, organization_id: str) -> set[str]:
    keys: set[str] = set()
    for term in (
        db.query(models.GlossaryTerm)
        .filter(
            or_(
                models.GlossaryTerm.organization_id.is_(None),
                models.GlossaryTerm.organization_id == organization_id,
            )
        )
        .all()
    ):
        keys.add(_normalize_key(term.term))
        for alias in term.aliases or []:
            keys.add(_normalize_key(alias))
    return keys


def _candidate_aliases_for(term: str) -> List[str]:
    aliases = set()
    no_space = term.replace(" ", "")
    if no_space != term and len(no_space) >= 3:
        aliases.add(no_space)
    if " " in term:
        initials = "".join(part[0] for part in term.split() if part)
        if len(initials) >= 2:
            aliases.add(initials.upper())
    if term.isupper() and len(term) >= 2:
        aliases.add(" ".join(term.lower()))
    return sorted(alias for alias in aliases if _normalize_key(alias) != _normalize_key(term))


def _extract_glossary_candidates(transcript_text: str) -> List[Dict[str, Any]]:
    token_pattern = re.compile(r"\b[A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9/-]{1,}\b(?:\s+\b[A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9/-]{1,}\b){0,2}")
    matches = [_normalize_candidate(match.group(0)) for match in token_pattern.finditer(transcript_text or "")]
    filtered = [item for item in matches if item]
    counts = Counter(filtered)
    suggestions: List[Dict[str, Any]] = []
    for candidate, count in counts.items():
        if count < 2:
            continue
        suggestion_type = _detect_suggestion_type(candidate)
        confidence = min(0.95, 0.35 + (count * 0.1) + (0.1 if suggestion_type != "UNKNOWN_TERM" else 0))
        suggestions.append(
            {
                "canonical_term_candidate": candidate,
                "alias_candidates": _candidate_aliases_for(candidate),
                "occurrence_count": count,
                "confidence_score": round(confidence, 2),
                "suggestion_type": suggestion_type,
            }
        )
    return suggestions


def _extract_evidence_examples(transcript_text: str, candidate: str, limit: int = 3) -> List[str]:
    examples: List[str] = []
    if not transcript_text or not candidate:
        return examples
    for line in re.split(r"[\n.!?]", transcript_text):
        cleaned = _normalize_space(line)
        if cleaned and re.search(re.escape(candidate), cleaned, flags=re.IGNORECASE):
            examples.append(cleaned[:220])
        if len(examples) >= limit:
            break
    return examples


def _upsert_glossary_suggestion(
    db: Session,
    organization_id: str,
    meeting_id: str,
    transcript_text: str,
    suggestion_data: Dict[str, Any],
) -> Optional[models.GlossarySuggestion]:
    candidate = suggestion_data["canonical_term_candidate"]
    normalized_candidate = _normalize_key(candidate)
    cooldown_threshold = datetime.utcnow() - timedelta(days=GLOSSARY_SUGGESTION_REJECT_COOLDOWN_DAYS)
    existing = None
    for item in db.query(models.GlossarySuggestion).filter(models.GlossarySuggestion.organization_id == organization_id).all():
        if _normalize_key(item.canonical_term_candidate) == normalized_candidate:
            existing = item
            break

    evidence_examples = _extract_evidence_examples(transcript_text, candidate)
    payload = {
        "organization_id": organization_id,
        "canonical_term_candidate": candidate,
        "alias_candidates": suggestion_data.get("alias_candidates") or [],
        "category_hint": suggestion_data.get("category_hint"),
        "source_meeting_ids": [meeting_id],
        "evidence_examples": evidence_examples,
        "occurrence_count": suggestion_data.get("occurrence_count", 0),
        "confidence_score": suggestion_data.get("confidence_score", 0.0),
        "suggestion_type": suggestion_data.get("suggestion_type", "UNKNOWN_TERM"),
        "status": "PENDING",
    }

    if existing:
        if existing.status == "REJECTED" and existing.reviewed_at and existing.reviewed_at >= cooldown_threshold:
            return None
        source_ids = list(dict.fromkeys([*(existing.source_meeting_ids or []), meeting_id]))
        aliases = _normalize_aliases([*(existing.alias_candidates or []), *(payload["alias_candidates"] or [])], candidate)
        evidence = list(dict.fromkeys([*(existing.evidence_examples or []), *evidence_examples]))[:3]
        updates = {
            "alias_candidates": aliases,
            "source_meeting_ids": source_ids,
            "evidence_examples": evidence,
            "occurrence_count": (existing.occurrence_count or 0) + payload["occurrence_count"],
            "confidence_score": max(existing.confidence_score or 0.0, payload["confidence_score"]),
        }
        if existing.status != "APPLIED":
            updates["status"] = "PENDING"
        return update_glossary_suggestion(db, existing.id, updates)

    return create_glossary_suggestion(db, payload)


def generate_glossary_suggestions_for_transcript(
    db: Session,
    organization_id: Optional[str],
    meeting_id: str,
    transcript_text: str,
    nlp_metadata: Optional[Dict[str, Any]] = None,
) -> List[models.GlossarySuggestion]:
    if not organization_id or not transcript_text:
        return []
    existing_keys = _existing_glossary_keys(db, organization_id)
    created_or_updated: List[models.GlossarySuggestion] = []
    for candidate in _extract_glossary_candidates(transcript_text):
        normalized_candidate = _normalize_key(candidate["canonical_term_candidate"])
        if normalized_candidate in existing_keys:
            continue
        if any(_normalize_key(alias) in existing_keys for alias in candidate["alias_candidates"]):
            continue
        suggestion = _upsert_glossary_suggestion(db, organization_id, meeting_id, transcript_text, candidate)
        if suggestion:
            created_or_updated.append(suggestion)
    return created_or_updated


def list_glossary_suggestions_payload(
    organization_id: str,
    status: Optional[str],
    skip: int,
    limit: int,
    db: Session,
    current_user: models.User,
) -> List[schemas.GlossarySuggestion]:
    auth.require_org_admin(db, current_user, organization_id)
    return get_glossary_suggestions(db, organization_id, status=status, skip=skip, limit=limit)


def run_glossary_suggestions_payload(
    organization_id: str,
    db: Session,
    current_user: models.User,
) -> Dict[str, int]:
    auth.require_org_admin(db, current_user, organization_id)
    transcripts = (
        db.query(models.Transcript)
        .join(models.Meeting, models.Meeting.id == models.Transcript.meeting_id)
        .filter(models.Meeting.organization_id == organization_id, models.Transcript.processing_status == "COMPLETED")
        .order_by(models.Transcript.created_at.desc())
        .limit(200)
        .all()
    )
    affected = 0
    for transcript in transcripts:
        results = generate_glossary_suggestions_for_transcript(
            db,
            organization_id,
            transcript.meeting_id,
            transcript.content,
            transcript.nlp_metadata,
        )
        affected += len(results)
    return {"processed_transcripts": len(transcripts), "suggestions_changed": affected}


def approve_glossary_suggestion_payload(
    suggestion_id: str,
    request: schemas.GlossarySuggestionApproveRequest,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    auth.require_org_admin(db, current_user, request.organization_id)
    suggestion = get_glossary_suggestion_by_id(db, suggestion_id)
    if not suggestion or suggestion.organization_id != request.organization_id:
        raise HTTPException(status_code=404, detail="Glossary suggestion not found")
    payload = _validate_glossary_payload(db, request.model_dump(), request.organization_id, current_user)
    created = create_glossary_term(db, payload, current_user.id)
    update_glossary_suggestion(
        db,
        suggestion_id,
        {"status": "APPLIED", "reviewed_by": current_user.id, "reviewed_at": datetime.utcnow()},
    )
    return created


def merge_glossary_suggestion_payload(
    suggestion_id: str,
    request: schemas.GlossarySuggestionMergeRequest,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    auth.require_org_admin(db, current_user, request.organization_id)
    suggestion = get_glossary_suggestion_by_id(db, suggestion_id)
    if not suggestion or suggestion.organization_id != request.organization_id:
        raise HTTPException(status_code=404, detail="Glossary suggestion not found")
    term = get_glossary_term_by_id(db, request.target_term_id)
    if not term or term.organization_id != request.organization_id:
        raise HTTPException(status_code=404, detail="Target glossary term not found")
    merged_aliases = _normalize_aliases([*(term.aliases or []), *(request.aliases or [])], term.term)
    validated = _validate_glossary_payload(
        db,
        {
            "term": term.term,
            "aliases": merged_aliases,
            "category": term.category,
            "translation_vi": term.translation_vi,
            "translation_en": term.translation_en,
            "translation_ja": term.translation_ja,
            "translation_zh": term.translation_zh,
            "translation_ko": term.translation_ko,
            "is_active": term.is_active,
        },
        request.organization_id,
        current_user,
        current_term_id=term.id,
    )
    updated = update_glossary_term(db, term.id, {"aliases": validated["aliases"]})
    update_glossary_suggestion(
        db,
        suggestion_id,
        {"status": "APPLIED", "reviewed_by": current_user.id, "reviewed_at": datetime.utcnow()},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Target glossary term not found")
    return updated


def reject_glossary_suggestion_payload(
    suggestion_id: str,
    organization_id: str,
    db: Session,
    current_user: models.User,
) -> schemas.GlossarySuggestion:
    auth.require_org_admin(db, current_user, organization_id)
    suggestion = get_glossary_suggestion_by_id(db, suggestion_id)
    if not suggestion or suggestion.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Glossary suggestion not found")
    updated = update_glossary_suggestion(
        db,
        suggestion_id,
        {"status": "REJECTED", "reviewed_by": current_user.id, "reviewed_at": datetime.utcnow()},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Glossary suggestion not found")
    return updated


def get_glossary_insights_payload(
    organization_id: str,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryInsightsResponse:
    auth.require_org_admin(db, current_user, organization_id)
    transcripts = (
        db.query(models.Transcript)
        .join(models.Meeting, models.Meeting.id == models.Transcript.meeting_id)
        .filter(models.Meeting.organization_id == organization_id)
        .order_by(models.Transcript.created_at.desc())
        .limit(200)
        .all()
    )
    corrected_counter: Counter[str] = Counter()
    for transcript in transcripts:
        metadata = transcript.nlp_metadata or {}
        for correction in metadata.get("corrections") or []:
            if correction.get("source") == "glossary" and correction.get("original"):
                corrected_counter[_normalize_space(correction["original"])] += 1

    suggestions = db.query(models.GlossarySuggestion).filter(models.GlossarySuggestion.organization_id == organization_id).all()
    missing = sorted(
        [item for item in suggestions if item.status == "PENDING"],
        key=lambda item: item.occurrence_count,
        reverse=True,
    )[:5]
    return schemas.GlossaryInsightsResponse(
        top_corrected_aliases=[
            schemas.GlossaryInsightsItem(value=value, count=count)
            for value, count in corrected_counter.most_common(5)
        ],
        top_missing_terms=[
            schemas.GlossaryInsightsItem(value=item.canonical_term_candidate, count=item.occurrence_count or 0)
            for item in missing
        ],
        pending_suggestions_count=sum(1 for item in suggestions if item.status == "PENDING"),
        approved_count=sum(1 for item in suggestions if item.status == "APPLIED"),
        rejected_count=sum(1 for item in suggestions if item.status == "REJECTED"),
    )


def list_glossary_terms_payload(
    organization_id: Optional[str],
    category: Optional[str],
    is_active: Optional[bool],
    skip: int,
    limit: int,
    db: Session,
    current_user: models.User,
) -> List[schemas.GlossaryTerm]:
    if organization_id:
        auth.require_org_member(db, current_user, organization_id)
        return get_glossary_terms(
            db,
            organization_id=organization_id,
            category=category,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    query = _scope_glossary_query(db, current_user, organization_id=None)
    if category:
        query = query.filter(models.GlossaryTerm.category == category)
    if is_active is not None:
        query = query.filter(models.GlossaryTerm.is_active == is_active)
    return query.order_by(models.GlossaryTerm.term).offset(skip).limit(limit).all()


def create_glossary_term_payload(
    term: schemas.GlossaryTermCreate,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    payload = _validate_glossary_payload(db, term.model_dump(), term.organization_id, current_user)
    return create_glossary_term(db, payload, current_user.id)


def update_glossary_term_payload(
    term_id: str,
    updates: schemas.GlossaryTermUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    update_payload = term.__dict__.copy()
    update_payload.update(updates.model_dump(exclude_unset=True))
    validated = _validate_glossary_payload(db, update_payload, term.organization_id, current_user, current_term_id=term_id)
    partial = updates.model_dump(exclude_unset=True)
    if "term" in partial:
        partial["term"] = validated["term"]
    if "aliases" in partial:
        partial["aliases"] = validated["aliases"]
    if "category" in partial:
        partial["category"] = validated["category"]
    return update_glossary_term(db, term_id, partial)


def delete_glossary_term_payload(term_id: str, db: Session, current_user: models.User) -> Dict[str, str]:
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    delete_glossary_term(db, term_id)
    return {"message": "Glossary term deleted successfully"}


def list_action_items_payload(
    db: Session,
    current_user: models.User,
    meeting_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[schemas.ActionItem]:
    query = db.query(models.ActionItem).options(
        joinedload(models.ActionItem.meeting)
        .joinedload(models.Meeting.participants)
        .joinedload(models.MeetingParticipant.user),
        joinedload(models.ActionItem.meeting).joinedload(models.Meeting.speaker_mappings),
        joinedload(models.ActionItem.meeting).joinedload(models.Meeting.transcripts),
        joinedload(models.ActionItem.assignees).joinedload(models.ActionItemAssignee.user),
    )

    if meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        from src.api.core.meeting_operations import require_meeting_room_access

        require_meeting_room_access(db, current_user, meeting)
        query = query.filter(models.ActionItem.meeting_id == meeting_id)
    else:
        participant_meeting_ids = meeting_participant_meeting_ids_for_user(db, current_user)
        user_email = (current_user.email or "").lower()
        assigned_filters = [models.ActionItem.assignees.any(models.ActionItemAssignee.user_id == current_user.id)]
        if user_email:
            assigned_filters.append(
                models.ActionItem.assignees.any(func.lower(models.ActionItemAssignee.email) == user_email)
            )
        query = query.filter(
            or_(
                *assigned_filters,
                and_(
                    ~models.ActionItem.assignees.any(),
                    or_(
                        and_(
                            models.ActionItem.meeting_id.is_(None),
                            models.ActionItem.created_by == current_user.id,
                        ),
                        models.ActionItem.meeting_id.in_(participant_meeting_ids),
                    ),
                ),
            )
        )

    if status:
        query = query.filter(models.ActionItem.status == status)

    items = query.order_by(models.ActionItem.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_action_item_payload(item) for item in items]


def create_action_item_payload(
    action_item: schemas.ActionItemCreate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    meeting = None
    if action_item.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == action_item.meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        require_action_item_manager_for_meeting(db, current_user, meeting)

    action_data = resolve_action_item_assignees(db, action_item.model_dump(), meeting)
    created = create_action_item(db, action_data, current_user.id)
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_ACTION_ITEM",
        target=created.title,
        role=current_user.role or "member",
    )
    payload = serialize_action_item_payload(created)
    broadcast_action_item_updated(created)
    return payload


def update_action_item_payload(
    action_id: str,
    updates: schemas.ActionItemUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_visible_to_user(db, db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    meeting = None
    if db_action.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == db_action.meeting_id).first()
    update_data = updates.model_dump(exclude_unset=True)
    is_manager = action_item_manageable_by_user(db, db_action, current_user)
    is_assignee = action_item_assigned_to_user(db_action, current_user)

    if not is_manager:
        if not is_assignee:
            if meeting:
                raise HTTPException(status_code=403, detail=action_item_manager_error_detail(meeting))
            raise HTTPException(status_code=403, detail="Action item access denied")
        raise HTTPException(status_code=403, detail="Use /assignees/me for personal status updates")

    update_data = resolve_action_item_assignees(
        db,
        update_data,
        meeting,
        current_assignees=list(db_action.assignees or []),
    )
    updated = update_action_item(db, action_id, update_data)
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_ACTION_ITEM",
        target=updated.title if updated else action_id,
        role=current_user.role or "member",
    )
    payload = serialize_action_item_payload(updated)
    broadcast_action_item_updated(updated)
    return payload


def update_my_action_item_assignment_payload(
    action_id: str,
    updates: schemas.ActionItemAssigneeStatusUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_assigned_to_user(db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    user_email = (current_user.email or "").lower()
    target = next(
        (
            assignee for assignee in (db_action.assignees or [])
            if assignee.user_id == current_user.id or ((assignee.email or "").lower() == user_email and user_email)
        ),
        None,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Action item assignee not found")

    next_status = updates.status
    target.status = next_status
    target.completed_at = datetime.now() if next_status == "COMPLETED" else None
    update_action_item(
        db,
        action_id,
        {
            "assignees": [
                {
                    "user_id": assignee.user_id,
                    "email": assignee.email,
                    "display_name": assignee.display_name,
                    "status": assignee.status,
                    "completed_at": assignee.completed_at,
                }
                for assignee in (db_action.assignees or [])
            ]
        },
    )
    refreshed = get_action_item_by_id(db, action_id)
    payload = serialize_action_item_payload(refreshed)
    broadcast_action_item_updated(refreshed)
    return payload


def delete_action_item_payload(action_id: str, db: Session, current_user: models.User) -> Dict[str, str]:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_manageable_by_user(db, db_action, current_user):
        if db_action.meeting_id:
            meeting = db.query(models.Meeting).filter(models.Meeting.id == db_action.meeting_id).first()
            if meeting:
                raise HTTPException(status_code=403, detail=action_item_manager_error_detail(meeting))
        raise HTTPException(status_code=403, detail="Action item access denied")

    deleted_title = db_action.title
    deleted_meeting_id = db_action.meeting_id
    delete_action_item(db, action_id)
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_ACTION_ITEM",
        target=deleted_title,
        role=current_user.role or "member",
    )
    broadcast_action_item_deleted(deleted_meeting_id, action_id)
    return {"message": "Action item deleted successfully"}
