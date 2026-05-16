from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid
from .. import models


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
        language=segment_data.get("language", "auto"),
        confidence_score=segment_data.get("confidence_score"),
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
            language=segment_data.get("language", "auto"),
            confidence_score=segment_data.get("confidence_score"),
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
        joinedload(models.ActionItem.created_by_user)
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
        joinedload(models.ActionItem.created_by_user)
    )
    
    if meeting_id:
        query = query.filter(models.ActionItem.meeting_id == meeting_id)
    
    if assigned_to:
        query = query.filter(models.ActionItem.assigned_to == assigned_to)
    
    if status:
        query = query.filter(models.ActionItem.status == status)
    
    return query.order_by(models.ActionItem.created_at.desc()).offset(skip).limit(limit).all()


def create_action_item(db: Session, action_data: dict, created_by: str) -> models.ActionItem:
    db_action = models.ActionItem(
        id=action_data.get("id", str(uuid.uuid4())),
        meeting_id=action_data.get("meeting_id"),
        summary_id=action_data.get("summary_id"),
        title=action_data["title"],
        description=action_data.get("description"),
        assigned_to=action_data.get("assigned_to"),
        assigned_email=action_data.get("assigned_email"),
        status=action_data.get("status", "PENDING"),
        priority=action_data.get("priority", "MEDIUM"),
        due_date=action_data.get("due_date"),
        created_by=created_by,
    )
    db.add(db_action)
    db.commit()
    db.refresh(db_action)
    return db_action


def update_action_item(db: Session, action_id: str, updates: dict) -> Optional[models.ActionItem]:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        return None
    
    # Handle status change to COMPLETED
    if updates.get("status") == "COMPLETED" and db_action.status != "COMPLETED":
        from datetime import datetime
        updates["completed_at"] = datetime.now()
    
    for key, value in updates.items():
        if hasattr(db_action, key):
            setattr(db_action, key, value)
    
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
