from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid
from .. import models


def get_meeting_by_id(db: Session, meeting_id: str) -> Optional[models.Meeting]:
    return db.query(models.Meeting).options(
        joinedload(models.Meeting.organization),
        joinedload(models.Meeting.group).joinedload(models.Group.memberships),
        joinedload(models.Meeting.created_by_user),
        joinedload(models.Meeting.participants),
        joinedload(models.Meeting.audio_files),
        joinedload(models.Meeting.transcripts),
        joinedload(models.Meeting.summaries),
        joinedload(models.Meeting.action_items)
    ).filter(models.Meeting.id == meeting_id).first()


def get_meetings(
    db: Session,
    organization_id: Optional[str] = None,
    group_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.Meeting]:
    query = db.query(models.Meeting).options(
        joinedload(models.Meeting.organization),
        joinedload(models.Meeting.group),
        joinedload(models.Meeting.created_by_user)
    )
    
    if organization_id:
        query = query.filter(models.Meeting.organization_id == organization_id)

    if group_id:
        query = query.filter(models.Meeting.group_id == group_id)

    if status:
        query = query.filter(models.Meeting.status == status)
    
    return query.order_by(models.Meeting.created_at.desc()).offset(skip).limit(limit).all()


def create_meeting(db: Session, meeting_data: dict, created_by: str) -> models.Meeting:
    db_meeting = models.Meeting(
        id=meeting_data.get("id", str(uuid.uuid4())),
        organization_id=meeting_data.get("organization_id"),
        group_id=meeting_data.get("group_id"),
        title=meeting_data["title"],
        description=meeting_data.get("description"),
        scheduled_start=meeting_data.get("scheduled_start"),
        scheduled_end=meeting_data.get("scheduled_end"),
        duration=meeting_data.get("duration", 0),
        location=meeting_data.get("location"),
        meeting_type=meeting_data.get("meeting_type", "MEETING"),
        status=meeting_data.get("status", "upcoming"),
        code=meeting_data.get("code"),
        recording_url=meeting_data.get("recording_url"),
        transcript_url=meeting_data.get("transcript_url"),
        audio_url=meeting_data.get("audio_url"),
        is_pinned=meeting_data.get("is_pinned", False),
        created_by=created_by,
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def update_meeting(db: Session, meeting_id: str, updates: dict) -> Optional[models.Meeting]:
    db_meeting = get_meeting_by_id(db, meeting_id)
    if not db_meeting:
        return None
    
    for key, value in updates.items():
        if hasattr(db_meeting, key):
            setattr(db_meeting, key, value)
    
    db.commit()
    db.refresh(db_meeting)
    return db_meeting


def delete_meeting(db: Session, meeting_id: str) -> bool:
    db_meeting = get_meeting_by_id(db, meeting_id)
    if not db_meeting:
        return False
    
    db.delete(db_meeting)
    db.commit()
    return True


def add_meeting_participant(
    db: Session, 
    meeting_id: str, 
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    name: Optional[str] = None,
    speaker_label: Optional[str] = None,
    role: str = "PARTICIPANT"
) -> Optional[models.MeetingParticipant]:
    # Check if participant already exists
    if user_id:
        existing = db.query(models.MeetingParticipant).filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.user_id == user_id
        ).first()
        if existing:
            return existing
    elif email:
        existing = db.query(models.MeetingParticipant).filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.email == email
        ).first()
        if existing:
            return existing
    
    db_participant = models.MeetingParticipant(
        id=str(uuid.uuid4()),
        meeting_id=meeting_id,
        user_id=user_id,
        email=email,
        name=name,
        speaker_label=speaker_label,
        role=role,
    )
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    return db_participant


def remove_meeting_participant(db: Session, meeting_id: str, user_id: Optional[str] = None, email: Optional[str] = None) -> bool:
    query = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == meeting_id
    )
    
    if user_id:
        query = query.filter(models.MeetingParticipant.user_id == user_id)
    elif email:
        query = query.filter(models.MeetingParticipant.email == email)
    else:
        return False
    
    db_participant = query.first()
    if not db_participant:
        return False
    
    db.delete(db_participant)
    db.commit()
    return True


def update_meeting_status(db: Session, meeting_id: str, status: str) -> Optional[models.Meeting]:
    return update_meeting(db, meeting_id, {"status": status})
