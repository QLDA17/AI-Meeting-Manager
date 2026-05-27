"""Transcript draft persistence, normalization, chunk management, and finalization."""

import asyncio
import glob
import logging
import os
import subprocess
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, sessionmaker

from src.api import models, schemas
from src.api.database import SessionLocal
from src.api.core.meetings_support import estimate_segment_end, normalize_speaker_label
from src.api.core.meeting_stt import (
    get_meeting_settings,
    merge_meeting_settings,
    normalize_stt_provider,
    normalize_transcription_mode,
)

logger = logging.getLogger(__name__)
SUPPORTED_SUMMARY_LANGUAGES = ("vi", "en", "zh", "ja", "ko")
_translation_locks: Dict[str, asyncio.Lock] = {}
_latest_translation_batches: Dict[str, str] = {}
MIN_DEFERRED_CHUNK_BYTES = 4096


def _empty_summary_payload() -> schemas.MeetingAnalysisOutput:
    return schemas.MeetingAnalysisOutput(
        meeting_summary="",
        key_points=[],
        decisions=[],
        action_items=[],
        risks=[],
        open_questions=[],
        timeline_highlights=[],
        speaker_summaries=[],
    )


def _deferred_chunk_sort_key(path: str) -> int:
    name = os.path.basename(path)
    try:
        return int(name.split("_", 1)[1].split(".", 1)[0])
    except Exception:
        return 10**9


def next_transcript_chunk_index(db: Session, meeting_id: str, user_id: str) -> int:
    current = db.query(func.max(models.MeetingTranscriptDraft.chunk_index)).filter(
        models.MeetingTranscriptDraft.meeting_id == meeting_id,
        models.MeetingTranscriptDraft.user_id == user_id,
    ).scalar()
    return int(current if current is not None else -1) + 1


def upsert_transcript_draft(
    db: Session,
    *,
    meeting_id: str,
    user_id: str,
    chunk_index: int,
    text: str,
    segments: List[Dict[str, Any]],
    language: str,
    provider: str,
    model: str,
    start_ms: int = 0,
) -> models.MeetingTranscriptDraft:
    existing = db.query(models.MeetingTranscriptDraft).filter(
        models.MeetingTranscriptDraft.meeting_id == meeting_id,
        models.MeetingTranscriptDraft.user_id == user_id,
        models.MeetingTranscriptDraft.chunk_index == chunk_index,
    ).first()
    if existing:
        existing.text = text
        existing.segments = segments
        existing.language = language
        existing.provider = provider
        existing.model = model
        existing.start_ms = start_ms
        draft = existing
    else:
        draft = models.MeetingTranscriptDraft(
            meeting_id=meeting_id,
            user_id=user_id,
            chunk_index=chunk_index,
            text=text,
            segments=segments,
            language=language,
            provider=provider,
            model=model,
            start_ms=start_ms,
        )
        db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


def build_transcript_from_drafts(db: Session, meeting_id: str) -> Dict[str, Any]:
    drafts = db.query(models.MeetingTranscriptDraft).filter(
        models.MeetingTranscriptDraft.meeting_id == meeting_id,
    ).order_by(models.MeetingTranscriptDraft.chunk_index.asc(), models.MeetingTranscriptDraft.created_at.asc()).all()
    texts: List[str] = []
    segments: List[Dict[str, Any]] = []
    languages: List[str] = []
    for draft in drafts:
        if draft.text:
            texts.append(draft.text)
        if draft.language:
            languages.append(draft.language)
        raw_segments = draft.segments or []
        draft_segments = raw_segments
        if not raw_segments and draft.text:
            offset_seconds = (draft.start_ms or 0) / 1000
            draft_segments = [{
                "speaker": "Speaker_01",
                "start": offset_seconds,
                "end": estimate_segment_end(offset_seconds, draft.text),
                "text": draft.text,
                "language": draft.language or "auto",
            }]
        for segment in draft_segments:
            normalized = normalize_segment_payload(segment, draft.language or "auto")
            if normalized["text"]:
                if raw_segments:
                    offset_seconds = (draft.start_ms or 0) / 1000
                    normalized["start_time"] = normalized["start_time"] + offset_seconds
                    normalized["end_time"] = normalized["end_time"] + offset_seconds
                segments.append(normalized)
                languages.append(normalized["language"])
    language = next((lang for lang in languages if lang and lang != "auto"), "auto")
    return {"transcript": "\n".join(texts), "segments": segments, "language": language, "chunks": drafts}


def serialize_transcript_draft_chunks(chunks: List[models.MeetingTranscriptDraft]) -> List[Dict[str, Any]]:
    serialized: List[Dict[str, Any]] = []
    for item in chunks:
        offset_seconds = (item.start_ms or 0) / 1000
        raw_segments = item.segments or []
        segments = [
            {
                **segment,
                "start": float(segment.get("start", segment.get("start_time", 0)) or 0) + offset_seconds,
                "end": float(segment.get("end", segment.get("end_time", 0)) or 0) + offset_seconds,
            }
            for segment in raw_segments
        ] or [{
            "speaker": "Speaker_01",
            "start": offset_seconds,
            "end": estimate_segment_end(offset_seconds, item.text),
            "text": item.text,
            "language": item.language or "auto",
        }]
        serialized.append({
            "id": item.id,
            "userId": item.user_id,
            "user_id": item.user_id,
            "chunkIndex": item.chunk_index,
            "chunk_index": item.chunk_index,
            "text": item.text,
            "segments": segments,
            "language": item.language,
            "startMs": item.start_ms,
            "start_ms": item.start_ms,
            "timestamp": (item.updated_at or item.created_at or datetime.now(timezone.utc)).isoformat(),
        })
    return serialized


