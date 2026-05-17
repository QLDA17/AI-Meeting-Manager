import os
import sys
import time
import json
import logging
import re
import hashlib
import glob
import subprocess
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks, status, Request, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from datetime import date, datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from jose import jwt
import asyncio
import uuid
import secrets

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Import our hardened modules
from src.api.database import engine, get_db, health_check as db_health_check, close_db_connections, Base, SessionLocal
from src.api.config import get_config, ConfigError
from src.api.logging_middleware import setup_logging, RequestLoggingMiddleware
from src.api.rate_limiting import RateLimitMiddleware

# Setup logging first (before other imports that might log)
try:
    config = get_config()
    setup_logging(log_level=config.log_level, json_format=config.environment == "production")
    logger = logging.getLogger(__name__)
    logger.info("Logging initialized", extra=config.to_dict())
except ConfigError as e:
    print(f"❌ Config Error: {e}", file=sys.stderr)
    sys.exit(1)

from src.api import models, auth, schemas
from src.api.crud import (
    get_user_by_id, get_user_by_username, get_user_by_email, create_user, update_user,
    create_password_reset_otp, get_valid_password_reset_otp, mark_password_reset_otp_used,
    get_organization_by_id, get_organizations, update_organization, delete_organization, update_user_organization_role,
    create_group, get_group_by_id, get_groups_by_org, update_group, delete_group,
    get_group_memberships, add_user_to_group, update_group_membership, remove_user_from_group,
    get_group_messages, create_group_message, update_group_message, delete_group_message,
    get_meetings, get_meeting_by_id, check_meeting_overlap, create_meeting, update_meeting, add_meeting_participant, remove_meeting_participant,
    get_action_item_by_id, update_action_item, delete_action_item,
    create_transcript, create_transcript_segments_bulk,
    create_meeting_summary, create_action_item,
    get_glossary_term_by_id, get_glossary_terms, create_glossary_term, update_glossary_term, delete_glossary_term,
    create_audio_file,
)
# Lazy import torch-dependent modules to avoid startup errors
# from src.cost.cost_logger import CostLogger
# from src.providers.google_llm import GoogleLLMAdapter
from src.api.chat import router as chat_router
from src.api.export import router as export_router
from src.api.notifications import router as notifications_router, send_email, FRONTEND_URL
from src.api.swagger import custom_openapi
# from src.cost.api import get_admin_costs, get_admin_performance
# from src.api.jobs import MeetingProcessingJob, JOBS

# Audio upload storage directory
AUDIO_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "audio")

# Initialize SQLite tables automatically in development fallback mode.
if str(config.database.url).startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="MultiMinutes AI API",
    version="1.0.0-beta",
    description="AI-powered meeting minutes generation system",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Custom OpenAPI schema - temporarily disabled
# app.openapi = lambda: custom_openapi(app)
app.router.redirect_slashes = False


