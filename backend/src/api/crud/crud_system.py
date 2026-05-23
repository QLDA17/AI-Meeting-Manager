from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid
from .. import models


# ==================== Audio Files ====================

def get_audio_file_by_id(db: Session, audio_id: str) -> Optional[models.AudioFile]:
    return db.query(models.AudioFile).filter(models.AudioFile.id == audio_id).first()


def get_audio_files_by_meeting(db: Session, meeting_id: str) -> List[models.AudioFile]:
    return db.query(models.AudioFile).filter(
        models.AudioFile.meeting_id == meeting_id
    ).all()


def create_audio_file(db: Session, audio_data: dict) -> models.AudioFile:
    db_audio = models.AudioFile(
        id=audio_data.get("id", str(uuid.uuid4())),
        meeting_id=audio_data["meeting_id"],
        filename=audio_data["filename"],
        original_filename=audio_data["original_filename"],
        file_path=audio_data["file_path"],
        file_size=audio_data["file_size"],
        duration_seconds=audio_data.get("duration_seconds"),
        format=audio_data["format"],
        sample_rate=audio_data.get("sample_rate"),
        channels=audio_data.get("channels"),
        upload_status=audio_data.get("upload_status", "UPLOADING"),
    )
    db.add(db_audio)
    db.commit()
    db.refresh(db_audio)
    return db_audio


def update_audio_file(db: Session, audio_id: str, updates: dict) -> Optional[models.AudioFile]:
    db_audio = get_audio_file_by_id(db, audio_id)
    if not db_audio:
        return None
    
    for key, value in updates.items():
        if hasattr(db_audio, key):
            setattr(db_audio, key, value)
    
    db.commit()
    db.refresh(db_audio)
    return db_audio


def delete_audio_file(db: Session, audio_id: str) -> bool:
    db_audio = get_audio_file_by_id(db, audio_id)
    if not db_audio:
        return False
    
    db.delete(db_audio)
    db.commit()
    return True


# ==================== Export Files ====================

def get_export_file_by_id(db: Session, export_id: str) -> Optional[models.ExportFile]:
    return db.query(models.ExportFile).options(
        joinedload(models.ExportFile.generated_by_user)
    ).filter(models.ExportFile.id == export_id).first()