def normalize_segment_payload(segment: Dict[str, Any], default_language: str = "auto") -> Dict[str, Any]:
    speaker_label = normalize_speaker_label(segment.get("speaker_label") or segment.get("speaker") or "Speaker_01")
    return {
        "speaker_label": speaker_label,
        "start_time": float(segment.get("start_time", segment.get("start", 0)) or 0),
        "end_time": float(segment.get("end_time", segment.get("end", 0)) or 0),
        "text": segment.get("text", "") or "",
        "original_text": segment.get("original_text"),
        "language": segment.get("language") or segment.get("detected_language") or default_language or "auto",
        "confidence_score": segment.get("confidence_score") or segment.get("confidence"),
        "nlp_metadata": segment.get("nlp_metadata"),
        "word_count": len((segment.get("text", "") or "").split()),
    }


def _segment_corrections(segment: Dict[str, Any]) -> List[Dict[str, Any]]:
    metadata = segment.get("nlp_metadata") if isinstance(segment, dict) else None
    corrections = metadata.get("corrections") if isinstance(metadata, dict) else None
    return corrections if isinstance(corrections, list) else []


def _speaker_assignment_rate(segments: List[Dict[str, Any]]) -> float:
    if not segments:
        return 0.0
    assigned = 0
    for segment in segments:
        label = str(segment.get("speaker_label") or segment.get("speaker") or "").strip()
        if label:
            assigned += 1
    return round(assigned / len(segments), 3)


