import os
import sys
import time
import json
import logging
import re
import hashlib
import glob
import subprocess
import threading
import queue
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks, status, Request, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from datetime import date, datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
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
from src.api.core.user_payloads import (
    format_user_payload as core_format_user_payload,
    get_organization_approval_status as core_get_organization_approval_status,
    normalize_global_role as core_normalize_global_role,
)
# from src.cost.api import get_admin_costs, get_admin_performance
# from src.api.jobs import MeetingProcessingJob, JOBS

# Audio upload storage directory
AUDIO_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "audio")
AVATAR_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars")

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
    _ensure_column("users", "bio", "bio TEXT")


def _ensure_action_item_assignee_backfill() -> None:
    try:
        models.ActionItemAssignee.__table__.create(bind=engine, checkfirst=True)
        session = SessionLocal()
        try:
            legacy_items = session.query(models.ActionItem).options(
                joinedload(models.ActionItem.assignees),
                joinedload(models.ActionItem.assigned_to_user),
            ).all()
            changed = False
            for item in legacy_items:
                if item.assignees:
                    continue
                if not item.assigned_email and not item.assigned_to:
                    continue
                display_name = None
                if item.assigned_to_user:
                    display_name = " ".join(
                        part for part in [item.assigned_to_user.first_name, item.assigned_to_user.last_name] if part
                    ).strip() or item.assigned_to_user.username or item.assigned_to_user.email
                session.add(models.ActionItemAssignee(
                    id=str(uuid.uuid4()),
                    action_item_id=item.id,
                    user_id=item.assigned_to,
                    email=item.assigned_email or (item.assigned_to_user.email if item.assigned_to_user else ""),
                    display_name=display_name or item.assigned_email,
                    status=item.status or "PENDING",
                    completed_at=item.completed_at,
                ))
                changed = True
            if changed:
                session.commit()
        finally:
            session.close()
    except Exception as exc:
        logger.warning("Failed to ensure action item assignee backfill: %s", exc)


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
        models.ActionItemAssignee.__table__.create(bind=engine, checkfirst=True)
        _ensure_meeting_runtime_columns()
        _ensure_action_item_assignee_backfill()

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
MAX_ADMIN_AUDIT_LOGS = 2000
ADMIN_PROMPTS: Dict[str, Dict[str, Any]] = {
    "summary_vi": {
        "key": "summary_vi",
        "name": "Tóm tắt cuộc họp (VI)",
        "description": "Prompt tạo tóm tắt cuộc họp bằng tiếng Việt",
        "content": (
            "Tạo biên bản tóm tắt cuộc họp bằng tiếng Việt ở mức vừa đủ: không quá ngắn, không lan man. "
            "Phải nêu rõ mục tiêu/bối cảnh cuộc họp, các chủ đề chính đã bàn, kết luận hoặc quyết định, "
            "việc cần làm tiếp theo, người phụ trách nếu transcript có nói rõ, và các vấn đề còn mở. "
            "Giữ đúng nội dung transcript, không bịa thêm quyết định hoặc deadline."
        ),
        "version": "2.2.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    },
    "summary_en": {
        "key": "summary_en",
        "name": "Meeting Summary (EN)",
        "description": "Meeting summary prompt in English",
        "content": (
            "Create a balanced meeting brief in English: complete enough to preserve the main content, "
            "but not a transcript recap. Cover the meeting goal/context, main discussion themes, outcomes "
            "or explicit decisions, next steps, owners when clearly stated, and open issues. Do not invent "
            "decisions, deadlines, owners, or tasks."
        ),
        "version": "2.2.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    },
    "summary_zh": {
        "key": "summary_zh",
        "name": "会议摘要 (ZH)",
        "description": "Meeting summary prompt in Chinese",
        "content": (
            "请用中文生成详略适中的会议摘要：内容要覆盖主要信息，但不要逐字复述。"
            "请说明会议目标/背景、主要讨论主题、结果或明确决定、下一步行动、明确提到的负责人以及未解决问题。"
            "不要编造决定、截止日期、负责人或任务。"
        ),
        "version": "2.2.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    },
    "summary_ja": {
        "key": "summary_ja",
        "name": "会議サマリー (JA)",
        "description": "Meeting summary prompt in Japanese",
        "content": (
            "日本語で、短すぎず長すぎない会議要約を作成してください。逐語的な議事録ではなく、"
            "会議の目的/背景、主要な議論、結果または明確な決定事項、次のアクション、"
            "明示された担当者、未解決事項を十分に含めてください。決定、期限、担当者、タスクを推測で追加しないでください。"
        ),
        "version": "2.2.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    },
    "summary_ko": {
        "key": "summary_ko",
        "name": "회의 요약 (KO)",
        "description": "Meeting summary prompt in Korean",
        "content": (
            "한국어로 너무 짧지도 길지도 않은 균형 잡힌 회의 요약을 작성해 주세요. "
            "회의 목적/배경, 주요 논의 주제, 결과 또는 명확한 결정, 다음 단계, 명시된 담당자, "
            "남은 이슈를 포함하되, 회의록을 그대로 반복하지 마세요. 결정, 기한, 담당자, 할 일을 추측해 추가하지 마세요."
        ),
        "version": "2.2.0",
        "last_updated": datetime.now(timezone.utc).isoformat(),
    },
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

# Persist admin prompts to JSON file
_PROMPTS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "admin_prompts.json")

def _load_admin_prompts() -> None:
    """Load admin prompts from JSON file if it exists."""
    global ADMIN_PROMPTS
    try:
        if os.path.exists(_PROMPTS_FILE):
            with open(_PROMPTS_FILE, "r") as f:
                saved = json.load(f)
                ADMIN_PROMPTS.update(saved)
    except Exception:
        pass

def _save_admin_prompts() -> None:
    """Save admin prompts to JSON file."""
    try:
        os.makedirs(os.path.dirname(_PROMPTS_FILE), exist_ok=True)
        with open(_PROMPTS_FILE, "w") as f:
            json.dump(ADMIN_PROMPTS, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

_load_admin_prompts()

ADMIN_BROADCAST_HISTORY: List[Dict[str, Any]] = []


def ensure_audit_log_table() -> None:
    try:
        models.AuditLog.__table__.create(bind=engine, checkfirst=True)
    except Exception:
        # Keep runtime alive even when DDL permissions are restricted.
        pass


def append_admin_audit_log(actor: str, action: str, target: str, ip: str = "system", role: str = "System Admin") -> None:
    actor_name = actor or "unknown"
    timestamp = datetime.now(timezone.utc)
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


def push_runtime_notification(notification: Dict[str, Any]) -> None:
    RUNTIME_NOTIFICATIONS.append(notification)
    if len(RUNTIME_NOTIFICATIONS) > MAX_RUNTIME_NOTIFICATIONS:
        del RUNTIME_NOTIFICATIONS[:-MAX_RUNTIME_NOTIFICATIONS]


def normalize_notification_metadata(
    metadata: Optional[Dict[str, Any]] = None,
    *,
    source_type: Optional[str] = None,
    source_id: Optional[str] = None,
) -> Dict[str, Any]:
    raw = dict(metadata or {})
    entity_type = (
        raw.get("entity_type")
        or source_type
        or raw.get("type")
        or ("task" if raw.get("task_id") or raw.get("taskId") else None)
        or ("group" if raw.get("group_id") or raw.get("groupId") else None)
        or ("meeting" if raw.get("meeting_id") or raw.get("meetingId") else None)
        or ("invitation" if raw.get("invitationId") else None)
        or "system"
    )
    meeting_id = raw.get("meeting_id") or raw.get("meetingId")
    group_id = raw.get("group_id") or raw.get("groupId")
    task_id = raw.get("task_id") or raw.get("taskId")
    organization_id = raw.get("organization_id") or raw.get("organizationId")
    action_label = raw.get("action_label")

    if not action_label:
        action_label = {
            "meeting": "Mở cuộc họp",
            "task": "Mở việc",
            "group": "Mở nhóm",
            "invitation": "Xem lời mời",
            "system": "Xem chi tiết",
        }.get(str(entity_type), "Xem chi tiết")

    normalized = {
        **raw,
        "entity_type": entity_type,
        "meeting_id": meeting_id,
        "group_id": group_id,
        "task_id": task_id,
        "organization_id": organization_id,
        "action_label": action_label,
    }
    if source_id and entity_type in {"meeting", "task", "group", "invitation"}:
        key = f"{entity_type}_id"
        if not normalized.get(key):
            normalized[key] = source_id
    return normalized


def notification_payload(notification: models.Notification) -> Dict[str, Any]:
    return {
        "id": notification.id,
        "type": notification.type,
        "priority": notification.priority,
        "title": notification.title,
        "message": notification.message,
        "timestamp": (notification.created_at or datetime.now(timezone.utc)).isoformat(),
        "isRead": bool(notification.is_read),
        "metadata": normalize_notification_metadata(
            notification.metadata_json,
            source_type=notification.source_type,
            source_id=notification.source_id,
        ),
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
        metadata_json=normalize_notification_metadata(metadata, source_type=source_type, source_id=source_id),
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


class AdminUserRoleUpdateRequest(BaseModel):
    role: str  # "system-admin" or "member"


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



def build_unique_username(db: Session, requested_username: Optional[str], email: str) -> str:
    from src.api.core.auth_profile_operations import build_unique_username as core_build_unique_username

    return core_build_unique_username(db, requested_username, email)


def get_organization_approval_status(org: models.Organization) -> str:
    return core_get_organization_approval_status(org)


def format_user_payload(user: models.User) -> Dict[str, Any]:
    return core_format_user_payload(user)


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


def draft_transcript_segment_response_payloads(
    segments: List[Dict[str, Any]],
    speaker_map: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    speaker_map = speaker_map or {}
    payloads: List[Dict[str, Any]] = []
    for index, segment in enumerate(segments or []):
        text = str(segment.get("text") or "").strip()
        if not text:
            continue
        raw_label = normalize_speaker_label(segment.get("speaker_label") or segment.get("speaker") or "Speaker_01")
        display_name = speaker_map.get(raw_label, raw_label)
        payloads.append({
            "id": f"draft-segment-{index:03d}",
            "transcript_id": "draft",
            "speaker_label": display_name,
            "speaker_raw_label": raw_label,
            "speaker_display_name": display_name,
            "start_time": float(segment.get("start_time") or segment.get("start") or 0),
            "end_time": float(segment.get("end_time") or segment.get("end") or 0),
            "text": text,
            "language": str(segment.get("language") or "auto"),
            "confidence_score": (
                float(segment.get("confidence_score"))
                if segment.get("confidence_score") is not None
                else float(segment.get("confidence"))
                if segment.get("confidence") is not None
                else None
            ),
            "word_count": len(text.split()),
            "created_at": datetime.now(timezone.utc),
        })
    return payloads


def _normalize_match_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (value or "").lower())).strip()


def _anchor_from_segments(
    text: Optional[str],
    segments: List[Dict[str, Any]],
    *,
    preferred_speaker: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    normalized_text = _normalize_match_text(text)
    if not normalized_text:
        return None

    tokens = [token for token in normalized_text.split() if len(token) >= 3][:8]
    if not tokens:
        return None

    best_segment: Optional[Dict[str, Any]] = None
    best_score = 0
    preferred_normalized = _normalize_match_text(preferred_speaker) if preferred_speaker else None

    for segment in segments or []:
        segment_text = _normalize_match_text(segment.get("text"))
        if not segment_text:
            continue
        score = sum(2 for token in tokens if token in segment_text)
        if normalized_text and normalized_text[: min(len(normalized_text), 32)] in segment_text:
            score += 3
        if preferred_normalized and preferred_normalized in _normalize_match_text(segment.get("speaker_label")):
            score += 1
        if score > best_score:
            best_score = score
            best_segment = segment

    if not best_segment or best_score <= 0:
        return None

    return {
        "start_time": float(best_segment.get("start_time") or 0),
        "end_time": float(best_segment.get("end_time") or best_segment.get("start_time") or 0),
        "speaker_label": best_segment.get("speaker_label"),
        "source_segment_ids": [best_segment.get("id")] if best_segment.get("id") else [],
    }


def build_anchored_text_items(
    items: List[str],
    segments: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    anchored_items: List[Dict[str, Any]] = []
    for item in items or []:
        text = str(item or "").strip()
        if not text:
            continue
        anchored_items.append({
            "text": text,
            "anchor": _anchor_from_segments(text, segments),
        })
    return anchored_items


def build_meeting_activity_payload(
    meeting: models.Meeting,
    *,
    transcript_status: str,
    has_transcript_draft: bool,
    audio_status: str,
    summary_status: Optional[str],
    summary_error_text: Optional[str],
    action_items: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    def _activity_timestamp_value(value: Any) -> float:
        if value is None:
            return 0.0
        if isinstance(value, datetime):
            return value.timestamp()
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return 0.0
            try:
                return datetime.fromisoformat(normalized.replace("Z", "+00:00")).timestamp()
            except ValueError:
                return 0.0
        return 0.0

    creator = meeting.created_by_user
    creator_label = (
        " ".join(part for part in [getattr(creator, "first_name", None), getattr(creator, "last_name", None)] if part).strip()
        if creator else None
    ) or getattr(creator, "username", None) or getattr(creator, "email", None) or "Hệ thống"

    items: List[Dict[str, Any]] = [{
        "id": f"meeting-created-{meeting.id}",
        "type": "meeting.created",
        "title": "Cuộc họp được tạo",
        "description": f"{creator_label} đã tạo cuộc họp và chia sẻ ngữ cảnh ban đầu.",
        "timestamp": meeting.created_at.isoformat() if meeting.created_at else None,
        "tone": "neutral",
        "actor": {
            "id": getattr(creator, "id", None),
            "displayName": creator_label,
            "email": getattr(creator, "email", None),
        },
        "metadata": {"meeting_id": meeting.id},
    }]

    if meeting.actual_start or meeting.scheduled_start:
        items.append({
            "id": f"meeting-start-{meeting.id}",
            "type": "meeting.started",
            "title": "Cuộc họp bắt đầu",
            "description": "Buổi họp đã bắt đầu và dữ liệu đang được thu thập.",
            "timestamp": (meeting.actual_start or meeting.scheduled_start).isoformat() if (meeting.actual_start or meeting.scheduled_start) else None,
            "tone": "info",
            "metadata": {"meeting_id": meeting.id},
        })

    if meeting.actual_end:
        items.append({
            "id": f"meeting-end-{meeting.id}",
            "type": "meeting.ended",
            "title": "Cuộc họp kết thúc",
            "description": "Bản ghi âm, transcript và AI Notes đã sẵn sàng cho giai đoạn xử lý sau họp.",
            "timestamp": meeting.actual_end.isoformat(),
            "tone": "neutral",
            "metadata": {"meeting_id": meeting.id},
        })

    if transcript_status == "DRAFT" and has_transcript_draft:
        items.append({
            "id": f"transcript-draft-{meeting.id}",
            "type": "transcript.draft_saved",
            "title": "Transcript đang được lưu bản nháp",
            "description": "Hệ thống đã giữ lại transcript gần realtime, kể cả khi AI Notes chưa hoàn tất.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "info",
            "metadata": {"meeting_id": meeting.id},
        })
    elif transcript_status == "COMPLETED":
        items.append({
            "id": f"transcript-complete-{meeting.id}",
            "type": "transcript.completed",
            "title": "Transcript đã hoàn tất",
            "description": "Transcript chính thức đã sẵn sàng để tìm kiếm và nghe lại theo timeline.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "success",
            "metadata": {"meeting_id": meeting.id},
        })

    if audio_status == "PROCESSING":
        items.append({
            "id": f"audio-processing-{meeting.id}",
            "type": "audio.processing",
            "title": "Bản ghi âm đang được publish",
            "description": "Raw audio đã có và hệ thống đang chuẩn bị player để phát lại trên giao diện.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "warning",
            "metadata": {"meeting_id": meeting.id},
        })
    elif audio_status == "READY":
        items.append({
            "id": f"audio-ready-{meeting.id}",
            "type": "audio.ready",
            "title": "Bản ghi âm đã sẵn sàng",
            "description": "Bạn có thể phát lại audio full và nhảy tới từng mốc transcript.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "success",
            "metadata": {"meeting_id": meeting.id},
        })

    if summary_status == "COMPLETED":
        items.append({
            "id": f"summary-complete-{meeting.id}",
            "type": "summary.completed",
            "title": "AI Notes đã tạo xong",
            "description": "Tóm tắt, quyết định và việc cần làm đã được tổng hợp.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "success",
            "metadata": {"meeting_id": meeting.id},
        })
    elif summary_status == "FAILED":
        items.append({
            "id": f"summary-failed-{meeting.id}",
            "type": "summary.failed",
            "title": "AI Notes cần được tạo lại",
            "description": summary_error_text or "Bản tổng hợp AI chưa hoàn tất. Bạn có thể thử tạo lại từ tab AI Notes.",
            "timestamp": (meeting.updated_at or meeting.created_at).isoformat() if (meeting.updated_at or meeting.created_at) else None,
            "tone": "danger",
            "metadata": {"meeting_id": meeting.id},
        })

    for action_item in action_items:
        assignees = action_item.get("assignees") or []
        completed_count = len([assignee for assignee in assignees if assignee.get("status") == "COMPLETED"])
        assignee_summary = ", ".join(
            item.get("display_name") or item.get("email") or ""
            for item in assignees
            if item.get("display_name") or item.get("email")
        ) or "Chưa giao người phụ trách"
        items.append({
            "id": f"action-{action_item['id']}",
            "type": "action_item.completed" if action_item.get("status") == "COMPLETED" else "action_item.updated",
            "title": (
                f"Hoàn tất việc: {action_item['title']}"
                if action_item.get("status") == "COMPLETED"
                else f"Cập nhật phân công: {action_item['title']}"
                if assignees
                else f"Backlog mới: {action_item['title']}"
            ),
            "description": (
                f"{assignee_summary} · {completed_count}/{len(assignees)} đã xong"
                if assignees
                else "Task đang chờ người phụ trách nhận việc."
            ),
            "timestamp": action_item.get("completed_at") or action_item.get("updated_at") or action_item.get("created_at"),
            "tone": "success" if action_item.get("status") == "COMPLETED" else "warning" if not assignees else "info",
            "metadata": {
                "meeting_id": meeting.id,
                "task_id": action_item["id"],
            },
        })

    return sorted(
        items,
        key=lambda item: _activity_timestamp_value(item.get("timestamp")),
        reverse=True,
    )[:12]


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


AI_SUMMARY_MAX_CHARS = 1400
AI_ITEM_MAX_CHARS = 220
AI_KEY_POINTS_LIMIT = 8
AI_DECISIONS_LIMIT = 6
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


def _split_ai_owner_text(owner_text: str) -> List[str]:
    normalized = (owner_text or "").strip()
    if not normalized:
        return []
    parts = re.split(r",|;|/|&|\band\b|\bvà\b", normalized, flags=re.IGNORECASE)
    unique: List[str] = []
    seen = set()
    for part in parts:
        cleaned = _clip_ai_text(_compact_ai_text(part), 80)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(cleaned)
    return unique


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
        f"Create a balanced, useful meeting brief: complete enough to preserve the important content, but not a verbatim transcript. "
        f"Use only facts explicitly supported by the transcript. Do not invent decisions, owners, deadlines, or tasks. "
        f"meeting_summary must be 4-7 clear sentences and under {AI_SUMMARY_MAX_CHARS} characters. It must mention the meeting objective/context, main discussion themes, outcomes, and next direction when present. "
        f"key_points has at most {AI_KEY_POINTS_LIMIT} important points and should cover distinct discussion topics, not only final conclusions. "
        f"decisions has at most {AI_DECISIONS_LIMIT} explicit decisions, agreements, approvals, or confirmed directions, or an empty array. "
        f"action_items has at most {AI_ACTION_ITEMS_LIMIT} explicit tasks with keys: task, owner, deadline. Include only concrete follow-up work. "
        f"For owner: use the speaker's display name from the transcript if a person is clearly responsible. If not stated, use empty string \"\". "
        f"For deadline: use the exact date/time mentioned. If not stated, use empty string \"\". "
        f"risks has at most {AI_RISKS_LIMIT} explicit blockers or risks, or an empty array. "
        f"open_questions has at most {AI_OPEN_QUESTIONS_LIMIT} unresolved questions, or an empty array. "
        f"timeline_highlights has at most {AI_TIMELINE_HIGHLIGHTS_LIMIT} short highlights with timestamps or order markers when available; use it to preserve the flow of meaningful discussion. "
        f"speaker_summaries has at most {AI_SPEAKER_SUMMARIES_LIMIT} short strings like 'Name: contribution'. "
        f"If the transcript is short or thin, still provide the useful facts available without padding."
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
        '  "meeting_summary": "4-7 clear sentences covering objective/context, main discussion, outcomes, and next direction when present",\n'
        '  "key_points": ["max 8 important distinct points from the discussion"],\n'
        '  "decisions": ["max 6 explicit decisions, agreements, approvals, or confirmed directions only"],\n'
        '  "action_items": [{"task": "string", "owner": "string", "deadline": "string"}],\n'
        '  "risks": ["max 4 explicit risks or blockers"],\n'
        '  "open_questions": ["max 4 unresolved questions"],\n'
        '  "timeline_highlights": ["max 6 short timeline highlights"],\n'
        '  "speaker_summaries": ["max 6 speaker contribution summaries"]\n'
        "}\n\n"
        f"Quality bar: prefer specific, content-rich bullets over generic statements. Mention project names, numbers, constraints, deadlines, blockers, or owners when they appear in the transcript. If a field lacks evidence, return an empty array for that field.\n\n"
        f"Transcript:\n{transcript}"
    )
    return system_prompt, user_prompt


def enrich_organization_payload(org: models.Organization) -> Dict[str, Any]:
    from src.api.core.organization_operations import enrich_organization_payload as core_enrich_organization_payload

    return core_enrich_organization_payload(org)


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


def get_meeting_access_mode(db: Session, user: models.User, meeting: models.Meeting) -> str:
    if auth.get_user_org_role(db, user, meeting.organization_id):
        return "org_member"
    participant = get_meeting_participant_for_user(db, meeting.id, user)
    if participant and participant.invite_status != "declined":
        return "meeting_guest"
    return "none"


def _valid_meeting_audio_records(meeting: models.Meeting) -> List[models.AudioFile]:
    records = []
    for audio_file in (meeting.audio_files or []):
        if (
            audio_file.file_path
            and os.path.exists(audio_file.file_path)
            and os.path.getsize(audio_file.file_path) > 0
            and (audio_file.upload_status or "").upper() == "PROCESSED"
        ):
            records.append(audio_file)
    return sorted(records, key=lambda item: (item.updated_at or item.created_at or datetime.min, item.id))


def _sync_meeting_audio_urls(db: Session, meeting: models.Meeting, audio_file: models.AudioFile) -> None:
    audio_stream_url = f"/api/audio-files/{audio_file.id}/stream"
    meeting.audio_url = audio_stream_url
    meeting.recording_url = audio_stream_url
    latest_transcript = db.query(models.Transcript).filter(
        models.Transcript.meeting_id == meeting.id,
    ).order_by(models.Transcript.created_at.desc()).first()
    if latest_transcript and not latest_transcript.audio_file_id:
        latest_transcript.audio_file_id = audio_file.id
    db.flush()


def ensure_meeting_audio_published(db: Session, meeting: models.Meeting) -> str:
    valid_records = _valid_meeting_audio_records(meeting)
    if valid_records:
        latest_record = valid_records[-1]
        expected_url = f"/api/audio-files/{latest_record.id}/stream"
        if meeting.audio_url != expected_url or meeting.recording_url != expected_url:
            _sync_meeting_audio_urls(db, meeting, latest_record)
            db.commit()
            db.refresh(meeting)
        return "READY"

    perm_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting.id)
    if not os.path.isdir(perm_dir):
        return "NONE"

    all_dir_files = [
        path for path in glob.glob(os.path.join(perm_dir, "*"))
        if os.path.isfile(path)
    ]
    output_filename = f"recording_{meeting.id}.wav"
    output_path = os.path.join(perm_dir, output_filename)

    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        existing = db.query(models.AudioFile).filter(
            models.AudioFile.meeting_id == meeting.id,
            or_(
                models.AudioFile.file_path == output_path,
                models.AudioFile.filename == output_filename,
            ),
        ).order_by(models.AudioFile.updated_at.desc(), models.AudioFile.created_at.desc()).first()
        if existing:
            existing.file_path = output_path
            existing.filename = output_filename
            existing.original_filename = existing.original_filename or "meeting_recording.wav"
            existing.file_size = os.path.getsize(output_path)
            existing.format = "WAV"
            existing.sample_rate = existing.sample_rate or 16000
            existing.channels = existing.channels or 1
            existing.upload_status = "PROCESSED"
            audio_record = existing
        else:
            audio_record = models.AudioFile(
                meeting_id=meeting.id,
                filename=output_filename,
                original_filename="meeting_recording.wav",
                file_path=output_path,
                file_size=os.path.getsize(output_path),
                format="WAV",
                sample_rate=16000,
                channels=1,
                upload_status="PROCESSED",
            )
            db.add(audio_record)
            db.flush()
        _sync_meeting_audio_urls(db, meeting, audio_record)
        db.commit()
        db.refresh(meeting)
        return "READY"

    candidate_files = sorted(
        path for path in (glob.glob(os.path.join(perm_dir, "chunk_*")) + glob.glob(os.path.join(perm_dir, "stream_*.wav")))
        if os.path.isfile(path) and os.path.getsize(path) > 0 and os.path.abspath(path) != os.path.abspath(output_path)
    )
    if not candidate_files:
        return "PROCESSING" if all_dir_files else "NONE"

    concat_list_path = os.path.join(perm_dir, "concat_publish.txt")
    try:
        if len(candidate_files) == 1:
            subprocess.run(
                ["ffmpeg", "-y", "-i", candidate_files[0], "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path],
                capture_output=True,
                timeout=120,
                check=True,
            )
        else:
            with open(concat_list_path, "w") as concat_file:
                for candidate in candidate_files:
                    concat_file.write(f"file '{candidate}'\n")
            subprocess.run(
                ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list_path, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path],
                capture_output=True,
                timeout=120,
                check=True,
            )

        if not os.path.exists(output_path) or os.path.getsize(output_path) <= 0:
            logger.warning("Audio publish produced empty output for meeting %s", meeting.id)
            return "PROCESSING"

        audio_record = db.query(models.AudioFile).filter(
            models.AudioFile.meeting_id == meeting.id,
            or_(
                models.AudioFile.file_path == output_path,
                models.AudioFile.filename == output_filename,
            ),
        ).order_by(models.AudioFile.updated_at.desc(), models.AudioFile.created_at.desc()).first()
        if audio_record:
            audio_record.file_path = output_path
            audio_record.filename = output_filename
            audio_record.original_filename = audio_record.original_filename or "meeting_recording.wav"
            audio_record.file_size = os.path.getsize(output_path)
            audio_record.format = "WAV"
            audio_record.sample_rate = audio_record.sample_rate or 16000
            audio_record.channels = audio_record.channels or 1
            audio_record.upload_status = "PROCESSED"
        else:
            audio_record = models.AudioFile(
                meeting_id=meeting.id,
                filename=output_filename,
                original_filename="meeting_recording.wav",
                file_path=output_path,
                file_size=os.path.getsize(output_path),
                format="WAV",
                sample_rate=16000,
                channels=1,
                upload_status="PROCESSED",
            )
            db.add(audio_record)
            db.flush()

        _sync_meeting_audio_urls(db, meeting, audio_record)
        db.commit()
        db.refresh(meeting)

        for candidate in candidate_files:
            try:
                os.unlink(candidate)
            except OSError:
                pass
        return "READY"
    except subprocess.CalledProcessError as exc:
        logger.warning("ffmpeg publish failed for meeting %s: %s", meeting.id, exc.stderr)
        return "PROCESSING"
    except FileNotFoundError as exc:
        logger.warning("ffmpeg not available while publishing audio for meeting %s: %s", meeting.id, exc)
        return "FAILED"
    except Exception as exc:
        logger.error("Unexpected audio publish failure for meeting %s: %s", meeting.id, exc, exc_info=True)
        return "FAILED"
    finally:
        if os.path.exists(concat_list_path):
            try:
                os.unlink(concat_list_path)
            except OSError:
                pass


def build_meeting_detail_payload(
    db: Session,
    meeting: models.Meeting,
    user_lang: str = "vi",
    access_mode: Optional[str] = None,
) -> Dict[str, Any]:
    audio_status = ensure_meeting_audio_published(db, meeting)
    latest_transcript = _latest_processed_record(meeting.transcripts or [])
    draft_payload = build_transcript_from_drafts(db, meeting.id)
    has_transcript_draft = bool(
        str(draft_payload.get("transcript") or "").strip()
        or bool(draft_payload.get("segments"))
    )
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
    serialized_action_items = [serialize_action_item_payload(item) for item in (meeting.action_items or [])]
    transcript_segments = (
        transcript_segment_response_payloads(latest_transcript, speaker_map)
        if latest_transcript
        else draft_transcript_segment_response_payloads(draft_payload.get("segments") or [], speaker_map)
    )
    transcript_content = latest_transcript.content if latest_transcript else (draft_payload.get("transcript") or None)
    transcript_language = (
        latest_transcript.language
        if latest_transcript
        else draft_payload.get("language") if draft_payload.get("language") not in {None, "", "auto"} else None
    )
    transcript_status = "COMPLETED" if latest_transcript else "DRAFT" if has_transcript_draft else "EMPTY"
    key_points_text = summarize_json_items(latest_summary.key_points if latest_summary else None)
    decisions_text = summarize_json_items(latest_summary.decisions if latest_summary else None)
    timeline_highlights_text = summarize_json_items(latest_summary.timeline_highlights if latest_summary else None)
    activity = build_meeting_activity_payload(
        meeting,
        transcript_status=transcript_status,
        has_transcript_draft=has_transcript_draft,
        audio_status=audio_status,
        summary_status=summary_status,
        summary_error_text=summary_error_text,
        action_items=serialized_action_items,
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
        "audio_status": audio_status,
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
        "transcript_segments": transcript_segments,
        "speaker_mappings": [speaker_mapping_payload(item) for item in speaker_mappings],
        "summaries": meeting.summaries or [],
        "action_items": serialized_action_items,
        "transcript_content": transcript_content,
        "transcript_language": transcript_language,
        "transcript_status": transcript_status,
        "has_transcript_draft": has_transcript_draft,
        "activity": activity,
        "meeting_summary_text": latest_summary.meeting_summary if latest_summary else None,
        "key_points_text": key_points_text,
        "key_points_items": build_anchored_text_items(key_points_text, transcript_segments),
        "decisions_text": decisions_text,
        "decisions_items": build_anchored_text_items(decisions_text, transcript_segments),
        "risks_text": summarize_json_items(latest_summary.risks if latest_summary else None),
        "open_questions_text": summarize_json_items(latest_summary.open_questions if latest_summary else None),
        "timeline_highlights_text": timeline_highlights_text,
        "timeline_highlights_items": build_anchored_text_items(timeline_highlights_text, transcript_segments),
        "speaker_summaries_text": summarize_json_items(latest_summary.speaker_summaries if latest_summary else None),
        "summary_status": summary_status,
        "summary_error_text": summary_error_text,
        "summary_provider": latest_summary_any.ai_provider if latest_summary_any else None,
        "summary_model_name": latest_summary_any.model_name if latest_summary_any else None,
        "access_mode": access_mode,
    }


def user_org_ids(user: models.User) -> List[str]:
    return [membership.organization_id for membership in user.user_organizations]


def action_item_visible_to_user(db: Session, action_item: models.ActionItem, user: models.User) -> bool:
    from src.api.core.action_item_support import action_item_visible_to_user as core_action_item_visible_to_user

    return core_action_item_visible_to_user(db, action_item, user)


def action_item_assigned_to_user(action_item: models.ActionItem, user: models.User) -> bool:
    from src.api.core.action_item_support import action_item_assigned_to_user as core_action_item_assigned_to_user

    return core_action_item_assigned_to_user(action_item, user)


def action_item_manager_error_detail(meeting: models.Meeting) -> str:
    from src.api.core.action_item_support import action_item_manager_error_detail as core_action_item_manager_error_detail

    return core_action_item_manager_error_detail(meeting)


def can_manage_action_items_for_meeting(
    db: Session,
    user: models.User,
    meeting: models.Meeting,
) -> bool:
    from src.api.core.action_item_support import can_manage_action_items_for_meeting as core_can_manage_action_items_for_meeting

    return core_can_manage_action_items_for_meeting(db, user, meeting)


def require_action_item_manager_for_meeting(
    db: Session,
    user: models.User,
    meeting: models.Meeting,
) -> None:
    from src.api.core.action_item_support import require_action_item_manager_for_meeting as core_require_action_item_manager_for_meeting

    return core_require_action_item_manager_for_meeting(db, user, meeting)


def action_item_manageable_by_user(db: Session, action_item: models.ActionItem, user: models.User) -> bool:
    from src.api.core.action_item_support import action_item_manageable_by_user as core_action_item_manageable_by_user

    return core_action_item_manageable_by_user(db, action_item, user)


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


def meeting_participant_assignee_options(meeting: Optional[models.Meeting]) -> List[Dict[str, Optional[str]]]:
    from src.api.core.action_item_support import meeting_participant_assignee_options as core_meeting_participant_assignee_options

    return core_meeting_participant_assignee_options(meeting)


def attach_action_item_display_data(action_item: models.ActionItem) -> models.ActionItem:
    from src.api.core.action_item_support import attach_action_item_display_data as core_attach_action_item_display_data

    return core_attach_action_item_display_data(action_item)


def serialize_action_item_assignee_payload(assignee: models.ActionItemAssignee) -> Dict[str, Any]:
    from src.api.core.action_item_support import serialize_action_item_assignee_payload as core_serialize_action_item_assignee_payload

    return core_serialize_action_item_assignee_payload(assignee)


def serialize_action_item_payload(action_item: models.ActionItem) -> Dict[str, Any]:
    from src.api.core.action_item_support import serialize_action_item_payload as core_serialize_action_item_payload

    return core_serialize_action_item_payload(action_item)


def _blank_to_none(value: Any) -> Optional[str]:
    from src.api.core.action_item_support import _blank_to_none as core_blank_to_none

    return core_blank_to_none(value)


def _meeting_participant_assignee_lookup(meeting: Optional[models.Meeting]) -> Dict[str, Dict[str, Optional[str]]]:
    from src.api.core.action_item_support import _meeting_participant_assignee_lookup as core_meeting_participant_assignee_lookup

    return core_meeting_participant_assignee_lookup(meeting)


def _resolve_single_assignee(
    db: Session,
    assignee_input: Dict[str, Any],
    meeting: Optional[models.Meeting],
) -> Optional[Dict[str, Any]]:
    from src.api.core.action_item_support import _resolve_single_assignee as core_resolve_single_assignee

    return core_resolve_single_assignee(db, assignee_input, meeting)


def resolve_action_item_assignees(
    db: Session,
    payload: Dict[str, Any],
    meeting: Optional[models.Meeting],
    current_assignees: Optional[List[models.ActionItemAssignee]] = None,
) -> Dict[str, Any]:
    from src.api.core.action_item_support import resolve_action_item_assignees as core_resolve_action_item_assignees

    return core_resolve_action_item_assignees(db, payload, meeting, current_assignees=current_assignees)


def group_member_payload(membership: models.GroupMembership) -> Dict[str, Any]:
    from src.api.core.group_operations import group_member_payload as core_group_member_payload

    return core_group_member_payload(membership)


def normalize_global_role(role: Optional[str]) -> str:
    return core_normalize_global_role(role)


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
            connections = self.active_connections.setdefault(meeting_id, [])
            connections[:] = [(ws, u) for ws, u in connections if ws != websocket]
            connections.append((websocket, {**user_info, "connected_at": datetime.now(timezone.utc).isoformat()}))

    async def disconnect(self, meeting_id: str, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        disconnected_user: Optional[Dict[str, Any]] = None
        should_emit_left = False
        async with self._lock:
            connections = self.active_connections.get(meeting_id, [])
            for ws, user_info in connections:
                if ws == websocket:
                    disconnected_user = user_info
                    break
            self.active_connections[meeting_id] = [(ws, u) for ws, u in connections if ws != websocket]
            if not self.active_connections.get(meeting_id):
                self.active_connections.pop(meeting_id, None)
                should_emit_left = bool(disconnected_user)
            elif disconnected_user:
                user_id = disconnected_user.get("id")
                should_emit_left = not any(
                    user_info.get("id") == user_id
                    for _, user_info in self.active_connections.get(meeting_id, [])
                )
        return disconnected_user if should_emit_left else None

    def get_participants(self, meeting_id: str) -> List[Dict[str, Any]]:
        deduped: Dict[str, Dict[str, Any]] = {}
        for _, user_info in self.active_connections.get(meeting_id, []):
            key = str(user_info.get("id") or user_info.get("email") or len(deduped))
            deduped[key] = user_info
        return list(deduped.values())

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


def get_meeting_participant_for_user(db: Session, meeting_id: str, user: models.User) -> Optional[models.MeetingParticipant]:
    participant = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == meeting_id,
        models.MeetingParticipant.user_id == user.id,
    ).first()
    if participant:
        return participant

    email = (user.email or "").lower()
    if not email:
        return None
    participant = db.query(models.MeetingParticipant).filter(
        models.MeetingParticipant.meeting_id == meeting_id,
        func.lower(models.MeetingParticipant.email) == email,
    ).first()
    if participant and not participant.user_id:
        existing_user_participant = db.query(models.MeetingParticipant).filter(
            models.MeetingParticipant.meeting_id == meeting_id,
            models.MeetingParticipant.user_id == user.id,
        ).first()
        if not existing_user_participant:
            participant.user_id = user.id
            participant.name = participant.name or " ".join(
                part for part in [user.first_name, user.last_name] if part
            ).strip() or user.username
            db.flush()
    return participant


def require_meeting_room_access(db: Session, user: models.User, meeting: models.Meeting) -> Optional[models.MeetingParticipant]:
    try:
        auth.require_org_member(db, user, meeting.organization_id)
        return get_meeting_participant_for_user(db, meeting.id, user)
    except HTTPException as org_error:
        participant = get_meeting_participant_for_user(db, meeting.id, user)
        if participant and participant.invite_status != "declined":
            return participant
        raise org_error


def mark_participant_attended(db: Session, participant: Optional[models.MeetingParticipant]) -> None:
    if not participant:
        return
    if participant.invite_status == "pending":
        participant.invite_status = "accepted"
    participant.attended = True
    participant.joined_at = participant.joined_at or datetime.now(timezone.utc)
    db.flush()


def format_meeting_participant_payload(participant: models.MeetingParticipant) -> Dict[str, Any]:
    user = participant.user
    display_name = (
        participant.name
        or (" ".join(part for part in [getattr(user, "first_name", None), getattr(user, "last_name", None)] if part).strip() if user else "")
        or getattr(user, "username", None)
        or participant.email
        or "Thành viên"
    )
    return {
        "id": participant.user_id or participant.id,
        "participant_id": participant.id,
        "user_id": participant.user_id,
        "email": participant.email or (user.email if user else None),
        "displayName": display_name,
        "name": display_name,
        "role": participant.role,
        "invite_status": participant.invite_status,
        "attended": participant.attended,
        "joined_at": participant.joined_at.isoformat() if participant.joined_at else None,
        "left_at": participant.left_at.isoformat() if participant.left_at else None,
    }


def format_summary_payload(summary: Optional[models.MeetingSummary]) -> Optional[Dict[str, Any]]:
    if not summary:
        return None
    return {
        "id": summary.id,
        "meeting_summary": summary.meeting_summary or "",
        "key_points": summary.key_points or [],
        "decisions": summary.decisions or [],
        "action_items": summary.action_items or [],
        "risks": summary.risks or [],
        "open_questions": summary.open_questions or [],
        "timeline_highlights": summary.timeline_highlights or [],
        "speaker_summaries": summary.speaker_summaries or [],
        "processing_status": summary.processing_status,
        "language": summary.language,
        "ai_provider": summary.ai_provider,
        "model_name": summary.model_name,
        "created_at": summary.created_at.isoformat() if summary.created_at else None,
    }


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


def build_room_snapshot(db: Session, meeting_id: str, current_user: models.User) -> Dict[str, Any]:
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    participant = require_meeting_room_access(db, current_user, meeting)
    mark_participant_attended(db, participant)

    messages = db.query(models.MeetingMessage).options(
        joinedload(models.MeetingMessage.user)
    ).filter(
        models.MeetingMessage.meeting_id == meeting_id
    ).order_by(models.MeetingMessage.created_at.asc()).limit(100).all()
    draft = build_transcript_from_drafts(db, meeting_id)
    draft_payload = {
        "transcript": draft["transcript"],
        "segments": draft["segments"],
        "language": draft["language"],
        "chunks": serialize_transcript_draft_chunks(draft["chunks"]),
    }
    latest_transcript = _latest_processed_record(meeting.transcripts or [])
    has_transcript_draft = bool(str(draft["transcript"] or "").strip() or bool(draft["segments"]))
    transcript_status = "COMPLETED" if latest_transcript else "DRAFT" if has_transcript_draft else "EMPTY"
    latest_summary = _latest_processed_record(meeting.summaries or [], fallback_to_any=True)
    participant_records = db.query(models.MeetingParticipant).options(
        joinedload(models.MeetingParticipant.user)
    ).filter(models.MeetingParticipant.meeting_id == meeting_id).all()

    return {
        "type": "room.snapshot",
        "meeting_id": meeting_id,
        "meeting": {
            "id": meeting.id,
            "status": meeting.status,
            "title": meeting.title,
            "code": meeting.code,
            "access_mode": get_meeting_access_mode(db, current_user, meeting),
        },
        "participants": [format_meeting_participant_payload(item) for item in participant_records],
        "online_participants": meeting_room_manager.get_participants(meeting_id),
        "action_items": [serialize_action_item_payload(item) for item in (meeting.action_items or [])],
        "messages": [format_meeting_message_payload(message) for message in messages],
        "transcript": draft_payload,
        "transcript_status": transcript_status,
        "has_transcript_draft": has_transcript_draft,
        "ai_notes": format_summary_payload(latest_summary),
        "summary_status": latest_summary.processing_status if latest_summary else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


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


def broadcast_meeting_room_event(meeting_id: Optional[str], payload: Dict[str, Any]) -> None:
    if not meeting_id:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(meeting_room_manager.broadcast(meeting_id, payload))
    else:
        loop.create_task(meeting_room_manager.broadcast(meeting_id, payload))


def broadcast_participant_list_event(meeting_id: Optional[str]) -> None:
    if not meeting_id:
        return
    participant_rows: List[Dict[str, Any]] = []
    db = SessionLocal()
    try:
        participant_records = db.query(models.MeetingParticipant).options(
            joinedload(models.MeetingParticipant.user)
        ).filter(models.MeetingParticipant.meeting_id == meeting_id).all()
        participant_rows = [format_meeting_participant_payload(item) for item in participant_records]
    except Exception:
        logger.exception("Failed to build participant list event for meeting %s", meeting_id)
    finally:
        db.close()
    broadcast_meeting_room_event(
        meeting_id,
        {
            "type": "participant.list",
            "meeting_id": meeting_id,
            "participants": meeting_room_manager.get_participants(meeting_id),
            "all_participants": participant_rows,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def broadcast_action_item_updated(action_item: models.ActionItem) -> None:
    from src.api.core.action_item_support import broadcast_action_item_updated as core_broadcast_action_item_updated

    return core_broadcast_action_item_updated(action_item)


def broadcast_action_item_deleted(meeting_id: Optional[str], action_item_id: str) -> None:
    from src.api.core.action_item_support import broadcast_action_item_deleted as core_broadcast_action_item_deleted

    return core_broadcast_action_item_deleted(meeting_id, action_item_id)


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
    from src.api.core.invitation_support import resolve_pending_invitation_by_token as core_resolve_pending_invitation_by_token

    return core_resolve_pending_invitation_by_token(db, token)


def invitation_preview_payload(invitation: models.Invitation) -> Dict[str, Any]:
    from src.api.core.invitation_support import invitation_preview_payload as core_invitation_preview_payload

    return core_invitation_preview_payload(invitation)


def build_invitation_email_html(org_name: str, role: str, invite_url: str) -> str:
    from src.api.core.invitation_support import build_invitation_email_html as core_build_invitation_email_html

    return core_build_invitation_email_html(org_name, role, invite_url)


def build_password_reset_email_html(reset_code: str, expires_minutes: int) -> str:
    from src.api.core.auth_profile_operations import build_password_reset_email_html as core_build_password_reset_email_html

    return core_build_password_reset_email_html(reset_code, expires_minutes)


# Auth Endpoints
@app.post("/api/auth/register", response_model=schemas.RegisterResponse)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    from src.api.core.auth_profile_operations import register_payload

    return register_payload(req, db)

@app.post("/api/auth/login", response_model=Token)
async def login(req: schemas.UserLogin, db: Session = Depends(get_db)):
    from src.api.core.auth_profile_operations import login_payload

    return login_payload(req, db)


@app.post("/api/auth/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    from src.api.core.auth_profile_operations import forgot_password_payload

    return forgot_password_payload(req, db)


@app.post("/api/auth/reset-password", response_model=schemas.MessageResponse)
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    from src.api.core.auth_profile_operations import reset_password_payload

    return reset_password_payload(req, db)


@app.get("/api/profile")
@app.get("/api/auth/me")
def get_profile(current_user = Depends(auth.get_current_user)):
    from src.api.core.auth_profile_operations import get_profile_payload

    return get_profile_payload(current_user)


@app.patch("/api/profile")
def update_profile(
    updates: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.auth_profile_operations import update_profile_payload

    return update_profile_payload(updates, db, current_user)


@app.post("/api/profile/change-password", response_model=schemas.MessageResponse)
def change_password(
    req: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.auth_profile_operations import change_password_payload

    return change_password_payload(req, db, current_user)


def _avatar_extension_for_upload(file: UploadFile) -> Optional[str]:
    from src.api.core.auth_profile_operations import _avatar_extension_for_upload as core_avatar_extension_for_upload

    return core_avatar_extension_for_upload(file)


def _avatar_file_path(user_id: str) -> Optional[str]:
    from src.api.core.auth_profile_operations import _avatar_file_path as core_avatar_file_path

    return core_avatar_file_path(user_id)


@app.get("/api/users/{user_id}/avatar")
def get_user_avatar(user_id: str, db: Session = Depends(get_db)):
    from src.api.core.auth_profile_operations import get_user_avatar_payload

    return get_user_avatar_payload(user_id, db)


@app.post("/api/profile/avatar")
async def upload_profile_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.auth_profile_operations import upload_profile_avatar_payload

    return await upload_profile_avatar_payload(file, db, current_user)

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
    from src.api.core.organization_operations import create_organization_payload, list_organizations_payload

    if request.method == "GET":
        return list_organizations_payload(skip, limit, db, current_user)

    if not org_data:
        raise HTTPException(status_code=400, detail="Missing organization data")
    return create_organization_payload(org_data, db, current_user)


@app.post("/api/admin/organizations/{org_id}/approve", response_model=schemas.Organization)
def approve_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import approve_organization_payload

    return approve_organization_payload(org_id, db, current_user)


@app.post("/api/admin/organizations/{org_id}/reject")
def reject_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import reject_organization_payload

    return reject_organization_payload(org_id, db, current_user)


@app.post("/api/admin/organizations/{org_id}/suspend")
def suspend_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import suspend_organization_payload

    return suspend_organization_payload(org_id, db, current_user)


@app.get("/api/organizations/{org_id}", response_model=schemas.Organization)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.organization_operations import get_organization_payload

    return get_organization_payload(org_id, db, current_user)

@app.patch("/api/organizations/{org_id}", response_model=schemas.Organization)
def update_organization_endpoint(
    org_id: str,
    updates: schemas.OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.organization_operations import update_organization_payload

    return update_organization_payload(org_id, updates, db, current_user)


@app.delete("/api/organizations/{org_id}")
def delete_organization_endpoint(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import delete_organization_payload

    return delete_organization_payload(org_id, db, current_user)


@app.get("/api/organizations/{org_id}/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_organization_users(
    org_id: str,
    q: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import search_invitable_organization_users_payload

    return search_invitable_organization_users_payload(org_id, q, db, current_user)


@app.get("/api/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_users_alias(
    organization_id: str,
    q: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import search_invitable_users_alias_payload

    return search_invitable_users_alias_payload(organization_id, q, db, current_user)


# Invitation Endpoints
@app.post("/api/invitations", response_model=schemas.InvitationCreateResponse)
def create_invitation_endpoint(
    inv_data: schemas.InvitationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.organization_operations import create_invitation_payload

    return create_invitation_payload(inv_data, db, current_user)


@app.get("/api/invitations/preview", response_model=schemas.InvitationPreview)
def preview_invitation(token: str, db: Session = Depends(get_db)):
    from src.api.core.organization_operations import preview_invitation_payload

    return preview_invitation_payload(token, db)


@app.get("/api/invitations/pending")
def list_my_pending_invitations(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import list_my_pending_invitations_payload

    return list_my_pending_invitations_payload(db, current_user)


@app.post("/api/invitations/accept", response_model=schemas.InvitationAcceptResponse)
def accept_invitation_endpoint(
    req: schemas.InvitationAccept,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.organization_operations import accept_invitation_by_token_payload

    return accept_invitation_by_token_payload(req, db, current_user)


@app.post("/api/invitations/{invitation_id}/accept", response_model=schemas.InvitationAcceptResponse)
def accept_invitation_by_id(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.organization_operations import accept_invitation_by_id_payload

    return accept_invitation_by_id_payload(invitation_id, db, current_user)


@app.get("/api/organizations/{org_id}/members", response_model=List[Dict[str, Any]])
def list_organization_members(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.organization_operations import list_organization_members_payload

    return list_organization_members_payload(org_id, db, current_user)

# Group Endpoints
@app.get("/api/groups", response_model=List[schemas.Group])
def list_groups(
    org_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import list_groups_payload

    return list_groups_payload(org_id, db, current_user)


@app.get("/api/groups/{group_id}", response_model=schemas.Group)
def get_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import get_group_payload

    return get_group_payload(group_id, db, current_user)


@app.post("/api/groups", response_model=schemas.Group)
def create_group_endpoint(
    group_data: schemas.GroupCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import create_group_payload

    return create_group_payload(group_data, db, current_user)


@app.patch("/api/groups/{group_id}", response_model=schemas.Group)
def update_group_endpoint(
    group_id: str,
    updates: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import update_group_payload

    return update_group_payload(group_id, updates, db, current_user)


@app.delete("/api/groups/{group_id}")
def delete_group_endpoint(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import delete_group_payload

    return delete_group_payload(group_id, db, current_user)


@app.get("/api/groups/{group_id}/members", response_model=List[schemas.GroupMember])
def list_group_members(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import list_group_members_payload

    return list_group_members_payload(group_id, db, current_user)


@app.get("/api/groups/{group_id}/users/search", response_model=List[schemas.UserSearchResult])
def search_invitable_group_users(
    group_id: str,
    q: str = "",
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.group_operations import search_invitable_group_users_payload

    return search_invitable_group_users_payload(group_id, q, db, current_user)


@app.post("/api/groups/{group_id}/members", response_model=schemas.GroupMembership)
def add_group_member(
    group_id: str,
    membership: schemas.GroupMembershipCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import add_group_member_payload

    return add_group_member_payload(group_id, membership, db, current_user)


@app.post("/api/groups/{group_id}/members/invite-by-email", response_model=schemas.GroupMembership)
def add_group_member_by_email(
    group_id: str,
    payload: GroupInviteByEmailRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import add_group_member_by_email_payload

    return add_group_member_by_email_payload(group_id, payload.model_dump(), db, current_user)


@app.patch("/api/groups/{group_id}/members/{user_id}", response_model=schemas.GroupMembership)
def update_group_member(
    group_id: str,
    user_id: str,
    updates: schemas.GroupMembershipUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import update_group_member_payload

    return update_group_member_payload(group_id, user_id, updates, db, current_user)


@app.delete("/api/groups/{group_id}/members/{user_id}")
def delete_group_member(
    group_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import delete_group_member_payload

    return delete_group_member_payload(group_id, user_id, db, current_user)

# ==================== Group Messages ====================

@app.get("/api/groups/{group_id}/messages", response_model=List[schemas.GroupMessage])
def get_group_messages_endpoint(
    group_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import get_group_messages_payload

    return get_group_messages_payload(group_id, limit, offset, db, current_user)

@app.post("/api/groups/{group_id}/messages", response_model=schemas.GroupMessage)
def create_group_message_endpoint(
    group_id: str,
    message: schemas.GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import create_group_message_payload

    return create_group_message_payload(group_id, message, db, current_user)


@app.get("/api/groups/{group_id}/messages/latest", response_model=Optional[schemas.GroupMessage])
def get_latest_group_message_endpoint(
    group_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import get_latest_group_message_payload

    return get_latest_group_message_payload(group_id, db, current_user)

@app.patch("/api/groups/messages/{message_id}", response_model=schemas.GroupMessage)
def update_group_message_endpoint(
    message_id: str,
    updates: schemas.GroupMessageUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import update_group_message_payload

    return update_group_message_payload(message_id, updates, db, current_user)

@app.delete("/api/groups/messages/{message_id}")
def delete_group_message_endpoint(
    message_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.group_operations import delete_group_message_payload

    return delete_group_message_payload(message_id, db, current_user)

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
        joinedload(models.Meeting.action_items).joinedload(models.ActionItem.assignees).joinedload(models.ActionItemAssignee.user),
        joinedload(models.Meeting.speaker_mappings),
    ).filter(models.Meeting.code == meeting_code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    participant = require_meeting_room_access(db, current_user, meeting)
    mark_participant_attended(db, participant)
    db.commit()
    user_lang = getattr(current_user, "language", None) or "vi"
    return schemas.MeetingDetailResponse.model_validate(
        build_meeting_detail_payload(
            db,
            meeting,
            user_lang,
            access_mode=get_meeting_access_mode(db, current_user, meeting),
        )
    )


@app.get("/api/meetings/{meeting_id}", response_model=schemas.MeetingDetailResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    meeting = get_meeting_by_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    participant = require_meeting_room_access(db, current_user, meeting)
    mark_participant_attended(db, participant)
    db.commit()
    user_lang = getattr(current_user, "language", None) or "vi"
    return schemas.MeetingDetailResponse.model_validate(
        build_meeting_detail_payload(
            db,
            meeting,
            user_lang,
            access_mode=get_meeting_access_mode(db, current_user, meeting),
        )
    )


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
    require_meeting_room_access(db, current_user, meeting)

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
    require_meeting_room_access(db, current_user, meeting)
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
    require_meeting_room_access(db, current_user, meeting)
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
        participant = require_meeting_room_access(db, current_user, meeting)
        mark_participant_attended(db, participant)
        db.commit()
        user_payload = format_user_payload(current_user)
        await meeting_room_manager.connect(meeting_id, websocket, user_payload)
        connected = True
        try:
            snapshot = build_room_snapshot(db, meeting_id, current_user)
        except Exception as snapshot_exc:
            logger.error(
                "Failed to build meeting room snapshot for meeting %s: %s",
                meeting_id,
                snapshot_exc,
                exc_info=True,
            )
            db.rollback()
            snapshot = {
                "type": "room.snapshot",
                "meeting_id": meeting_id,
                "meeting": {
                    "id": meeting.id,
                    "status": meeting.status,
                    "title": meeting.title,
                    "code": meeting.code,
                    "access_mode": get_meeting_access_mode(db, current_user, meeting),
                },
                "participants": [],
                "online_participants": meeting_room_manager.get_participants(meeting_id),
                "messages": [],
                "transcript": {"text": "", "segments": [], "chunks": []},
                "ai_notes": None,
                "summary_status": None,
                "snapshot_warning": "partial_snapshot",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        await websocket.send_json(snapshot)
        # Broadcast join to all (including sender)
        await meeting_room_manager.broadcast(
            meeting_id,
            {
                "type": "participant.joined",
                "meeting_id": meeting_id,
                "user": user_payload,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        broadcast_participant_list_event(meeting_id)

        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")
            if event_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
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
                        "timestamp": datetime.now(timezone.utc).isoformat(),
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
            left_user = await meeting_room_manager.disconnect(meeting_id, websocket)
            broadcast_participant_list_event(meeting_id)
            if left_user and current_user:
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {
                        "type": "participant.left",
                        "meeting_id": meeting_id,
                        "user": format_user_payload(current_user),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
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
        scheduled_start = datetime.now(timezone.utc)
        if not scheduled_end:
            scheduled_end = scheduled_start  # duration tracked via actual_start/actual_end

    # Block meetings in the past (skip for instant live meetings)
    if not is_instant and scheduled_start:
        if scheduled_start < datetime.now(timezone.utc):
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
        meeting_payload["actual_start"] = datetime.now(timezone.utc)
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
                    "id": f"runtime-invite-{meeting.id}-{uid}-{int(datetime.now(timezone.utc).timestamp())}",
                    "recipient_user_id": uid,
                    "type": "meeting_invite",
                    "priority": "today",
                    "title": "Lời mời tham gia cuộc họp",
                    "message": f"Bạn được mời tham gia \"{meeting.title}\".",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
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
                    "id": f"runtime-create-{meeting.id}-{recipient_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "today",
                    "title": "Nhân viên vừa tạo cuộc họp mới",
                    "message": f"{actor_name} đã lên lịch \"{meeting.title}\".",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
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

    now = datetime.now(timezone.utc)
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
        {"type": "meeting.status", "meeting_id": meeting_id, "status": updated.status, "timestamp": datetime.now(timezone.utc).isoformat()},
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

    if target_status == "completed":
        try:
            await finalize_meeting_transcript(meeting_id, db, current_user, {})
            db.expire_all()
            refreshed = get_meeting_by_id(db, meeting_id)
            if refreshed:
                meeting = refreshed
            if meeting.status in {"completed", "failed", "canceled"}:
                await meeting_room_manager.broadcast(
                    meeting_id,
                    {"type": "meeting.status", "meeting_id": meeting_id, "status": meeting.status, "timestamp": datetime.now(timezone.utc).isoformat()},
                )
                return meeting
        except HTTPException as exc:
            if exc.status_code not in {400, 404}:
                raise
        except Exception:
            logger.exception("Auto-finalize before meeting completion failed for meeting %s", meeting_id)

    now = datetime.now(timezone.utc)
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
        {"type": "meeting.status", "meeting_id": meeting_id, "status": updated.status, "timestamp": datetime.now(timezone.utc).isoformat()},
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
        if start and start < datetime.now(timezone.utc):
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
                    "id": f"runtime-delete-request-{meeting_id}-{recipient_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "urgent",
                    "title": "Yeu cau xoa cuoc hop",
                    "message": f"{actor_name} vua yeu cau xoa \"{existing.title}\".",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
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
                    "id": f"runtime-delete-{meeting_id}-{recipient_id}-{int(datetime.now(timezone.utc).timestamp())}",
                    "recipient_user_id": recipient_id,
                    "type": "meeting",
                    "priority": "urgent",
                    "title": "Nhân viên vừa xóa cuộc họp",
                    "message": f"{actor_name} đã xóa \"{deleted_title}\".",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
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

# Singleton STT providers - load once, reuse for all chunks
_stt_service = None
_stt_services_by_provider: Dict[str, Any] = {}

def get_stt_provider(provider_name: Optional[str] = None):
    global _stt_service
    normalized_provider = (provider_name or "").strip().lower()
    if normalized_provider:
        if normalized_provider not in _stt_services_by_provider:
            from src.stt.service import STTService
            _stt_services_by_provider[normalized_provider] = STTService(provider=normalized_provider)
        return _stt_services_by_provider[normalized_provider].provider

    if _stt_service is None:
        from src.stt.service import STTService
        _stt_service = STTService()
    return _stt_service.provider


def audio_upload_suffix(filename: Optional[str]) -> str:
    lowered = (filename or "").lower()
    if lowered.endswith(".wav"):
        return ".wav"
    if lowered.endswith(".mp3"):
        return ".mp3"
    if lowered.endswith(".mp4"):
        return ".mp4"
    if lowered.endswith(".webm"):
        return ".webm"
    if lowered.endswith(".m4a"):
        return ".m4a"
    return ".webm"


async def save_upload_to_temp_wav(audio: UploadFile) -> str:
    import tempfile

    suffix = audio_upload_suffix(audio.filename)
    tmp_path = ""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
        tmp.write(content)
        tmp_path = tmp.name

    audio_path = tmp_path
    if suffix != ".wav":
        wav_path = tmp_path.rsplit(".", 1)[0] + ".wav"
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-acodec", "pcm_s16le", "-f", "wav", wav_path],
                capture_output=True,
                timeout=30,
                check=True,
            )
            os.unlink(tmp_path)
            audio_path = wav_path
        except (subprocess.CalledProcessError, FileNotFoundError) as exc:
            logger.warning("ffmpeg conversion failed for temp STT upload, using original: %s", exc)
    return audio_path


def normalize_test_stt_result(result: Dict[str, Any], language: str = "auto") -> Dict[str, Any]:
    detected_language = result.get("language") or result.get("detected_language") or language or "auto"
    text = str(result.get("text") or "")
    segments = []
    for segment in result.get("segments", []) or []:
        segments.append({
            "speaker": segment.get("speaker") or segment.get("speaker_label") or "Test Speaker",
            "speaker_label": normalize_speaker_label(segment.get("speaker_label") or segment.get("speaker") or "Test Speaker"),
            "speaker_display_name": segment.get("speaker_display_name") or segment.get("speaker") or "Test Speaker",
            "start": segment.get("start", segment.get("start_time", 0)),
            "end": segment.get("end", segment.get("end_time", 0)),
            "text": segment.get("text", ""),
            "language": segment.get("language") or segment.get("detected_language") or detected_language,
            "confidence": segment.get("confidence") or segment.get("confidence_score"),
        })
    if text.strip() and not segments:
        segments = [{
            "speaker": "Test Speaker",
            "speaker_label": "Test Speaker",
            "speaker_display_name": "Test Speaker",
            "start": 0,
            "end": estimate_segment_end(0, text),
            "text": text.strip(),
            "language": detected_language,
            "confidence": result.get("confidence") or result.get("confidence_score"),
        }]
    return {"text": text, "segments": segments, "language": detected_language}


def realtime_stt_enabled() -> bool:
    mode = os.getenv("REALTIME_STT_MODE", "deepgram_streaming").lower()
    return mode == "deepgram_streaming" and bool(os.getenv("DEEPGRAM_API_KEY"))


def deepgram_message_to_payload(message: Any) -> Optional[Dict[str, Any]]:
    if isinstance(message, bytes):
        return None
    data = message.model_dump() if hasattr(message, "model_dump") else message
    if not isinstance(data, dict):
        data = getattr(message, "__dict__", {})
    event_type = data.get("type") or getattr(message, "type", None)
    if event_type == "Results":
        channel = data.get("channel") or {}
        alternatives = channel.get("alternatives") or []
        alternative = alternatives[0] if alternatives else {}
        transcript = str(alternative.get("transcript") or "").strip()
        if not transcript:
            return None
        return {
            "kind": "result",
            "text": transcript,
            "is_final": bool(data.get("is_final")),
            "speech_final": bool(data.get("speech_final")),
            "from_finalize": bool(data.get("from_finalize")),
            "start": float(data.get("start") or 0),
            "duration": float(data.get("duration") or 0),
            "confidence": alternative.get("confidence"),
        }
    if event_type == "UtteranceEnd":
        return {"kind": "utterance_end"}
    if event_type == "SpeechStarted":
        return {"kind": "speech_started"}
    return None


class DeepgramLiveBridge:
    def __init__(
        self,
        *,
        loop: asyncio.AbstractEventLoop,
        sample_rate: int = 16000,
        language: str = "vi",
    ) -> None:
        self.loop = loop
        self.sample_rate = int(sample_rate or 16000)
        self.language = language or "vi"
        self.result_queue: asyncio.Queue = asyncio.Queue()
        self.media_queue: "queue.Queue[Any]" = queue.Queue()
        self.stop_event = threading.Event()
        self.thread: Optional[threading.Thread] = None

    def _emit(self, payload: Dict[str, Any]) -> None:
        self.loop.call_soon_threadsafe(self.result_queue.put_nowait, payload)

    def start(self) -> None:
        self.thread = threading.Thread(target=self._run, name="deepgram-live-stt", daemon=True)
        self.thread.start()

    def send_media(self, data: bytes) -> None:
        if data:
            self.media_queue.put(data)

    def finalize(self) -> None:
        self.media_queue.put({"type": "finalize"})

    def close(self) -> None:
        self.stop_event.set()
        self.media_queue.put({"type": "close"})

    def _run(self) -> None:
        try:
            from deepgram import DeepgramClient

            api_key = os.environ.get("DEEPGRAM_API_KEY", "")
            if not api_key:
                self._emit({"kind": "error", "error": "DEEPGRAM_API_KEY not set"})
                return

            client = DeepgramClient(api_key=api_key)
            model = os.getenv("DEEPGRAM_MODEL", "nova-3")
            logger.info(f"DeepgramLiveBridge: connecting to Deepgram streaming (model={model}, lang={self.language}, sr={self.sample_rate})")

            with client.listen.v1.connect(
                model=model,
                language=self.language,
                encoding="linear16",
                sample_rate=self.sample_rate,
                channels=1,
                interim_results="true",
                endpointing=350,
                smart_format="true",
                punctuate="true",
                diarize="false",
                vad_events="true",
            ) as dg_socket:
                logger.info("DeepgramLiveBridge: connected successfully")
                self._emit({"kind": "status", "status": "streaming"})

                def recv_loop() -> None:
                    while not self.stop_event.is_set():
                        try:
                            payload = deepgram_message_to_payload(dg_socket.recv())
                            if payload:
                                self._emit(payload)
                        except Exception as exc:
                            if not self.stop_event.is_set():
                                logger.error(f"DeepgramLiveBridge recv error: {exc}")
                                self._emit({"kind": "error", "error": f"Deepgram recv error: {exc}"})
                            break

                recv_thread = threading.Thread(target=recv_loop, name="deepgram-live-recv", daemon=True)
                recv_thread.start()

                while not self.stop_event.is_set():
                    item = self.media_queue.get()
                    if isinstance(item, (bytes, bytearray)):
                        dg_socket.send_media(bytes(item))
                    elif isinstance(item, dict) and item.get("type") == "finalize":
                        dg_socket.send_finalize()
                    elif isinstance(item, dict) and item.get("type") == "close":
                        try:
                            dg_socket.send_finalize()
                            dg_socket.send_close_stream()
                        except Exception:
                            pass
                        break
        except ImportError as exc:
            logger.error(f"DeepgramLiveBridge: deepgram SDK not installed: {exc}")
            self._emit({"kind": "error", "error": f"Deepgram SDK not installed: {exc}"})
        except Exception as exc:
            logger.error(f"DeepgramLiveBridge: connection failed: {type(exc).__name__}: {exc}")
            self._emit({"kind": "error", "error": f"Deepgram connection failed: {exc}"})
        finally:
            self._emit({"kind": "status", "status": "closed"})


def websocket_token_from_headers(websocket: WebSocket, token: Optional[str]) -> Optional[str]:
    return token or websocket.headers.get("authorization")


async def receive_initial_stt_config(websocket: WebSocket) -> tuple[Dict[str, Any], Optional[bytes]]:
    message = await websocket.receive()
    if message.get("bytes") is not None:
        return {}, message["bytes"]
    raw_text = message.get("text")
    if not raw_text:
        return {}, None
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        return {}, None
    if payload.get("type") == "stt.config":
        return payload, None
    return payload, None


def build_stream_segment(
    *,
    text: str,
    user_display_name: str,
    language: str,
    confidence: Optional[float],
) -> Dict[str, Any]:
    speaker_label = normalize_speaker_label(user_display_name)
    return {
        "speaker": user_display_name,
        "speaker_label": speaker_label,
        "speaker_display_name": user_display_name,
        "start": 0,
        "end": estimate_segment_end(0, text),
        "text": text,
        "language": language,
        "confidence": confidence,
    }


def next_transcript_chunk_index(db: Session, meeting_id: str, user_id: str) -> int:
    current = db.query(func.max(models.MeetingTranscriptDraft.chunk_index)).filter(
        models.MeetingTranscriptDraft.meeting_id == meeting_id,
        models.MeetingTranscriptDraft.user_id == user_id,
    ).scalar()
    return int(current if current is not None else -1) + 1


@app.websocket("/api/test-stt/stream")
async def test_stt_stream(websocket: WebSocket, token: Optional[str] = Query(None)):
    db = SessionLocal()
    bridge: Optional[DeepgramLiveBridge] = None
    try:
        await websocket.accept()
        current_user = get_ws_user(db, websocket_token_from_headers(websocket, token))
        if not realtime_stt_enabled():
            await websocket.send_json({
                "type": "stt.status",
                "status": "fallback",
                "reason": "realtime_stt_disabled",
            })
            await websocket.close(code=1013, reason="Realtime STT fallback")
            return

        config_payload, first_bytes = await receive_initial_stt_config(websocket)
        sample_rate = int(config_payload.get("sampleRate") or config_payload.get("sample_rate") or 16000)
        language = str(config_payload.get("language") or "vi")
        bridge = DeepgramLiveBridge(loop=asyncio.get_running_loop(), sample_rate=sample_rate, language=language)
        bridge.start()
        if first_bytes:
            bridge.send_media(first_bytes)

        chunk_index = 0
        final_parts: List[str] = []
        final_confidence: Optional[float] = None
        user_display_name = " ".join(part for part in [current_user.first_name, current_user.last_name] if part).strip() or current_user.username

        async def receive_loop() -> None:
            while True:
                message = await websocket.receive()
                if message.get("bytes") is not None:
                    bridge.send_media(message["bytes"])
                    continue
                raw_text = message.get("text")
                if not raw_text:
                    continue
                try:
                    payload = json.loads(raw_text)
                except json.JSONDecodeError:
                    continue
                if payload.get("type") == "stt.finalize":
                    bridge.finalize()
                elif payload.get("type") == "stt.close":
                    bridge.close()
                    break

        async def emit_final(text: str, confidence: Optional[float]) -> None:
            nonlocal chunk_index
            normalized_text = text.strip()
            if not normalized_text:
                return
            segments = [build_stream_segment(
                text=normalized_text,
                user_display_name=user_display_name,
                language=language,
                confidence=confidence,
            )]
            nlp_metadata = None
            if phobert_enabled_for(language):
                try:
                    processor = get_phobert_processor()
                    processed = processor.process_chunk(normalized_text, segments, {})
                    normalized_text = str(processed.get("text") or normalized_text)
                    segments = processed.get("segments") or segments
                    nlp_metadata = processed.get("nlp_metadata")
                except Exception as nlp_error:
                    logger.warning("PhoBERT test stream post-processing skipped: %s", nlp_error)

            await websocket.send_json({
                "type": "test_stt.final",
                "id": f"test:{current_user.id}:{chunk_index}",
                "chunkIndex": chunk_index,
                "text": normalized_text,
                "segments": segments,
                "language": language,
                "provider": "deepgram",
                "model": os.getenv("DEEPGRAM_MODEL", "nova-3"),
                "nlp_metadata": nlp_metadata,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            chunk_index += 1

        async def result_loop() -> None:
            nonlocal final_parts, final_confidence
            while True:
                payload = await bridge.result_queue.get()
                kind = payload.get("kind")
                if kind == "status":
                    if payload.get("status") == "closed" and final_parts:
                        await emit_final(" ".join(final_parts), final_confidence)
                        final_parts = []
                        final_confidence = None
                    await websocket.send_json({"type": "stt.status", "status": payload.get("status")})
                    if payload.get("status") == "closed":
                        break
                elif kind == "error":
                    await websocket.send_json({
                        "type": "stt.status",
                        "status": "error",
                        "error": payload.get("error"),
                    })
                    break
                elif kind == "result":
                    text = str(payload.get("text") or "").strip()
                    if not text:
                        continue
                    if payload.get("is_final"):
                        final_parts.append(text)
                        final_confidence = payload.get("confidence") or final_confidence
                        if payload.get("speech_final") or payload.get("from_finalize"):
                            await emit_final(" ".join(final_parts), final_confidence)
                            final_parts = []
                            final_confidence = None
                    else:
                        interim_text = " ".join([*final_parts, text]).strip()
                        await websocket.send_json({
                            "type": "test_stt.interim",
                            "text": interim_text,
                            "language": language,
                            "provider": "deepgram",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                elif kind == "utterance_end" and final_parts:
                    await emit_final(" ".join(final_parts), final_confidence)
                    final_parts = []
                    final_confidence = None

        receive_task = asyncio.create_task(receive_loop())
        result_task = asyncio.create_task(result_loop())
        done, pending = await asyncio.wait({receive_task, result_task}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in done:
            if task.exception():
                raise task.exception()
    except WebSocketDisconnect:
        pass
    except HTTPException as exc:
        try:
            await websocket.send_json({"type": "stt.status", "status": "error", "error": str(exc.detail)})
            await websocket.close(code=1008, reason=str(exc.detail))
        except Exception:
            pass
    except Exception as exc:
        logger.error("Test STT stream error: %s", exc, exc_info=True)
        try:
            await websocket.send_json({"type": "stt.status", "status": "error", "error": str(exc)})
            await websocket.close(code=1011, reason="STT stream error")
        except Exception:
            pass
    finally:
        if bridge:
            bridge.close()
        db.close()


@app.websocket("/api/meetings/{meeting_id}/stt-stream")
async def meeting_stt_stream(
    websocket: WebSocket,
    meeting_id: str,
    token: Optional[str] = Query(None),
):
    db = SessionLocal()
    bridge: Optional[DeepgramLiveBridge] = None
    raw_audio_file = None
    raw_audio_path = ""
    sample_rate = 16000
    try:
        await websocket.accept()
        logger.info(f"STT WebSocket accepted: meeting={meeting_id}")

        # Authenticate user
        try:
            auth_token = websocket_token_from_headers(websocket, token)
            logger.info(f"STT WebSocket auth: token={'present' if auth_token else 'missing'}")
            current_user = get_ws_user(db, auth_token)
            logger.info(f"STT WebSocket auth success: user={current_user.username}")
        except HTTPException as auth_err:
            logger.warning(f"STT WebSocket auth failed: {auth_err.detail}")
            await websocket.send_json({"type": "stt.status", "status": "error", "error": f"Auth failed: {auth_err.detail}"})
            await websocket.close(code=1008, reason="Authentication failed")
            return

        meeting = get_meeting_by_id(db, meeting_id)
        if not meeting:
            await websocket.send_json({"type": "stt.status", "status": "error", "error": "Meeting not found"})
            await websocket.close(code=1008, reason="Meeting not found")
            return

        try:
            require_meeting_room_access(db, current_user, meeting)
        except HTTPException as access_err:
            logger.warning(f"STT WebSocket access denied: {access_err.detail}")
            await websocket.send_json({"type": "stt.status", "status": "error", "error": f"Access denied: {access_err.detail}"})
            await websocket.close(code=1008, reason="Access denied")
            return

        if not realtime_stt_enabled():
            await websocket.send_json({
                "type": "stt.status",
                "status": "fallback",
                "reason": "realtime_stt_disabled",
            })
            await websocket.close(code=1013, reason="Realtime STT fallback")
            return

        config_payload, first_bytes = await receive_initial_stt_config(websocket)
        sample_rate = int(config_payload.get("sampleRate") or config_payload.get("sample_rate") or 16000)
        language = str(config_payload.get("language") or "vi")
        bridge = DeepgramLiveBridge(loop=asyncio.get_running_loop(), sample_rate=sample_rate, language=language)
        bridge.start()
        if first_bytes:
            bridge.send_media(first_bytes)

        # Save raw audio for recording persistence
        audio_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting_id)
        os.makedirs(audio_dir, exist_ok=True)
        raw_audio_path = os.path.join(audio_dir, f"stream_{current_user.id}_{int(time.time())}.pcm")
        raw_audio_file = open(raw_audio_path, "ab")
        if first_bytes:
            raw_audio_file.write(first_bytes)

        chunk_index = next_transcript_chunk_index(db, meeting_id, current_user.id)
        stream_started_at = time.time()
        final_parts: List[str] = []
        final_confidence: Optional[float] = None
        user_display_name = " ".join(part for part in [current_user.first_name, current_user.last_name] if part).strip() or current_user.username

        async def receive_loop() -> None:
            while True:
                message = await websocket.receive()
                if message.get("bytes") is not None:
                    bridge.send_media(message["bytes"])
                    raw_audio_file.write(message["bytes"])
                    continue
                raw_text = message.get("text")
                if not raw_text:
                    continue
                try:
                    payload = json.loads(raw_text)
                except json.JSONDecodeError:
                    continue
                if payload.get("type") == "stt.finalize":
                    bridge.finalize()
                elif payload.get("type") == "stt.close":
                    bridge.close()
                    break

        async def emit_final(text: str, confidence: Optional[float]) -> None:
            nonlocal chunk_index
            normalized_text = text.strip()
            if not normalized_text:
                return
            segments = [build_stream_segment(
                text=normalized_text,
                user_display_name=user_display_name,
                language=language,
                confidence=confidence,
            )]
            nlp_metadata = None
            if phobert_enabled_for(language):
                try:
                    processor = get_phobert_processor()
                    glossary = build_glossary_dict(db, meeting.organization_id)
                    processed = processor.process_chunk(normalized_text, segments, glossary)
                    normalized_text = str(processed.get("text") or normalized_text)
                    segments = processed.get("segments") or segments
                    nlp_metadata = processed.get("nlp_metadata")
                except Exception as nlp_error:
                    logger.warning("PhoBERT meeting stream post-processing skipped: %s", nlp_error)

            start_ms = int(max(0, time.time() - stream_started_at) * 1000)
            upsert_transcript_draft(
                db,
                meeting_id=meeting_id,
                user_id=current_user.id,
                chunk_index=chunk_index,
                text=normalized_text,
                segments=segments,
                language=language,
                provider="deepgram_streaming",
                model=os.getenv("DEEPGRAM_MODEL", "nova-3"),
                start_ms=start_ms,
            )
            event_payload = {
                "type": "transcript.chunk",
                "meeting_id": meeting_id,
                "id": f"{meeting_id}:{current_user.id}:{chunk_index}",
                "user_id": current_user.id,
                "chunkIndex": chunk_index,
                "text": normalized_text,
                "segments": segments,
                "speaker": user_display_name,
                "language": language,
                "nlp_metadata": nlp_metadata,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            await websocket.send_json(event_payload)
            await meeting_room_manager.broadcast(meeting_id, event_payload)
            chunk_index += 1

        async def result_loop() -> None:
            nonlocal final_parts, final_confidence
            while True:
                payload = await bridge.result_queue.get()
                kind = payload.get("kind")
                if kind == "status":
                    if payload.get("status") == "closed" and final_parts:
                        await emit_final(" ".join(final_parts), final_confidence)
                        final_parts = []
                        final_confidence = None
                    await websocket.send_json({"type": "stt.status", "status": payload.get("status")})
                    if payload.get("status") == "closed":
                        break
                elif kind == "error":
                    await websocket.send_json({
                        "type": "stt.status",
                        "status": "error",
                        "error": payload.get("error"),
                    })
                    break
                elif kind == "result":
                    text = str(payload.get("text") or "").strip()
                    if not text:
                        continue
                    if payload.get("is_final"):
                        final_parts.append(text)
                        final_confidence = payload.get("confidence") or final_confidence
                        if payload.get("speech_final") or payload.get("from_finalize"):
                            await emit_final(" ".join(final_parts), final_confidence)
                            final_parts = []
                            final_confidence = None
                    else:
                        interim_text = " ".join([*final_parts, text]).strip()
                        interim_payload = {
                            "type": "transcript.interim",
                            "meeting_id": meeting_id,
                            "user_id": current_user.id,
                            "speaker": user_display_name,
                            "text": interim_text,
                            "language": language,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                        await websocket.send_json(interim_payload)
                        await meeting_room_manager.broadcast(meeting_id, interim_payload)
                elif kind == "utterance_end" and final_parts:
                    await emit_final(" ".join(final_parts), final_confidence)
                    final_parts = []
                    final_confidence = None

        receive_task = asyncio.create_task(receive_loop())
        result_task = asyncio.create_task(result_loop())
        done, pending = await asyncio.wait({receive_task, result_task}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in done:
            if task.exception():
                raise task.exception()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("Meeting STT stream error: %s", exc, exc_info=True)
        try:
            await websocket.send_json({"type": "stt.status", "status": "error", "error": str(exc)})
            await websocket.close(code=1011, reason="STT stream error")
        except Exception:
            pass
    finally:
        if bridge:
            bridge.close()
        # Close raw audio file and convert PCM → WAV
        try:
            if raw_audio_file and not raw_audio_file.closed:
                raw_audio_file.close()
            if os.path.exists(raw_audio_path) and os.path.getsize(raw_audio_path) > 0:
                import wave
                wav_path = raw_audio_path.replace(".pcm", ".wav")
                with wave.open(wav_path, "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(sample_rate)
                    with open(raw_audio_path, "rb") as pf:
                        wf.writeframes(pf.read())
                os.remove(raw_audio_path)
                logger.info(f"Saved streaming audio: {wav_path} ({os.path.getsize(wav_path)} bytes)")
        except Exception as audio_err:
            logger.error(f"Failed to save streaming audio: {audio_err}")
        db.close()


@app.post("/api/test-stt/transcribe-chunk")
async def test_stt_transcribe_chunk(
    audio: UploadFile = File(...),
    chunk_index: Optional[int] = Form(None),
    language: str = Form("auto"),
    provider_name: Optional[str] = Form(None),
    current_user=Depends(auth.get_current_user),
):
    """No-DB microphone test endpoint: temp audio -> STT -> optional PhoBERT -> JSON."""
    audio_path = ""
    try:
        audio_path = await save_upload_to_temp_wav(audio)
        provider = get_stt_provider(provider_name)
        result = provider.transcribe(audio_path)
        if not result or "text" not in result:
            raise ValueError("Invalid transcription result")
        if result.get("error"):
            raise ValueError(f"STT provider error: {result['error']}")

        normalized = normalize_test_stt_result(result, language)
        text = normalized["text"]
        segments = normalized["segments"]
        detected_language = normalized["language"]
        nlp_metadata = None
        if phobert_enabled_for(detected_language):
            try:
                processor = get_phobert_processor()
                processed = processor.process_chunk(text, segments, {})
                text = str(processed.get("text") or text)
                segments = processed.get("segments") or segments
                nlp_metadata = processed.get("nlp_metadata")
            except Exception as nlp_error:
                logger.warning("PhoBERT test chunk post-processing skipped: %s", nlp_error)

        actual_provider = provider_name or os.getenv("STT_PROVIDER", "deepgram").lower()
        return {
            "id": f"test:{current_user.id}:{chunk_index}" if chunk_index is not None else None,
            "chunkIndex": chunk_index,
            "text": text,
            "segments": segments,
            "language": detected_language,
            "detected_language": detected_language,
            "provider": actual_provider,
            "model": os.getenv("DEEPGRAM_MODEL", "nova-3"),
            "nlp_metadata": nlp_metadata,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("No-DB test STT failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test STT failed: {exc}")
    finally:
        if audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except OSError:
                pass


@app.post("/api/test-stt/analyze", response_model=schemas.TestSTTAnalyzeResponse)
async def test_stt_analyze(
    payload: schemas.TestSTTAnalyzeRequest,
    current_user=Depends(auth.get_current_user),
):
    """No-DB AI Notes endpoint for upload-page microphone tests."""
    from src.providers.router_llm import RouterLLMAdapter

    full_text = (payload.transcript or "").strip()
    if not full_text:
        raise HTTPException(status_code=400, detail="Transcript is required")

    language = (payload.language or getattr(current_user, "language", None) or "vi").lower().strip()
    if language not in ("vi", "en", "zh", "ja", "ko"):
        language = "vi"

    errors: List[str] = []
    segments = payload.segments or []
    nlp_metadata = None
    if phobert_enabled_for(language):
        try:
            processor = get_phobert_processor()
            processed = processor.process_finalize(full_text, segments, {})
            full_text = str(processed.get("text") or full_text)
            segments = processed.get("segments") or segments
            nlp_metadata = processed.get("nlp_metadata")
        except Exception as nlp_error:
            logger.warning("PhoBERT test finalize post-processing skipped: %s", nlp_error, exc_info=True)
            errors.append(f"PhoBERT post-processing skipped: {nlp_error}")

    summary_status = "FAILED"
    summary_payload = schemas.MeetingAnalysisOutput(
        meeting_summary="",
        key_points=[],
        decisions=[],
        action_items=[],
    )
    summary_error_message = ""
    prompt_key = f"summary_{language}"
    custom_instruction = ADMIN_PROMPTS.get(prompt_key, ADMIN_PROMPTS.get("summary_vi", {})).get(
        "content",
        "Create a concise meeting brief. Focus on outcomes, explicit decisions, and next steps only.",
    )
    speaker_aware_transcript = build_speaker_aware_transcript(full_text, segments, {})
    system_prompt, user_prompt = build_structured_summary_prompts(
        speaker_aware_transcript,
        custom_instruction,
        language,
        "",
        nlp_metadata,
    )

    raw_response = None
    router = RouterLLMAdapter()
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

    if not raw_response:
        google_key = os.getenv("GOOGLE_API_KEY")
        if google_key:
            try:
                from src.providers.google_llm import GoogleLLMAdapter
                google = GoogleLLMAdapter(api_key=google_key)
                if google.client:
                    raw_response = google.chat_completion(system_prompt, user_prompt)
                    if raw_response and errors:
                        errors.pop()
            except Exception as exc:
                errors.append(f"Google Gemini fallback failed: {exc}")

    if raw_response:
        try:
            structured_payload = _extract_json_object(raw_response)
            summary_payload = _normalize_analysis_payload(structured_payload)
            summary_status = "COMPLETED"
        except Exception as parse_error:
            summary_error_message = f"Failed to parse LLM response: {parse_error}"
            errors.append(summary_error_message)

    if summary_status != "COMPLETED" and summary_error_message:
        summary_payload.meeting_summary = summary_error_message

    return {
        "summary_status": summary_status,
        "summary": summary_payload,
        "nlp_metadata": nlp_metadata,
        "errors": errors,
    }

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

        # Validate user has meeting room access.
        require_meeting_room_access(db, current_user, meeting)

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

            # Log STT usage to CostTracking
            duration_sec = result.get("duration_seconds", 0)
            if duration_sec > 0:
                try:
                    from src.api.crud.crud_system import create_cost_tracking
                    cost_per_sec = 0.0000717  # Deepgram Nova-3: ~$0.0043/min
                    create_cost_tracking(db, {
                        "meeting_id": meeting_id,
                        "service": "stt",
                        "api_endpoint": "deepgram",
                        "model_name": result.get("model", "nova-3"),
                        "input_tokens": int(duration_sec),
                        "output_tokens": 0,
                        "cost_usd": round(duration_sec * cost_per_sec, 6),
                    })
                except Exception as cost_err:
                    logger.warning(f"Failed to log STT cost: {cost_err}")
            
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
                        "id": f"{meeting_id}:{current_user.id}:{chunk_index}",
                        "user_id": current_user.id,
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
                        "speaker": normalized_segments[0].get("speaker") if normalized_segments else user_display_name,
                        "language": detected_language,
                        "nlp_metadata": nlp_metadata,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )

            return {
                "id": f"{meeting_id}:{current_user.id}:{chunk_index}" if chunk_index is not None else None,
                "user_id": current_user.id,
                "chunkIndex": chunk_index,
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
    require_meeting_room_access(db, current_user, meeting)
    draft = build_transcript_from_drafts(db, meeting_id)
    return {
        "meeting_id": meeting_id,
        "transcript": draft["transcript"],
        "segments": draft["segments"],
        "language": draft["language"],
        "chunks": serialize_transcript_draft_chunks(draft["chunks"]),
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


async def finalize_meeting_transcript(
    meeting_id: str,
    db: Session,
    current_user: models.User,
    body: Optional[Dict[str, Any]] = None,
):
    """Save transcript from request or drafts, then summarize and persist stable meeting artifacts."""
    from src.providers.router_llm import RouterLLMAdapter

    body = body or {}
    full_text = body.get("transcript", "")
    segments = body.get("segments", [])
    req_language = body.get("language", "")
    regenerate = bool(body.get("regenerate", False))
    errors: List[str] = []

    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    language = req_language or getattr(meeting, "language", None) or getattr(current_user, "language", None) or "vi"
    language = language.lower().strip() if language else "vi"
    if language not in ("vi", "en", "zh", "ja", "ko"):
        language = "vi"

    require_meeting_room_access(db, current_user, meeting)
    original_meeting_status = meeting.status

    draft_payload = build_transcript_from_drafts(db, meeting_id)
    has_transcript_draft = bool(
        str(draft_payload.get("transcript") or "").strip()
        or bool(draft_payload.get("segments"))
    )
    if not isinstance(full_text, str) or not full_text.strip():
        full_text = draft_payload["transcript"]
    if not segments:
        segments = draft_payload["segments"]
    if (not req_language or req_language == "auto") and draft_payload["language"] != "auto":
        language = draft_payload["language"]
        if language not in ("vi", "en", "zh", "ja", "ko"):
            language = "vi"

    if not isinstance(full_text, str) or not full_text.strip():
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
            "errors": errors,
        }

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
        perm_dir = os.path.join(AUDIO_UPLOAD_DIR, meeting_id)
        if os.path.isdir(perm_dir):
            chunk_files = sorted(glob.glob(os.path.join(perm_dir, "chunk_*")) + glob.glob(os.path.join(perm_dir, "stream_*.wav")))
            if chunk_files:
                logger.info(f"Concatenating {len(chunk_files)} audio chunks for meeting {meeting_id}")
                concat_list_path = os.path.join(perm_dir, "concat.txt")
                with open(concat_list_path, "w") as f:
                    for cf in chunk_files:
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
    await meeting_room_manager.broadcast(
        meeting_id,
        {
            "type": "ai.notes.started",
            "meeting_id": meeting_id,
            "summary_status": "PROCESSING",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

    if router.enabled:
        try:
            raw_response = router.structured_completion(system_prompt, user_prompt)
            if not raw_response:
                raise ValueError(router.last_error or "Router LLM returned empty response")
            # Log Groq LLM usage
            if router.last_usage:
                try:
                    from src.api.crud.crud_system import create_cost_tracking
                    usage = router.last_usage
                    create_cost_tracking(db, {
                        "meeting_id": meeting_id,
                        "service": "llm",
                        "api_endpoint": "groq",
                        "model_name": usage.get("model", "unknown"),
                        "input_tokens": usage.get("prompt_tokens", 0),
                        "output_tokens": usage.get("completion_tokens", 0),
                        "cost_usd": 0.0,  # Groq free tier
                    })
                except Exception as cost_err:
                    logger.warning(f"Failed to log Groq LLM cost: {cost_err}")
        except Exception as e:
            error_message = f"Router LLM summarization failed: {e}"
            logger.error(error_message, exc_info=True)
            errors.append(error_message)
            summary_error_message = error_message
            raw_response = None
    else:
        summary_error_message = router.last_error or "Router LLM is not configured"
        errors.append(summary_error_message)

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

    final_meeting_status = "completed" if summary_status == "COMPLETED" else "failed" if regenerate else "completed"
    if regenerate and original_meeting_status == "completed" and summary_status != "COMPLETED":
        final_meeting_status = "completed"
    try:
        update_meeting(db, meeting_id, {"status": final_meeting_status})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    db.commit()
    summary_broadcast_payload = format_summary_payload(summary_db) or {
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
            "summary": summary_broadcast_payload,
            "error": summary_error_message if summary_status != "COMPLETED" else "",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    await meeting_room_manager.broadcast(
        meeting_id,
        {
            "type": "ai.notes",
            "meeting_id": meeting_id,
            "summary_status": summary_status,
            "summary": summary_broadcast_payload,
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
        "errors": errors,
    }


@app.post("/api/meetings/{meeting_id}/finalize", response_model=schemas.MeetingFinalizeResponse)
async def finalize_meeting(
    meeting_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    body = await request.json()
    return await finalize_meeting_transcript(meeting_id, db, current_user, body)


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
        db.query(
            func.coalesce(
                models.ActionItemAssignee.display_name,
                models.ActionItemAssignee.email,
            ),
            func.count(),
        )
        .filter(models.ActionItemAssignee.email.isnot(None))
        .group_by(
            func.coalesce(
                models.ActionItemAssignee.display_name,
                models.ActionItemAssignee.email,
            )
        )
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
    from src.api.core.admin_operations import get_costs_payload

    return get_costs_payload()

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
                "metadata": normalize_notification_metadata({
                    "entity_type": "meeting",
                    "meeting_id": m.id,
                    "group_id": m.group_id,
                    "organization_id": m.organization_id,
                }),
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
                    "metadata": normalize_notification_metadata({
                        "entity_type": "meeting",
                        "meeting_id": m.id,
                        "group_id": m.group_id,
                        "organization_id": m.organization_id,
                    }),
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
                    "metadata": normalize_notification_metadata({
                        "entity_type": "meeting",
                        "meeting_id": m.id,
                        "group_id": m.group_id,
                        "organization_id": m.organization_id,
                    }),
                })

    runtime_for_user = [
        {
            **item,
            "metadata": normalize_notification_metadata(item.get("metadata")),
        }
        for item in RUNTIME_NOTIFICATIONS if item.get("recipient_user_id") == current_user.id
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
    notification.read_at = datetime.now(timezone.utc)
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
        {"is_read": True, "read_at": datetime.now(timezone.utc)},
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


@app.get("/api/search", response_model=List[schemas.SearchResult])
def search_entities(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    term = q.strip()
    if len(term) < 2:
        return []

    lowered = f"%{term.lower()}%"
    results: List[Dict[str, Any]] = []

    meeting_query = db.query(models.Meeting)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        participant_ids = meeting_participant_meeting_ids_for_user(db, current_user)
        if not org_ids:
            meeting_query = meeting_query.filter(models.Meeting.id.in_(participant_ids))
        else:
            meeting_query = meeting_query.filter(
                or_(
                    models.Meeting.organization_id.in_(org_ids),
                    models.Meeting.id.in_(participant_ids),
                )
            )

    meetings = meeting_query.filter(
        or_(
            func.lower(models.Meeting.title).like(lowered),
            func.lower(func.coalesce(models.Meeting.description, "")).like(lowered),
        )
    ).order_by(models.Meeting.updated_at.desc(), models.Meeting.created_at.desc()).limit(8).all()
    for meeting in meetings:
        results.append({
            "id": meeting.id,
            "type": "meeting",
            "title": meeting.title,
            "subtitle": meeting.group.name if meeting.group else meeting.organization.name if meeting.organization else "Cuộc họp",
            "route": f"/meetings/{meeting.id}",
            "context": {"initial_tab": "summary"},
        })

    group_query = db.query(models.Group)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            group_query = group_query.filter(models.Group.id == "__none__")
        else:
            group_query = group_query.filter(models.Group.organization_id.in_(org_ids))
    groups = group_query.filter(
        or_(
            func.lower(models.Group.name).like(lowered),
            func.lower(func.coalesce(models.Group.description, "")).like(lowered),
        )
    ).order_by(models.Group.updated_at.desc(), models.Group.created_at.desc()).limit(6).all()
    for group in groups:
        results.append({
            "id": group.id,
            "type": "group",
            "title": group.name,
            "subtitle": group.description or "Nhóm làm việc",
            "route": f"/groups/{group.id}",
            "context": {},
        })

    action_items = db.query(models.ActionItem).options(
        joinedload(models.ActionItem.meeting),
        joinedload(models.ActionItem.assignees),
    ).order_by(models.ActionItem.updated_at.desc(), models.ActionItem.created_at.desc()).limit(200).all()
    task_hits = 0
    for item in action_items:
        haystack = " ".join([
            item.title or "",
            item.description or "",
            item.meeting.title if item.meeting else "",
            " ".join(filter(None, [assignee.display_name or assignee.email for assignee in (item.assignees or [])])),
        ]).lower()
        if term.lower() not in haystack:
            continue
        if not action_item_visible_to_user(db, item, current_user):
            continue
        results.append({
            "id": item.id,
            "type": "task",
            "title": item.title,
            "subtitle": item.meeting.title if item.meeting else "Việc cá nhân",
            "route": f"/meetings/{item.meeting_id}" if item.meeting_id else "/actions",
            "context": {
                "initial_tab": "actions" if item.meeting_id else None,
                "meeting_id": item.meeting_id,
                "transcript_anchor": serialize_action_item_payload(item).get("anchor"),
            },
        })
        task_hits += 1
        if task_hits >= 8:
            break

    transcript_query = db.query(models.TranscriptSegment, models.Transcript, models.Meeting).join(
        models.Transcript, models.Transcript.id == models.TranscriptSegment.transcript_id,
    ).join(
        models.Meeting, models.Meeting.id == models.Transcript.meeting_id,
    )
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        participant_ids = meeting_participant_meeting_ids_for_user(db, current_user)
        if not org_ids:
            transcript_query = transcript_query.filter(models.Meeting.id.in_(participant_ids))
        else:
            transcript_query = transcript_query.filter(
                or_(
                    models.Meeting.organization_id.in_(org_ids),
                    models.Meeting.id.in_(participant_ids),
                )
            )
    transcript_hits = transcript_query.filter(
        func.lower(models.TranscriptSegment.text).like(lowered)
    ).order_by(models.TranscriptSegment.created_at.desc()).limit(8).all()
    for segment, transcript, meeting in transcript_hits:
        speaker_label = normalize_speaker_label(segment.speaker_label or "Speaker_01")
        display_name = next(
            (mapping.display_name for mapping in (meeting.speaker_mappings or []) if mapping.speaker_label == speaker_label and mapping.display_name),
            speaker_label,
        )
        snippet = (segment.text or "").strip()
        if len(snippet) > 120:
            snippet = snippet[:117].rstrip() + "..."
        results.append({
            "id": f"segment:{segment.id}",
            "type": "transcript",
            "title": meeting.title,
            "subtitle": f"{display_name}: {snippet}",
            "route": f"/meetings/{meeting.id}",
            "context": {
                "meeting_id": meeting.id,
                "initial_tab": "transcript",
                "transcript_anchor": {
                    "start_time": float(segment.start_time or 0),
                    "end_time": float(segment.end_time or 0),
                    "speaker_label": display_name,
                    "source_segment_ids": [segment.id],
                },
            },
        })

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for item in results:
        key = (item["type"], item["id"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped[:20]


def require_system_admin_user(current_user: models.User) -> None:
    from src.api.core.admin_operations import require_system_admin_user as core_require_system_admin_user

    core_require_system_admin_user(current_user)


@app.get("/api/admin/stats")
def admin_get_stats(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import get_admin_stats_payload

    return get_admin_stats_payload(db, current_user)


@app.get("/api/admin/users")
def admin_list_users(
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import get_admin_users_payload

    return get_admin_users_payload(db, current_user)


@app.patch("/api/admin/users/{user_id}/status")
def admin_update_user_status(
    user_id: str,
    payload: AdminUserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import update_admin_user_status_payload

    return update_admin_user_status_payload(user_id, payload.is_active, db, current_user)


@app.patch("/api/admin/users/{user_id}/role")
def admin_update_user_role(
    user_id: str,
    payload: AdminUserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import update_admin_user_role_payload

    return update_admin_user_role_payload(user_id, payload.role, db, current_user)


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import delete_admin_user_payload

    return delete_admin_user_payload(user_id, db, current_user)


@app.get("/api/admin/ai-services")
def admin_get_ai_services(current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import get_admin_ai_services_payload

    return get_admin_ai_services_payload(current_user)


@app.get("/api/admin/ai-services/usage")
def admin_get_ai_usage(
    current_user=Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    from src.api.core.admin_operations import get_admin_ai_usage_payload

    return get_admin_ai_usage_payload(db, current_user)


@app.get("/api/admin/prompts")
def admin_get_prompts(current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import get_admin_prompts_payload

    return get_admin_prompts_payload(current_user)


@app.put("/api/admin/prompts/{prompt_key}")
def admin_update_prompt(
    prompt_key: str,
    payload: AdminPromptUpdateRequest,
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import update_admin_prompt_payload

    return update_admin_prompt_payload(prompt_key, payload.model_dump(), current_user)


@app.get("/api/admin/notifications")
def admin_list_broadcasts(current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import get_admin_broadcasts_payload

    return get_admin_broadcasts_payload(current_user)


@app.post("/api/admin/notifications")
def admin_create_broadcast(
    payload: AdminBroadcastRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import create_admin_broadcast_payload

    return create_admin_broadcast_payload(payload.model_dump(), db, current_user)


@app.delete("/api/admin/notifications/{notification_id}")
def admin_delete_broadcast(notification_id: str, current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import delete_admin_broadcast_payload

    return delete_admin_broadcast_payload(notification_id, current_user)


@app.get("/api/admin/audit-logs")
def admin_get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import get_admin_audit_logs_payload

    return get_admin_audit_logs_payload(skip, limit, db, current_user)


@app.get("/api/admin/settings")
def admin_get_settings(current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import get_admin_settings_payload

    return get_admin_settings_payload(current_user)


@app.patch("/api/admin/settings")
def admin_update_settings(
    payload: AdminSettingsUpdateRequest,
    current_user = Depends(auth.get_current_user),
):
    from src.api.core.admin_operations import update_admin_settings_payload

    return update_admin_settings_payload(payload.model_dump(exclude_unset=True), current_user)


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
    from src.api.core.glossary_action_item_operations import list_glossary_terms_payload

    return list_glossary_terms_payload(organization_id, category, is_active, skip, limit, db, current_user)


@app.post("/api/glossary", response_model=schemas.GlossaryTerm)
def create_glossary_term_endpoint(
    term: schemas.GlossaryTermCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import create_glossary_term_payload

    return create_glossary_term_payload(term, db, current_user)


@app.patch("/api/glossary/{term_id}", response_model=schemas.GlossaryTerm)
def update_glossary_term_endpoint(
    term_id: str,
    updates: schemas.GlossaryTermUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import update_glossary_term_payload

    return update_glossary_term_payload(term_id, updates, db, current_user)


@app.delete("/api/glossary/{term_id}")
def delete_glossary_term_endpoint(
    term_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import delete_glossary_term_payload

    return delete_glossary_term_payload(term_id, db, current_user)

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
    from src.api.core.glossary_action_item_operations import list_action_items_payload

    return list_action_items_payload(
        db,
        current_user,
        meeting_id=meeting_id,
        status=status,
        skip=skip,
        limit=limit,
    )

@app.post("/api/action-items", response_model=schemas.ActionItem)
def create_new_action_item(
    action_item: schemas.ActionItemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import create_action_item_payload

    return create_action_item_payload(action_item, db, current_user)

@app.patch("/api/action-items/{action_id}", response_model=schemas.ActionItem)
def update_existing_action_item(
    action_id: str,
    updates: schemas.ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import update_action_item_payload

    return update_action_item_payload(action_id, updates, db, current_user)


@app.patch("/api/action-items/{action_id}/assignees/me", response_model=schemas.ActionItem)
def update_my_action_item_assignment(
    action_id: str,
    updates: schemas.ActionItemAssigneeStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import update_my_action_item_assignment_payload

    return update_my_action_item_assignment_payload(action_id, updates, db, current_user)

@app.delete("/api/action-items/{action_id}")
def delete_existing_action_item(
    action_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    from src.api.core.glossary_action_item_operations import delete_action_item_payload

    return delete_action_item_payload(action_id, db, current_user)


@app.get("/api/config/features")
def get_feature_flags(current_user = Depends(auth.get_current_user)):
    from src.api.core.admin_operations import get_feature_flags_payload

    return get_feature_flags_payload(current_user)

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