def _ensure_column(table_name: str, column_name: str, ddl: str) -> None:
    try:
        with engine.begin() as connection:
            dialect = connection.dialect.name
            if dialect == "sqlite":
                existing = [row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()]
                if column_name not in existing:
                    connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")
            elif dialect in {"mysql", "mariadb"}:
                exists = connection.exec_driver_sql(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = %s
                      AND column_name = %s
                    """,
                    (table_name, column_name),
                ).scalar()
                if not exists:
                    connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")
    except Exception as exc:
        logger.warning("Failed to ensure column %s.%s: %s", table_name, column_name, exc)


def _ensure_meeting_runtime_columns() -> None:
    _ensure_column("transcript_segments", "language", "language VARCHAR(10) DEFAULT 'auto'")
    _ensure_column("transcripts", "post_processed", "post_processed BOOLEAN DEFAULT FALSE")
    _ensure_column("transcripts", "nlp_metadata", "nlp_metadata JSON")
    _ensure_column("transcript_segments", "original_text", "original_text TEXT")
    _ensure_column("transcript_segments", "nlp_metadata", "nlp_metadata JSON")
    _ensure_column("meetings", "reminder_sent", "reminder_sent BOOLEAN DEFAULT FALSE")
    _ensure_column("meeting_participants", "invite_status", "invite_status VARCHAR(20) DEFAULT 'accepted'")
    _ensure_column("meeting_summaries", "risks", "risks JSON")
    _ensure_column("meeting_summaries", "open_questions", "open_questions JSON")
    _ensure_column("meeting_summaries", "timeline_highlights", "timeline_highlights JSON")
    _ensure_column("meeting_summaries", "speaker_summaries", "speaker_summaries JSON")


# ============= MIDDLEWARE =============

# 1. Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# 2. Rate limiting (disabled in development, enabled in production)
if config.environment != "development":
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=int(os.getenv("RATE_LIMIT_RPM", "100")),
        window_size=int(os.getenv("RATE_LIMIT_WINDOW", "60")),
        exclude_paths=["/health", "/metrics", "/docs", "/openapi.json"],
    )
    logger.info("Rate limiting enabled")
else:
    logger.info("Rate limiting disabled in development mode")

# 3. CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.server.cors_origins,
    allow_credentials=config.server.cors_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= STARTUP/SHUTDOWN EVENTS =============

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting MultiMinutes AI API...")
    start_time = time.time()

    # Start background scheduler for reminders and status transitions
    import asyncio
    from .scheduler import run_scheduler
    asyncio.create_task(run_scheduler())
    
    try:
        # Ensure new lightweight runtime tables exist even without full migrations.
        models.AuditLog.__table__.create(bind=engine, checkfirst=True)
        models.Notification.__table__.create(bind=engine, checkfirst=True)
        models.MeetingTranscriptDraft.__table__.create(bind=engine, checkfirst=True)
        models.MeetingMessage.__table__.create(bind=engine, checkfirst=True)
        models.MeetingSpeakerMapping.__table__.create(bind=engine, checkfirst=True)
        _ensure_meeting_runtime_columns()

        # 1. Validate database connection
        db_status = db_health_check()
        if db_status["status"] != "healthy":
            logger.error(f"Database health check failed: {db_status}")
        else:
            logger.info(
                f"Database healthy - latency: {db_status.get('latency_ms')}ms, "
                f"pool: {db_status.get('pool_size')}/{db_status.get('checked_out')} connections"
            )
        
        # 2. Log configuration
        logger.info("Configuration", extra=config.to_dict())
        
        # 3. Check AI provider availability
        if config.ai.provider == "google" and not config.ai.google_api_key:
            logger.warning("Google API key not configured - AI features will be disabled")
        elif config.ai.provider == "openai" and not config.ai.openai_api_key:
            logger.warning("OpenAI API key not configured - AI features will be disabled")
        
        elapsed = (time.time() - start_time) * 1000
        logger.info(f"Startup complete in {elapsed:.0f}ms")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down MultiMinutes AI API...")
    close_db_connections()
    logger.info("Shutdown complete")


# ============= MIDDLEWARE CONFIGURATION =============

# Note: Cost logger and AI adapter moved to lazy initialization
# to avoid startup errors when torch/GPU not available
cost_logger = None
adapter = None
RUNTIME_NOTIFICATIONS: List[Dict[str, Any]] = []
MAX_RUNTIME_NOTIFICATIONS = 500
ADMIN_AUDIT_LOGS: List[Dict[str, Any]] = []
MAX_ADMIN_AUDIT_LOGS = 2000
ADMIN_PROMPTS: Dict[str, Dict[str, Any]] = {
    "summary_vi": {
        "key": "summary_vi",
        "name": "Tóm tắt cuộc họp (VI)",
        "description": "Prompt tạo tóm tắt cuộc họp bằng tiếng Việt",
        "content": (
            "Tạo executive meeting brief bằng tiếng Việt. Tóm tắt phải ngắn, đúng trọng tâm, "
            "chỉ nêu mục tiêu, kết quả chính, quyết định rõ ràng và bước tiếp theo. "
            "Không kể lại transcript, không bịa quyết định hoặc việc cần làm."
        ),
        "version": "2.1.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_en": {
        "key": "summary_en",
        "name": "Meeting Summary (EN)",
        "description": "Meeting summary prompt in English",
        "content": (
            "Create a concise executive meeting brief in English. Focus only on the meeting goal, "
            "main outcomes, explicit decisions, and next steps. Do not retell the transcript or invent "
            "decisions/action items."
        ),
        "version": "2.1.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_zh": {
        "key": "summary_zh",
        "name": "会议摘要 (ZH)",
        "description": "Meeting summary prompt in Chinese",
        "content": (
            "请用中文生成简洁的会议高管摘要，只关注会议目标、主要结果、明确决定和下一步。"
            "不要复述全文，不要编造决定或待办事项。"
        ),
        "version": "2.1.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_ja": {
        "key": "summary_ja",
        "name": "会議サマリー (JA)",
        "description": "Meeting summary prompt in Japanese",
        "content": (
            "日本語で簡潔なエグゼクティブ向け会議ブリーフを作成してください。"
            "会議の目的、主要な結果、明確な決定事項、次のアクションだけに集中してください。"
            "全文の再説明や決定・タスクの推測はしないでください。"
        ),
        "version": "2.1.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_ko": {
        "key": "summary_ko",
        "name": "회의 요약 (KO)",
        "description": "Meeting summary prompt in Korean",
        "content": (
            "한국어로 간결한 임원용 회의 브리프를 작성해 주세요. 회의 목적, 핵심 결과, "
            "명확한 결정, 다음 단계에만 집중하세요. 회의록을 장황하게 반복하거나 결정/할 일을 추측하지 마세요."
        ),
        "version": "2.1.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
}
ADMIN_AI_SERVICES: Dict[str, Any] = {
    "llm_provider": "google",
    "llm_enabled": True,
    "stt_provider": "openai-whisper",
    "stt_enabled": True,
    "vector_db_enabled": True,
    "api_health": [
        {"name": "LLM API", "latency_ms": 120, "status": "online"},
        {"name": "STT Worker", "latency_ms": 450, "status": "online"},
        {"name": "Vector DB", "latency_ms": 15, "status": "online"},
        {"name": "Storage API", "latency_ms": 85, "status": "online"},
    ],
}
ADMIN_SYSTEM_SETTINGS: Dict[str, Any] = {
    "require_2fa_admin": True,
    "public_registration_enabled": True,
    "storage_limit_gb_per_org": 50,
    "transcript_retention_policy": "forever",
    "maintenance_mode": False,
}

# Persist admin settings to JSON file
_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "admin_settings.json")

def _load_admin_settings() -> None:
    """Load admin settings from JSON file if it exists."""
    global ADMIN_SYSTEM_SETTINGS
    try:
        if os.path.exists(_SETTINGS_FILE):
            with open(_SETTINGS_FILE, "r") as f:
                saved = json.load(f)
                ADMIN_SYSTEM_SETTINGS.update(saved)
    except Exception:
        pass

def _save_admin_settings() -> None:
    """Save admin settings to JSON file."""
    try:
        os.makedirs(os.path.dirname(_SETTINGS_FILE), exist_ok=True)
        with open(_SETTINGS_FILE, "w") as f:
            json.dump(ADMIN_SYSTEM_SETTINGS, f, indent=2)
    except Exception:
        pass

_load_admin_settings()
ADMIN_BROADCAST_HISTORY: List[Dict[str, Any]] = []


def ensure_audit_log_table() -> None:
    try:
        models.AuditLog.__table__.create(bind=engine, checkfirst=True)
    except Exception:
        # Keep runtime alive even when DDL permissions are restricted.
        pass


def append_admin_audit_log(actor: str, action: str, target: str, ip: str = "system", role: str = "System Admin") -> None:
    actor_name = actor or "unknown"
    timestamp = datetime.utcnow()
    entry = {
        "id": str(uuid.uuid4()),
        "time": timestamp.isoformat(),
        "user": actor_name,
        "role": role,
        "action": action,
        "target": target,
        "org": "System",
        "ip": ip,
    }

    # Persist to DB first, keep memory copy as fallback and hot-cache for UI.
    db = None
    try:
        ensure_audit_log_table()
        db = SessionLocal()
        db.add(
            models.AuditLog(
                id=entry["id"],
                time=timestamp,
                user=actor_name,
                role=role,
                action=action,
                target=target,
                org="System",
                ip=ip,
            )
        )
        db.commit()
    except Exception:
        try:
            if db:
                db.rollback()
        except Exception:
            pass
    finally:
        try:
            if db:
                db.close()
        except Exception:
            pass

    ADMIN_AUDIT_LOGS.append(entry)
    if len(ADMIN_AUDIT_LOGS) > MAX_ADMIN_AUDIT_LOGS:
        del ADMIN_AUDIT_LOGS[:-MAX_ADMIN_AUDIT_LOGS]


def push_runtime_notification(notification: Dict[str, Any]) -> None:
    RUNTIME_NOTIFICATIONS.append(notification)
    if len(RUNTIME_NOTIFICATIONS) > MAX_RUNTIME_NOTIFICATIONS:
        del RUNTIME_NOTIFICATIONS[:-MAX_RUNTIME_NOTIFICATIONS]


def notification_payload(notification: models.Notification) -> Dict[str, Any]:
    return {
        "id": notification.id,
        "type": notification.type,
        "priority": notification.priority,
        "title": notification.title,
        "message": notification.message,
        "timestamp": (notification.created_at or datetime.utcnow()).isoformat(),
        "isRead": bool(notification.is_read),
        "metadata": notification.metadata_json or {},
    }


def create_persisted_notification(
    db: Session,
    *,
    recipient_user_id: str,
    notification_type: str,
    priority: str,
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
    source_type: Optional[str] = None,
    source_id: Optional[str] = None,
    commit: bool = True,
) -> models.Notification:
    existing = None
    if source_type and source_id:
        existing = db.query(models.Notification).filter(
            models.Notification.recipient_user_id == recipient_user_id,
            models.Notification.source_type == source_type,
            models.Notification.source_id == source_id,
        ).first()
    if existing:
        return existing

    notification = models.Notification(
        recipient_user_id=recipient_user_id,
        type=notification_type,
        priority=priority,
        title=title,
        message=message,
        metadata_json=metadata or {},
        source_type=source_type,
        source_id=source_id,
    )
    db.add(notification)
    if commit:
        db.commit()
        db.refresh(notification)
    else:
        db.flush()
    return notification


def get_org_admin_recipient_ids(db: Session, organization_id: str, actor_user_id: str) -> List[str]:
    recipients = db.query(models.UserOrganization.user_id).filter(
        models.UserOrganization.organization_id == organization_id,
        models.UserOrganization.role == "org-admin",
        models.UserOrganization.user_id != actor_user_id,
    ).all()
    return [item[0] for item in recipients]

def init_ai_services():
    """Lazy initialization of AI services (called on first use)"""
    global cost_logger, adapter
    if cost_logger is None or adapter is None:
        try:
            from src.cost.cost_logger import CostLogger
            from src.providers.google_llm import GoogleLLMAdapter
            cost_logger = CostLogger(monthly_hard_limit_usd=config.cost.monthly_limit_usd)
            adapter = GoogleLLMAdapter(cost_logger=cost_logger)
            logger.info("✅ AI services initialized")
        except Exception as e:
            logger.error(f"Failed to initialize AI services: {e}")
            # Set to False to prevent retries
            cost_logger = False
            adapter = False

# Pydantic Schemas - Use new schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    source: str
    confidence: float

class AnalyticsResponse(BaseModel):
    total_meetings_over_time: Dict[str, int]
    provider_distribution: Dict[str, int]
    top_action_owners: Dict[str, int]
    topic_trends: Dict[str, int]


class GroupInviteByEmailRequest(BaseModel):
    email: str
    role: str = "member"


class AdminUserStatusUpdateRequest(BaseModel):
    is_active: bool


class AdminPromptUpdateRequest(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    content: str
    version: Optional[str] = None


class AdminBroadcastRequest(BaseModel):
    title: str
    content: str
    type: str = "info"
    target: str = "all"


class AdminSettingsUpdateRequest(BaseModel):
    require_2fa_admin: Optional[bool] = None
    public_registration_enabled: Optional[bool] = None
    storage_limit_gb_per_org: Optional[int] = None
    transcript_retention_policy: Optional[str] = None
    maintenance_mode: Optional[bool] = None


class AdminAIServicesUpdateRequest(BaseModel):
    llm_provider: Optional[str] = None
    llm_enabled: Optional[bool] = None
    stt_provider: Optional[str] = None
    stt_enabled: Optional[bool] = None
    vector_db_enabled: Optional[bool] = None


def build_unique_username(db: Session, requested_username: Optional[str], email: str) -> str:
    base_username = (requested_username or email.split("@")[0] or "user").strip().lower()
    sanitized = "".join(ch if ch.isalnum() or ch in {"-", "_", "."} else "-" for ch in base_username).strip("-_.")
    candidate = sanitized or "user"
    suffix = 1

    while get_user_by_username(db, candidate):
        suffix += 1
        candidate = f"{sanitized or 'user'}-{suffix}"

    return candidate


def get_organization_approval_status(org: models.Organization) -> str:
    settings = org.settings or {}
    return settings.get("approval_status", "active")


def format_user_payload(user: models.User) -> Dict[str, Any]:
    display_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip() or user.username
    system_role = normalize_global_role(user.role)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": system_role,
        "systemRole": system_role,
        "displayName": display_name,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "avatarUrl": user.avatar_url,
        "phone": user.phone,
        "gender": user.gender,
        "dateOfBirth": user.date_of_birth.isoformat() if user.date_of_birth else None,
        "language": user.language or "vi",
        "timezone": user.timezone or "Asia/Ho_Chi_Minh",
        "notificationPreferences": user.notification_preferences or {},
        "isActive": user.is_active,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
        "orgMemberships": [
            {
                "orgId": om.organization_id,
                "role": om.role,
                "orgName": om.organization.name if om.organization else None,
                "approvalStatus": get_organization_approval_status(om.organization) if om.organization else "active",
            }
            for om in user.user_organizations
        ],
        "groupMemberships": [
            {"groupId": gm.group_id, "role": gm.role, "groupName": gm.group.name if gm.group else None}
            for gm in user.group_memberships
        ],
    }


def summarize_json_items(items: Any) -> List[str]:
    if not items:
        return []
    if isinstance(items, list):
        normalized: List[str] = []
        for item in items:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, dict):
                normalized.append(
                    item.get("text")
                    or item.get("title")
                    or item.get("summary")
                    or item.get("decision")
                    or item.get("content")
                    or str(item)
                )
            else:
                normalized.append(str(item))
        return [item for item in normalized if item]
    return [str(items)]


def _latest_processed_record(
    items: List[Any],
    success_status: str = "COMPLETED",
    fallback_to_any: bool = True,
) -> Optional[Any]:
    successful = [item for item in items or [] if getattr(item, "processing_status", None) == success_status]
    pool = successful or (list(items or []) if fallback_to_any else [])
    return max(pool, key=lambda item: getattr(item, "updated_at", None) or item.created_at or datetime.min, default=None)


def split_transcript_content_for_display(content: str, max_chars: int = 700) -> List[str]:
    if not content or not content.strip():
        return []

    lines = [line.strip() for line in content.splitlines() if line.strip()]
    if len(lines) > 1:
        return lines

    sentences = [item.strip() for item in re.split(r"(?<=[.!?。！？])\s+", content.strip()) if item.strip()]
    if len(sentences) <= 1:
        text = content.strip()
        return [text[index:index + max_chars].strip() for index in range(0, len(text), max_chars) if text[index:index + max_chars].strip()]

    chunks: List[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > max_chars:
            chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current.strip())
    return chunks


def transcript_segment_response_payloads(
    transcript: Optional[models.Transcript],
    speaker_map: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    if not transcript:
        return []
    speaker_map = speaker_map or {}

    ordered_segments = sorted(
        transcript.segments or [],
        key=lambda segment: (
            float(segment.start_time or 0),
            segment.created_at or datetime.min,
            segment.id,
        ),
    )

    if ordered_segments:
        payloads: List[Dict[str, Any]] = []
        for segment in ordered_segments:
            if not (segment.text or "").strip():
                continue
            raw_label = normalize_speaker_label(segment.speaker_label or "Speaker_01")
            display_name = speaker_map.get(raw_label, raw_label)
            payloads.append({
                "id": segment.id,
                "transcript_id": segment.transcript_id,
                "speaker_label": display_name,
                "speaker_raw_label": raw_label,
                "speaker_display_name": display_name,
                "start_time": float(segment.start_time or 0),
                "end_time": float(segment.end_time or 0),
                "text": segment.text or "",
                "language": getattr(segment, "language", None) or transcript.language or "auto",
                "confidence_score": float(segment.confidence_score) if segment.confidence_score is not None else None,
                "word_count": segment.word_count,
                "created_at": segment.created_at,
            })
        return payloads

    fallback_chunks = split_transcript_content_for_display(transcript.content or "")
    payloads: List[Dict[str, Any]] = []
    start_time = 0.0
    for index, chunk in enumerate(fallback_chunks):
        end_time = estimate_segment_end(start_time, chunk)
        raw_label = "Speaker_01"
        display_name = speaker_map.get(raw_label, raw_label)
        payloads.append({
            "id": f"{transcript.id[:28]}-{index:03d}",
            "transcript_id": transcript.id,
            "speaker_label": display_name,
            "speaker_raw_label": raw_label,
            "speaker_display_name": display_name,
            "start_time": start_time,
            "end_time": end_time,
            "text": chunk,
            "language": transcript.language or "auto",
            "confidence_score": None,
            "word_count": len(chunk.split()),
            "created_at": transcript.created_at,
        })
        start_time = end_time
    return payloads


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    if not raw_text or not raw_text.strip():
        raise ValueError("Router returned empty response")

    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError("Router response did not contain a JSON object")

    parsed = json.loads(match.group())
    if not isinstance(parsed, dict):
        raise ValueError("Router JSON payload must be an object")
    return parsed


AI_SUMMARY_MAX_CHARS = 900
AI_ITEM_MAX_CHARS = 220
AI_KEY_POINTS_LIMIT = 5
AI_DECISIONS_LIMIT = 5
AI_ACTION_ITEMS_LIMIT = 7
AI_RISKS_LIMIT = 4
AI_OPEN_QUESTIONS_LIMIT = 4
AI_TIMELINE_HIGHLIGHTS_LIMIT = 6
AI_SPEAKER_SUMMARIES_LIMIT = 6


def _compact_ai_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _try_parse_date(value: Optional[str]) -> Optional[date]:
    if not value or value.lower() in {"n/a", "unassigned", ""}:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _clip_ai_text(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    clipped = text[:max_chars].rstrip()
    sentence_end = max(clipped.rfind("."), clipped.rfind("!"), clipped.rfind("?"), clipped.rfind("。"))
    if sentence_end >= max_chars - 160:
        return clipped[: sentence_end + 1].strip()
    word_end = clipped.rfind(" ")
    if word_end >= max_chars - 80:
        clipped = clipped[:word_end].rstrip()
    return f"{clipped}..."


def _normalize_ai_string_list(value: Any, limit: int, max_chars: int = AI_ITEM_MAX_CHARS) -> List[str]:
    if isinstance(value, str):
        raw_items = [line.strip(" -•\t") for line in value.splitlines()]
    elif isinstance(value, list):
        raw_items = value
    else:
        raw_items = []

    normalized: List[str] = []
    seen = set()
    for item in raw_items:
        text = _clip_ai_text(_compact_ai_text(item), max_chars)
        if not text:
            continue
        dedupe_key = text.lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        normalized.append(text)
        if len(normalized) >= limit:
            break
    return normalized


def _normalize_analysis_payload(payload: Dict[str, Any]) -> schemas.MeetingAnalysisOutput:
    normalized_action_items = []
    seen_tasks = set()
    for item in payload.get("action_items") or []:
        if isinstance(item, dict):
            task = _clip_ai_text(_compact_ai_text(item.get("task")), AI_ITEM_MAX_CHARS)
            if not task:
                continue
            task_key = task.lower()
            if task_key in seen_tasks:
                continue
            seen_tasks.add(task_key)
            owner_raw = _clip_ai_text(_compact_ai_text(item.get("owner") or ""), 80)
            deadline_raw = _clip_ai_text(_compact_ai_text(item.get("deadline") or ""), 80)
            normalized_action_items.append(
                {
                    "task": task,
                    "owner": owner_raw if owner_raw and owner_raw.lower() not in {"unassigned", "n/a"} else "",
                    "deadline": deadline_raw if deadline_raw and deadline_raw.lower() not in {"n/a", "unassigned"} else "",
                }
            )
            if len(normalized_action_items) >= AI_ACTION_ITEMS_LIMIT:
                break

    normalized = {
        "meeting_summary": _clip_ai_text(_compact_ai_text(payload.get("meeting_summary")), AI_SUMMARY_MAX_CHARS),
        "key_points": _normalize_ai_string_list(payload.get("key_points"), AI_KEY_POINTS_LIMIT),
        "decisions": _normalize_ai_string_list(payload.get("decisions"), AI_DECISIONS_LIMIT),
        "action_items": normalized_action_items,
        "risks": _normalize_ai_string_list(payload.get("risks"), AI_RISKS_LIMIT),
        "open_questions": _normalize_ai_string_list(payload.get("open_questions"), AI_OPEN_QUESTIONS_LIMIT),
        "timeline_highlights": _normalize_ai_string_list(payload.get("timeline_highlights"), AI_TIMELINE_HIGHLIGHTS_LIMIT),
        "speaker_summaries": _normalize_ai_string_list(payload.get("speaker_summaries"), AI_SPEAKER_SUMMARIES_LIMIT),
    }
    return schemas.MeetingAnalysisOutput.model_validate(normalized)


def build_glossary_context(db: Session, organization_id: Optional[str]) -> str:
    query = db.query(models.GlossaryTerm).filter(models.GlossaryTerm.is_active == True)
    if organization_id:
        query = query.filter(or_(models.GlossaryTerm.organization_id.is_(None), models.GlossaryTerm.organization_id == organization_id))
    else:
        query = query.filter(models.GlossaryTerm.organization_id.is_(None))
    terms = query.order_by(models.GlossaryTerm.term.asc()).limit(80).all()
    if not terms:
        return ""
    lines = []
    for term in terms:
        translations = [
            value for value in [
                term.translation_vi,
                term.translation_en,
                term.translation_ja,
                term.translation_zh,
                term.translation_ko,
            ] if value
        ]
        suffix = f" => {', '.join(translations)}" if translations else ""
        lines.append(f"- {term.term}{suffix}")
    return "\n".join(lines)


def build_glossary_dict(db: Session, organization_id: Optional[str]) -> Dict[str, str]:
    query = db.query(models.GlossaryTerm).filter(models.GlossaryTerm.is_active == True)
    if organization_id:
        query = query.filter(or_(models.GlossaryTerm.organization_id.is_(None), models.GlossaryTerm.organization_id == organization_id))
    else:
        query = query.filter(models.GlossaryTerm.organization_id.is_(None))
    terms = query.order_by(models.GlossaryTerm.term.asc()).limit(200).all()
    glossary: Dict[str, str] = {}
    for term in terms:
        if not term.term:
            continue
        canonical = term.term
        glossary[canonical] = canonical
        for alias in [
            term.translation_vi,
            term.translation_en,
            term.translation_ja,
            term.translation_zh,
            term.translation_ko,
        ]:
            if alias:
                glossary[alias] = canonical
    return glossary


_phobert_processor = None


def get_phobert_processor():
    global _phobert_processor
    if _phobert_processor is None:
        from src.nlp import PhoBERTPostProcessor

        _phobert_processor = PhoBERTPostProcessor()
    return _phobert_processor


def phobert_enabled_for(language: str) -> bool:
    return os.getenv("PHOBERT_ENABLED", "false").lower() == "true" and (language or "vi").lower() in {"vi", "auto"}


def build_structured_summary_prompts(
    transcript: str,
    custom_instruction: str,
    language: str = "vi",
    glossary_context: str = "",
    nlp_metadata: Optional[Dict[str, Any]] = None,
) -> tuple[str, str]:
    lang_names = {"vi": "Vietnamese", "en": "English", "zh": "Chinese", "ja": "Japanese", "ko": "Korean"}
    lang_name = lang_names.get(language, "Vietnamese")

    system_prompt = (
        f"You are an executive meeting note assistant. "
        f"Respond ONLY in {lang_name}. "
        f"Return ONLY a valid JSON object, no markdown, no explanation, no extra text. "
        f"JSON must have exactly 8 keys: meeting_summary, key_points, decisions, action_items, risks, open_questions, timeline_highlights, speaker_summaries. "
        f"Be concise and decision-focused. Do not retell the transcript. "
        f"Use only facts explicitly supported by the transcript. Do not invent decisions, owners, deadlines, or tasks. "
        f"meeting_summary must be 3-5 short sentences and under {AI_SUMMARY_MAX_CHARS} characters. "
        f"key_points has at most {AI_KEY_POINTS_LIMIT} high-impact items. "
        f"decisions has at most {AI_DECISIONS_LIMIT} explicit decisions, or an empty array. "
        f"action_items has at most {AI_ACTION_ITEMS_LIMIT} explicit tasks with keys: task, owner, deadline. "
        f"For owner: use the speaker's display name from the transcript if a person is clearly responsible. If not stated, use empty string \"\". "
        f"For deadline: use the exact date/time mentioned. If not stated, use empty string \"\". "
        f"risks has at most {AI_RISKS_LIMIT} explicit blockers or risks, or an empty array. "
        f"open_questions has at most {AI_OPEN_QUESTIONS_LIMIT} unresolved questions, or an empty array. "
        f"timeline_highlights has at most {AI_TIMELINE_HIGHLIGHTS_LIMIT} short highlights with timestamps or order markers when available. "
        f"speaker_summaries has at most {AI_SPEAKER_SUMMARIES_LIMIT} short strings like 'Name: contribution'."
    )
    glossary_block = (
        f"\nInternal glossary. Preserve these names/terms exactly when they appear, and use the translations as context:\n{glossary_context}\n"
        if glossary_context
        else ""
    )
    nlp_block = ""
    if nlp_metadata:
        dialect_hint = nlp_metadata.get("dialect_hint") or "unknown"
        dialect_confidence = nlp_metadata.get("dialect_confidence")
        correction_count = nlp_metadata.get("correction_count", 0)
        terms = ", ".join(nlp_metadata.get("terms") or [])
        nlp_block = (
            "\nLow-priority transcript processing context. Use this only to interpret wording; do not infer facts from it:\n"
            f"- regional_text_hint: {dialect_hint}\n"
            f"- regional_text_confidence: {dialect_confidence}\n"
            f"- correction_count: {correction_count}\n"
            f"- detected_terms: {terms or '(none)'}\n"
        )
    user_prompt = (
        f"Admin guidance, lower priority than the concise JSON rules above:\n{custom_instruction.strip()}\n\n"
        f"{glossary_block}\n"
        f"{nlp_block}\n"
        f"Return JSON in exactly this schema:\n"
        "{\n"
        '  "meeting_summary": "3-5 short sentences, executive brief, not a transcript recap",\n'
        '  "key_points": ["max 5 concise high-impact points"],\n'
        '  "decisions": ["max 5 explicit decisions only"],\n'
        '  "action_items": [{"task": "string", "owner": "string", "deadline": "string"}],\n'
        '  "risks": ["max 4 explicit risks or blockers"],\n'
        '  "open_questions": ["max 4 unresolved questions"],\n'
        '  "timeline_highlights": ["max 6 short timeline highlights"],\n'
        '  "speaker_summaries": ["max 6 speaker contribution summaries"]\n'
        "}\n\n"
        f"If the transcript lacks clear action items, decisions, risks, questions, timeline events, or speaker-specific information, return empty arrays for those fields.\n\n"
        f"Transcript:\n{transcript}"
    )
    return system_prompt, user_prompt


def enrich_organization_payload(org: models.Organization) -> Dict[str, Any]:
    meetings = org.meetings or []
    total_minutes = sum((meeting.duration or 0) for meeting in meetings)
    settings = org.settings or {}
    return {
        "id": org.id,
        "name": org.name,
        "description": org.description,
        "domain": org.domain,
        "logo_url": org.logo_url,
        "settings": org.settings,
        "created_at": org.created_at,
        "updated_at": org.updated_at,
        "member_count": len(org.user_organizations or []),
        "group_count": len(org.groups or []),
        "meeting_count": len(meetings),
        "total_hours": round(total_minutes / 60, 2),
        "approval_status": settings.get("approval_status", "active"),
        "requested_by_user_id": settings.get("requested_by_user_id"),
        "approved_by_user_id": settings.get("approved_by_user_id"),
        "approved_at": settings.get("approved_at"),
    }


def enrich_group_payload(group: models.Group) -> Dict[str, Any]:
    meetings = group.meetings or []
    total_minutes = sum((meeting.duration or 0) for meeting in meetings)
    return {
        "id": group.id,
        "organization_id": group.organization_id,
        "name": group.name,
        "description": group.description,
        "privacy_level": group.privacy_level,
        "settings": group.settings,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "member_count": len(group.memberships or []),
        "meeting_count": len(meetings),
        "total_hours": round(total_minutes / 60, 2),
    }


def build_meeting_detail_payload(meeting: models.Meeting, user_lang: str = "vi") -> Dict[str, Any]:
    latest_transcript = _latest_processed_record(meeting.transcripts or [])
    speaker_mappings = sorted(meeting.speaker_mappings or [], key=lambda item: item.speaker_label)
    speaker_map = {item.speaker_label: item.display_name for item in speaker_mappings if item.display_name}
    # Filter summaries by user's preferred language first
    summaries = meeting.summaries or []
    lang_match = [s for s in summaries if (s.language or "vi") == user_lang]
    summary_pool = lang_match if lang_match else summaries
    latest_summary_any = _latest_processed_record(summary_pool, fallback_to_any=True)
    latest_summary = _latest_processed_record(summary_pool, fallback_to_any=False)
    summary_status = latest_summary_any.processing_status if latest_summary_any else None
    summary_error_text = (
        latest_summary_any.meeting_summary
        if latest_summary_any and latest_summary_any.processing_status == "FAILED"
        else None
    )

    return {
        "id": meeting.id,
        "organization_id": meeting.organization_id,
        "group_id": meeting.group_id,
        "title": meeting.title,
        "description": meeting.description,
        "scheduled_start": meeting.scheduled_start,
        "scheduled_end": meeting.scheduled_end,
        "actual_start": meeting.actual_start,
        "actual_end": meeting.actual_end,
        "duration": meeting.duration,
        "location": meeting.location,
        "meeting_type": meeting.meeting_type,
        "status": meeting.status,
        "code": meeting.code,
        "recording_url": meeting.recording_url,
        "transcript_url": meeting.transcript_url,
        "audio_url": meeting.audio_url,
        "is_pinned": meeting.is_pinned,
        "created_by": meeting.created_by,
        "created_at": meeting.created_at,
        "updated_at": meeting.updated_at,
        "organization": enrich_organization_payload(meeting.organization) if meeting.organization else None,
        "group": enrich_group_payload(meeting.group) if meeting.group else None,
        "created_by_user": format_user_payload(meeting.created_by_user) if meeting.created_by_user else None,
        "participants": meeting.participants or [],
        "audio_files": meeting.audio_files or [],
        "transcripts": meeting.transcripts or [],
        "transcript_segments": transcript_segment_response_payloads(latest_transcript, speaker_map),
        "speaker_mappings": [speaker_mapping_payload(item) for item in speaker_mappings],
        "summaries": meeting.summaries or [],
        "action_items": meeting.action_items or [],
        "transcript_content": latest_transcript.content if latest_transcript else None,
        "transcript_language": latest_transcript.language if latest_transcript else None,
        "meeting_summary_text": latest_summary.meeting_summary if latest_summary else None,
        "key_points_text": summarize_json_items(latest_summary.key_points if latest_summary else None),
        "decisions_text": summarize_json_items(latest_summary.decisions if latest_summary else None),
        "risks_text": summarize_json_items(latest_summary.risks if latest_summary else None),
        "open_questions_text": summarize_json_items(latest_summary.open_questions if latest_summary else None),
        "timeline_highlights_text": summarize_json_items(latest_summary.timeline_highlights if latest_summary else None),
        "speaker_summaries_text": summarize_json_items(latest_summary.speaker_summaries if latest_summary else None),
        "summary_status": summary_status,
        "summary_error_text": summary_error_text,
        "summary_provider": latest_summary_any.ai_provider if latest_summary_any else None,
        "summary_model_name": latest_summary_any.model_name if latest_summary_any else None,
    }


def user_org_ids(user: models.User) -> List[str]:
    return [membership.organization_id for membership in user.user_organizations]


def action_item_visible_to_user(db: Session, action_item: models.ActionItem, user: models.User) -> bool:
    if user.role == "system-admin":
        return True
    if action_item.created_by == user.id or action_item.assigned_to == user.id:
        return True
    if action_item.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == action_item.meeting_id).first()
        return bool(meeting and auth.get_user_org_role(db, user, meeting.organization_id))
    return False


def group_member_payload(membership: models.GroupMembership) -> Dict[str, Any]:
    user = membership.user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar_url": user.avatar_url,
        "language": user.language or "vi",
        "timezone": user.timezone or "Asia/Ho_Chi_Minh",
        "notification_preferences": user.notification_preferences,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
        "groupMemberships": [{"groupId": membership.group_id, "role": membership.role}],
    }


def normalize_global_role(role: Optional[str]) -> str:
    return "system-admin" if role == "system-admin" else "member"


def normalize_meeting_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if not value:
        return value
    if value.tzinfo:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def require_meeting_manager(db: Session, user: models.User, meeting: models.Meeting) -> None:
    if user.role == "system-admin" or meeting.created_by == user.id:
        return

    org_role = auth.get_user_org_role(db, user, meeting.organization_id)
    if org_role == "org-admin":
        return

    if meeting.group_id and auth.get_user_group_role(db, user, meeting.group_id) == "group-admin":
        return

    raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa cuộc họp này")


def normalize_speaker_label(value: Any) -> str:
    raw = str(value or "").strip()
    canonical = re.match(r"^speaker_(\d{2,})$", raw, re.IGNORECASE)
    if canonical:
        return f"Speaker_{int(canonical.group(1)):02d}"
    match = re.search(r"(\d+)", raw)
    if match:
        number = int(match.group(1)) + 1
        return f"Speaker_{number:02d}"
    return "Speaker_01"


def speaker_mapping_payload(mapping: models.MeetingSpeakerMapping) -> Dict[str, Any]:
    return {
        "id": mapping.id,
        "meeting_id": mapping.meeting_id,
        "speaker_label": mapping.speaker_label,
        "display_name": mapping.display_name,
        "user_id": mapping.user_id,
        "created_at": mapping.created_at.isoformat() if mapping.created_at else None,
        "updated_at": mapping.updated_at.isoformat() if mapping.updated_at else None,
    }


def get_speaker_mapping_dict(db: Session, meeting_id: str) -> Dict[str, str]:
    rows = db.query(models.MeetingSpeakerMapping).filter(
        models.MeetingSpeakerMapping.meeting_id == meeting_id
    ).all()
    return {row.speaker_label: row.display_name for row in rows if row.display_name}


def ensure_speaker_mapping(db: Session, meeting_id: str, speaker_label: str, display_name: Optional[str] = None) -> models.MeetingSpeakerMapping:
    normalized_label = normalize_speaker_label(speaker_label)
    mapping = db.query(models.MeetingSpeakerMapping).filter(
        models.MeetingSpeakerMapping.meeting_id == meeting_id,
        models.MeetingSpeakerMapping.speaker_label == normalized_label,
    ).first()
    if mapping:
        if display_name and mapping.display_name == mapping.speaker_label:
            mapping.display_name = display_name
        return mapping
    mapping = models.MeetingSpeakerMapping(
        meeting_id=meeting_id,
        speaker_label=normalized_label,
        display_name=display_name or normalized_label,
    )
    db.add(mapping)
    db.flush()
    return mapping


def format_meeting_message_payload(message: models.MeetingMessage) -> Dict[str, Any]:
    return {
        "id": message.id,
        "meeting_id": message.meeting_id,
        "user_id": message.user_id,
        "text": message.text,
        "message_type": message.message_type,
        "reply_to_id": message.reply_to_id,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "updated_at": message.updated_at.isoformat() if message.updated_at else None,
        "user": format_user_payload(message.user) if message.user else None,
    }


def build_speaker_aware_transcript(
    transcript_text: str,
    segments: List[Dict[str, Any]],
    speaker_map: Dict[str, str],
) -> str:
    if not segments:
        return transcript_text
    lines = []
    for segment in segments:
        text = (segment.get("text") or "").strip()
        if not text:
            continue
        raw_label = normalize_speaker_label(segment.get("speaker") or segment.get("speaker_label"))
        display_name = speaker_map.get(raw_label, raw_label)
        start = float(segment.get("start", segment.get("start_time", 0)) or 0)
        lines.append(f"[{start:0.1f}s] {display_name}: {text}")
    return "\n".join(lines) or transcript_text


class MeetingRoomConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, List[Tuple[WebSocket, Dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, meeting_id: str, websocket: WebSocket, user_info: Dict[str, Any]) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.setdefault(meeting_id, []).append((websocket, user_info))

    async def disconnect(self, meeting_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self.active_connections.get(meeting_id, [])
            self.active_connections[meeting_id] = [(ws, u) for ws, u in connections if ws != websocket]
            if not self.active_connections.get(meeting_id):
                self.active_connections.pop(meeting_id, None)

    def get_participants(self, meeting_id: str) -> List[Dict[str, Any]]:
        return [u for _, u in self.active_connections.get(meeting_id, [])]

    async def broadcast(self, meeting_id: str, payload: Dict[str, Any]) -> None:
        connections = list(self.active_connections.get(meeting_id, []))
        stale: List[WebSocket] = []
        for websocket, _ in connections:
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        if stale:
            async with self._lock:
                current = self.active_connections.get(meeting_id, [])
                self.active_connections[meeting_id] = [(ws, u) for ws, u in current if ws not in stale]


meeting_room_manager = MeetingRoomConnectionManager()


def get_ws_user(db: Session, token: Optional[str]) -> models.User:
    if token and token.lower().startswith("bearer "):
        token = token.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing websocket token")
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise ValueError("Missing subject")
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid websocket token") from exc
    user = get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid websocket user")
    return user


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


def estimate_segment_end(start_seconds: float, text: str) -> float:
    word_count = len((text or "").split())
    return start_seconds + max(1.0, word_count * 0.38)


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


def resolve_pending_invitation_by_token(db: Session, token: str) -> Optional[models.Invitation]:
    now = datetime.utcnow()

    expired_count = db.query(models.Invitation).filter(
        models.Invitation.status == "pending",
        models.Invitation.expires_at < now,
    ).update({"status": "expired"}, synchronize_session=False)
    if expired_count:
        db.commit()

    token_sha256 = hashlib.sha256(token.encode("utf-8")).hexdigest()
    invitation = db.query(models.Invitation).options(
        joinedload(models.Invitation.organization),
        joinedload(models.Invitation.group),
    ).filter(
        models.Invitation.status == "pending",
        models.Invitation.token_sha256 == token_sha256,
        models.Invitation.expires_at >= now,
    ).first()

    if invitation and auth.verify_password(token, invitation.token_hash):
        return invitation

    # Backward compatibility for invitations created before token_sha256 existed.
    legacy_invitations = db.query(models.Invitation).options(
        joinedload(models.Invitation.organization),
        joinedload(models.Invitation.group),
    ).filter(
        models.Invitation.status == "pending",
        models.Invitation.token_sha256.is_(None),
        models.Invitation.expires_at >= now,
    ).all()
    for legacy_invitation in legacy_invitations:
        if auth.verify_password(token, legacy_invitation.token_hash):
            legacy_invitation.token_sha256 = token_sha256
            db.flush()
            return legacy_invitation

    return None


def invitation_preview_payload(invitation: models.Invitation) -> Dict[str, Any]:
    return {
        "email": invitation.email,
        "organization_id": invitation.organization_id,
        "organization_name": invitation.organization.name if invitation.organization else None,
        "role": invitation.role,
        "status": invitation.status,
        "expires_at": invitation.expires_at,
    }


def build_invitation_email_html(org_name: str, role: str, invite_url: str) -> str:
    role_labels = {
        "org-admin": "Quản trị tổ chức",
        "member": "Thành viên",
        "viewer": "Người xem",
    }
    role_label = role_labels.get(role, role)
    return f"""
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px 12px 0 0;'>
            <h1 style='color: white; margin: 0;'>Lời mời tham gia tổ chức</h1>
        </div>
        <div style='background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;'>
            <p style='color: #0f172a; font-size: 16px;'>Bạn được mời tham gia <strong>{org_name}</strong>.</p>
            <p style='color: #475569; font-size: 14px;'>Vai trò của bạn sau khi tham gia: <strong>{role_label}</strong>.</p>
            <div style='margin: 28px 0; text-align: center;'>
                <a href='{invite_url}' style='background: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 9999px; font-weight: bold; display: inline-block;'>Tham gia tổ chức</a>
            </div>
            <p style='color: #64748b; font-size: 12px;'>Nếu nút không hoạt động, hãy mở liên kết này:</p>
            <p style='color: #2563eb; font-size: 12px; word-break: break-all;'>{invite_url}</p>
        </div>
    </div>
    """


def build_password_reset_email_html(reset_code: str, expires_minutes: int) -> str:
    return f"""
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%); padding: 30px; border-radius: 12px 12px 0 0;'>
            <h1 style='color: white; margin: 0;'>Ma xac thuc dat lai mat khau</h1>
        </div>
        <div style='background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;'>
            <p style='color: #0f172a; font-size: 16px;'>Ban vua yeu cau dat lai mat khau MultiMinutes AI.</p>
            <p style='color: #475569; font-size: 14px;'>Nhap ma OTP ben duoi vao man hinh "Quen mat khau".</p>
            <div style='margin: 28px 0; text-align: center;'>
                <div style='display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; background: white; border: 1px solid #dbeafe; border-radius: 12px; padding: 16px 24px;'>{reset_code}</div>
            </div>
            <p style='color: #64748b; font-size: 13px;'>Ma co hieu luc trong {expires_minutes} phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
        </div>
    </div>
    """


# Auth Endpoints
@app.post("/api/auth/register", response_model=schemas.RegisterResponse)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if not req.inviteToken and not ADMIN_SYSTEM_SETTINGS.get("public_registration_enabled", True):
        raise HTTPException(status_code=403, detail="Public registration is disabled")

    username = build_unique_username(db, req.username, req.email)
    invitation = None

    if req.inviteToken:
        invitation = resolve_pending_invitation_by_token(db, req.inviteToken)
        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
        if invitation.email.lower() != req.email.lower():
            raise HTTPException(status_code=400, detail="Invitation email does not match registration email")

    if req.username:
        db_user = get_user_by_username(db, req.username)
    else:
        db_user = None
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    db_user_email = get_user_by_email(db, req.email)
    if db_user_email:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        user_data = {
            "username": username,
            "email": req.email,
            "password": req.password,
            "role": "member",
            "first_name": req.firstName,
            "last_name": req.lastName,
            "phone": req.phone,
            "gender": req.gender,
            "date_of_birth": datetime.combine(req.dateOfBirth, datetime.min.time()),
        }
        user = create_user(db, user_data, commit=False)
        next_step = "setup_org"
        accepted_invitation = False

        if req.orgName and not invitation:
            from src.api.crud import create_organization, add_user_to_organization
            org = create_organization(
                db,
                {
                    "name": req.orgName,
                    "settings": {
                        "approval_status": "pending",
                        "requested_by_user_id": user.id,
                    },
                },
                commit=False,
            )
            add_user_to_organization(db, user.id, org.id, "member", commit=False)
            next_step = "pending_approval"

        if invitation:
            from src.api.crud import add_user_to_organization, add_user_to_group
            org_role = invitation.role if invitation.role in {"org-admin", "member", "viewer"} else "member"
            add_user_to_organization(db, user.id, invitation.organization_id, org_role, commit=False)
            if invitation.group_id:
                group_role = invitation.role if invitation.role in {"group-admin", "member", "viewer"} else "member"
                add_user_to_group(
                    db,
                    invitation.group_id,
                    user.id,
                    group_role,
                    invited_by=invitation.invited_by,
                    commit=False,
                )
            invitation.status = "accepted"
            invitation.accepted_at = datetime.utcnow()
            invitation.accepted_by = user.id
            accepted_invitation = True
            next_step = "dashboard"

        db.commit()
        user = db.query(models.User).options(
            joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
            joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group),
        ).filter(models.User.id == user.id).first()
    except Exception:
        db.rollback()
        raise

    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_payload(user),
        "nextStep": next_step,
        "acceptedInvitation": accepted_invitation,
    }

@app.post("/api/auth/login", response_model=Token)
async def login(req: schemas.UserLogin, db: Session = Depends(get_db)):
    # Find user by username or email with eager loading of memberships
    user = db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group),
    ).filter((models.User.username == req.username) | (models.User.email == req.username)).first()
    
    if not user or not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_payload(user),
    }


@app.post("/api/auth/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    response = {"message": "If the email exists, a reset code has been sent"}
    if not user:
        return response

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_minutes = 15
    expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)
    create_password_reset_otp(db, user.id, user.email, otp, expires_at)
    email_html = build_password_reset_email_html(otp, expires_minutes)
    email_sent = send_email(
        user.email,
        "MultiMinutes AI - Ma dat lai mat khau",
        email_html,
    )

    if not email_sent and config.environment == "production":
        raise HTTPException(status_code=503, detail="Unable to send reset email. Please try again later.")

    if config.environment != "production":
        response["dev_otp"] = otp
        if not email_sent:
            response["email_delivery"] = "failed_dev_mode"
    return response


@app.post("/api/auth/reset-password", response_model=schemas.MessageResponse)
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    now = datetime.utcnow()
    db_otp = get_valid_password_reset_otp(db, req.email, req.otp, now)
    if not db_otp:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    update_user(db, user.id, {"password": req.newPassword})
    mark_password_reset_otp_used(db, db_otp.id, now)
    return {"message": "Password reset successfully"}


@app.get("/api/profile")
@app.get("/api/auth/me")
def get_profile(current_user = Depends(auth.get_current_user)):
    return format_user_payload(current_user)


@app.patch("/api/profile")
def update_profile(
    updates: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    user = update_user(db, current_user.id, updates.model_dump(exclude_unset=True))
    return format_user_payload(user)


@app.post("/api/profile/change-password", response_model=schemas.MessageResponse)
def change_password(
    req: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if not auth.verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    update_user(db, current_user.id, {"password": req.new_password})
    return {"message": "Password changed successfully"}

# Organization Endpoints
@app.api_route("/api/organizations", methods=["GET", "POST"], response_model=Any)
@app.api_route("/api/organizations/", methods=["GET", "POST"], response_model=Any)
def organizations_endpoint(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    org_data: Optional[schemas.OrganizationCreate] = None,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if request.method == "GET":
        if current_user.role == "system-admin":
            orgs = get_organizations(db, skip=skip, limit=limit)
        else:
            orgs = [membership.organization for membership in current_user.user_organizations]
        return [schemas.Organization.model_validate(enrich_organization_payload(o)) for o in orgs]
    
    # POST - Create
    if not org_data:
        raise HTTPException(status_code=400, detail="Missing organization data")
    
    from src.api.crud import create_organization, add_user_to_organization
    org_payload = org_data.model_dump()
    if current_user.role == "system-admin":
        org_payload["settings"] = {
            **(org_payload.get("settings") or {}),
            "approval_status": "active",
            "approved_by_user_id": current_user.id,
            "approved_at": datetime.utcnow().isoformat(),
        }
        org = create_organization(db, org_payload)
        add_user_to_organization(db, current_user.id, org.id, "org-admin")
        append_admin_audit_log(
            actor=current_user.username,
            action="CREATE_ORGANIZATION",
            target=org.name,
            role="System Admin",
        )
    else:
        org_payload["settings"] = {
            **(org_payload.get("settings") or {}),
            "approval_status": "pending",
            "requested_by_user_id": current_user.id,
        }
        org = create_organization(db, org_payload)
        add_user_to_organization(db, current_user.id, org.id, "member")
        append_admin_audit_log(
            actor=current_user.username,
            action="REQUEST_ORGANIZATION_APPROVAL",
            target=org.name,
            role=current_user.role or "member",
        )
    db.refresh(org)
    return schemas.Organization.model_validate(enrich_organization_payload(org))


@app.post("/api/admin/organizations/{org_id}/approve", response_model=schemas.Organization)
def approve_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    if current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required")

    org = get_organization_by_id(db, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    current_settings = org.settings or {}
    requested_by_user_id = current_settings.get("requested_by_user_id")
    org.settings = {
        **current_settings,
        "approval_status": "active",
        "approved_by_user_id": current_user.id,
        "approved_at": datetime.utcnow().isoformat(),
    }

    if requested_by_user_id:
        membership = update_user_organization_role(db, requested_by_user_id, org.id, "org-admin")
        if not membership:
            from src.api.crud import add_user_to_organization

            add_user_to_organization(db, requested_by_user_id, org.id, "org-admin")

    db.commit()
    db.refresh(org)
    append_admin_audit_log(
        actor=current_user.username,
        action="APPROVE_ORGANIZATION",
        target=org.name,
        role="System Admin",
    )
    return schemas.Organization.model_validate(enrich_organization_payload(org))

@app.get("/api/organizations/{org_id}", response_model=schemas.Organization)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    org = auth.require_org_member(db, current_user, org_id)
    return schemas.Organization.model_validate(enrich_organization_payload(org))

@app.patch("/api/organizations/{org_id}", response_model=schemas.Organization)
def update_organization_endpoint(
    org_id: str,
    updates: schemas.OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_admin(db, current_user, org_id)
    org = update_organization(db, org_id, updates.model_dump(exclude_unset=True))
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_ORGANIZATION",
        target=org.name,
        role=current_user.role or "org-admin",
    )
    return schemas.Organization.model_validate(enrich_organization_payload(org))


@app.delete("/api/organizations/{org_id}")
def delete_organization_endpoint(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    auth.require_org_admin(db, current_user, org_id)
    org = get_organization_by_id(db, org_id)
    if not delete_organization(db, org_id):
        raise HTTPException(status_code=404, detail="Organization not found")
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_ORGANIZATION",
        target=org.name if org else org_id,
        role=current_user.role or "org-admin",
    )
    return {"message": "Organization deleted successfully"}


@app.get("/api/organizations/{org_id}/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_organization_users(
    org_id: str,
    q: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    auth.require_org_admin(db, current_user, org_id)
    query = q.strip().lower()
    if len(query) < 2:
        return []

    existing_member_user_ids = db.query(models.UserOrganization.user_id).filter(
        models.UserOrganization.organization_id == org_id
    )
    search_pattern = f"%{query}%"
    users = db.query(models.User).filter(
        models.User.is_active == True,
        ~models.User.id.in_(existing_member_user_ids),
        or_(
            models.User.email.ilike(search_pattern),
            models.User.username.ilike(search_pattern),
            models.User.first_name.ilike(search_pattern),
            models.User.last_name.ilike(search_pattern),
        ),
    ).order_by(models.User.email.asc()).limit(10).all()

    return [
        {
            "id": user.id,
            "email": user.email,
            "displayName": " ".join(
                part for part in [user.first_name, user.last_name] if part
            ) or user.username or user.email,
            "username": user.username,
            "avatarUrl": user.avatar_url,
        }
        for user in users
    ]


@app.get("/api/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_users_alias(
    organization_id: str,
    q: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    return search_invitable_organization_users(
        org_id=organization_id,
        q=q,
        db=db,
        current_user=current_user,
    )


# Invitation Endpoints
@app.post("/api/invitations", response_model=schemas.InvitationCreateResponse)
def create_invitation_endpoint(
    inv_data: schemas.InvitationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_admin(db, current_user, inv_data.organization_id)
    invite_email = inv_data.email.lower()

    target_group = None
    if inv_data.group_id:
        target_group = db.query(models.Group).filter(
            models.Group.id == inv_data.group_id,
            models.Group.organization_id == inv_data.organization_id,
        ).first()
        if not target_group:
            raise HTTPException(status_code=400, detail="Group does not belong to this organization")

    target_user = db.query(models.User).filter(models.User.email == invite_email).first()
    existing_member = db.query(models.UserOrganization).join(models.User).filter(
        models.User.email == invite_email,
        models.UserOrganization.organization_id == inv_data.organization_id,
    ).first()
    if existing_member:
        raise HTTPException(status_code=409, detail="User already belongs to this organization")

    organization = db.query(models.Organization).filter(models.Organization.id == inv_data.organization_id).first()
    existing_invite = db.query(models.Invitation).filter(
        models.Invitation.email == invite_email,
        models.Invitation.organization_id == inv_data.organization_id,
        models.Invitation.status == "pending",
        models.Invitation.group_id == inv_data.group_id,
    ).first()
    if existing_invite:
        if target_user:
            create_persisted_notification(
                db,
                recipient_user_id=target_user.id,
                notification_type="invitation",
                priority="today",
                title="Bạn có lời mời tham gia tổ chức",
                message=f"{current_user.email} đã mời bạn tham gia {organization.name if organization else 'tổ chức'}.",
                metadata={
                    "invitationId": existing_invite.id,
                    "organizationId": existing_invite.organization_id,
                    "organizationName": organization.name if organization else None,
                    "role": existing_invite.role,
                    "type": "invitation",
                },
                source_type="invitation",
                source_id=existing_invite.id,
            )
        return {
            "message": "Invitation is already pending",
            "email": invite_email,
            "organization_id": existing_invite.organization_id,
            "expires_at": existing_invite.expires_at,
            "invitation_id": existing_invite.id,
            "emailSent": False,
            "alreadyPending": True,
        }

    token = secrets.token_urlsafe(32)
    token_hash = auth.get_password_hash(token)
    token_sha256 = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = models.Invitation(
        email=invite_email,
        organization_id=inv_data.organization_id,
        group_id=inv_data.group_id,
        role=inv_data.role,
        token_hash=token_hash,
        token_sha256=token_sha256,
        expires_at=expires_at,
        invited_by=current_user.id,
        status="pending"
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    invite_url = f"{FRONTEND_URL.rstrip('/')}/invite?token={token}"
    email_html = build_invitation_email_html(
        organization.name if organization else "tổ chức của bạn",
        inv_data.role,
        invite_url,
    )
    subject = f"Lời mời tham gia {organization.name if organization else 'MultiMinutes AI'}"
    email_sent = send_email(invite_email, subject, email_html)
    if target_user:
        create_persisted_notification(
            db,
            recipient_user_id=target_user.id,
            notification_type="invitation",
            priority="today",
            title="Bạn có lời mời tham gia tổ chức",
            message=f"{current_user.email} đã mời bạn tham gia {organization.name if organization else 'tổ chức'}.",
            metadata={
                "invitationId": invitation.id,
                "organizationId": invitation.organization_id,
                "organizationName": organization.name if organization else None,
                "role": invitation.role,
                "type": "invitation",
            },
            source_type="invitation",
            source_id=invitation.id,
        )
    elif not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send invitation email")
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_ORG_INVITATION" if not target_user else "CREATE_REGISTERED_USER_INVITATION",
        target=f"{inv_data.email} -> {target_group.name if target_group else inv_data.organization_id}",
        role=current_user.role or "org-admin",
    )

    return {
        "message": "Invitation email sent successfully",
        "email": invite_email,
        "organization_id": inv_data.organization_id,
        "expires_at": expires_at,
        "invitation_id": invitation.id,
        "emailSent": email_sent,
        "alreadyPending": False,
    }


@app.get("/api/invitations/preview", response_model=schemas.InvitationPreview)
def preview_invitation(token: str, db: Session = Depends(get_db)):
    invitation = resolve_pending_invitation_by_token(db, token)
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")
    return invitation_preview_payload(invitation)


@app.get("/api/invitations/pending")
def list_my_pending_invitations(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    now = datetime.utcnow()
    invitations = db.query(models.Invitation).options(
        joinedload(models.Invitation.organization)
    ).filter(
        models.Invitation.email == current_user.email,
        models.Invitation.status == "pending",
    ).order_by(models.Invitation.created_at.desc()).all()

    pending_items = []
    changed = False
    for invitation in invitations:
        if invitation.expires_at < now:
            invitation.status = "expired"
            changed = True
            continue

        pending_items.append(
            {
                "id": invitation.id,
                "email": invitation.email,
                "organization_id": invitation.organization_id,
                "organization_name": invitation.organization.name if invitation.organization else None,
                "role": invitation.role,
                "expires_at": invitation.expires_at,
                "created_at": invitation.created_at,
            }
        )

    if changed:
        db.commit()

    return pending_items


@app.post("/api/invitations/accept", response_model=schemas.InvitationAcceptResponse)
def accept_invitation_endpoint(
    req: schemas.InvitationAccept,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    invitation = resolve_pending_invitation_by_token(db, req.token)
    if not invitation:
        token_sha256 = hashlib.sha256(req.token.encode("utf-8")).hexdigest()
        accepted_invitation = db.query(models.Invitation).filter(
            models.Invitation.token_sha256 == token_sha256,
            models.Invitation.status == "accepted",
            models.Invitation.accepted_by == current_user.id,
        ).first()
        if accepted_invitation:
            return {
                "message": "Successfully joined the organization",
                "organization_id": accepted_invitation.organization_id,
            }
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")

    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=400, detail="This invitation was sent to a different email address")

    existing_membership = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == current_user.id,
        models.UserOrganization.organization_id == invitation.organization_id,
    ).first()

    if not existing_membership:
        from src.api.crud import add_user_to_organization
        org_role = invitation.role if invitation.role in {"org-admin", "member", "viewer"} else "member"
        add_user_to_organization(db, current_user.id, invitation.organization_id, org_role)

    if invitation.group_id:
        from src.api.crud import add_user_to_group
        group_role = invitation.role if invitation.role in {"group-admin", "member", "viewer"} else "member"
        add_user_to_group(
            db,
            invitation.group_id,
            current_user.id,
            group_role,
            invited_by=invitation.invited_by,
        )

    invitation.status = "accepted"
    invitation.accepted_at = datetime.utcnow()
    invitation.accepted_by = current_user.id
    db.commit()

    return {
        "message": "Successfully joined the organization",
        "organization_id": invitation.organization_id,
    }


@app.post("/api/invitations/{invitation_id}/accept", response_model=schemas.InvitationAcceptResponse)
def accept_invitation_by_id(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    invitation = db.query(models.Invitation).filter(models.Invitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if invitation.status == "accepted" and invitation.accepted_by == current_user.id:
        return {
            "message": "Successfully joined the organization",
            "organization_id": invitation.organization_id,
        }
    if invitation.status != "pending":
        raise HTTPException(status_code=400, detail="Invitation is no longer pending")
    if invitation.expires_at < datetime.utcnow():
        invitation.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=400, detail="This invitation was sent to a different email address")

    existing_membership = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == current_user.id,
        models.UserOrganization.organization_id == invitation.organization_id,
    ).first()

    if not existing_membership:
        from src.api.crud import add_user_to_organization
        org_role = invitation.role if invitation.role in {"org-admin", "member", "viewer"} else "member"
        add_user_to_organization(db, current_user.id, invitation.organization_id, org_role)

    if invitation.group_id:
        from src.api.crud import add_user_to_group
        group_role = invitation.role if invitation.role in {"group-admin", "member", "viewer"} else "member"
        add_user_to_group(
            db,
            invitation.group_id,
            current_user.id,
            group_role,
            invited_by=invitation.invited_by,
        )

    invitation.status = "accepted"
    invitation.accepted_at = datetime.utcnow()
    invitation.accepted_by = current_user.id
    db.commit()

    return {
        "message": "Successfully joined the organization",
        "organization_id": invitation.organization_id,
    }


@app.get("/api/organizations/{org_id}/members", response_model=List[Dict[str, Any]])
def list_organization_members(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_member(db, current_user, org_id)
    members = db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group),
    ).join(models.UserOrganization).filter(models.UserOrganization.organization_id == org_id).all()
    return [format_user_payload(member) for member in members]

# Group Endpoints
@app.get("/api/groups", response_model=List[schemas.Group])
def list_groups(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_member(db, current_user, org_id)
    groups = get_groups_by_org(db, org_id)
    visible_groups = []
    for group in groups:
        if group.privacy_level != "private":
            visible_groups.append(group)
            continue
        if current_user.role == "system-admin":
            visible_groups.append(group)
            continue
        org_role = auth.get_user_org_role(db, current_user, org_id)
        group_role = auth.get_user_group_role(db, current_user, group.id)
        if org_role == "org-admin" or group_role:
            visible_groups.append(group)
    return [schemas.Group.model_validate(enrich_group_payload(group)) for group in visible_groups]


@app.get("/api/groups/{group_id}", response_model=schemas.Group)
def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_member(db, current_user, group_id)
    group = get_group_by_id(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return schemas.Group.model_validate(enrich_group_payload(group))


@app.post("/api/groups", response_model=schemas.Group)
def create_group_endpoint(
    group_data: schemas.GroupCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_admin(db, current_user, group_data.organization_id)
    group = create_group(db, group_data.model_dump(), created_by=current_user.id)
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_GROUP",
        target=group.name,
        role=current_user.role or "org-admin",
    )
    return schemas.Group.model_validate(enrich_group_payload(group))


@app.patch("/api/groups/{group_id}", response_model=schemas.Group)
def update_group_endpoint(
    group_id: str,
    updates: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_admin(db, current_user, group_id)
    group = update_group(db, group_id, updates.model_dump(exclude_unset=True))
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_GROUP",
        target=group.name,
        role=current_user.role or "group-admin",
    )
    return schemas.Group.model_validate(enrich_group_payload(group))


@app.delete("/api/groups/{group_id}")
def delete_group_endpoint(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_admin(db, current_user, group_id)
    group = get_group_by_id(db, group_id)
    if not delete_group(db, group_id):
        raise HTTPException(status_code=404, detail="Group not found")
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_GROUP",
        target=group.name if group else group_id,
        role=current_user.role or "group-admin",
    )
    return {"message": "Group deleted successfully"}


@app.get("/api/groups/{group_id}/members", response_model=List[schemas.GroupMember])
def list_group_members(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_member(db, current_user, group_id)
    return [group_member_payload(membership) for membership in get_group_memberships(db, group_id)]


@app.get("/api/groups/{group_id}/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_group_users(
    group_id: str,
    q: str = "",
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    group = auth.require_group_admin(db, current_user, group_id)
    query = q.strip().lower()

    existing_group_user_ids = db.query(models.GroupMembership.user_id).filter(
        models.GroupMembership.group_id == group_id,
    )
    filters = [
        models.UserOrganization.organization_id == group.organization_id,
        models.User.is_active == True,
        ~models.User.id.in_(existing_group_user_ids),
    ]
    if len(query) >= 2:
        search_pattern = f"%{query}%"
        filters.append(
            or_(
                models.User.email.ilike(search_pattern),
                models.User.username.ilike(search_pattern),
                models.User.first_name.ilike(search_pattern),
                models.User.last_name.ilike(search_pattern),
            )
        )

    users = db.query(models.User).join(models.UserOrganization).filter(
        *filters,
    ).order_by(models.User.email.asc()).limit(20).all()

    return [
        {
            "id": user.id,
            "email": user.email,
            "displayName": " ".join(
                part for part in [user.first_name, user.last_name] if part
            ) or user.username or user.email,
            "username": user.username,
            "avatarUrl": user.avatar_url,
        }
        for user in users
    ]


@app.post("/api/groups/{group_id}/members", response_model=schemas.GroupMembership)
def add_group_member(
    group_id: str,
    membership: schemas.GroupMembershipCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    group = auth.require_group_admin(db, current_user, group_id)
    if membership.role not in {"member", "group-admin"}:
        raise HTTPException(status_code=400, detail="Only member or group-admin can be assigned when adding a group member")
    current_org_role = auth.get_user_org_role(db, current_user, group.organization_id)
    if membership.role == "group-admin" and current_org_role not in {"system-admin", "org-admin"}:
        raise HTTPException(status_code=403, detail="Only organization admins can grant group-admin role")
    user = get_user_by_id(db, membership.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not auth.get_user_org_role(db, user, group.organization_id):
        raise HTTPException(status_code=400, detail="User must belong to the group organization")
    existing_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user.id,
    ).first()
    if existing_membership:
        raise HTTPException(status_code=409, detail="Người dùng đã ở trong nhóm này rồi.")

    created_membership = add_user_to_group(db, group_id, user.id, membership.role, invited_by=current_user.id)
    create_persisted_notification(
        db,
        recipient_user_id=user.id,
        notification_type="user",
        priority="today",
        title="Bạn đã được thêm vào nhóm",
        message=f"{current_user.email} đã thêm bạn vào nhóm {group.name}.",
        metadata={
            "groupId": group.id,
            "groupName": group.name,
            "organizationId": group.organization_id,
            "role": membership.role,
            "type": "group-member-added",
        },
        source_type="group-membership",
        source_id=created_membership.id,
    )
    append_admin_audit_log(
        actor=current_user.username,
        action="ADD_GROUP_MEMBER",
        target=f"{user.email} -> {group.name}",
        role=current_user.role or "group-admin",
    )
    return created_membership


@app.post("/api/groups/{group_id}/members/invite-by-email", response_model=schemas.GroupMembership)
def add_group_member_by_email(
    group_id: str,
    payload: GroupInviteByEmailRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    group = auth.require_group_admin(db, current_user, group_id)
    email = (payload.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if payload.role not in {"member", "group-admin"}:
        raise HTTPException(status_code=400, detail="Only member or group-admin can be assigned when adding a group member")
    current_org_role = auth.get_user_org_role(db, current_user, group.organization_id)
    if payload.role == "group-admin" and current_org_role not in {"system-admin", "org-admin"}:
        raise HTTPException(status_code=403, detail="Only organization admins can grant group-admin role")

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="Email này chưa có tài khoản. Hãy mời vào tổ chức trước.",
        )

    if not auth.get_user_org_role(db, user, group.organization_id):
        raise HTTPException(
            status_code=400,
            detail="Người dùng chưa thuộc tổ chức. Hãy mời vào tổ chức trước.",
        )

    existing_membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user.id,
    ).first()
    if existing_membership:
        raise HTTPException(status_code=409, detail="Người dùng đã ở trong nhóm này rồi.")

    membership = add_user_to_group(db, group_id, user.id, payload.role, invited_by=current_user.id)
    create_persisted_notification(
        db,
        recipient_user_id=user.id,
        notification_type="user",
        priority="today",
        title="Bạn đã được thêm vào nhóm",
        message=f"{current_user.email} đã thêm bạn vào nhóm {group.name}.",
        metadata={
            "groupId": group.id,
            "groupName": group.name,
            "organizationId": group.organization_id,
            "role": payload.role,
            "type": "group-member-added",
        },
        source_type="group-membership",
        source_id=membership.id,
    )
    append_admin_audit_log(
        actor=current_user.username,
        action="ADD_GROUP_MEMBER",
        target=f"{email} -> {group.name}",
        role=current_user.role or "group-admin",
    )
    return membership


@app.patch("/api/groups/{group_id}/members/{user_id}", response_model=schemas.GroupMembership)
def update_group_member(
    group_id: str,
    user_id: str,
    updates: schemas.GroupMembershipUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_admin(db, current_user, group_id)
    membership = update_group_membership(db, group_id, user_id, updates.model_dump(exclude_unset=True))
    if not membership:
        raise HTTPException(status_code=404, detail="Group membership not found")
    return membership


@app.delete("/api/groups/{group_id}/members/{user_id}")
def delete_group_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_group_admin(db, current_user, group_id)
    if not remove_user_from_group(db, group_id, user_id):
        raise HTTPException(status_code=404, detail="Group membership not found")
    return {"message": "Group member removed successfully"}

# ==================== Group Messages ====================

@app.get("/api/groups/{group_id}/messages", response_model=List[schemas.GroupMessage])
def get_group_messages_endpoint(
    group_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Chat is only for actual group members (or system-admin)
    auth.require_strict_group_member(db, current_user, group_id)
    return get_group_messages(db, group_id, limit, offset)

@app.post("/api/groups/{group_id}/messages", response_model=schemas.GroupMessage)
def create_group_message_endpoint(
    group_id: str,
    message: schemas.GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Chat is only for actual group members (or system-admin)
    group = auth.require_strict_group_member(db, current_user, group_id)
    created_message = create_group_message(db, group_id, current_user.id, message.text, reply_to_id=message.reply_to_id)

    actor_name = current_user.first_name or current_user.username or current_user.email
    memberships = db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id
    ).all()
    recipient_ids = {
        membership.user_id
        for membership in memberships
        if membership.user_id != current_user.id
    }

    timestamp = datetime.utcnow().isoformat()
    for recipient_id in recipient_ids:
        push_runtime_notification(
            {
                "id": f"group-message-{created_message.id}-{recipient_id}",
                "type": "mention",
                "priority": "today",
                "title": "Tin nhan moi trong team",
                "message": f'{actor_name} vua gui tin nhan moi trong team "{group.name}".',
                "timestamp": timestamp,
                "isRead": False,
                "metadata": {
                    "group": group.name,
                    "group_id": group.id,
                    "message_id": created_message.id,
                },
                "recipient_user_id": recipient_id,
            }
        )

    return created_message


@app.get("/api/groups/{group_id}/messages/latest", response_model=Optional[schemas.GroupMessage])
def get_latest_group_message_endpoint(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_strict_group_member(db, current_user, group_id)
    return (
        db.query(models.GroupMessage)
        .options(joinedload(models.GroupMessage.user))
        .filter(models.GroupMessage.group_id == group_id)
        .order_by(models.GroupMessage.created_at.desc())
        .first()
    )

@app.patch("/api/groups/messages/{message_id}", response_model=schemas.GroupMessage)
def update_group_message_endpoint(
    message_id: str,
    updates: schemas.GroupMessageUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Retrieve message to check ownership
    db_message = db.query(models.GroupMessage).filter(models.GroupMessage.id == message_id).first()
    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")
    auth.require_strict_group_member(db, current_user, db_message.group_id)

    if db_message.user_id != current_user.id:
        # Check if user is group admin (admins can pin/unpin)
        auth.require_group_admin(db, current_user, db_message.group_id)

    return update_group_message(db, message_id, updates.model_dump(exclude_unset=True))

@app.delete("/api/groups/messages/{message_id}")
def delete_group_message_endpoint(
    message_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Retrieve message to check ownership
    db_message = db.query(models.GroupMessage).filter(models.GroupMessage.id == message_id).first()
    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")
    auth.require_strict_group_member(db, current_user, db_message.group_id)
    
    if db_message.user_id != current_user.id:
        # Admins can also delete messages
        auth.require_group_admin(db, current_user, db_message.group_id)
        
    success = delete_group_message(db, message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted"}

# Meeting Endpoints
@app.get("/api/meetings", response_model=List[schemas.Meeting])
def list_meetings(
    organization_id: Optional[str] = None,
    group_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    query = db.query(models.Meeting)

    if group_id:
        group = auth.require_group_member(db, current_user, group_id)
        organization_id = organization_id or group.organization_id
        query = query.filter(models.Meeting.group_id == group_id)
    elif organization_id:
        auth.require_org_member(db, current_user, organization_id)
        query = query.filter(models.Meeting.organization_id == organization_id)
    elif current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            return []
        query = query.filter(models.Meeting.organization_id.in_(org_ids))

    # Filter by status if provided
    if status:
        query = query.filter(models.Meeting.status == status)

    can_view_all = current_user.role == "system-admin"
    if not can_view_all and organization_id:
        can_view_all = auth.get_user_org_role(db, current_user, organization_id) == "org-admin"
    if not can_view_all and group_id:
        can_view_all = auth.get_user_group_role(db, current_user, group_id) == "group-admin"

    # Regular users can only see meetings they created or are invited to.
    if not can_view_all:
        participant_meeting_ids = db.query(models.MeetingParticipant.meeting_id).filter(
            models.MeetingParticipant.user_id == current_user.id
        ).subquery()
        query = query.filter(
            or_(
                models.Meeting.created_by == current_user.id,
                models.Meeting.id.in_(participant_meeting_ids)
            )
        )

    meetings = query.options(
        joinedload(models.Meeting.organization),
        joinedload(models.Meeting.group),
        joinedload(models.Meeting.created_by_user),
        joinedload(models.Meeting.summaries),
        joinedload(models.Meeting.action_items),
    ).order_by(models.Meeting.created_at.desc()).offset(skip).limit(limit).all()

    # Enrich with computed fields for list view
    user_lang = getattr(current_user, "language", None) or "vi"
    for m in meetings:
        m.group_name = m.group.name if m.group else None
        m.organization_name = m.organization.name if m.organization else None
        m.action_items_count = len(m.action_items) if m.action_items else 0
        if m.summaries:
            # Prefer summary in user's language, fall back to any
            lang_match = [s for s in m.summaries if (s.language or "vi") == user_lang]
            pool = lang_match if lang_match else m.summaries
            latest = max(pool, key=lambda s: s.created_at or s.id)
            m.summary_text = latest.meeting_summary
            m.key_points_list = latest.key_points if isinstance(latest.key_points, list) else []
            m.decisions_list = latest.decisions if isinstance(latest.decisions, list) else []

    return meetings


@app.get("/api/meetings/by-code/{meeting_code}", response_model=schemas.MeetingDetailResponse)
def get_meeting_by_code(
    meeting_code: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    meeting = db.query(models.Meeting).options(
        joinedload(models.Meeting.organization),
        joinedload(models.Meeting.group).joinedload(models.Group.memberships),
        joinedload(models.Meeting.created_by_user),
        joinedload(models.Meeting.participants).joinedload(models.MeetingParticipant.user),
        joinedload(models.Meeting.audio_files),
        joinedload(models.Meeting.transcripts).joinedload(models.Transcript.segments),
        joinedload(models.Meeting.summaries),
        joinedload(models.Meeting.action_items),
        joinedload(models.Meeting.speaker_mappings),
    ).filter(models.Meeting.code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    user_lang = getattr(current_user, "language", None) or "vi"
    return schemas.MeetingDetailResponse.model_validate(build_meeting_detail_payload(meeting, user_lang))


@app.get("/api/meetings/{meeting_id}", response_model=schemas.MeetingDetailResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    user_lang = getattr(current_user, "language", None) or "vi"
    return schemas.MeetingDetailResponse.model_validate(build_meeting_detail_payload(meeting, user_lang))


@app.get("/api/meetings/{meeting_id}/my-status")
def get_my_meeting_status(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    """Get current user's participant status for a meeting."""
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)

    participant = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == meeting_id,
        models.MeetingParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        return {"is_participant": False, "invite_status": None, "role": None}

    return {
        "is_participant": True,
        "invite_status": participant.invite_status,
        "role": participant.role,
        "participant_id": participant.id,
    }