def _build_transcript_quality_metadata(
    *,
    provider: str,
    provider_model: Optional[str],
    detected_language: str,
    raw_segments: List[Dict[str, Any]],
    cleaned_segments: List[Dict[str, Any]],
    post_processing_applied: bool,
) -> Dict[str, Any]:
    correction_count = sum(len(_segment_corrections(segment)) for segment in cleaned_segments)
    low_confidence_segment_count = sum(
        1
        for segment in cleaned_segments
        if segment.get("confidence_score") is not None and float(segment.get("confidence_score") or 0) < 0.6
    )
    quality_status = "healthy"
    if not cleaned_segments or low_confidence_segment_count > max(1, len(cleaned_segments) // 2):
        quality_status = "degraded"
    return {
        "provider": provider,
        "provider_model": provider_model,
        "detected_language": detected_language,
        "raw_segment_count": len(raw_segments),
        "cleaned_segment_count": len(cleaned_segments),
        "correction_count": correction_count,
        "speaker_assignment_rate": _speaker_assignment_rate(cleaned_segments),
        "low_confidence_segment_count": low_confidence_segment_count,
        "post_processing_applied": post_processing_applied,
        "quality_status": quality_status,
    }


def build_transcript_artifacts(
    *,
    text: str,
    segments: List[Dict[str, Any]],
    language: str,
    provider_name: str,
    provider_model: Optional[str] = None,
) -> Dict[str, Any]:
    from src.api.core.nlp_support import get_phobert_processor, phobert_enabled_for

    raw_text = text or ""
    raw_segments = [normalize_segment_payload(segment, language) for segment in (segments or [])]
    cleaned_text = raw_text
    cleaned_segments = [dict(segment) for segment in raw_segments]
    nlp_metadata = None
    post_processed = False

    if phobert_enabled_for(language):
        try:
            processor = get_phobert_processor()
            processed = processor.process_finalize(raw_text, segments if isinstance(segments, list) else [])
            cleaned_text = str(processed.get("text") or raw_text)
            cleaned_segments = [
                normalize_segment_payload(segment, language)
                for segment in (processed.get("segments") or segments or [])
            ]
            nlp_metadata = processed.get("nlp_metadata")
            post_processed = bool(processed.get("post_processed"))
            raw_text = str(processed.get("raw_text") or raw_text)
            raw_segments = [
                normalize_segment_payload(segment, language)
                for segment in (processed.get("raw_segments") or segments or [])
            ]
        except Exception as exc:
            logger.warning("PhoBERT finalize post-processing skipped: %s", exc, exc_info=True)

    quality_metadata = _build_transcript_quality_metadata(
        provider=provider_name,
        provider_model=provider_model,
        detected_language=language,
        raw_segments=raw_segments,
        cleaned_segments=cleaned_segments,
        post_processing_applied=post_processed,
    )

    return {
        "raw_text": raw_text,
        "cleaned_text": cleaned_text,
        "raw_segments": raw_segments,
        "cleaned_segments": cleaned_segments,
        "nlp_metadata": nlp_metadata,
        "post_processed": post_processed,
        "quality_metadata": quality_metadata,
    }


def normalize_summary_language(language: Optional[str], fallback: str = "vi") -> str:
    normalized = (language or fallback or "vi").lower().strip()
    if normalized not in SUPPORTED_SUMMARY_LANGUAGES:
        return fallback if fallback in SUPPORTED_SUMMARY_LANGUAGES else "vi"
    return normalized


def resolve_meeting_summary_language(
    *,
    requested_language: Optional[str],
    current_user: models.User,
    transcript_language: Optional[str],
) -> str:
    if requested_language and requested_language != "auto":
        return normalize_summary_language(requested_language)
    if getattr(current_user, "language", None):
        return normalize_summary_language(current_user.language)
    if transcript_language and transcript_language != "auto":
        return normalize_summary_language(transcript_language)
    return "vi"


def ordered_summary_languages(primary_language: str) -> List[str]:
    primary = normalize_summary_language(primary_language)
    return [primary, *[language for language in SUPPORTED_SUMMARY_LANGUAGES if language != primary]]


def build_summary_generation_state(summaries: List[models.MeetingSummary]) -> Dict[str, str]:
    state: Dict[str, str] = {language: "MISSING" for language in SUPPORTED_SUMMARY_LANGUAGES}
    for summary in summaries or []:
        language = normalize_summary_language(getattr(summary, "language", None))
        state[language] = getattr(summary, "processing_status", None) or "PENDING"
    return state


def _get_translation_lock(meeting_id: str) -> asyncio.Lock:
    lock = _translation_locks.get(meeting_id)
    if lock is None:
        lock = asyncio.Lock()
        _translation_locks[meeting_id] = lock
    return lock


def _serialize_summary_payload(payload: schemas.MeetingAnalysisOutput) -> Dict[str, Any]:
    return {
        "meeting_summary": payload.meeting_summary,
        "key_points": payload.key_points,
        "decisions": payload.decisions,
        "action_items": [item.model_dump() for item in payload.action_items],
        "risks": payload.risks,
        "open_questions": payload.open_questions,
        "timeline_highlights": payload.timeline_highlights,
        "speaker_summaries": payload.speaker_summaries,
    }


def _deserialize_summary_payload(summary: models.MeetingSummary) -> schemas.MeetingAnalysisOutput:
    return schemas.MeetingAnalysisOutput.model_validate(
        {
            "meeting_summary": summary.meeting_summary or "",
            "key_points": summary.key_points or [],
            "decisions": summary.decisions or [],
            "action_items": summary.action_items or [],
            "risks": summary.risks or [],
            "open_questions": summary.open_questions or [],
            "timeline_highlights": summary.timeline_highlights or [],
            "speaker_summaries": summary.speaker_summaries or [],
        }
    )


def _validate_translation_shape(
    source_payload: schemas.MeetingAnalysisOutput,
    translated_payload: schemas.MeetingAnalysisOutput,
) -> None:
    source = _serialize_summary_payload(source_payload)
    translated = _serialize_summary_payload(translated_payload)
    fields = (
        "key_points",
        "decisions",
        "action_items",
        "risks",
        "open_questions",
        "timeline_highlights",
        "speaker_summaries",
    )
    for field in fields:
        expected = len(source[field])
        actual = len(translated[field])
        if expected != actual:
            raise ValueError(f"Translated field '{field}' count mismatch: expected {expected}, got {actual}")


def _build_summary_data(
    *,
    language: str,
    summary_payload: schemas.MeetingAnalysisOutput,
    summary_status: str,
    summary_error_message: str,
    ai_provider_name: str,
    model_name: str,
    generation_group_id: str,
    summary_kind: str,
    source_summary_id: Optional[str],
) -> Dict[str, Any]:
    serialized_payload = _serialize_summary_payload(summary_payload)
    return {
        "language": language,
        "generation_group_id": generation_group_id,
        "source_summary_id": source_summary_id,
        "summary_kind": summary_kind,
        "key_points": serialized_payload["key_points"],
        "decisions": serialized_payload["decisions"],
        "action_items": serialized_payload["action_items"],
        "risks": serialized_payload["risks"],
        "open_questions": serialized_payload["open_questions"],
        "timeline_highlights": serialized_payload["timeline_highlights"],
        "speaker_summaries": serialized_payload["speaker_summaries"],
        "meeting_summary": summary_payload.meeting_summary if summary_status == "COMPLETED" else summary_error_message,
        "ai_provider": ai_provider_name,
        "model_name": model_name,
        "processing_status": summary_status,
    }


def _upsert_summary_row(
    db: Session,
    *,
    meeting_id: str,
    language: str,
    summary_data: Dict[str, Any],
) -> models.MeetingSummary:
    from src.api.crud import create_meeting_summary

    summary_db = (
        db.query(models.MeetingSummary)
        .filter(
            models.MeetingSummary.meeting_id == meeting_id,
            models.MeetingSummary.language == language,
        )
        .order_by(models.MeetingSummary.created_at.desc())
        .first()
    )
    if summary_db:
        for key, value in summary_data.items():
            setattr(summary_db, key, value)
        db.flush()
        return summary_db
    return create_meeting_summary(db, {"meeting_id": meeting_id, **summary_data})


def _generate_and_persist_summary_for_language(
    *,
    meeting_id: str,
    db: Session,
    current_user: models.User,
    transcript_text: str,
    segments_to_save: List[Dict[str, Any]],
    language: str,
    prompts: Dict[str, Dict[str, Any]],
    nlp_metadata: Optional[Dict[str, Any]],
    persist_action_items_to_db: bool,
    generation_group_id: str,
    summary_kind: str,
    source_summary_id: Optional[str] = None,
    source_summary_payload: Optional[schemas.MeetingAnalysisOutput] = None,
):
    from src.api.core.meeting_operations import format_summary_payload, get_speaker_mapping_dict
    from src.api.core.nlp_support import (
        _extract_json_object,
        _normalize_analysis_payload,
        _split_ai_owner_text,
        _try_parse_date,
        build_speaker_aware_transcript,
        build_structured_summary_prompts,
        build_structured_summary_translation_prompts,
    )
    from src.api.crud import create_action_item
    from src.providers.router_llm import RouterLLMAdapter

    language = normalize_summary_language(language)
    summary_status = "FAILED"
    summary_payload = _empty_summary_payload()
    summary_error_message = ""
    ai_provider_name = "router"
    router = RouterLLMAdapter()
    if source_summary_payload is None:
        prompt_key = f"summary_{language}"
        custom_instruction = prompts.get(prompt_key, prompts.get("summary_vi", {})).get(
            "content",
            "Create a concise executive meeting brief. Focus on outcomes, explicit decisions, and next steps only.",
        )
        speaker_map = get_speaker_mapping_dict(db, meeting_id)
        speaker_aware_transcript = build_speaker_aware_transcript(transcript_text, segments_to_save, speaker_map)
        system_prompt, user_prompt = build_structured_summary_prompts(
            speaker_aware_transcript,
            custom_instruction,
            language,
            nlp_metadata,
        )
    else:
        system_prompt, user_prompt = build_structured_summary_translation_prompts(
            _serialize_summary_payload(source_summary_payload),
            language,
        )

    raw_response = None
    errors: List[str] = []
    summary_error_type = ""
    retry_after_seconds: Optional[float] = None
    if router.enabled:
        try:
            raw_response = router.structured_completion(system_prompt, user_prompt)
            if not raw_response:
                raise ValueError(router.last_error or "Router LLM returned empty response")
        except Exception as exc:
            summary_error_message = f"Router LLM summarization failed: {exc}"
            errors.append(summary_error_message)
            raw_response = None
    else:
        summary_error_message = router.last_error or "Router LLM is not configured"
        errors.append(summary_error_message)

    if not raw_response and router.last_error:
        summary_error_message = router.last_error
        summary_error_type = router.last_error_type or "router_error"
        retry_after_seconds = router.last_retry_after_seconds

    if not raw_response:
        google_key = os.getenv("GOOGLE_API_KEY")
        if google_key:
            try:
                from src.providers.google_llm import GoogleLLMAdapter
                google = GoogleLLMAdapter(api_key=google_key)
                if google.client and source_summary_payload is None:
                    raw_response = google.chat_completion(system_prompt, user_prompt)
                    if raw_response:
                        ai_provider_name = "google-gemini"
                        if errors:
                            errors.pop()
            except Exception as exc:
                fallback_error = f"Google Gemini fallback also failed: {exc}"
                errors.append(fallback_error)

    if raw_response:
        try:
            structured_payload = _extract_json_object(raw_response)
            summary_payload = _normalize_analysis_payload(structured_payload)
            if source_summary_payload is not None:
                _validate_translation_shape(source_summary_payload, summary_payload)
            summary_status = "COMPLETED"
        except Exception as parse_error:
            summary_error_message = f"Failed to parse LLM response: {parse_error}"
            summary_error_type = "translation_shape_mismatch" if source_summary_payload is not None else "parse_error"
            errors.append(summary_error_message)

    summary_data = _build_summary_data(
        language=language,
        summary_payload=summary_payload,
        summary_status=summary_status,
        summary_error_message=summary_error_message,
        ai_provider_name=ai_provider_name,
        model_name=router.model if ai_provider_name == "router" else ai_provider_name,
        generation_group_id=generation_group_id,
        summary_kind=summary_kind,
        source_summary_id=source_summary_id,
    )
    summary_db = _upsert_summary_row(db, meeting_id=meeting_id, language=language, summary_data=summary_data)
    if persist_action_items_to_db:
        db.query(models.ActionItem).filter(models.ActionItem.summary_id == summary_db.id).delete(synchronize_session=False)
        db.flush()

    if summary_status == "COMPLETED" and persist_action_items_to_db:
        for ai in summary_payload.action_items:
            owner = (ai.owner or "").strip() or None
            deadline = (ai.deadline or "").strip() or None
            resolved_assignees = []
            for owner_part in _split_ai_owner_text(owner or ""):
                participant = db.query(models.MeetingParticipant).filter(
                    models.MeetingParticipant.meeting_id == meeting_id,
                    or_(
                        models.MeetingParticipant.name.ilike(f"%{owner_part}%"),
                        models.MeetingParticipant.email.ilike(f"%{owner_part}%"),
                    )
                ).first()
                if participant and (participant.email or (participant.user and participant.user.email)):
                    resolved_assignees.append({
                        "user_id": participant.user_id,
                        "email": participant.email or participant.user.email,
                        "display_name": participant.name or owner_part,
                    })

            create_action_item(db, {
                "meeting_id": meeting_id,
                "summary_id": summary_db.id,
                "title": ai.task,
                "description": None,
                "assignees": resolved_assignees,
                "assigned_email": resolved_assignees[0]["email"] if resolved_assignees else None,
                "due_date": _try_parse_date(deadline),
                "status": "PENDING",
                "priority": "MEDIUM",
            }, created_by=current_user.id)

    return {
        "summary_db": summary_db,
        "summary_status": summary_status,
        "summary_payload": summary_payload,
        "summary_error_message": summary_error_message,
        "summary_broadcast_payload": format_summary_payload(summary_db),
        "errors": errors,
        "summary_error_type": summary_error_type,
        "retry_after_seconds": retry_after_seconds,
    }


# ─── Transcript Finalization ────────────────────────────────────────────────


def _is_wav_16k_mono(path: str) -> bool:
    """Check if a WAV file is already 16kHz mono PCM."""
    if not path.lower().endswith(".wav"):
        return False
    try:
        import wave
        with wave.open(path, "rb") as w:
            return w.getframerate() == 16000 and w.getnchannels() == 1
    except Exception:
        return False


def _normalize_chunks_for_concat(chunk_files: list[str], temp_dir: str) -> list[str]:
    """Normalize each chunk to WAV 16kHz mono for safe concatenation."""
    normalized = []
    for cf in chunk_files:
        if _is_wav_16k_mono(cf):
            normalized.append(cf)
        else:
            base = os.path.splitext(os.path.basename(cf))[0]
            out_path = os.path.join(temp_dir, f"{base}_norm.wav")
            try:
                subprocess.run(
                    ["ffmpeg", "-y", "-i", cf, "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", out_path],
                    capture_output=True, timeout=60, check=True,
                )
                normalized.append(out_path)
            except Exception as e:
                logger.warning("Failed to normalize chunk %s: %s", cf, e)
    return normalized


async def _process_translation_queue(
    *,
    meeting_id: str,
    canonical_language: str,
    canonical_summary_id: str,
    generation_group_id: str,
    current_user_id: str,
    db_bind: Any = None,
) -> None:
    from src.api.core.meeting_operations import meeting_room_manager

    lock = _get_translation_lock(meeting_id)
    async with lock:
        if _latest_translation_batches.get(meeting_id) != generation_group_id:
            return

        if db_bind is not None:
            background_session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=db_bind,
                expire_on_commit=False,
            )
            session = background_session_factory()
        else:
            session = SessionLocal()
        try:
            current_user = session.query(models.User).filter(models.User.id == current_user_id).first()
            canonical_summary = session.query(models.MeetingSummary).filter(models.MeetingSummary.id == canonical_summary_id).first()
            if not current_user or not canonical_summary:
                return

            canonical_payload = _deserialize_summary_payload(canonical_summary)
            for language in ordered_summary_languages(canonical_language):
                if language == canonical_language:
                    continue
                if _latest_translation_batches.get(meeting_id) != generation_group_id:
                    return

                processing_data = _build_summary_data(
                    language=language,
                    summary_payload=_empty_summary_payload(),
                    summary_status="PROCESSING",
                    summary_error_message="Đang dịch từ bản gốc.",
                    ai_provider_name=canonical_summary.ai_provider or "router",
                    model_name=canonical_summary.model_name or "router",
                    generation_group_id=generation_group_id,
                    summary_kind="translation",
                    source_summary_id=canonical_summary.id,
                )
                _upsert_summary_row(session, meeting_id=meeting_id, language=language, summary_data=processing_data)
                session.commit()
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {
                        "type": "ai.notes.started",
                        "meeting_id": meeting_id,
                        "summary_status": "PROCESSING",
                        "language": language,
                        "generation_group_id": generation_group_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )

                for attempt in range(1, 4):
                    if _latest_translation_batches.get(meeting_id) != generation_group_id:
                        return
                    result = _generate_and_persist_summary_for_language(
                        meeting_id=meeting_id,
                        db=session,
                        current_user=current_user,
                        transcript_text="",
                        segments_to_save=[],
                        language=language,
                        prompts={},
                        nlp_metadata=None,
                        persist_action_items_to_db=False,
                        generation_group_id=generation_group_id,
                        summary_kind="translation",
                        source_summary_id=canonical_summary.id,
                        source_summary_payload=canonical_payload,
                    )
                    session.commit()
                    if result["summary_status"] == "COMPLETED":
                        await meeting_room_manager.broadcast(
                            meeting_id,
                            {
                                "type": "ai.notes.completed",
                                "meeting_id": meeting_id,
                                "summary_status": result["summary_status"],
                                "language": language,
                                "summary": result["summary_broadcast_payload"],
                                "error": "",
                                "error_type": None,
                                "generation_group_id": generation_group_id,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            },
                        )
                        break
                    if result["summary_error_type"] != "rate_limit" or attempt >= 3:
                        await meeting_room_manager.broadcast(
                            meeting_id,
                            {
                                "type": "ai.notes.failed",
                                "meeting_id": meeting_id,
                                "summary_status": result["summary_status"],
                                "language": language,
                                "summary": result["summary_broadcast_payload"],
                                "error": result["summary_error_message"],
                                "error_type": result["summary_error_type"] or None,
                                "generation_group_id": generation_group_id,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            },
                        )
                        break
                    retry_after = result["retry_after_seconds"] or 1.0
                    await asyncio.sleep(max(retry_after, 0.5) * attempt)
        finally:
            session.close()


