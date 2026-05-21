from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid
import re
from .. import models


AI_GENERATED_META_DESCRIPTION_RE = re.compile(
    r"^\s*(?:Phụ trách:.*|Chưa phân công)(?:\s*\|\s*(?:Hạn:.*|Chưa đặt hạn))?\s*$",
    re.IGNORECASE,
)


def is_ai_generated_meta_description(value: Optional[str]) -> bool:
    return bool(value and AI_GENERATED_META_DESCRIPTION_RE.match(value.strip()))


# ==================== Transcript ====================

def get_transcript_by_id(db: Session, transcript_id: str) -> Optional[models.Transcript]:
    return db.query(models.Transcript).options(
        joinedload(models.Transcript.segments)
    ).filter(models.Transcript.id == transcript_id).first()


def get_transcripts_by_meeting(db: Session, meeting_id: str) -> List[models.Transcript]:
    return db.query(models.Transcript).options(
        joinedload(models.Transcript.segments)
    ).filter(models.Transcript.meeting_id == meeting_id).all()


def create_transcript(db: Session, transcript_data: dict) -> models.Transcript:
    db_transcript = models.Transcript(
        id=transcript_data.get("id", str(uuid.uuid4())),
        meeting_id=transcript_data["meeting_id"],
        audio_file_id=transcript_data.get("audio_file_id"),
        content=transcript_data["content"],
        language=transcript_data.get("language", "vi"),
        word_count=transcript_data.get("word_count", 0),
        processing_status=transcript_data.get("processing_status", "PENDING"),
        stt_provider=transcript_data.get("stt_provider", "whisper"),
        confidence_score=transcript_data.get("confidence_score"),
        post_processed=transcript_data.get("post_processed", False),
        nlp_metadata=transcript_data.get("nlp_metadata"),
    )
    db.add(db_transcript)
    db.commit()
    db.refresh(db_transcript)
    return db_transcript


def update_transcript(db: Session, transcript_id: str, updates: dict) -> Optional[models.Transcript]:
    db_transcript = get_transcript_by_id(db, transcript_id)
    if not db_transcript:
        return None
    
    for key, value in updates.items():
        if hasattr(db_transcript, key):
            setattr(db_transcript, key, value)
    
    db.commit()
    db.refresh(db_transcript)
    return db_transcript


def delete_transcript(db: Session, transcript_id: str) -> bool:
    db_transcript = get_transcript_by_id(db, transcript_id)
    if not db_transcript:
        return False
    
    db.delete(db_transcript)
    db.commit()
    return True


# ==================== Transcript Segment ====================

def create_transcript_segment(db: Session, segment_data: dict) -> models.TranscriptSegment:
    db_segment = models.TranscriptSegment(
        id=segment_data.get("id", str(uuid.uuid4())),
        transcript_id=segment_data["transcript_id"],
        speaker_label=segment_data["speaker_label"],
        start_time=segment_data["start_time"],
        end_time=segment_data["end_time"],
        text=segment_data["text"],
        original_text=segment_data.get("original_text"),
        language=segment_data.get("language", "auto"),
        confidence_score=segment_data.get("confidence_score"),
        nlp_metadata=segment_data.get("nlp_metadata"),
        word_count=segment_data.get("word_count", 0),
    )
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return db_segment


def create_transcript_segments_bulk(db: Session, segments: List[dict]) -> List[models.TranscriptSegment]:
    db_segments = []
    for segment_data in segments:
        db_segment = models.TranscriptSegment(
            id=segment_data.get("id", str(uuid.uuid4())),
            transcript_id=segment_data["transcript_id"],
            speaker_label=segment_data["speaker_label"],
            start_time=segment_data["start_time"],
            end_time=segment_data["end_time"],
            text=segment_data["text"],
            original_text=segment_data.get("original_text"),
            language=segment_data.get("language", "auto"),
            confidence_score=segment_data.get("confidence_score"),
            nlp_metadata=segment_data.get("nlp_metadata"),
            word_count=segment_data.get("word_count", 0),
        )
        db_segments.append(db_segment)
    
    db.add_all(db_segments)
    db.commit()
    return db_segments


# ==================== Meeting Summary ====================