@app.get("/api/meetings/{meeting_id}/messages", response_model=List[schemas.MeetingMessage])
def list_meeting_messages(
    meeting_id: str,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    messages = db.query(models.MeetingMessage).options(
        joinedload(models.MeetingMessage.user)
    ).filter(
        models.MeetingMessage.meeting_id == meeting_id
    ).order_by(models.MeetingMessage.created_at.asc()).offset(offset).limit(limit).all()
    return [format_meeting_message_payload(message) for message in messages]


@app.post("/api/meetings/{meeting_id}/messages", response_model=schemas.MeetingMessage)
async def create_meeting_message_endpoint(
    meeting_id: str,
    message: schemas.MeetingMessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    text = message.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    db_message = models.MeetingMessage(
        meeting_id=meeting_id,
        user_id=current_user.id,
        text=text,
        message_type=message.message_type,
        reply_to_id=message.reply_to_id,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    db_message = db.query(models.MeetingMessage).options(
        joinedload(models.MeetingMessage.user)
    ).filter(models.MeetingMessage.id == db_message.id).first()
    payload = format_meeting_message_payload(db_message)
    await meeting_room_manager.broadcast(meeting_id, {"type": "chat.message", "message": payload})
    return payload


@app.get("/api/meetings/{meeting_id}/speaker-mappings", response_model=List[schemas.MeetingSpeakerMapping])
def list_meeting_speaker_mappings(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    mappings = db.query(models.MeetingSpeakerMapping).filter(
        models.MeetingSpeakerMapping.meeting_id == meeting_id
    ).order_by(models.MeetingSpeakerMapping.speaker_label.asc()).all()
    return [speaker_mapping_payload(mapping) for mapping in mappings]


@app.patch("/api/meetings/{meeting_id}/speaker-mappings/{speaker_label}", response_model=schemas.MeetingSpeakerMapping)
async def update_meeting_speaker_mapping(
    meeting_id: str,
    speaker_label: str,
    payload: schemas.MeetingSpeakerMappingUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    normalized_label = normalize_speaker_label(speaker_label)
    user_id = payload.user_id
    if user_id:
        participant = db.query(models.MeetingParticipant).filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.user_id == user_id,
        ).first()
        if not participant:
            raise HTTPException(status_code=400, detail="Selected user is not a meeting participant")
    mapping = ensure_speaker_mapping(db, meeting_id, normalized_label)
    mapping.display_name = payload.display_name.strip()
    mapping.user_id = user_id
    db.commit()
    db.refresh(mapping)
    response_payload = speaker_mapping_payload(mapping)
    await meeting_room_manager.broadcast(
        meeting_id,
        {"type": "speaker.mapping_updated", "mapping": response_payload},
    )
    return response_payload


@app.websocket("/api/meetings/{meeting_id}/stream")
async def meeting_room_stream(
    websocket: WebSocket,
    meeting_id: str,
    token: Optional[str] = Query(None),
):
    db = SessionLocal()
    current_user: Optional[models.User] = None
    meeting: Optional[models.Meeting] = None
    connected = False
    try:
        header_token = websocket.headers.get("authorization")
        current_user = get_ws_user(db, token or header_token)
        meeting = get_meeting_by_id(db, meeting_id)
        if not meeting:
            await websocket.close(code=1008, reason="Meeting not found")
            return
        auth.require_org_member(db, current_user, meeting.organization_id)
        user_payload = format_user_payload(current_user)
        await meeting_room_manager.connect(meeting_id, websocket, user_payload)
        connected = True
        # Send current participant list to the newly connected user
        current_participants = meeting_room_manager.get_participants(meeting_id)
        await websocket.send_json({
            "type": "participant.list",
            "participants": current_participants,
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Broadcast join to all (including sender)
        await meeting_room_manager.broadcast(
            meeting_id,
            {
                "type": "participant.joined",
                "meeting_id": meeting_id,
                "user": user_payload,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")
            if event_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
            elif event_type == "chat.send":
                text = str(data.get("text") or "").strip()
                if not text:
                    continue
                db_message = models.MeetingMessage(
                    meeting_id=meeting_id,
                    user_id=current_user.id,
                    text=text[:4000],
                    message_type="chat",
                    reply_to_id=data.get("reply_to_id"),
                )
                db.add(db_message)
                db.commit()
                db.refresh(db_message)
                db_message = db.query(models.MeetingMessage).options(
                    joinedload(models.MeetingMessage.user)
                ).filter(models.MeetingMessage.id == db_message.id).first()
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {"type": "chat.message", "message": format_meeting_message_payload(db_message)},
                )
            elif event_type == "participant.state":
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {
                        "type": "participant.state",
                        "meeting_id": meeting_id,
                        "user_id": current_user.id,
                        "micOn": bool(data.get("micOn", True)),
                        "cameraOn": bool(data.get("cameraOn", True)),
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
    except WebSocketDisconnect:
        pass
    except HTTPException as exc:
        if not connected:
            await websocket.close(code=1008, reason=str(exc.detail))
    except Exception as exc:
        logger.error("Meeting websocket error: %s", exc, exc_info=True)
        if not connected:
            await websocket.close(code=1011, reason="WebSocket error")
    finally:
        if connected:
            await meeting_room_manager.disconnect(meeting_id, websocket)
            if current_user:
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {
                        "type": "participant.left",
                        "meeting_id": meeting_id,
                        "user": format_user_payload(current_user),
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
        db.close()


@app.post("/api/meetings", response_model=schemas.Meeting)
def create_meeting_endpoint(
    meeting_data: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_member(db, current_user, meeting_data.organization_id)
    if meeting_data.group_id:
        group = auth.require_group_member(db, current_user, meeting_data.group_id)
        if group.organization_id != meeting_data.organization_id:
            raise HTTPException(status_code=400, detail="Group does not belong to organization")

    scheduled_start = normalize_meeting_datetime(meeting_data.scheduled_start)
    scheduled_end = normalize_meeting_datetime(meeting_data.scheduled_end)

    is_instant = meeting_data.status == "live"

    # For instant meetings: set actual_start if no scheduled_start provided
    if is_instant and not scheduled_start:
        scheduled_start = datetime.utcnow()
        if not scheduled_end:
            scheduled_end = scheduled_start  # duration tracked via actual_start/actual_end

    # Block meetings in the past (skip for instant live meetings)
    if not is_instant and scheduled_start:
        if scheduled_start < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Không thể tạo cuộc họp trong quá khứ")

    # scheduled_end must be after scheduled_start (skip for instant)
    if not is_instant and scheduled_start and scheduled_end:
        if scheduled_end <= scheduled_start:
            raise HTTPException(status_code=400, detail="Thời gian kết thúc phải sau thời gian bắt đầu")

    # Block if any participant has an overlapping meeting (skip for instant)
    if not is_instant and scheduled_start and scheduled_end:
        all_participant_ids = list(set([current_user.id] + (meeting_data.participant_ids or [])))
        conflicts = check_meeting_overlap(
            db,
            participant_ids=all_participant_ids,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
        )
        if conflicts:
            titles = ", ".join(c["meeting_title"] for c in conflicts)
            raise HTTPException(
                status_code=409,
                detail=f"Trùng lịch với: {titles}. Vui lòng chọn giờ khác.",
            )

    meeting_payload = meeting_data.model_dump()
    meeting_payload["scheduled_start"] = scheduled_start
    meeting_payload["scheduled_end"] = scheduled_end
    if is_instant and not meeting_payload.get("actual_start"):
        meeting_payload["actual_start"] = datetime.utcnow()
    meeting = create_meeting(db, meeting_payload, created_by=current_user.id)

    # Determine invite_status based on meeting type
    participant_invite_status = "accepted" if is_instant else "pending"

    # Add creator as host participant
    add_meeting_participant(db, meeting.id, user_id=current_user.id, role="HOST", invite_status="accepted")

    # Add invited participants by user ID
    if meeting_data.participant_ids:
        for uid in meeting_data.participant_ids:
            if uid != current_user.id:
                add_meeting_participant(db, meeting.id, user_id=uid, role="PARTICIPANT", invite_status=participant_invite_status)

    # Add invited participants by email
    if meeting_data.participant_emails:
        for email in meeting_data.participant_emails:
            add_meeting_participant(db, meeting.id, email=email, role="PARTICIPANT", invite_status=participant_invite_status)

    # Notify invited participants (in-app)
    if not is_instant and meeting_data.participant_ids:
        for uid in meeting_data.participant_ids:
            if uid != current_user.id:
                push_runtime_notification({
                    "id": f"runtime-invite-{meeting.id}-{uid}-{int(datetime.utcnow().timestamp())}",
                    "recipient_user_id": uid,
                    "type": "meeting_invite",
                    "priority": "today",
                    "title": "Lời mời tham gia cuộc họp",
                    "message": f"Bạn được mời tham gia \"{meeting.title}\".",
                    "timestamp": datetime.utcnow().isoformat(),
                    "isRead": False,
                    "metadata": {"meeting_id": meeting.id},
                })

    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_MEETING",
        target=meeting.title,
        role=current_user.role or "member",
    )

    if current_user.role != "system-admin":
        recipient_ids = get_org_admin_recipient_ids(db, meeting.organization_id, current_user.id)
        actor_name = current_user.first_name or current_user.username or current_user.email
        for recipient_id in recipient_ids:
            push_runtime_notification(
                {
                    "id": f"runtime-create-{meeting.id}-{recipient_id}-{int(datetime.utcnow().timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "today",
                    "title": "Nhân viên vừa tạo cuộc họp mới",
                    "message": f"{actor_name} đã lên lịch \"{meeting.title}\".",
                    "timestamp": datetime.utcnow().isoformat(),
                    "isRead": False,
                    "metadata": {"group": meeting.group.name if meeting.group else None, "meeting_id": meeting.id},
                }
            )

    return meeting


@app.post("/api/meetings/{meeting_id}/start", response_model=schemas.Meeting)
async def start_meeting_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    require_meeting_manager(db, current_user, meeting)

    if meeting.status in {"completed", "failed", "canceled", "processing"}:
        raise HTTPException(status_code=400, detail=f"Cannot start meeting with status '{meeting.status}'")

    now = datetime.utcnow()
    updates = {
        "actual_start": meeting.actual_start or now,
        "scheduled_start": meeting.scheduled_start or now,
        "scheduled_end": meeting.scheduled_end or (now + timedelta(hours=1)),
    }
    if meeting.status == "upcoming":
        updates["status"] = "live"

    try:
        updated = update_meeting(db, meeting_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await meeting_room_manager.broadcast(
        meeting_id,
        {"type": "meeting.status", "meeting_id": meeting_id, "status": updated.status, "timestamp": datetime.utcnow().isoformat()},
    )
    return updated


@app.post("/api/meetings/{meeting_id}/end", response_model=schemas.Meeting)
async def end_meeting_endpoint(
    meeting_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    require_meeting_manager(db, current_user, meeting)

    try:
        body = await request.json()
    except Exception:
        body = {}
    target_status = body.get("status") or "processing"
    if target_status not in {"processing", "completed", "failed"}:
        raise HTTPException(status_code=400, detail="Invalid meeting end status")

    if meeting.status in {"completed", "failed", "canceled"}:
        return meeting

    now = datetime.utcnow()
    if meeting.status == "upcoming":
        try:
            meeting = update_meeting(
                db,
                meeting_id,
                {
                    "actual_start": meeting.actual_start or now,
                    "scheduled_start": meeting.scheduled_start or now,
                    "scheduled_end": meeting.scheduled_end or (now + timedelta(hours=1)),
                    "status": "live",
                },
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    start = meeting.actual_start or meeting.scheduled_start or meeting.created_at or now
    duration = max(0, int((now - start).total_seconds() / 60))
    updates = {
        "actual_end": now,
        "duration": duration,
        "status": target_status,
    }
    try:
        updated = update_meeting(db, meeting_id, updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await meeting_room_manager.broadcast(
        meeting_id,
        {"type": "meeting.status", "meeting_id": meeting_id, "status": updated.status, "timestamp": datetime.utcnow().isoformat()},
    )
    return updated


@app.put("/api/meetings/{meeting_id}", response_model=schemas.Meeting)
def update_meeting_endpoint(
    meeting_id: str,
    meeting_data: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    existing = get_meeting_by_id(db, meeting_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, existing.organization_id)
    require_meeting_manager(db, current_user, existing)
    updates = meeting_data.model_dump(exclude_unset=True)
    if "scheduled_start" in updates:
        updates["scheduled_start"] = normalize_meeting_datetime(updates["scheduled_start"])
    if "scheduled_end" in updates:
        updates["scheduled_end"] = normalize_meeting_datetime(updates["scheduled_end"])

    # Validate time range if either is being updated
    if "scheduled_start" in updates or "scheduled_end" in updates:
        start = updates.get("scheduled_start", existing.scheduled_start)
        end = updates.get("scheduled_end", existing.scheduled_end)
        if start and end and end <= start:
            raise HTTPException(status_code=400, detail="Thời gian kết thúc phải sau thời gian bắt đầu")
        if start and start < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Không thể chuyển cuộc họp về thời gian trong quá khứ")

    if updates.get("group_id"):
        group = auth.require_group_member(db, current_user, updates["group_id"])
        if group.organization_id != existing.organization_id:
            raise HTTPException(status_code=400, detail="Group does not belong to organization")

    # Handle participant updates separately
    participant_ids = updates.pop("participant_ids", None)

    # Block if any participant has an overlapping meeting (excluding this meeting)
    start = updates.get("scheduled_start", existing.scheduled_start)
    end = updates.get("scheduled_end", existing.scheduled_end)
    check_ids = list(set([existing.created_by] + (participant_ids or [p.user_id for p in existing.participants if p.user_id])))
    if start and end and check_ids:
        conflicts = check_meeting_overlap(db, participant_ids=check_ids, scheduled_start=start, scheduled_end=end, exclude_meeting_id=meeting_id)
        if conflicts:
            titles = ", ".join(c["meeting_title"] for c in conflicts)
            raise HTTPException(status_code=409, detail=f"Trùng lịch với: {titles}. Vui lòng chọn giờ khác.")
    if participant_ids is not None:
        existing_participant_ids = {p.user_id for p in existing.participants if p.user_id}
        new_participant_ids = set(participant_ids) | {existing.created_by}  # Always keep creator
        for pid in existing_participant_ids - new_participant_ids:
            remove_meeting_participant(db, meeting_id, user_id=pid)
        for pid in new_participant_ids - existing_participant_ids:
            add_meeting_participant(db, meeting_id, user_id=pid, role="PARTICIPANT")

    try:
        meeting = update_meeting(db, meeting_id, updates)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_MEETING",
        target=meeting.title if meeting else meeting_id,
        role=current_user.role or "member",
    )
    return meeting


@app.put("/api/participants/{participant_id}/rsvp")
def rsvp_participant(
    participant_id: str,
    body: dict,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    """Allow a participant to accept or decline a meeting invitation."""
    participant = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.id == participant_id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Only the participant themselves can RSVP
    if participant.user_id and participant.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only RSVP for yourself")

    new_status = body.get("invite_status")
    if new_status not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="invite_status must be 'accepted' or 'declined'")

    participant.invite_status = new_status
    db.commit()
    db.refresh(participant)
    return {"id": participant.id, "invite_status": participant.invite_status}


@app.delete("/api/meetings/{meeting_id}")
def delete_meeting_endpoint(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.crud import delete_meeting
    existing = get_meeting_by_id(db, meeting_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Meeting not found")
    can_delete = False
    if current_user.role == "system-admin":
        can_delete = True
    elif existing.group_id:
        try:
            auth.require_group_admin(db, current_user, existing.group_id)
            can_delete = True
        except HTTPException:
            can_delete = False
    else:
        try:
            auth.require_org_admin(db, current_user, existing.organization_id)
            can_delete = True
        except HTTPException:
            can_delete = False

    if not can_delete:
        recipient_ids = get_org_admin_recipient_ids(db, existing.organization_id, current_user.id)
        actor_name = current_user.first_name or current_user.username or current_user.email
        for recipient_id in recipient_ids:
            push_runtime_notification(
                {
                    "id": f"runtime-delete-request-{meeting_id}-{recipient_id}-{int(datetime.utcnow().timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "urgent",
                    "title": "Yeu cau xoa cuoc hop",
                    "message": f"{actor_name} vua yeu cau xoa \"{existing.title}\".",
                    "timestamp": datetime.utcnow().isoformat(),
                    "isRead": False,
                    "metadata": {"group": existing.group.name if existing.group else None, "meeting_id": existing.id},
                }
            )
        append_admin_audit_log(
            actor=current_user.username,
            action="REQUEST_DELETE_MEETING",
            target=existing.title,
            role=current_user.role or "member",
        )
        raise HTTPException(status_code=403, detail="Ban khong co quyen xoa truc tiep. Yeu cau da gui cho org admin.")

    deleted_title = existing.title
    deleted_group_name = existing.group.name if existing.group else None
    delete_meeting(db, meeting_id)
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_MEETING",
        target=deleted_title,
        role=current_user.role or "admin",
    )

    if current_user.role != "system-admin":
        recipient_ids = get_org_admin_recipient_ids(db, existing.organization_id, current_user.id)
        actor_name = current_user.first_name or current_user.username or current_user.email
        for recipient_id in recipient_ids:
            push_runtime_notification(
                {
                    "id": f"runtime-delete-{meeting_id}-{recipient_id}-{int(datetime.utcnow().timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "urgent",
                    "title": "Nhân viên vừa xóa cuộc họp",
                    "message": f"{actor_name} đã xóa \"{deleted_title}\".",
                    "timestamp": datetime.utcnow().isoformat(),
                    "isRead": False,
                    "metadata": {"group": deleted_group_name, "meeting_id": meeting_id},
                }
            )

    return {"message": "Meeting deleted successfully"}

@app.post("/api/upload")
async def upload_audio(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    # Temporarily disabled due to torch codec issue
    raise HTTPException(status_code=503, detail="Upload feature temporarily disabled due to dependency issues")

    # if not file.filename.lower().endswith((".wav", ".mp3")):
    #     raise HTTPException(
    #         status_code= status.HTTP_400_BAD_REQUEST,
    #         detail="Invalid file type. Only .wav and .mp3 are supported.",
    #     )

    # # Ensure upload directory exists
    # upload_dir = os.path.join("data", "uploads")
    # os.makedirs(upload_dir, exist_ok=True)
    
    # # Save file to disk
    # file_id = str(uuid.uuid4())
    # extension = os.path.splitext(file.filename)[1]
    # file_path = os.path.join(upload_dir, f"{file_id}{extension}")
    
    # with open(file_path, "wb") as buffer:
    #     content = await file.read()
    #     buffer.write(content)

    # # Create meeting record with new schema
    # meeting_data = {
    #     "title": file.filename,
    #     "status": "IN_PROGRESS",
    #     "meeting_type": "MEETING",
    # }
    # db_meeting = create_meeting(db, meeting_data, created_by=current_user.id)
    
    # # Create audio file record
    # from src.api.crud import create_audio_file
    # audio_data = {
    #     "meeting_id": db_meeting.id,
    #     "filename": f"{file_id}{extension}",
    #     "original_filename": file.filename,
    #     "file_path": file_path,
    #     "file_size": os.path.getsize(file_path),
    #     "format": extension[1:].upper(),
    #     "upload_status": "UPLOADED"
    # }
    # db_audio = create_audio_file(db, audio_data)
    
    # # Initialize Job
    # job = MeetingProcessingJob(db_meeting.id, db_meeting.title, cost_logger)
    # job.audio_path = file_path
    # job.audio_file_id = db_audio.id
    # JOBS[job.job_id] = job

    # # Run background pipeline
    # background_tasks.add_task(job.run)

    # return {"job_id": job.job_id, "meeting_id": db_meeting.id}

# Singleton STT provider - load once, reuse for all chunks
_stt_service = None

def get_stt_provider():
    global _stt_service
    if _stt_service is None:
        from src.stt.service import STTService
        _stt_service = STTService()
    return _stt_service.provider

@app.post("/api/meetings/{meeting_id}/transcribe-chunk")
async def transcribe_chunk(
    meeting_id: str,
    audio: UploadFile = File(...),
    chunk_index: Optional[int] = Form(None),
    start_ms: int = Form(0),
    language: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    """Receive an audio chunk and return STT transcription (Deepgram Nova 3)."""
    import tempfile
    import subprocess

    try:
        # Validate meeting exists
        meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")

        # Validate user has access to this meeting's organization
        auth.require_org_member(db, current_user, meeting.organization_id)

        # Validate audio file
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Determine audio format
        suffix = ".webm"
        if audio.filename.lower().endswith(".wav"):
            suffix = ".wav"
        elif audio.filename.lower().endswith(".mp3"):
            suffix = ".mp3"
        elif audio.filename.lower().endswith(".mp4"):
            suffix = ".mp4"
        elif audio.filename.lower().endswith(".webm"):
            suffix = ".webm"
        else:
            # Default to webm for unknown formats
            suffix = ".webm"

        # Save chunk to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            try:
                content = await audio.read()
                if not content:
                    raise ValueError("Empty audio file")
                tmp.write(content)
                tmp_path = tmp.name
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to read audio: {str(e)}")

        audio_path = tmp_path
        stt_provider_name = os.getenv("STT_PROVIDER", "deepgram").lower()

        # Save chunk to permanent storage for later concatenation
        if chunk_index is not None:
            try:
                perm_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting_id)
                os.makedirs(perm_dir, exist_ok=True)
                chunk_filename = f"chunk_{chunk_index:06d}{suffix}"
                permanent_path = os.path.join(perm_dir, chunk_filename)
                with open(permanent_path, "wb") as pf:
                    pf.write(content)
                logger.info(f"Saved audio chunk permanently: {permanent_path}")
            except Exception as perm_err:
                logger.warning(f"Failed to save chunk permanently (non-fatal): {perm_err}")

        # Always convert to WAV (PCM 16kHz mono) for reliable STT processing
        if suffix != ".wav":
            wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
            try:
                subprocess.run(
                    ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", "-f", "wav", wav_path],
                    capture_output=True, timeout=30, check=True
                )
                os.unlink(tmp_path)
                audio_path = wav_path
                logger.info(f"Converted {suffix} to WAV for STT processing")
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                logger.warning(f"ffmpeg conversion failed, using original: {e}")

        try:
            # Transcribe using configured provider (Deepgram Nova 3)
            provider = get_stt_provider()
            result = provider.transcribe(audio_path)
            
            # Validate result
            if not result or "text" not in result:
                raise ValueError("Invalid transcription result")

            # Check if provider returned an error
            if "error" in result and result["error"]:
                raise ValueError(f"STT provider error: {result['error']}")
            
            logger.info(f"Chunk transcription success: meeting={meeting_id}, text_len={len(result.get('text', ''))}, segments={len(result.get('segments', []))}")
            
            detected_language = result.get("language") or result.get("detected_language") or language or "auto"
            # Use authenticated user's name as speaker label (overrides Deepgram diarization)
            user_display_name = " ".join(part for part in [current_user.first_name, current_user.last_name] if part).strip() or current_user.username
            normalized_segments = []
            for segment in result.get("segments", []):
                raw_label = normalize_speaker_label(user_display_name)
                mapping = ensure_speaker_mapping(db, meeting_id, raw_label, display_name=user_display_name)
                normalized_segments.append({
                    "speaker": user_display_name,
                    "speaker_label": raw_label,
                    "speaker_display_name": user_display_name,
                    "start": segment.get("start", segment.get("start_time", 0)),
                    "end": segment.get("end", segment.get("end_time", 0)),
                    "text": segment.get("text", ""),
                    "language": segment.get("language") or segment.get("detected_language") or detected_language,
                    "confidence": segment.get("confidence") or segment.get("confidence_score"),
                })
            text = result.get("text", "")
            if text.strip() and not normalized_segments:
                mapping = ensure_speaker_mapping(db, meeting_id, user_display_name, display_name=user_display_name)
                normalized_segments = [{
                    "speaker": user_display_name,
                    "speaker_label": normalize_speaker_label(user_display_name),
                    "speaker_display_name": user_display_name,
                    "start": 0,
                    "end": estimate_segment_end(0, text),
                    "text": text.strip(),
                    "language": detected_language,
                    "confidence": result.get("confidence") or result.get("confidence_score"),
                }]

            nlp_metadata = None
            if phobert_enabled_for(detected_language):
                try:
                    processor = get_phobert_processor()
                    glossary = build_glossary_dict(db, meeting.organization_id)
                    processed = processor.process_chunk(text, normalized_segments, glossary)
                    text = str(processed.get("text") or text)
                    normalized_segments = processed.get("segments") or normalized_segments
                    nlp_metadata = processed.get("nlp_metadata")
                except Exception as nlp_error:
                    logger.warning("PhoBERT chunk post-processing skipped: %s", nlp_error)

            if text.strip() and chunk_index is not None:
                upsert_transcript_draft(
                    db,
                    meeting_id=meeting_id,
                    user_id=current_user.id,
                    chunk_index=chunk_index,
                    text=text.strip(),
                    segments=normalized_segments,
                    language=detected_language,
                    provider=stt_provider_name,
                    model=os.getenv("DEEPGRAM_MODEL", "nova-3"),
                    start_ms=start_ms,
                )
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {
                        "type": "transcript.chunk",
                        "meeting_id": meeting_id,
                        "chunkIndex": chunk_index,
                        "text": text.strip(),
                        "segments": [
                            {
                                **segment,
                                "start": float(segment.get("start", 0) or 0) + (start_ms or 0) / 1000,
                                "end": float(segment.get("end", 0) or 0) + (start_ms or 0) / 1000,
                            }
                            for segment in normalized_segments
                        ],
                        "language": detected_language,
                        "nlp_metadata": nlp_metadata,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )

            return {
                "text": text,
                "segments": normalized_segments,
                "language": detected_language,
                "detected_language": detected_language,
                "provider": stt_provider_name,
                "model": os.getenv("DEEPGRAM_MODEL", "nova-3"),
                "nlp_metadata": nlp_metadata,
            }
        except Exception as transcribe_error:
            logger.error(f"Transcription error: {str(transcribe_error)}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Transcription failed: {str(transcribe_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chunk upload error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Chunk processing failed: {str(e)}"
        )
    finally:
        if 'audio_path' in locals() and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup audio file: {e}")


@app.get("/api/meetings/{meeting_id}/transcript-draft")
def get_transcript_draft(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    draft = build_transcript_from_drafts(db, meeting_id)
    return {
        "meeting_id": meeting_id,
        "transcript": draft["transcript"],
        "segments": draft["segments"],
        "language": draft["language"],
        "chunks": [
            {
                "id": item.id,
                "chunkIndex": item.chunk_index,
                "text": item.text,
                "segments": [
                    {
                        **segment,
                        "start": float(segment.get("start", segment.get("start_time", 0)) or 0) + (item.start_ms or 0) / 1000,
                        "end": float(segment.get("end", segment.get("end_time", 0)) or 0) + (item.start_ms or 0) / 1000,
                    }
                    for segment in (item.segments or [])
                ] or [{
                    "speaker": "Speaker_01",
                    "start": (item.start_ms or 0) / 1000,
                    "end": estimate_segment_end((item.start_ms or 0) / 1000, item.text),
                    "text": item.text,
                    "language": item.language or "auto",
                }],
                "language": item.language,
                "startMs": item.start_ms,
                "timestamp": (item.updated_at or item.created_at or datetime.utcnow()).isoformat(),
            }
            for item in draft["chunks"]
        ],
    }


@app.get("/api/audio-files/{audio_id}/stream")
def stream_audio_file(
    audio_id: str,
    db: Session = Depends(get_db),
):
    """Stream an audio file by its ID. No auth required for direct playback."""
    audio_file = db.query(models.AudioFile).filter(models.AudioFile.id == audio_id).first()
    if not audio_file:
        raise HTTPException(status_code=404, detail="Audio file not found")
    if not os.path.exists(audio_file.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")
    return FileResponse(
        audio_file.file_path,
        media_type="audio/wav",
        filename=audio_file.original_filename or "recording.wav",
    )


@app.post("/api/meetings/{meeting_id}/finalize", response_model=schemas.MeetingFinalizeResponse)
async def finalize_meeting(
    meeting_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    """Save full transcript to DB, then summarize via a single Router LLM call."""
    from src.providers.router_llm import RouterLLMAdapter

    body = await request.json()
    full_text = body.get("transcript", "")
    segments = body.get("segments", [])
    req_language = body.get("language", "")
    regenerate = bool(body.get("regenerate", False))
    errors: List[str] = []

    # Verify meeting exists
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Determine language: request body > meeting > user > default "vi"
    language = req_language or getattr(meeting, "language", None) or getattr(current_user, "language", None) or "vi"
    language = language.lower().strip() if language else "vi"
    if language not in ("vi", "en", "zh", "ja", "ko"):
        language = "vi"

    # Validate user has access to this meeting's organization
    auth.require_org_member(db, current_user, meeting.organization_id)
    original_meeting_status = meeting.status

    draft_payload = build_transcript_from_drafts(db, meeting_id)
    if not isinstance(full_text, str) or not full_text.strip():
        full_text = draft_payload["transcript"]
    if not segments:
        segments = draft_payload["segments"]
    if (not req_language or req_language == "auto") and draft_payload["language"] != "auto":
        language = draft_payload["language"]
        if language not in ("vi", "en", "zh", "ja", "ko"):
            language = "vi"

    if not isinstance(full_text, str) or not full_text.strip():
        raise HTTPException(status_code=400, detail="Transcript is required for finalize")

    nlp_metadata = None
    post_processed = False
    if phobert_enabled_for(language):
        try:
            processor = get_phobert_processor()
            glossary = build_glossary_dict(db, meeting.organization_id)
            processed = processor.process_finalize(full_text, segments if isinstance(segments, list) else [], glossary)
            full_text = str(processed.get("text") or full_text)
            segments = processed.get("segments") or segments
            nlp_metadata = processed.get("nlp_metadata")
            post_processed = bool(processed.get("post_processed"))
        except Exception as nlp_error:
            logger.warning("PhoBERT finalize post-processing skipped: %s", nlp_error, exc_info=True)
            errors.append(f"PhoBERT post-processing skipped: {nlp_error}")

    try:
        if meeting.status == "upcoming":
            meeting = update_meeting(
                db,
                meeting_id,
                {
                    "status": "live",
                    "actual_start": meeting.actual_start or datetime.utcnow(),
                    "scheduled_start": meeting.scheduled_start or datetime.utcnow(),
                    "scheduled_end": meeting.scheduled_end or (datetime.utcnow() + timedelta(hours=1)),
                },
            )
        if meeting.status in {"live", "queued", "failed"}:
            meeting = update_meeting(db, meeting_id, {"status": "processing"})
        elif meeting.status == "canceled":
            raise HTTPException(status_code=400, detail="Cannot finalize a canceled meeting")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Upsert transcript so finalize can be safely retried.
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
        db_transcript.language = language
        db_transcript.word_count = len(full_text.split())
        db_transcript.processing_status = "COMPLETED"
        db_transcript.stt_provider = os.getenv("STT_PROVIDER", "deepgram")
        db_transcript.post_processed = post_processed
        db_transcript.nlp_metadata = nlp_metadata
        if segments_to_save:
            db.query(models.TranscriptSegment).filter(
                models.TranscriptSegment.transcript_id == db_transcript.id,
            ).delete(synchronize_session=False)
            db.flush()
    else:
        db_transcript = create_transcript(db, {
            "meeting_id": meeting_id,
            "content": full_text,
            "language": language,
            "word_count": len(full_text.split()),
            "processing_status": "COMPLETED",
            "stt_provider": os.getenv("STT_PROVIDER", "deepgram"),
            "post_processed": post_processed,
            "nlp_metadata": nlp_metadata,
        })

    # Save segments
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

    # === Concatenate audio chunks into final recording ===
    audio_file_id = None
    try:
        perm_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting_id)
        if os.path.isdir(perm_dir):
            chunk_files = sorted(glob.glob(os.path.join(perm_dir, "chunk_*")))
            if chunk_files:
                logger.info(f"Concatenating {len(chunk_files)} audio chunks for meeting {meeting_id}")
                concat_list_path = os.path.join(perm_dir, "concat.txt")
                with open(concat_list_path, "w") as f:
                    for cf in chunk_files:
                        f.write(f"file '{cf}'\n")

                output_filename = f"recording_{meeting_id}.wav"
                output_path = os.path.join(perm_dir, output_filename)
                result = subprocess.run(
                    ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list_path,
                     "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path],
                    capture_output=True, timeout=120, check=True,
                )
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    file_size = os.path.getsize(output_path)
                    audio_record = create_audio_file(db, {
                        "meeting_id": meeting_id,
                        "filename": output_filename,
                        "original_filename": f"meeting_recording.wav",
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

                    # Cleanup chunk files
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
            else:
                logger.info(f"No audio chunks found for meeting {meeting_id}")
        else:
            logger.info(f"No audio directory found for meeting {meeting_id}")
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg concat failed for meeting {meeting_id}: {e.stderr}")
    except Exception as e:
        logger.error(f"Audio concatenation failed for meeting {meeting_id}: {e}")

    summary_status = "FAILED"
    summary_payload = schemas.MeetingAnalysisOutput(
        meeting_summary="",
        key_points=[],
        decisions=[],
        action_items=[],
    )
    summary_error_message = ""
    ai_provider_name = "router"
    router = RouterLLMAdapter()

    prompt_key = f"summary_{language}"
    custom_instruction = ADMIN_PROMPTS.get(prompt_key, ADMIN_PROMPTS.get("summary_vi", {})).get(
        "content",
        "Create a concise executive meeting brief. Focus on outcomes, explicit decisions, and next steps only.",
    )
    glossary_context = build_glossary_context(db, meeting.organization_id)
    speaker_map = get_speaker_mapping_dict(db, meeting_id)
    speaker_aware_transcript = build_speaker_aware_transcript(full_text, segments_to_save, speaker_map)
    system_prompt, user_prompt = build_structured_summary_prompts(
        speaker_aware_transcript,
        custom_instruction,
        language,
        glossary_context,
        nlp_metadata,
    )

    raw_response = None

    # Try Router LLM first (with built-in model fallback for content-blocked)
    if router.enabled:
        try:
            raw_response = router.structured_completion(system_prompt, user_prompt)
            if not raw_response:
                raise ValueError(router.last_error or "Router LLM returned empty response")
        except Exception as e:
            error_message = f"Router LLM summarization failed: {e}"
            logger.error(error_message, exc_info=True)
            errors.append(error_message)
            summary_error_message = error_message
            raw_response = None
    else:
        summary_error_message = router.last_error or "Router LLM is not configured"
        errors.append(summary_error_message)

    # Fallback to Google Gemini if Router failed
    if not raw_response:
        google_key = os.getenv("GOOGLE_API_KEY")
        if google_key:
            logger.info("Router LLM failed, falling back to Google Gemini for summarization")
            try:
                from src.providers.google_llm import GoogleLLMAdapter
                google = GoogleLLMAdapter(api_key=google_key)
                if google.client:
                    raw_response = google.chat_completion(system_prompt, user_prompt)
                    if raw_response:
                        ai_provider_name = "google-gemini"
                        errors.pop() if errors else None
                        logger.info("Google Gemini fallback succeeded")
            except Exception as ge:
                fallback_error = f"Google Gemini fallback also failed: {ge}"
                logger.error(fallback_error, exc_info=True)
                errors.append(fallback_error)

    # Parse the response if we got one
    if raw_response:
        try:
            structured_payload = _extract_json_object(raw_response)
            summary_payload = _normalize_analysis_payload(structured_payload)
            summary_status = "COMPLETED"
        except Exception as parse_error:
            error_message = f"Failed to parse LLM response: {parse_error}"
            logger.error(error_message, exc_info=True)
            errors.append(error_message)
            summary_error_message = error_message

    summary_db = db.query(models.MeetingSummary).filter(
        models.MeetingSummary.meeting_id == meeting_id,
        models.MeetingSummary.language == language,
    ).order_by(models.MeetingSummary.created_at.desc()).first()
    summary_data = {
        "language": language,
        "key_points": summary_payload.key_points,
        "decisions": summary_payload.decisions,
        "action_items": [item.model_dump() for item in summary_payload.action_items],
        "risks": summary_payload.risks,
        "open_questions": summary_payload.open_questions,
        "timeline_highlights": summary_payload.timeline_highlights,
        "speaker_summaries": summary_payload.speaker_summaries,
        "meeting_summary": summary_payload.meeting_summary if summary_status == "COMPLETED" else summary_error_message,
        "ai_provider": ai_provider_name,
        "model_name": router.model if ai_provider_name == "router" else ai_provider_name,
        "processing_status": summary_status,
    }
    if summary_db:
        for key, value in summary_data.items():
            setattr(summary_db, key, value)
        db.query(models.ActionItem).filter(models.ActionItem.summary_id == summary_db.id).delete(synchronize_session=False)
        db.flush()
    else:
        summary_db = create_meeting_summary(db, {"meeting_id": meeting_id, **summary_data})

    if summary_status == "COMPLETED":
        for ai in summary_payload.action_items:
            owner = (ai.owner or "").strip() or None
            deadline = (ai.deadline or "").strip() or None

            # Try to match owner to meeting participant
            assigned_email = None
            if owner:
                participant = db.query(models.MeetingParticipant).filter(
                    models.MeetingParticipant.meeting_id == meeting_id,
                    or_(
                        models.MeetingParticipant.name.ilike(f"%{owner}%"),
                        models.MeetingParticipant.email.ilike(f"%{owner}%"),
                    )
                ).first()
                if participant and participant.email:
                    assigned_email = participant.email
                elif participant and participant.user:
                    assigned_email = participant.user.email

            # Build Vietnamese description
            desc_parts = []
            if owner:
                desc_parts.append(f"Phụ trách: {owner}")
            else:
                desc_parts.append("Chưa phân công")
            if deadline:
                desc_parts.append(f"Hạn: {deadline}")
            else:
                desc_parts.append("Chưa đặt hạn")

            create_action_item(db, {
                "meeting_id": meeting_id,
                "summary_id": summary_db.id,
                "title": ai.task,
                "description": " | ".join(desc_parts),
                "assigned_email": assigned_email,
                "due_date": _try_parse_date(deadline),
                "status": "PENDING",
                "priority": "MEDIUM",
            }, created_by=current_user.id)

    final_meeting_status = "completed" if summary_status == "COMPLETED" else "failed" if regenerate else "completed"
    if regenerate and original_meeting_status == "completed" and summary_status != "COMPLETED":
        final_meeting_status = "completed"
    try:
        update_meeting(db, meeting_id, {"status": final_meeting_status})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    await meeting_room_manager.broadcast(
        meeting_id,
        {
            "type": "ai.notes",
            "meeting_id": meeting_id,
            "summary_status": summary_status,
            "summary": summary_payload.model_dump(),
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

    return {
        "meeting_id": meeting_id,
        "transcript_status": "COMPLETED",
        "summary_status": summary_status,
        "summary": summary_payload,
        "nlp_metadata": nlp_metadata,
        "errors": errors,
    }


@app.get("/api/meetings/{meeting_id}/dialect")
def get_meeting_dialect(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)

    transcript = db.query(models.Transcript).filter(
        models.Transcript.meeting_id == meeting_id,
    ).order_by(models.Transcript.created_at.desc()).first()
    metadata = transcript.nlp_metadata if transcript and transcript.nlp_metadata else {}
    return {
        "meeting_id": meeting_id,
        "dialect_hint": metadata.get("dialect_hint", "unknown"),
        "confidence": metadata.get("dialect_confidence", 0.0),
        "post_processed": bool(transcript.post_processed) if transcript else False,
        "correction_count": metadata.get("correction_count", 0),
        "nlp_metadata": metadata,
    }


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    # Temporarily disabled
    raise HTTPException(status_code=503, detail="Job tracking temporarily disabled")
    # if job_id not in JOBS:
    #     raise HTTPException(status_code=404, detail="Job not found")
    
    # job = JOBS[job_id]
    # return {
    #     "job_id": job.job_id,
    #     "status": job.status,
    #     "progress": job.progress,
    #     "meeting_id": job.meeting_id,
    #     "results": job.results if job.status == "completed" else None
    # }

# Analytics Endpoints
@app.get("/api/analytics/meetings", response_model=AnalyticsResponse)
async def get_meeting_analytics(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    # Meetings over time (last 30 days)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    org_ids = user_org_ids(current_user)
    base_query = db.query(models.Meeting)
    if current_user.role != "system-admin" and org_ids:
        base_query = base_query.filter(models.Meeting.organization_id.in_(org_ids))

    meetings_over_time = {}
    rows = (
        base_query
        .filter(models.Meeting.created_at >= thirty_days_ago)
        .with_entities(
            func.date(models.Meeting.created_at).label("day"),
            func.count().label("cnt"),
        )
        .group_by(func.date(models.Meeting.created_at))
        .all()
    )
    for row in rows:
        meetings_over_time[str(row.day)] = row.cnt

    # Status distribution
    status_rows = (
        base_query
        .with_entities(models.Meeting.status, func.count())
        .group_by(models.Meeting.status)
        .all()
    )
    provider_distribution = {str(s): c for s, c in status_rows}

    # Top action item owners
    action_rows = (
        db.query(models.ActionItem.assigned_email, func.count())
        .filter(models.ActionItem.assigned_email.isnot(None))
        .group_by(models.ActionItem.assigned_email)
        .order_by(func.count().desc())
        .limit(10)
        .all()
    )
    top_action_owners = {str(name or "Chưa gán"): c for name, c in action_rows}

    # Topic trends (from meeting titles - simple word frequency)
    topic_rows = (
        base_query
        .filter(models.Meeting.status == "completed")
        .with_entities(models.Meeting.title)
        .order_by(models.Meeting.created_at.desc())
        .limit(100)
        .all()
    )
    topic_trends: Dict[str, int] = {}
    for (title,) in topic_rows:
        if title:
            topic_trends[title[:30]] = topic_trends.get(title[:30], 0) + 1
    # Sort by count and take top 8
    topic_trends = dict(sorted(topic_trends.items(), key=lambda x: x[1], reverse=True)[:8])

    return {
        "total_meetings_over_time": meetings_over_time,
        "provider_distribution": provider_distribution,
        "top_action_owners": top_action_owners,
        "topic_trends": topic_trends,
    }

@app.get("/api/analytics/performance")
async def get_performance_analytics():
    # Temporarily disabled
    raise HTTPException(status_code=503, detail="Analytics temporarily disabled")
    # return get_admin_performance()

@app.get("/api/admin/costs")
async def get_costs():
    # Temporarily disabled
    raise HTTPException(status_code=503, detail="Cost tracking temporarily disabled")
    # return get_admin_costs()

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    base_query = db.query(models.Meeting)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            return {
                "totalMeetings": 0,
                "totalHours": 0,
                "processingCount": 0,
                "actualCostUsd": 0,
                "estimatedCostUsd": 0,
                "liveSuccessRate": "100%",
                "modelHealth": {},
                "features": {
                    "uploadEnabled": ADMIN_SYSTEM_SETTINGS.get("upload_enabled", True),
                    "jobTrackingEnabled": ADMIN_SYSTEM_SETTINGS.get("job_tracking_enabled", True),
                    "systemAdminEnabled": current_user.role == "system-admin",
                },
            }
        base_query = base_query.filter(models.Meeting.organization_id.in_(org_ids))

    # SQL aggregation instead of loading all rows
    total_meetings = base_query.with_entities(func.count()).scalar() or 0
    processing_count = base_query.filter(
        models.Meeting.status.in_(["processing", "queued"])
    ).with_entities(func.count()).scalar() or 0
    total_minutes = base_query.with_entities(
        func.coalesce(func.sum(models.Meeting.duration), 0)
    ).scalar() or 0

    return {
        "totalMeetings": total_meetings,
        "totalHours": round(total_minutes / 60, 2),
        "processingCount": processing_count,
        "actualCostUsd": 0,
        "estimatedCostUsd": 0,
        "liveSuccessRate": "100%",
        "modelHealth": {},
        "features": {
            "uploadEnabled": ADMIN_SYSTEM_SETTINGS.get("upload_enabled", True),
            "jobTrackingEnabled": ADMIN_SYSTEM_SETTINGS.get("job_tracking_enabled", True),
            "systemAdminEnabled": current_user.role == "system-admin",
        },
    }

@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    """Get in-app notifications for the current user based on real meeting activity."""
    persisted_notifications = db.query(models.Notification).filter(
        models.Notification.recipient_user_id == current_user.id,
    ).order_by(models.Notification.created_at.desc()).limit(50).all()
    notifications = [notification_payload(notification) for notification in persisted_notifications]
    now = datetime.now()

    query = db.query(models.Meeting)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            return []
        query = query.filter(models.Meeting.organization_id.in_(org_ids))
    meetings = query.order_by(models.Meeting.created_at.desc()).limit(20).all()

    for m in meetings:
        created_at = m.created_at or now
        # Notification: meeting was recently created
        diff_hours = (now - created_at).total_seconds() / 3600
        if diff_hours < 48:
            priority = "urgent" if diff_hours < 2 else "today" if diff_hours < 24 else "recent"
            notifications.append({
                "id": f"created-{m.id}",
                "type": "meeting",
                "priority": priority,
                "title": "Cuộc họp mới được tạo",
                "message": f'"{m.title}" đã được tạo thành công.',
                "timestamp": created_at.isoformat(),
                "isRead": False,
                "metadata": {"group": m.group.name if m.group else None, "meeting_id": m.id},
            })

        # Notification: upcoming scheduled meeting
        if m.scheduled_start:
            diff_start = (m.scheduled_start - now).total_seconds() / 3600
            if 0 < diff_start < 24:
                notifications.append({
                    "id": f"upcoming-{m.id}",
                    "type": "meeting",
                    "priority": "urgent" if diff_start < 1 else "today",
                    "title": "Cuộc họp sắp diễn ra",
                    "message": f'"{m.title}" sẽ bắt đầu trong {int(diff_start * 60)} phút.',
                    "timestamp": m.scheduled_start.isoformat(),
                    "isRead": False,
                    "metadata": {"group": m.group.name if m.group else None, "meeting_id": m.id},
                })

        # Notification: completed meeting
        if m.status == "completed" and m.scheduled_end:
            diff_end = (now - m.scheduled_end).total_seconds() / 3600
            if diff_end < 48:
                notifications.append({
                    "id": f"done-{m.id}",
                    "type": "meeting",
                    "priority": "recent",
                    "title": "Cuộc họp đã kết thúc",
                    "message": f'"{m.title}" đã hoàn thành. AI đang xử lý biên bản.',
                    "timestamp": m.scheduled_end.isoformat(),
                    "isRead": True,
                    "metadata": {"group": m.group.name if m.group else None, "meeting_id": m.id},
                })

    runtime_for_user = [
        item for item in RUNTIME_NOTIFICATIONS if item.get("recipient_user_id") == current_user.id
    ]
    notifications.extend(runtime_for_user)

    # Sort by timestamp descending
    notifications.sort(key=lambda x: x["timestamp"], reverse=True)
    return notifications


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.recipient_user_id == current_user.id,
    ).first()
    if not notification:
        return {"message": "Notification is not persisted"}

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notification)
    return notification_payload(notification)


@app.post("/api/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    db.query(models.Notification).filter(
        models.Notification.recipient_user_id == current_user.id,
        models.Notification.is_read == False,
    ).update(
        {"is_read": True, "read_at": datetime.utcnow()},
        synchronize_session=False,
    )
    db.commit()
    return {"message": "Notifications marked as read"}


@app.delete("/api/notifications/{notification_id}")
def dismiss_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.recipient_user_id == current_user.id,
    ).first()
    if not notification:
        return {"message": "Notification is not persisted"}

    db.delete(notification)
    db.commit()
    return {"message": "Notification dismissed"}


def require_system_admin_user(current_user: models.User) -> None:
    if current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required")


@app.get("/api/admin/users")
def admin_list_users(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    users = db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group),
    ).order_by(models.User.created_at.desc()).all()
    return [format_user_payload(user) for user in users]


@app.patch("/api/admin/users/{user_id}/status")
def admin_update_user_status(
    user_id: str,
    payload: AdminUserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    user = update_user(db, user_id, {"is_active": payload.is_active})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    append_admin_audit_log(
        actor=current_user.username,
        action="ACTIVATE_USER" if payload.is_active else "SUSPEND_USER",
        target=user.email,
    )
    return format_user_payload(user)


@app.get("/api/admin/ai-services")
def admin_get_ai_services(current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    return ADMIN_AI_SERVICES


@app.patch("/api/admin/ai-services")
def admin_update_ai_services(
    payload: AdminAIServicesUpdateRequest,
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        ADMIN_AI_SERVICES[key] = value
    append_admin_audit_log(actor=current_user.username, action="UPDATE_AI_SERVICES", target="admin.ai-services")
    return ADMIN_AI_SERVICES


@app.get("/api/admin/prompts")
def admin_get_prompts(current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    return list(ADMIN_PROMPTS.values())


@app.put("/api/admin/prompts/{prompt_key}")
def admin_update_prompt(
    prompt_key: str,
    payload: AdminPromptUpdateRequest,
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    next_version = payload.version or ADMIN_PROMPTS.get(prompt_key, {}).get("version", "1.0.0")
    ADMIN_PROMPTS[prompt_key] = {
        "key": prompt_key,
        "name": payload.name,
        "description": payload.description,
        "content": payload.content,
        "version": next_version,
        "last_updated": datetime.utcnow().isoformat(),
    }
    append_admin_audit_log(actor=current_user.username, action="UPDATE_PROMPT", target=prompt_key)
    return ADMIN_PROMPTS[prompt_key]


@app.get("/api/admin/notifications")
def admin_list_broadcasts(current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    return ADMIN_BROADCAST_HISTORY


@app.post("/api/admin/notifications")
def admin_create_broadcast(
    payload: AdminBroadcastRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    item = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "content": payload.content,
        "type": payload.type,
        "target": payload.target,
        "status": "sent",
        "sentAt": datetime.utcnow().isoformat(),
        "reach": 0,
    }

    recipients: List[models.User] = []
    if payload.target == "all":
        recipients = db.query(models.User).filter(models.User.is_active == True).all()
    else:
        recipients = db.query(models.User).join(models.UserOrganization).filter(
            models.UserOrganization.organization_id == payload.target,
            models.User.is_active == True,
        ).all()

    for recipient in recipients:
        create_persisted_notification(
            db,
            recipient_user_id=recipient.id,
            notification_type="system",
            priority="today",
            title=payload.title,
            message=payload.content,
            metadata={"target": payload.target},
            source_type="admin-broadcast",
            source_id=item["id"],
            commit=False,
        )
    item["reach"] = len(recipients)
    db.commit()
    ADMIN_BROADCAST_HISTORY.insert(0, item)
    append_admin_audit_log(actor=current_user.username, action="SEND_BROADCAST", target=payload.target)
    return item


@app.delete("/api/admin/notifications/{notification_id}")
def admin_delete_broadcast(notification_id: str, current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    before = len(ADMIN_BROADCAST_HISTORY)
    ADMIN_BROADCAST_HISTORY[:] = [item for item in ADMIN_BROADCAST_HISTORY if item.get("id") != notification_id]
    if len(ADMIN_BROADCAST_HISTORY) == before:
        raise HTTPException(status_code=404, detail="Notification not found")
    append_admin_audit_log(actor=current_user.username, action="DELETE_BROADCAST", target=notification_id)
    return {"message": "Notification deleted"}


@app.get("/api/admin/audit-logs")
def admin_get_audit_logs(current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    ensure_audit_log_table()
    db = SessionLocal()
    try:
        db_logs = (
            db.query(models.AuditLog)
            .order_by(models.AuditLog.time.desc())
            .limit(MAX_ADMIN_AUDIT_LOGS)
            .all()
        )
    finally:
        db.close()
    if db_logs:
        return [
            {
                "id": log.id,
                "time": log.time.isoformat() if log.time else datetime.utcnow().isoformat(),
                "user": log.user,
                "role": log.role,
                "action": log.action,
                "target": log.target,
                "org": log.org,
                "ip": log.ip,
            }
            for log in db_logs
        ]
    return list(reversed(ADMIN_AUDIT_LOGS))


@app.get("/api/admin/settings")
def admin_get_settings(current_user = Depends(auth.get_current_user)):
    require_system_admin_user(current_user)
    return ADMIN_SYSTEM_SETTINGS


@app.patch("/api/admin/settings")
def admin_update_settings(
    payload: AdminSettingsUpdateRequest,
    current_user = Depends(auth.get_current_user),
):
    require_system_admin_user(current_user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        ADMIN_SYSTEM_SETTINGS[key] = value
    _save_admin_settings()
    append_admin_audit_log(actor=current_user.username, action="UPDATE_SYSTEM_SETTINGS", target="admin.settings")
    return ADMIN_SYSTEM_SETTINGS


# ==================== Glossary API ====================

@app.get("/api/glossary", response_model=List[schemas.GlossaryTerm])
def list_glossary_terms(
    organization_id: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if organization_id:
        auth.require_org_member(db, current_user, organization_id)
        return get_glossary_terms(db, organization_id=organization_id, category=category, is_active=is_active, skip=skip, limit=limit)

    query = db.query(models.GlossaryTerm)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        query = query.filter(or_(models.GlossaryTerm.organization_id.is_(None), models.GlossaryTerm.organization_id.in_(org_ids)))
    if category:
        query = query.filter(models.GlossaryTerm.category == category)
    if is_active is not None:
        query = query.filter(models.GlossaryTerm.is_active == is_active)
    return query.order_by(models.GlossaryTerm.term).offset(skip).limit(limit).all()


@app.post("/api/glossary", response_model=schemas.GlossaryTerm)
def create_glossary_term_endpoint(
    term: schemas.GlossaryTermCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    return create_glossary_term(db, term.model_dump(), current_user.id)


@app.patch("/api/glossary/{term_id}", response_model=schemas.GlossaryTerm)
def update_glossary_term_endpoint(
    term_id: str,
    updates: schemas.GlossaryTermUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    return update_glossary_term(db, term_id, updates.model_dump(exclude_unset=True))


@app.delete("/api/glossary/{term_id}")
def delete_glossary_term_endpoint(
    term_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    delete_glossary_term(db, term_id)
    return {"message": "Glossary term deleted successfully"}

# ==================== Action Items API ====================

@app.get("/api/action-items", response_model=List[schemas.ActionItem])
def list_action_items(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
    meeting_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    Get all action items for the current user.
    Supports filtering by meeting_id and status.
    """
    # Filter by items created by or assigned to the user, 
    # OR items belonging to meetings in the user's current organizations
    query = db.query(models.ActionItem).outerjoin(models.Meeting)
    
    # If meeting_id is provided, filter strictly by it
    if meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        auth.require_org_member(db, current_user, meeting.organization_id)
        query = query.filter(models.ActionItem.meeting_id == meeting_id)
    else:
        # Otherwise, show items the user is involved with
        from sqlalchemy import or_
        user_org_ids = [om.organization_id for om in current_user.user_organizations] if hasattr(current_user, 'user_organizations') else []
        
        query = query.filter(
            or_(
                models.ActionItem.created_by == current_user.id,
                models.ActionItem.assigned_to == current_user.id,
                models.Meeting.organization_id.in_(user_org_ids) if user_org_ids else False
            )
        )
    
    if status:
        query = query.filter(models.ActionItem.status == status)
        
    return query.order_by(models.ActionItem.created_at.desc()).offset(skip).limit(limit).all()

@app.post("/api/action-items", response_model=schemas.ActionItem)
def create_new_action_item(
    action_item: schemas.ActionItemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Create a new action item manually or via AI."""
    if action_item.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == action_item.meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        auth.require_org_member(db, current_user, meeting.organization_id)

    created = create_action_item(db, action_item.model_dump(), current_user.id)
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_ACTION_ITEM",
        target=created.title,
        role=current_user.role or "member",
    )
    return created

@app.patch("/api/action-items/{action_id}", response_model=schemas.ActionItem)
def update_existing_action_item(
    action_id: str,
    updates: schemas.ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Update an existing action item (status, priority, title, etc)."""
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_visible_to_user(db, db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    updated = update_action_item(db, action_id, updates.model_dump(exclude_unset=True))
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_ACTION_ITEM",
        target=updated.title if updated else action_id,
        role=current_user.role or "member",
    )
    return updated

@app.delete("/api/action-items/{action_id}")
def delete_existing_action_item(
    action_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Delete an action item."""
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_visible_to_user(db, db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    deleted_title = db_action.title
    delete_action_item(db, action_id)
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_ACTION_ITEM",
        target=deleted_title,
        role=current_user.role or "member",
    )
    return {"message": "Action item deleted successfully"}


@app.get("/api/config/features")
def get_feature_flags(current_user = Depends(auth.get_current_user)):
    return {
        "uploadEnabled": current_user.role == "system-admin",
        "jobTrackingEnabled": current_user.role == "system-admin",
        "systemAdminEnabled": current_user.role == "system-admin",
    }

@app.get("/health")
def health():
    """
    Health check endpoint.
    Returns: overall status and database health
    """
    db_status = db_health_check()
    overall_status = "healthy" if db_status.get("status") == "healthy" else "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "service": "multiminutes-api",
        "version": "1.0.0-beta",
        "database": db_status,
        "environment": config.environment,
    }

@app.get("/healthz")
def healthz():
    """Minimal health check for load balancers (liveness probe)"""
    return {"status": "ok"}

@app.get("/metrics")
def metrics():
    """
    System metrics endpoint (Prometheus-style or JSON).
    Returns database pool stats, request counts, etc.
    """
    db_status = db_health_check()
    
    # Get additional metrics if available
    try:
        from src.cost.cost_logger import CostLogger
        cost_stats = CostLogger.get_monthly_stats()
    except Exception:
        cost_stats = {"error": "Cost tracking not available"}
    
    return {
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "cost": cost_stats,
        "config": {
            "ai_provider": config.ai.provider,
            "environment": config.environment,
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