def _transcribe_deferred_chunks(
    meeting_id: str,
    stt_provider_name: str = "viwhisper",
    language: str = "auto",
) -> Dict[str, Any]:
    """Transcribe all stored audio chunks for a deferred-mode meeting.

    Reads chunk files from the audio upload directory, transcribes each using
    the configured STT provider, and returns merged text + segments.
    """
    from src.api.core.stt_support import get_stt_provider, ensure_audio_upload_dir

    audio_dir = os.path.join(ensure_audio_upload_dir(), meeting_id)
    if not os.path.isdir(audio_dir):
        return {"transcript": "", "segments": [], "language": language}

    # Find and sort chunk files
    chunk_files = sorted(glob.glob(os.path.join(audio_dir, "chunk_*.wav")), key=_deferred_chunk_sort_key)
    if not chunk_files:
        # Also try other formats
        for ext in ("*.webm", "*.mp3", "*.mp4"):
            chunk_files.extend(glob.glob(os.path.join(audio_dir, f"chunk_{ext}")))
        chunk_files.sort(key=_deferred_chunk_sort_key)

    if not chunk_files:
        logger.info(f"No deferred chunks found for meeting {meeting_id}")
        return {"transcript": "", "segments": [], "language": language}

    logger.info(f"Processing {len(chunk_files)} deferred chunks for meeting {meeting_id} using {stt_provider_name}")
    provider = get_stt_provider(stt_provider_name)

    all_text_parts: List[str] = []
    all_segments: List[Dict[str, Any]] = []
    time_offset_ms = 0
    detected_language = language

    processed_count = 0
    skipped_count = 0
    for chunk_path in chunk_files:
        try:
            if os.path.getsize(chunk_path) < MIN_DEFERRED_CHUNK_BYTES:
                skipped_count += 1
                logger.info("Skipping tiny deferred chunk %s", os.path.basename(chunk_path))
                continue
            result = provider.transcribe(chunk_path)
            if not result or not result.get("text", "").strip():
                skipped_count += 1
                continue

            chunk_text = result["text"].strip()
            all_text_parts.append(chunk_text)
            processed_count += 1

            for seg in result.get("segments", []):
                seg_start = float(seg.get("start", seg.get("start_time", 0)) or 0)
                seg_end = float(seg.get("end", seg.get("end_time", 0)) or 0)
                all_segments.append({
                    "speaker": seg.get("speaker", "Speaker_01"),
                    "speaker_label": seg.get("speaker_label", normalize_speaker_label(seg.get("speaker", "Speaker_01"))),
                    "speaker_display_name": seg.get("speaker_display_name", seg.get("speaker", "Speaker_01")),
                    "start": seg_start + time_offset_ms / 1000,
                    "end": seg_end + time_offset_ms / 1000,
                    "text": seg.get("text", ""),
                    "language": seg.get("language") or result.get("language") or language,
                    "confidence": seg.get("confidence") or seg.get("confidence_score"),
                })

            # Estimate offset for next chunk
            if result.get("segments"):
                last_seg = result["segments"][-1]
                time_offset_ms += int(float(last_seg.get("end", last_seg.get("end_time", 0)) or 0) * 1000)
            else:
                # Estimate from text length if no segments
                time_offset_ms += len(chunk_text) * 80  # rough estimate

            if result.get("language") and result["language"] != "auto":
                detected_language = result["language"]

            logger.info(f"Deferred chunk transcribed: {os.path.basename(chunk_path)}, text_len={len(chunk_text)}")
        except Exception as exc:
            logger.error(f"Failed to transcribe deferred chunk {chunk_path}: {exc}")
            continue

    full_text = "\n".join(all_text_parts)
    logger.info(f"Deferred transcription complete for meeting {meeting_id}: {len(all_segments)} segments, {len(full_text)} chars")
    return {
        "transcript": full_text,
        "segments": all_segments,
        "language": detected_language,
        "stored_chunk_count": len(chunk_files),
        "processed_chunk_count": processed_count,
        "skipped_chunk_count": skipped_count,
    }