def get_meeting_summary(db: Session, meeting_id: str) -> Optional[models.MeetingSummary]:
    return db.query(models.MeetingSummary).filter(
        models.MeetingSummary.meeting_id == meeting_id
    ).first()


def get_summary_by_id(db: Session, summary_id: str) -> Optional[models.MeetingSummary]:
    return db.query(models.MeetingSummary).filter(
        models.MeetingSummary.id == summary_id
    ).first()


def create_meeting_summary(db: Session, summary_data: dict) -> models.MeetingSummary:
    db_summary = models.MeetingSummary(
        id=summary_data.get("id", str(uuid.uuid4())),
        meeting_id=summary_data["meeting_id"],
        language=summary_data.get("language", "vi"),
        key_points=summary_data.get("key_points"),
        decisions=summary_data.get("decisions"),
        action_items=summary_data.get("action_items"),
        risks=summary_data.get("risks"),
        open_questions=summary_data.get("open_questions"),
        timeline_highlights=summary_data.get("timeline_highlights"),
        speaker_summaries=summary_data.get("speaker_summaries"),
        meeting_summary=summary_data.get("meeting_summary"),
        ai_provider=summary_data.get("ai_provider", "openai"),
        model_name=summary_data.get("model_name"),
        processing_status=summary_data.get("processing_status", "PENDING"),
    )
    db.add(db_summary)
    db.commit()
    db.refresh(db_summary)
    return db_summary


def update_meeting_summary(db: Session, summary_id: str, updates: dict) -> Optional[models.MeetingSummary]:
    db_summary = get_summary_by_id(db, summary_id)
    if not db_summary:
        return None
    
    for key, value in updates.items():
        if hasattr(db_summary, key):
            setattr(db_summary, key, value)
    
    db.commit()
    db.refresh(db_summary)
    return db_summary


def delete_meeting_summary(db: Session, summary_id: str) -> bool:
    db_summary = get_summary_by_id(db, summary_id)
    if not db_summary:
        return False
    
    db.delete(db_summary)
    db.commit()
    return True


# ==================== Action Items ====================

def get_action_item_by_id(db: Session, action_id: str) -> Optional[models.ActionItem]:
    return db.query(models.ActionItem).options(
        joinedload(models.ActionItem.assigned_to_user),
        joinedload(models.ActionItem.created_by_user),
        joinedload(models.ActionItem.assignees).joinedload(models.ActionItemAssignee.user),
        joinedload(models.ActionItem.meeting),
    ).filter(models.ActionItem.id == action_id).first()