def get_export_files(
    db: Session, 
    meeting_id: Optional[str] = None,
    format: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[models.ExportFile]:
    query = db.query(models.ExportFile).options(
        joinedload(models.ExportFile.generated_by_user)
    )
    
    if meeting_id:
        query = query.filter(models.ExportFile.meeting_id == meeting_id)
    
    if format:
        query = query.filter(models.ExportFile.format == format)
    
    return query.order_by(models.ExportFile.created_at.desc()).offset(skip).limit(limit).all()


def create_export_file(db: Session, export_data: dict, generated_by: str) -> models.ExportFile:
    db_export = models.ExportFile(
        id=export_data.get("id", str(uuid.uuid4())),
        meeting_id=export_data["meeting_id"],
        filename=export_data["filename"],
        file_path=export_data["file_path"],
        format=export_data["format"],
        file_size=export_data.get("file_size"),
        template_type=export_data.get("template_type", "STANDARD"),
        include_transcript=export_data.get("include_transcript", True),
        include_summary=export_data.get("include_summary", True),
        include_action_items=export_data.get("include_action_items", True),
        generated_by=generated_by,
        expires_at=export_data.get("expires_at"),
    )
    db.add(db_export)
    db.commit()
    db.refresh(db_export)
    return db_export


def increment_export_download_count(db: Session, export_id: str) -> Optional[models.ExportFile]:
    db_export = get_export_file_by_id(db, export_id)
    if not db_export:
        return None
    
    db_export.download_count += 1
    db.commit()
    db.refresh(db_export)
    return db_export


def delete_export_file(db: Session, export_id: str) -> bool:
    db_export = get_export_file_by_id(db, export_id)
    if not db_export:
        return False
    
    db.delete(db_export)
    db.commit()
    return True


# ==================== Cost Tracking ====================

def get_cost_tracking_by_id(db: Session, cost_id: str) -> Optional[models.CostTracking]:
    return db.query(models.CostTracking).filter(models.CostTracking.id == cost_id).first()


def get_cost_tracking(
    db: Session, 
    meeting_id: Optional[str] = None,
    service: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[models.CostTracking]:
    query = db.query(models.CostTracking)
    
    if meeting_id:
        query = query.filter(models.CostTracking.meeting_id == meeting_id)
    
    if service:
        query = query.filter(models.CostTracking.service == service)
    
    return query.order_by(models.CostTracking.created_at.desc()).offset(skip).limit(limit).all()


def get_total_cost_by_meeting(db: Session, meeting_id: str) -> float:
    from sqlalchemy import func
    result = db.query(func.sum(models.CostTracking.cost_usd)).filter(
        models.CostTracking.meeting_id == meeting_id
    ).scalar()
    return float(result) if result else 0.0


def create_cost_tracking(db: Session, cost_data: dict) -> models.CostTracking:
    db_cost = models.CostTracking(
        id=cost_data.get("id", str(uuid.uuid4())),
        meeting_id=cost_data.get("meeting_id"),
        service=cost_data["service"],
        api_endpoint=cost_data.get("api_endpoint"),
        model_name=cost_data.get("model_name"),
        input_tokens=cost_data.get("input_tokens", 0),
        output_tokens=cost_data.get("output_tokens", 0),
        cost_usd=cost_data["cost_usd"],
        currency=cost_data.get("currency", "USD"),
    )
    db.add(db_cost)
    db.commit()
    db.refresh(db_cost)
    return db_cost


def delete_cost_tracking(db: Session, cost_id: str) -> bool:
    db_cost = get_cost_tracking_by_id(db, cost_id)
    if not db_cost:
        return False
    
    db.delete(db_cost)
    db.commit()
    return True


# ==================== Glossary Terms ====================

def get_glossary_term_by_id(db: Session, term_id: str) -> Optional[models.GlossaryTerm]:
    return db.query(models.GlossaryTerm).options(
        joinedload(models.GlossaryTerm.organization),
        joinedload(models.GlossaryTerm.created_by_user)
    ).filter(models.GlossaryTerm.id == term_id).first()


def get_glossary_terms(
    db: Session, 
    organization_id: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0, 
    limit: int = 100
) -> List[models.GlossaryTerm]:
    query = db.query(models.GlossaryTerm).options(
        joinedload(models.GlossaryTerm.organization),
        joinedload(models.GlossaryTerm.created_by_user)
    )
    
    if organization_id:
        query = query.filter(models.GlossaryTerm.organization_id == organization_id)
    
    if category:
        query = query.filter(models.GlossaryTerm.category == category)
    
    if is_active is not None:
        query = query.filter(models.GlossaryTerm.is_active == is_active)
    
    return query.order_by(models.GlossaryTerm.term).offset(skip).limit(limit).all()


def create_glossary_term(db: Session, term_data: dict, created_by: str) -> models.GlossaryTerm:
    db_term = models.GlossaryTerm(
        id=term_data.get("id", str(uuid.uuid4())),
        organization_id=term_data.get("organization_id"),
        term=term_data["term"],
        aliases=term_data.get("aliases") or [],
        translation_vi=term_data.get("translation_vi"),
        translation_en=term_data.get("translation_en"),
        translation_ja=term_data.get("translation_ja"),
        translation_zh=term_data.get("translation_zh"),
        translation_ko=term_data.get("translation_ko"),
        category=term_data.get("category"),
        is_active=term_data.get("is_active", True),
        created_by=created_by,
    )
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term


def update_glossary_term(db: Session, term_id: str, updates: dict) -> Optional[models.GlossaryTerm]:
    db_term = get_glossary_term_by_id(db, term_id)
    if not db_term:
        return None
    
    for key, value in updates.items():
        if hasattr(db_term, key):
            setattr(db_term, key, value)
    
    db.commit()
    db.refresh(db_term)
    return db_term


def delete_glossary_term(db: Session, term_id: str) -> bool:
    db_term = get_glossary_term_by_id(db, term_id)
    if not db_term:
        return False
    
    db.delete(db_term)
    db.commit()
    return True


def get_glossary_suggestion_by_id(db: Session, suggestion_id: str) -> Optional[models.GlossarySuggestion]:
    return db.query(models.GlossarySuggestion).filter(models.GlossarySuggestion.id == suggestion_id).first()


def get_glossary_suggestions(
    db: Session,
    organization_id: str,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[models.GlossarySuggestion]:
    query = db.query(models.GlossarySuggestion).filter(models.GlossarySuggestion.organization_id == organization_id)
    if status:
        query = query.filter(models.GlossarySuggestion.status == status)
    return query.order_by(
        models.GlossarySuggestion.status.asc(),
        models.GlossarySuggestion.occurrence_count.desc(),
        models.GlossarySuggestion.updated_at.desc(),
    ).offset(skip).limit(limit).all()


def create_glossary_suggestion(db: Session, suggestion_data: dict) -> models.GlossarySuggestion:
    db_suggestion = models.GlossarySuggestion(
        id=suggestion_data.get("id", str(uuid.uuid4())),
        organization_id=suggestion_data["organization_id"],
        status=suggestion_data.get("status", "PENDING"),
        canonical_term_candidate=suggestion_data["canonical_term_candidate"],
        alias_candidates=suggestion_data.get("alias_candidates") or [],
        category_hint=suggestion_data.get("category_hint"),
        source_meeting_ids=suggestion_data.get("source_meeting_ids") or [],
        evidence_examples=suggestion_data.get("evidence_examples") or [],
        occurrence_count=suggestion_data.get("occurrence_count", 0),
        confidence_score=suggestion_data.get("confidence_score", 0.0),
        suggestion_type=suggestion_data.get("suggestion_type", "UNKNOWN_TERM"),
        reviewed_by=suggestion_data.get("reviewed_by"),
        reviewed_at=suggestion_data.get("reviewed_at"),
    )
    db.add(db_suggestion)
    db.commit()
    db.refresh(db_suggestion)
    return db_suggestion


def update_glossary_suggestion(db: Session, suggestion_id: str, updates: dict) -> Optional[models.GlossarySuggestion]:
    db_suggestion = get_glossary_suggestion_by_id(db, suggestion_id)
    if not db_suggestion:
        return None

    for key, value in updates.items():
        if hasattr(db_suggestion, key):
            setattr(db_suggestion, key, value)

    db.commit()
    db.refresh(db_suggestion)
    return db_suggestion
