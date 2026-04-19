from sqlalchemy.orm import Session, joinedload
from . import models, auth
import uuid

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user_data: dict):
    hashed_password = auth.get_password_hash(user_data["password"])
    db_user = models.User(
        username=user_data["username"],
        email=user_data["email"],
        hashed_password=hashed_password,
        role=user_data.get("role", "staff"),
        full_name=user_data.get("full_name")
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_meetings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Meeting).offset(skip).limit(limit).all()

def get_meeting(db: Session, meeting_id: str):
    return db.query(models.Meeting)\
        .options(joinedload(models.Meeting.transcript))\
        .options(joinedload(models.Meeting.summary))\
        .options(joinedload(models.Meeting.action_items))\
        .filter(models.Meeting.id == meeting_id).first()

def create_meeting(db: Session, meeting_data: dict, creator_id: str = None):
    db_meeting = models.Meeting(
        id=meeting_data.get("id", str(uuid.uuid4())),
        title=meeting_data["title"],
        description=meeting_data.get("description"),
        date=meeting_data.get("date"),
        duration=meeting_data.get("duration", "pending"),
        speaker_count=meeting_data.get("speaker_count", 0),
        status=meeting_data.get("status", "queued"),
        llm_source=meeting_data.get("llm_source", "none"),
        creator_id=creator_id
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def update_meeting(db: Session, meeting_id: str, updates: dict):
    db_meeting = get_meeting(db, meeting_id)
    if db_meeting:
        for key, value in updates.items():
            if key == "summary" and value:
                # Handle summary update separately if needed
                create_or_update_summary(db, meeting_id, value)
                continue
            if key == "action_items" and value:
                update_action_items(db, meeting_id, value)
                continue
            if hasattr(db_meeting, key):
                setattr(db_meeting, key, value)
        db.commit()
        db.refresh(db_meeting)
    return db_meeting

def create_or_update_summary(db: Session, meeting_id: str, summary_data: dict):
    db_summary = db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting_id).first()
    if not db_summary:
        db_summary = models.MeetingSummary(meeting_id=meeting_id)
        db.add(db_summary)
    
    db_summary.summary_text = summary_data.get("meeting_summary")
    db_summary.key_points = summary_data.get("key_points")
    db_summary.decisions = summary_data.get("decisions")
    db.commit()
    return db_summary

def update_action_items(db: Session, meeting_id: str, action_items: list):
    # For simplicity, replace all action items
    db.query(models.ActionItem).filter(models.ActionItem.meeting_id == meeting_id).delete()
    for item in action_items:
        db_item = models.ActionItem(
            meeting_id=meeting_id,
            task=item["task"],
            owner=item.get("owner"),
            deadline=item.get("deadline"),
            status=item.get("status", "pending")
        )
        db.add(db_item)
    db.commit()

def create_ai_quality_metric(db: Session, meeting_id: str, metrics: dict):
    db_metrics = models.AIQualityMetric(
        meeting_id=meeting_id,
        bleu_score=metrics.get("bleu", 0.0),
        rouge_l_score=metrics.get("rouge_l", 0.0),
        wer_score=metrics.get("wer", 0.0),
        der_score=metrics.get("der", 0.0),
        confidence_score=metrics.get("confidence", 0.0),
        latency_sec=metrics.get("latency_sec", 0.0)
    )
    db.add(db_metrics)
    db.commit()
    db.refresh(db_metrics)
    return db_metrics

def create_ai_cost_log(db: Session, log_data: dict):
    db_log = models.AICostLog(
        meeting_id=log_data.get("meeting_id"),
        model_name=log_data.get("model_name"),
        tokens_input=log_data.get("tokens_input", 0),
        tokens_output=log_data.get("tokens_output", 0),
        cost_usd=log_data.get("cost_usd", 0.0),
        is_estimated=log_data.get("is_estimated", False)
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log
