import os
import sys
import time
import json
import logging
import re
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
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
    get_meetings, get_meeting_by_id, create_meeting, update_meeting,
    get_action_item_by_id, update_action_item, delete_action_item,
    create_transcript, create_transcript_segments_bulk,
    create_meeting_summary, create_action_item,
    get_glossary_term_by_id, get_glossary_terms, create_glossary_term, update_glossary_term, delete_glossary_term,
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
    
    try:
        # Ensure new lightweight runtime tables exist even without full migrations.
        models.AuditLog.__table__.create(bind=engine, checkfirst=True)

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
        "name": "Tom tat cuoc hop (VI)",
        "description": "Prompt tao tom tat cuoc hop bang tieng Viet",
        "content": (
            "Dựa trên transcript cuộc họp dưới đây, hãy tạo bản tóm tắt CHI TIẾT bằng tiếng Việt. "
            "Bản tóm tắt phải dài ít nhất 3 đoạn văn, bao quát đầy đủ các chủ đề được thảo luận, "
            "kết luận và hướng đi tiếp theo. Không tóm tắt quá ngắn gọn."
        ),
        "version": "2.0.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_en": {
        "key": "summary_en",
        "name": "Meeting Summary (EN)",
        "description": "Meeting summary prompt in English",
        "content": (
            "Based on the meeting transcript below, create a DETAILED summary in English. "
            "The summary must be at least 3 paragraphs long, covering all topics discussed, "
            "conclusions reached, and next steps. Do not summarize too briefly."
        ),
        "version": "2.0.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_zh": {
        "key": "summary_zh",
        "name": "会议摘要 (ZH)",
        "description": "Meeting summary prompt in Chinese",
        "content": (
            "根据以下会议记录，请用中文创建一份详细的会议摘要。"
            "摘要至少需要3段文字，涵盖所有讨论的主题、结论和后续步骤。"
            "请不要过于简短地总结。"
        ),
        "version": "2.0.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_ja": {
        "key": "summary_ja",
        "name": "会議サマリー (JA)",
        "description": "Meeting summary prompt in Japanese",
        "content": (
            "以下の会議記録に基づいて、日本語で詳細な会議サマリーを作成してください。"
            "サマリーは少なくとも3段落以上で、議論されたすべてのトピック、結論、"
            "次のステップを網羅してください。短すぎる要約は避けてください。"
        ),
        "version": "2.0.0",
        "last_updated": datetime.utcnow().isoformat(),
    },
    "summary_ko": {
        "key": "summary_ko",
        "name": "회의 요약 (KO)",
        "description": "Meeting summary prompt in Korean",
        "content": (
            "아래 회의록을 바탕으로 한국어로 상세한 회의 요약을 작성해 주세요. "
            "요약은 최소 3단락 이상이어야 하며, 논의된 모든 주제, 결론, "
            "다음 단계를 포괄해야 합니다. 너무 간략하게 요약하지 마세요."
        ),
        "version": "2.0.0",
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
    return max(pool, key=lambda item: item.created_at or datetime.min, default=None)


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    if not raw_text or not raw_text.strip():
        raise ValueError("Router returned empty response")

    try:
        parsed = json.loads(raw_text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError("Router response did not contain a JSON object")

    parsed = json.loads(match.group())
    if not isinstance(parsed, dict):
        raise ValueError("Router JSON payload must be an object")
    return parsed


def _normalize_analysis_payload(payload: Dict[str, Any]) -> schemas.MeetingAnalysisOutput:
    normalized_action_items = []
    for item in payload.get("action_items") or []:
        if isinstance(item, dict):
            normalized_action_items.append(
                {
                    "task": str(item.get("task") or "").strip(),
                    "owner": str(item.get("owner") or "Unassigned").strip() or "Unassigned",
                    "deadline": str(item.get("deadline") or "N/A").strip() or "N/A",
                }
            )

    normalized = {
        "meeting_summary": str(payload.get("meeting_summary") or "").strip(),
        "key_points": [str(point).strip() for point in payload.get("key_points") or [] if str(point).strip()],
        "decisions": [str(item).strip() for item in payload.get("decisions") or [] if str(item).strip()],
        "action_items": [item for item in normalized_action_items if item["task"]],
    }
    return schemas.MeetingAnalysisOutput.model_validate(normalized)


def build_structured_summary_prompts(transcript: str, custom_instruction: str, language: str = "vi") -> tuple[str, str]:
    lang_names = {"vi": "Vietnamese", "en": "English", "zh": "Chinese", "ja": "Japanese", "ko": "Korean"}
    lang_name = lang_names.get(language, "Vietnamese")

    system_prompt = (
        f"You are an AI assistant specialized in analyzing meeting transcripts. "
        f"Respond ONLY in {lang_name}. "
        f"Return ONLY a valid JSON object, no markdown, no explanation, no extra text. "
        f"JSON must have exactly 4 keys: meeting_summary, key_points, decisions, action_items. "
        f"meeting_summary is a string (at least 3 paragraphs, detailed). "
        f"key_points and decisions are arrays of strings. "
        f"action_items is an array of objects with keys: task, owner, deadline."
    )
    user_prompt = (
        f"{custom_instruction.strip()}\n\n"
        f"Return JSON in exactly this schema:\n"
        "{\n"
        '  "meeting_summary": "string (detailed, at least 3 paragraphs)",\n'
        '  "key_points": ["string"],\n'
        '  "decisions": ["string"],\n'
        '  "action_items": [{"task": "string", "owner": "string", "deadline": "string"}]\n'
        "}\n\n"
        f"If the transcript lacks information for action items or decisions, return empty arrays.\n\n"
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


def build_meeting_detail_payload(meeting: models.Meeting) -> Dict[str, Any]:
    latest_transcript = _latest_processed_record(meeting.transcripts or [])
    latest_summary_any = _latest_processed_record(meeting.summaries or [], fallback_to_any=True)
    latest_summary = _latest_processed_record(meeting.summaries or [], fallback_to_any=False)
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
        "summaries": meeting.summaries or [],
        "action_items": meeting.action_items or [],
        "transcript_content": latest_transcript.content if latest_transcript else None,
        "transcript_language": latest_transcript.language if latest_transcript else None,
        "meeting_summary_text": latest_summary.meeting_summary if latest_summary else None,
        "key_points_text": summarize_json_items(latest_summary.key_points if latest_summary else None),
        "decisions_text": summarize_json_items(latest_summary.decisions if latest_summary else None),
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


def resolve_pending_invitation_by_token(db: Session, token: str) -> Optional[models.Invitation]:
    invitations = db.query(models.Invitation).options(
        joinedload(models.Invitation.organization)
    ).filter(models.Invitation.status == "pending").all()

    now = datetime.utcnow()
    expired_changed = False
    target_invitation = None

    for invitation in invitations:
        if invitation.expires_at < now:
            invitation.status = "expired"
            expired_changed = True
            continue
        if auth.verify_password(token, invitation.token_hash):
            target_invitation = invitation
            break

    if expired_changed:
        db.commit()

    return target_invitation


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
@app.post("/api/auth/register", response_model=schemas.MessageResponse)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
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

    user_data = {
        "username": username,
        "email": req.email,
        "password": req.password,
        "role": "member",
        "first_name": req.firstName,
        "last_name": req.lastName,
    }
    user = create_user(db, user_data)

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
        )
        add_user_to_organization(db, user.id, org.id, "member")

    if invitation:
        from src.api.crud import add_user_to_organization
        add_user_to_organization(db, user.id, invitation.organization_id, invitation.role)
        invitation.status = "accepted"
        invitation.accepted_at = datetime.utcnow()
        invitation.accepted_by = user.id
        db.commit()

    return {"message": "User created successfully"}

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

# Invitation Endpoints
@app.post("/api/invitations", response_model=schemas.InvitationCreateResponse)
def create_invitation_endpoint(
    inv_data: schemas.InvitationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    auth.require_org_admin(db, current_user, inv_data.organization_id)

    if inv_data.group_id:
        raise HTTPException(status_code=400, detail="Organization invitations do not support group_id")

    existing_member = db.query(models.UserOrganization).join(models.User).filter(
        models.User.email == inv_data.email,
        models.UserOrganization.organization_id == inv_data.organization_id,
    ).first()
    if existing_member:
        raise HTTPException(status_code=409, detail="User already belongs to this organization")

    existing_invites = db.query(models.Invitation).filter(
        models.Invitation.email == inv_data.email,
        models.Invitation.organization_id == inv_data.organization_id,
        models.Invitation.status == "pending",
    ).all()
    for invite in existing_invites:
        invite.status = "revoked"

    token = secrets.token_urlsafe(32)
    token_hash = auth.get_password_hash(token)
    expires_at = datetime.utcnow() + timedelta(days=7)

    invitation = models.Invitation(
        email=inv_data.email,
        organization_id=inv_data.organization_id,
        group_id=None,
        role=inv_data.role,
        token_hash=token_hash,
        expires_at=expires_at,
        invited_by=current_user.id,
        status="pending"
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    organization = db.query(models.Organization).filter(models.Organization.id == inv_data.organization_id).first()
    invite_url = f"{FRONTEND_URL.rstrip('/')}/invite?token={token}"
    email_html = build_invitation_email_html(
        organization.name if organization else "tổ chức của bạn",
        inv_data.role,
        invite_url,
    )
    subject = f"Lời mời tham gia {organization.name if organization else 'MultiMinutes AI'}"
    if not send_email(inv_data.email, subject, email_html):
        raise HTTPException(status_code=500, detail="Failed to send invitation email")
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_ORG_INVITATION",
        target=f"{inv_data.email} -> {inv_data.organization_id}",
        role=current_user.role or "org-admin",
    )

    return {
        "message": "Invitation email sent successfully",
        "email": inv_data.email,
        "organization_id": inv_data.organization_id,
        "expires_at": expires_at,
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
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token")

    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=400, detail="This invitation was sent to a different email address")

    existing_membership = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == current_user.id,
        models.UserOrganization.organization_id == invitation.organization_id,
    ).first()

    if not existing_membership:
        from src.api.crud import add_user_to_organization
        add_user_to_organization(db, current_user.id, invitation.organization_id, invitation.role)

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
        add_user_to_organization(db, current_user.id, invitation.organization_id, invitation.role)

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


@app.post("/api/groups/{group_id}/members", response_model=schemas.GroupMembership)
def add_group_member(
    group_id: str,
    membership: schemas.GroupMembershipCreate,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    group = auth.require_group_admin(db, current_user, group_id)
    user = get_user_by_id(db, membership.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not auth.get_user_org_role(db, user, group.organization_id):
        raise HTTPException(status_code=400, detail="User must belong to the group organization")
    return add_user_to_group(db, group_id, user.id, membership.role, invited_by=current_user.id)


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
    created_message = create_group_message(db, group_id, current_user.id, message.text)

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
    updates: Dict[str, Any],
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
        
    return update_group_message(db, message_id, updates)

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
    if group_id:
        group = auth.require_group_member(db, current_user, group_id)
        organization_id = organization_id or group.organization_id
    elif organization_id:
        auth.require_org_member(db, current_user, organization_id)
    elif current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            return []
        query = db.query(models.Meeting).filter(models.Meeting.organization_id.in_(org_ids))
        if status:
            query = query.filter(models.Meeting.status == status)
        return query.order_by(models.Meeting.created_at.desc()).offset(skip).limit(limit).all()

    return get_meetings(db, organization_id=organization_id, group_id=group_id, status=status, skip=skip, limit=limit)

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
    return schemas.MeetingDetailResponse.model_validate(build_meeting_detail_payload(meeting))

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
    meeting = create_meeting(db, meeting_data.model_dump(), created_by=current_user.id)
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
    updates = meeting_data.model_dump(exclude_unset=True)
    if updates.get("group_id"):
        group = auth.require_group_member(db, current_user, updates["group_id"])
        if group.organization_id != existing.organization_id:
            raise HTTPException(status_code=400, detail="Group does not belong to organization")
    meeting = update_meeting(db, meeting_id, updates)
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_MEETING",
        target=meeting.title if meeting else meeting_id,
        role=current_user.role or "member",
    )
    return meeting

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
            
            return {
                "text": result.get("text", ""),
                "segments": result.get("segments", []),
                "provider": stt_provider_name,
                "model": os.getenv("DEEPGRAM_MODEL", "nova-3"),
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

    if not isinstance(full_text, str) or not full_text.strip():
        raise HTTPException(status_code=400, detail="Transcript is required for finalize")

    # Save transcript
    transcript_data = {
        "meeting_id": meeting_id,
        "content": full_text,
        "language": language,
        "word_count": len(full_text.split()),
        "processing_status": "COMPLETED",
        "stt_provider": os.getenv("STT_PROVIDER", "deepgram"),
    }
    db_transcript = create_transcript(db, transcript_data)

    # Save segments
    if segments:
        segments_data = []
        for seg in segments:
            segments_data.append({
                "transcript_id": db_transcript.id,
                "speaker_label": seg.get("speaker", "Speaker_01"),
                "start_time": seg.get("start", 0),
                "end_time": seg.get("end", 0),
                "text": seg.get("text", ""),
            })
        if segments_data:
            create_transcript_segments_bulk(db, segments_data)

    # Update meeting status
    update_meeting(db, meeting_id, {"status": "completed"})
    db.commit()

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
        "Summarize the meeting transcript below in detail.",
    )
    system_prompt, user_prompt = build_structured_summary_prompts(full_text, custom_instruction, language)

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

    summary_db = create_meeting_summary(db, {
                "meeting_id": meeting_id,
                "language": language,
                "key_points": summary_payload.key_points,
                "decisions": summary_payload.decisions,
                "action_items": [item.model_dump() for item in summary_payload.action_items],
                "meeting_summary": summary_payload.meeting_summary if summary_status == "COMPLETED" else summary_error_message,
                "ai_provider": ai_provider_name,
                "model_name": router.model if ai_provider_name == "router" else ai_provider_name,
                "processing_status": summary_status,
            })

    if summary_status == "COMPLETED":
        for ai in summary_payload.action_items:
            create_action_item(db, {
                "meeting_id": meeting_id,
                "summary_id": summary_db.id,
                "title": ai.task,
                "description": "",
                "assigned_email": None,
                "status": "PENDING",
                "priority": "MEDIUM",
            }, created_by=current_user.id)

    db.commit()

    return {
        "meeting_id": meeting_id,
        "transcript_status": "COMPLETED",
        "summary_status": summary_status,
        "summary": summary_payload,
        "errors": errors,
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
async def get_meeting_analytics():
    return {
        "total_meetings_over_time": {
            "2024-03-25": 12,
            "2024-03-26": 15,
            "2024-03-27": 10,
            "2024-03-28": 18,
            "2024-03-29": 22,
            "2024-03-30": 14,
            "2024-03-31": 19,
        },
        "provider_distribution": {
            "live": 85,
            "fallback": 15
        },
        "top_action_owners": {
            "Huyền": 12,
            "Nhật": 8,
            "Oanh": 5,
            "Tuấn": 10
        },
        "topic_trends": {
            "Kế hoạch quý 2": 45,
            "Review code": 30,
            "Thiết kế UI/UX": 25,
            "Bảo mật hệ thống": 15
        }
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
    query = db.query(models.Meeting)
    if current_user.role != "system-admin":
        org_ids = user_org_ids(current_user)
        if not org_ids:
            total_meetings = 0
            processing_count = 0
            total_minutes = 0
        else:
            query = query.filter(models.Meeting.organization_id.in_(org_ids))
            meetings = query.all()
            total_meetings = len(meetings)
            processing_count = sum(1 for meeting in meetings if meeting.status in {"processing", "queued"})
            total_minutes = sum((meeting.duration or 0) for meeting in meetings)
    else:
        meetings = query.all()
        total_meetings = len(meetings)
        processing_count = sum(1 for meeting in meetings if meeting.status in {"processing", "queued"})
        total_minutes = sum((meeting.duration or 0) for meeting in meetings)

    return {
        "totalMeetings": total_meetings,
        "totalHours": round(total_minutes / 60, 2),
        "processingCount": processing_count,
        "actualCostUsd": 0,
        "estimatedCostUsd": 0,
        "liveSuccessRate": "100%",
        "modelHealth": {},
        "features": {
            "uploadEnabled": False,
            "jobTrackingEnabled": False,
            "systemAdminEnabled": False,
        },
    }

@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    """Get in-app notifications for the current user based on real meeting activity."""
    notifications = []
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
        push_runtime_notification(
            {
                "id": f"admin-broadcast-{item['id']}-{recipient.id}",
                "type": "system",
                "priority": "today",
                "title": payload.title,
                "message": payload.content,
                "timestamp": datetime.utcnow().isoformat(),
                "isRead": False,
                "recipient_user_id": recipient.id,
                "metadata": {"target": payload.target},
            }
        )
    item["reach"] = len(recipients)
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
        "uploadEnabled": False,
        "jobTrackingEnabled": False,
        "systemAdminEnabled": current_user.role == "system-admin" and False,
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
        "timestamp": "DEBUG_VERIFIED_" + datetime.now().isoformat(),
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