async def finalize_meeting_transcript(
    meeting_id: str,
    db: Session,
    current_user: models.User,
    body: Optional[Dict[str, Any]] = None,
    background_tasks: Optional[BackgroundTasks] = None,
):
    """Save transcript from request or drafts, then summarize and persist stable meeting artifacts."""
    from src.api.core.admin_runtime import get_admin_prompts_snapshot
    from src.api.core.meeting_operations import meeting_room_manager, require_meeting_room_access
    from src.api.crud import (
        create_audio_file,
        create_transcript,
        create_transcript_segments_bulk,
        update_meeting,
    )

    prompts = get_admin_prompts_snapshot(db)
    body = body or {}
    full_text = body.get("transcript", "")
    segments = body.get("segments", [])
    req_language = body.get("language", "")
    regenerate = bool(body.get("regenerate", False))
    full_regenerate = bool(body.get("full_regenerate", True))
    generate_summary = bool(body.get("generate_summary", True))
    generate_action_items = bool(body.get("generate_action_items", False))
    errors: List[str] = []

    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    require_meeting_room_access(db, current_user, meeting)
    original_meeting_status = meeting.status
    meeting_settings = get_meeting_settings(meeting)
    stt_provider_from_settings = normalize_stt_provider(
        body.get("stt_provider") or meeting_settings.get("sttProvider") or os.getenv("STT_PROVIDER", "deepgram")
    )
    transcription_mode = normalize_transcription_mode(
        stt_provider_from_settings,
        body.get("transcription_mode") or meeting_settings.get("transcriptionMode") or "realtime",
    )
    updated_settings = merge_meeting_settings(
        getattr(meeting, "settings", None),
        settings_updates={
            "sttProvider": stt_provider_from_settings,
            "transcriptionMode": transcription_mode,
            "language": req_language or meeting_settings.get("language") or getattr(current_user, "language", None) or "vi",
        },
        runtime_updates={
            "provider": stt_provider_from_settings,
            "mode": transcription_mode,
            "status": "finalizing",
            "finalization_status": "processing",
            "last_error": None,
        },
    )
    meeting = update_meeting(db, meeting_id, {"settings": updated_settings})
    deferred_metrics = {
        "stored_chunk_count": int((meeting.settings or {}).get("transcription_runtime", {}).get("stored_chunk_count") or 0),
        "processed_chunk_count": 0,
    }

    # Deferred mode: transcribe stored audio chunks if no transcript provided
    if transcription_mode == "deferred" and not full_text.strip():
        logger.info(f"Meeting {meeting_id} is in deferred mode, transcribing stored chunks...")
        try:
            deferred_result = _transcribe_deferred_chunks(
                meeting_id=meeting_id,
                stt_provider_name=stt_provider_from_settings,
                language=req_language or "auto",
            )
            deferred_metrics = {
                "stored_chunk_count": deferred_result.get("stored_chunk_count", deferred_metrics["stored_chunk_count"]),
                "processed_chunk_count": deferred_result.get("processed_chunk_count", 0),
            }
            if deferred_result.get("transcript", "").strip():
                full_text = deferred_result["transcript"]
                segments = deferred_result.get("segments", [])
                logger.info(f"Deferred transcription produced {len(full_text)} chars, {len(segments)} segments")
        except Exception as exc:
            logger.error(f"Deferred transcription failed for meeting {meeting_id}: {exc}")
            errors.append(f"Deferred transcription failed: {str(exc)}")

    draft_payload = build_transcript_from_drafts(db, meeting_id)
    has_transcript_draft = bool(
        str(draft_payload.get("transcript") or "").strip()
        or bool(draft_payload.get("segments"))
    )
    if not isinstance(full_text, str) or not full_text.strip():
        full_text = draft_payload["transcript"]
    if not segments:
        segments = draft_payload["segments"]
    transcript_language_hint = draft_payload["language"] if draft_payload["language"] != "auto" else None
    language = resolve_meeting_summary_language(
        requested_language=req_language,
        current_user=current_user,
        transcript_language=transcript_language_hint,
    )

    if not isinstance(full_text, str) or not full_text.strip():
        runtime_settings = merge_meeting_settings(
            getattr(meeting, "settings", None),
            runtime_updates={
                "status": "completed",
                "finalization_status": "completed",
                "processed_chunk_count": deferred_metrics.get("processed_chunk_count", 0),
                "stored_chunk_count": deferred_metrics.get("stored_chunk_count", 0),
            },
        )
        update_meeting(db, meeting_id, {"settings": runtime_settings, "status": "completed"})
        return {
            "meeting_id": meeting_id,
            "transcript_status": "EMPTY",
            "summary_status": "EMPTY",
            "has_transcript_draft": has_transcript_draft,
            "summary": schemas.MeetingAnalysisOutput(
                meeting_summary="",
                key_points=[],
                decisions=[],
                action_items=[],
            ),
            "nlp_metadata": None,
            "post_processing_applied": False,
            "quality_status": "degraded",
            "correction_count": 0,
            "errors": errors,
            "canonical_summary_language": language,
            "translation_queue_started": False,
            "generation_group_id": None,
            "summary_error_type": None,
            "summary_error_message": None,
        }

    provider_name = stt_provider_from_settings or os.getenv("STT_PROVIDER", "deepgram")
    transcript_artifacts = build_transcript_artifacts(
        text=full_text,
        segments=segments if isinstance(segments, list) else [],
        language=language,
        provider_name=provider_name,
    )
    full_text = transcript_artifacts["cleaned_text"]
    segments = transcript_artifacts["cleaned_segments"]
    raw_text = transcript_artifacts["raw_text"]
    nlp_metadata = transcript_artifacts["nlp_metadata"]
    post_processed = transcript_artifacts["post_processed"]
    quality_metadata = transcript_artifacts["quality_metadata"]

    try:
        if meeting.status == "upcoming":
            meeting = update_meeting(
                db,
                meeting_id,
                {
                    "status": "live",
                    "actual_start": meeting.actual_start or datetime.now(timezone.utc),
                    "scheduled_start": meeting.scheduled_start or datetime.now(timezone.utc),
                    "scheduled_end": meeting.scheduled_end or (datetime.now(timezone.utc) + timedelta(hours=1)),
                },
            )
        if meeting.status in {"live", "queued", "failed"}:
            meeting = update_meeting(db, meeting_id, {"status": "processing"})
        elif meeting.status == "canceled":
            raise HTTPException(status_code=400, detail="Cannot finalize a canceled meeting")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    db_transcript = db.query(models.Transcript).filter(
        models.Transcript.meeting_id == meeting_id,
    ).order_by(models.Transcript.created_at.desc()).first()
    segments_to_save = segments if isinstance(segments, list) else []
    if db_transcript:
        if not segments_to_save and db_transcript.segments:
            segments_to_save = [
                {
                    "speaker": segment.speaker_label,
                    "start": float(segment.start_time or 0),
                    "end": float(segment.end_time or 0),
                    "text": segment.text,
                    "language": getattr(segment, "language", None) or language,
                    "confidence": float(segment.confidence_score) if segment.confidence_score is not None else None,
                }
                for segment in db_transcript.segments
                if (segment.text or "").strip()
            ]
        db_transcript.content = full_text
        db_transcript.raw_content = raw_text
        db_transcript.language = language
        db_transcript.word_count = len(full_text.split())
        db_transcript.processing_status = "COMPLETED"
        db_transcript.stt_provider = provider_name
        db_transcript.post_processed = post_processed
        db_transcript.nlp_metadata = nlp_metadata
        db_transcript.quality_metadata = quality_metadata
        if segments_to_save:
            db.query(models.TranscriptSegment).filter(
                models.TranscriptSegment.transcript_id == db_transcript.id,
            ).delete(synchronize_session=False)
            db.flush()
    else:
        db_transcript = create_transcript(db, {
            "meeting_id": meeting_id,
            "content": full_text,
            "raw_content": raw_text,
            "language": language,
            "word_count": len(full_text.split()),
            "processing_status": "COMPLETED",
            "stt_provider": provider_name,
            "post_processed": post_processed,
            "nlp_metadata": nlp_metadata,
            "quality_metadata": quality_metadata,
        })

    if segments_to_save:
        segments_data = []
        for seg in segments_to_save:
            normalized = normalize_segment_payload(seg, language)
            if not normalized["text"]:
                continue
            segments_data.append({
                "transcript_id": db_transcript.id,
                **normalized,
            })
        if segments_data:
            create_transcript_segments_bulk(db, segments_data)

    db.commit()

    audio_file_id = None
    try:
        from src.api.core.meeting_operations import AUDIO_UPLOAD_DIR, LEGACY_AUDIO_UPLOAD_DIR

        canonical_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting_id)
        legacy_dir = os.path.join(LEGACY_AUDIO_UPLOAD_DIR, meeting_id)
        perm_dir = canonical_dir
        if not os.path.isdir(perm_dir) and os.path.isdir(legacy_dir):
            logger.info(f"Using legacy audio directory for meeting {meeting_id}: {legacy_dir}")
            perm_dir = legacy_dir
        if os.path.isdir(perm_dir):
            chunk_files = sorted(glob.glob(os.path.join(perm_dir, "chunk_*")) + glob.glob(os.path.join(perm_dir, "stream_*.wav")))
            if chunk_files:
                logger.info(f"Concatenating {len(chunk_files)} audio chunks for meeting {meeting_id}")
                normalized_files = _normalize_chunks_for_concat(chunk_files, perm_dir)
                files_to_concat = normalized_files if normalized_files else chunk_files
                try:
                    concat_list_path = os.path.join(perm_dir, "concat.txt")
                    with open(concat_list_path, "w") as f:
                        for cf in files_to_concat:
                            f.write(f"file '{cf}'\n")

                    output_filename = f"recording_{meeting_id}.wav"
                    output_path = os.path.join(perm_dir, output_filename)
                    subprocess.run(
                        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list_path,
                         "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path],
                        capture_output=True, timeout=120, check=True,
                    )
                    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                        file_size = os.path.getsize(output_path)
                        audio_record = create_audio_file(db, {
                            "meeting_id": meeting_id,
                            "filename": output_filename,
                            "original_filename": "meeting_recording.wav",
                            "file_path": output_path,
                            "file_size": file_size,
                            "format": "WAV",
                            "sample_rate": 16000,
                            "channels": 1,
                            "upload_status": "PROCESSED",
                        })
                        audio_file_id = audio_record.id
                        audio_stream_url = f"/api/audio-files/{audio_file_id}/stream"
                        update_meeting(db, meeting_id, {
                            "audio_url": audio_stream_url,
                            "recording_url": audio_stream_url,
                        })
                        db.commit()
                        logger.info(f"Audio recording saved: {output_path} ({file_size} bytes)")

                        for cf in chunk_files:
                            try:
                                os.unlink(cf)
                            except OSError:
                                pass
                        try:
                            os.unlink(concat_list_path)
                        except OSError:
                            pass
                    else:
                        logger.warning(f"ffmpeg concat produced empty output for meeting {meeting_id}")
                finally:
                    # Clean up temp normalized files (not the originals)
                    norm_set = set(normalized_files)
                    for nf in norm_set:
                        if nf not in chunk_files:
                            try:
                                os.unlink(nf)
                            except OSError:
                                pass
            else:
                logger.info(f"No audio chunks found for meeting {meeting_id}")
        else:
            logger.info(f"No audio directory found for meeting {meeting_id}")
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg concat failed for meeting {meeting_id}: {e.stderr}")
    except Exception as e:
        logger.error(f"Audio concatenation failed for meeting {meeting_id}: {e}")

    if not generate_summary:
        try:
            runtime_settings = merge_meeting_settings(
                getattr(meeting, "settings", None),
                runtime_updates={
                    "status": "completed",
                    "finalization_status": "completed",
                    "processed_chunk_count": deferred_metrics.get("processed_chunk_count", 0),
                    "stored_chunk_count": deferred_metrics.get("stored_chunk_count", 0),
                },
            )
            update_meeting(db, meeting_id, {"status": "completed", "settings": runtime_settings})
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        db.commit()
        return {
            "meeting_id": meeting_id,
            "transcript_status": "COMPLETED",
            "summary_status": "SKIPPED",
            "has_transcript_draft": has_transcript_draft,
            "summary": None,
            "nlp_metadata": nlp_metadata,
            "post_processing_applied": post_processed,
            "quality_status": quality_metadata.get("quality_status"),
            "correction_count": quality_metadata.get("correction_count"),
            "errors": errors,
            "default_summary_language": language,
            "canonical_summary_language": language,
            "available_summary_languages": [],
            "summary_generation_state": {},
            "translation_queue_started": False,
            "generation_group_id": None,
            "summary_error_type": None,
            "summary_error_message": None,
        }
    await meeting_room_manager.broadcast(
        meeting_id,
        {
            "type": "ai.notes.started",
            "meeting_id": meeting_id,
            "summary_status": "PROCESSING",
            "language": language,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    generation_group_id = str(uuid.uuid4())
    primary_summary_result = _generate_and_persist_summary_for_language(
        meeting_id=meeting_id,
        db=db,
        current_user=current_user,
        transcript_text=full_text,
        segments_to_save=segments_to_save,
        language=language,
        prompts=prompts,
        nlp_metadata=nlp_metadata,
        persist_action_items_to_db=generate_action_items,
        generation_group_id=generation_group_id,
        summary_kind="canonical",
        source_summary_id=None,
        source_summary_payload=None,
    )
    summary_db = primary_summary_result["summary_db"]
    summary_status = primary_summary_result["summary_status"]
    summary_payload = primary_summary_result["summary_payload"]
    summary_error_message = primary_summary_result["summary_error_message"]
    summary_error_type = primary_summary_result["summary_error_type"]
    errors.extend(primary_summary_result["errors"])

    final_meeting_status = "completed" if summary_status == "COMPLETED" else "failed" if regenerate else "completed"
    if regenerate and original_meeting_status == "completed" and summary_status != "COMPLETED":
        final_meeting_status = "completed"
    try:
        runtime_settings = merge_meeting_settings(
            getattr(meeting, "settings", None),
            runtime_updates={
                "status": "completed",
                "finalization_status": "completed",
                "processed_chunk_count": deferred_metrics.get("processed_chunk_count", 0),
                "stored_chunk_count": deferred_metrics.get("stored_chunk_count", 0),
                "last_error": summary_error_message if summary_status != "COMPLETED" else None,
            },
        )
        update_meeting(db, meeting_id, {"status": final_meeting_status, "settings": runtime_settings})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()

    translation_queue_started = False
    if summary_status == "COMPLETED" and full_regenerate:
        _latest_translation_batches[meeting_id] = generation_group_id
        for summary_language in ordered_summary_languages(language):
            if summary_language == language:
                continue
            processing_data = _build_summary_data(
                language=summary_language,
                summary_payload=_empty_summary_payload(),
                summary_status="PROCESSING",
                summary_error_message="Đang dịch từ bản gốc.",
                ai_provider_name=summary_db.ai_provider or "router",
                model_name=summary_db.model_name or "router",
                generation_group_id=generation_group_id,
                summary_kind="translation",
                source_summary_id=summary_db.id,
            )
            _upsert_summary_row(db, meeting_id=meeting_id, language=summary_language, summary_data=processing_data)
        db.commit()
        translation_queue_started = True
        if background_tasks is not None:
                background_tasks.add_task(
                    _process_translation_queue,
                    meeting_id=meeting_id,
                    canonical_language=language,
                    canonical_summary_id=summary_db.id,
                    generation_group_id=generation_group_id,
                    current_user_id=current_user.id,
                    db_bind=db.get_bind(),
                )
        else:
            asyncio.create_task(
                _process_translation_queue(
                    meeting_id=meeting_id,
                    canonical_language=language,
                    canonical_summary_id=summary_db.id,
                    generation_group_id=generation_group_id,
                    current_user_id=current_user.id,
                    db_bind=db.get_bind(),
                )
            )

    available_summaries = db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting_id).all()
    summary_generation_state = build_summary_generation_state(available_summaries)
    summary_broadcast_payload = primary_summary_result["summary_broadcast_payload"] or {
        "meeting_summary": summary_payload.meeting_summary,
        "key_points": summary_payload.key_points,
        "decisions": summary_payload.decisions,
        "action_items": [item.model_dump() for item in summary_payload.action_items],
        "risks": summary_payload.risks,
        "open_questions": summary_payload.open_questions,
        "timeline_highlights": summary_payload.timeline_highlights,
        "speaker_summaries": summary_payload.speaker_summaries,
        "processing_status": summary_status,
        "language": language,
    }
    ai_event_type = "ai.notes.completed" if summary_status == "COMPLETED" else "ai.notes.failed"
    await meeting_room_manager.broadcast(
        meeting_id,
        {
            "type": ai_event_type,
            "meeting_id": meeting_id,
            "summary_status": summary_status,
            "language": language,
            "summary": summary_broadcast_payload,
            "error": summary_error_message if summary_status != "COMPLETED" else "",
            "error_type": summary_error_type or None,
            "generation_group_id": generation_group_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

    return {
        "meeting_id": meeting_id,
        "transcript_status": "COMPLETED",
        "summary_status": summary_status,
        "has_transcript_draft": has_transcript_draft,
        "summary": summary_payload,
        "nlp_metadata": nlp_metadata,
        "post_processing_applied": post_processed,
        "quality_status": quality_metadata.get("quality_status"),
        "correction_count": quality_metadata.get("correction_count"),
        "errors": errors,
        "default_summary_language": language,
        "canonical_summary_language": language,
        "available_summary_languages": [summary.language for summary in available_summaries if summary.processing_status == "COMPLETED"],
        "summary_generation_state": summary_generation_state,
        "translation_queue_started": translation_queue_started,
        "generation_group_id": generation_group_id,
        "summary_error_type": summary_error_type or None,
        "summary_error_message": summary_error_message or None,
    }