def get_action_items(
    db: Session, 
    meeting_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[models.ActionItem]:
    query = db.query(models.ActionItem).options(
        joinedload(models.ActionItem.assigned_to_user),
        joinedload(models.ActionItem.created_by_user),
        joinedload(models.ActionItem.assignees).joinedload(models.ActionItemAssignee.user),
        joinedload(models.ActionItem.meeting),
    )
    
    if meeting_id:
        query = query.filter(models.ActionItem.meeting_id == meeting_id)
    
    if assigned_to:
        query = query.filter(models.ActionItem.assigned_to == assigned_to)
    
    if status:
        query = query.filter(models.ActionItem.status == status)

    return query.order_by(models.ActionItem.created_at.desc()).offset(skip).limit(limit).all()


def _normalize_aggregate_status(assignees: List[models.ActionItemAssignee]) -> str:
    if not assignees:
        return "PENDING"
    statuses = [assignee.status for assignee in assignees]
    if all(status == "COMPLETED" for status in statuses):
        return "COMPLETED"
    if all(status == "CANCELLED" for status in statuses):
        return "CANCELLED"
    if any(status == "IN_PROGRESS" for status in statuses):
        return "IN_PROGRESS"
    return "PENDING"


def sync_action_item_aggregate_status(db_action: models.ActionItem) -> None:
    aggregate_status = _normalize_aggregate_status(list(db_action.assignees or []))
    db_action.status = aggregate_status
    if aggregate_status == "COMPLETED":
        db_action.completed_at = datetime.now()
    else:
        db_action.completed_at = None


def replace_action_item_assignees(db: Session, db_action: models.ActionItem, assignees: List[dict]) -> None:
    existing_by_email = {
        (assignee.email or "").lower(): assignee
        for assignee in (db_action.assignees or [])
        if assignee.email
    }
    next_emails = set()
    next_assignees: List[models.ActionItemAssignee] = []

    for assignee_data in assignees:
        email = (assignee_data.get("email") or "").strip()
        if not email:
            continue
        email_key = email.lower()
        if email_key in next_emails:
            continue
        next_emails.add(email_key)
        existing = existing_by_email.get(email_key)
        if existing:
            existing.user_id = assignee_data.get("user_id")
            existing.display_name = assignee_data.get("display_name")
            existing.status = assignee_data.get("status", existing.status or "PENDING")
            existing.completed_at = assignee_data.get("completed_at")
            next_assignees.append(existing)
            continue

        next_assignees.append(
            models.ActionItemAssignee(
                id=str(uuid.uuid4()),
                action_item_id=db_action.id,
                user_id=assignee_data.get("user_id"),
                email=email,
                display_name=assignee_data.get("display_name"),
                status=assignee_data.get("status", "PENDING"),
                completed_at=assignee_data.get("completed_at"),
            )
        )

    db_action.assignees = next_assignees
    sync_action_item_aggregate_status(db_action)


def _normalize_legacy_assignees(action_data: dict) -> List[dict]:
    if action_data.get("assignees") is not None:
        return list(action_data.get("assignees") or [])

    legacy_email = action_data.get("assigned_email")
    legacy_user_id = action_data.get("assigned_to")
    if not legacy_email and not legacy_user_id:
        return []

    return [{
        "user_id": legacy_user_id,
        "email": legacy_email,
    }]


def create_action_item(db: Session, action_data: dict, created_by: str) -> models.ActionItem:
    normalized_assignees = _normalize_legacy_assignees(action_data)
    first_assignee = normalized_assignees[0] if normalized_assignees else None
    description = action_data.get("description")
    if action_data.get("summary_id") and is_ai_generated_meta_description(description):
        description = None
    db_action = models.ActionItem(
        id=action_data.get("id", str(uuid.uuid4())),
        meeting_id=action_data.get("meeting_id"),
        summary_id=action_data.get("summary_id"),
        title=action_data["title"],
        description=description,
        assigned_to=action_data.get("assigned_to") or (first_assignee.get("user_id") if first_assignee else None),
        assigned_email=action_data.get("assigned_email") or (first_assignee.get("email") if first_assignee else None),
        status=action_data.get("status", "PENDING"),
        priority=action_data.get("priority", "MEDIUM"),
        due_date=action_data.get("due_date"),
        created_by=created_by,
    )
    db.add(db_action)
    db.flush()
    replace_action_item_assignees(db, db_action, normalized_assignees)
    db.commit()
    db.refresh(db_action)
    return db_action


def update_action_item(db: Session, action_id: str, updates: dict) -> Optional[models.ActionItem]:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        return None
    
    raw_assignees_payload = updates.pop("assignees", None)
    assignees_payload = raw_assignees_payload
    if raw_assignees_payload is None and ("assigned_to" in updates or "assigned_email" in updates):
        assignees_payload = _normalize_legacy_assignees(updates)

    for key, value in updates.items():
        if hasattr(db_action, key):
            setattr(db_action, key, value)

    if db_action.summary_id and is_ai_generated_meta_description(db_action.description):
        db_action.description = None

    if assignees_payload is not None:
        replace_action_item_assignees(db, db_action, assignees_payload)
        first_assignee = assignees_payload[0] if assignees_payload else None
        db_action.assigned_to = first_assignee.get("user_id") if first_assignee else None
        db_action.assigned_email = first_assignee.get("email") if first_assignee else None
    elif db_action.assignees:
        sync_action_item_aggregate_status(db_action)
    elif "status" in updates:
        if updates.get("status") == "COMPLETED":
            db_action.completed_at = datetime.now()
        else:
            db_action.completed_at = None

    db.commit()
    db.refresh(db_action)
    return db_action


def delete_action_item(db: Session, action_id: str) -> bool:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        return False
    
    db.delete(db_action)
    db.commit()
    return True
