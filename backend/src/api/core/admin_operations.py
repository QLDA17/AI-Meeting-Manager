import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from src.api import models
from src.api.core.admin_runtime import (
    append_admin_audit_log,
    create_admin_broadcast_record,
    delete_admin_broadcast_record,
    ensure_audit_log_table,
    get_admin_settings_snapshot,
    list_admin_broadcasts,
    list_admin_prompts,
    update_admin_settings_values,
    upsert_admin_prompt,
)
from src.api.core.notifications_support import create_persisted_notification
from src.api.core.upload_jobs import feature_flags_for_user
from src.api.core.user_payloads import format_user_payload
from src.api.crud import update_user


def require_system_admin_user(current_user: models.User) -> None:
    if current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required")


def get_admin_stats_payload(db: Session, current_user: models.User) -> Dict[str, int]:
    require_system_admin_user(current_user)
    return {
        "total_users": db.query(models.User).count(),
        "total_organizations": db.query(models.Organization).count(),
        "total_meetings": db.query(models.Meeting).count(),
        "active_meetings": db.query(models.Meeting).filter(models.Meeting.status == "live").count(),
        "total_groups": db.query(models.Group).count(),
    }


def get_admin_users_payload(db: Session, current_user: models.User) -> List[Dict[str, Any]]:
    require_system_admin_user(current_user)
    users = db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group),
    ).order_by(models.User.created_at.desc()).all()
    return [format_user_payload(user) for user in users]


def update_admin_user_status_payload(
    user_id: str,
    is_active: bool,
    db: Session,
    current_user: models.User,
) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own active status")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not is_active and user.role == "system-admin":
        remaining_admins = (
            db.query(models.User)
            .filter(
                models.User.role == "system-admin",
                models.User.is_active == True,
                models.User.id != user.id,
            )
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot disable the last active system admin")
    user = update_user(db, user_id, {"is_active": is_active})
    append_admin_audit_log(
        actor=current_user.username,
        action="ACTIVATE_USER" if is_active else "SUSPEND_USER",
        target=user.email,
    )
    return format_user_payload(user)


def update_admin_user_role_payload(
    user_id: str,
    role: str,
    db: Session,
    current_user: models.User,
) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    if role not in ("system-admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be 'system-admin' or 'member'")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own system role")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "system-admin" and role != "system-admin":
        remaining_admins = (
            db.query(models.User)
            .filter(
                models.User.role == "system-admin",
                models.User.is_active == True,
                models.User.id != user.id,
            )
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot demote the last active system admin")
    user = update_user(db, user_id, {"role": role})
    append_admin_audit_log(
        actor=current_user.username,
        action="CHANGE_USER_ROLE",
        target=f"{user.email} -> {role}",
    )
    return format_user_payload(user)


def delete_admin_user_payload(user_id: str, db: Session, current_user: models.User) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "system-admin":
        remaining_admins = (
            db.query(models.User)
            .filter(
                models.User.role == "system-admin",
                models.User.is_active == True,
                models.User.id != user.id,
            )
            .count()
        )
        if remaining_admins == 0:
            raise HTTPException(status_code=400, detail="Cannot deactivate the last active system admin")
    user = update_user(db, user_id, {"is_active": False})
    append_admin_audit_log(
        actor=current_user.username,
        action="DEACTIVATE_USER",
        target=user.email,
    )
    return {"detail": "User account deactivated", "user_id": user_id}


def get_admin_ai_services_payload(current_user: models.User) -> Dict[str, Any]:
    require_system_admin_user(current_user)

    llm_provider = os.getenv("LLM_PROVIDER", "google").lower()
    stt_provider = os.getenv("STT_PROVIDER", "deepgram").lower()
    groq_key = os.getenv("GROQ_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "")
    phobert_enabled = os.getenv("PHOBERT_ENABLED", "false").lower() == "true"

    def _key_set(key: str, placeholder: str = "") -> bool:
        return bool(key) and key != placeholder

    llm_services = []
    if _key_set(groq_key, "your_groq_key_here"):
        llm_services.append({
            "name": "Groq",
            "model": os.getenv("ROUTER_MODEL", "llama-3.3-70b-versatile"),
            "role": "primary" if llm_provider in ("router", "groq") else "fallback",
            "enabled": True,
            "api_key_set": True,
        })
    if _key_set(google_key, "your_google_ai_studio_key_here"):
        llm_services.append({
            "name": "Google Gemini",
            "model": os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
            "role": "primary" if llm_provider == "google" else "fallback",
            "enabled": True,
            "api_key_set": True,
        })

    stt_providers = [
        {"name": "Deepgram", "id": "deepgram", "model": os.getenv("DEEPGRAM_MODEL", "nova-3")},
        {"name": "PhoWhisper", "id": "phowhisper", "model": "vinai/PhoWhisper-base"},
        {"name": "ViWhisper", "id": "viwhisper", "model": "NhutP/ViWhisper-small"},
    ]
    for provider in stt_providers:
        provider["active"] = provider["id"] == stt_provider

    nlp_services = []
    if phobert_enabled:
        nlp_services.append({
            "name": "PhoBERT Post-Processor",
            "model": os.getenv("PHOBERT_MODEL", "vinai/phobert-base"),
            "enabled": True,
            "features": {
                "dialect_detection": os.getenv("PHOBERT_DIALECT_ENABLED", "true").lower() == "true",
                "context_correction": True,
                "llm_correction": os.getenv("PHOBERT_LLM_CORRECTION_ENABLED", "false").lower() == "true",
            },
        })

    return {
        "llm": {"provider": llm_provider, "services": llm_services},
        "stt": {
            "provider": stt_provider,
            "available_providers": stt_providers,
            "realtime_mode": os.getenv("REALTIME_STT_MODE", "deepgram_streaming"),
        },
        "nlp": {"services": nlp_services},
    }


def get_admin_ai_usage_payload(db: Session, current_user: models.User) -> Dict[str, Any]:
    require_system_admin_user(current_user)

    from sqlalchemy import func as sqlfunc

    usage_by_service = db.query(
        models.CostTracking.service,
        models.CostTracking.model_name,
        sqlfunc.sum(models.CostTracking.input_tokens).label("total_input_tokens"),
        sqlfunc.sum(models.CostTracking.output_tokens).label("total_output_tokens"),
        sqlfunc.sum(models.CostTracking.cost_usd).label("total_cost_usd"),
        sqlfunc.count(models.CostTracking.id).label("request_count"),
    ).group_by(models.CostTracking.service, models.CostTracking.model_name).all()

    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    monthly_cost = db.query(sqlfunc.sum(models.CostTracking.cost_usd)).filter(
        models.CostTracking.created_at >= month_start
    ).scalar() or 0

    day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    daily_cost = db.query(sqlfunc.sum(models.CostTracking.cost_usd)).filter(
        models.CostTracking.created_at >= day_start
    ).scalar() or 0

    return {
        "services": [
            {
                "service": row.service,
                "model": row.model_name,
                "total_input_tokens": int(row.total_input_tokens or 0),
                "total_output_tokens": int(row.total_output_tokens or 0),
                "total_cost_usd": float(row.total_cost_usd or 0),
                "request_count": int(row.request_count or 0),
            }
            for row in usage_by_service
        ],
        "monthly_cost_usd": float(monthly_cost),
        "daily_cost_usd": float(daily_cost),
    }


def get_admin_prompts_payload(db: Session, current_user: models.User) -> List[Dict[str, Any]]:
    require_system_admin_user(current_user)
    return list_admin_prompts(db)


def update_admin_prompt_payload(
    prompt_key: str,
    payload: Mapping[str, Any],
    db: Session,
    current_user: models.User,
) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    prompt = upsert_admin_prompt(prompt_key, payload, db)
    append_admin_audit_log(actor=current_user.username, action="UPDATE_PROMPT", target=prompt_key)
    return prompt


def get_admin_broadcasts_payload(db: Session, current_user: models.User) -> List[Dict[str, Any]]:
    require_system_admin_user(current_user)
    return list_admin_broadcasts(db)


def create_admin_broadcast_payload(
    payload: Mapping[str, Any],
    db: Session,
    current_user: models.User,
) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    recipients: List[models.User] = []
    target = str(payload.get("target", "all"))
    if target == "all":
        recipients = db.query(models.User).filter(models.User.is_active == True).all()
    else:
        recipients = db.query(models.User).join(models.UserOrganization).filter(
            models.UserOrganization.organization_id == target,
            models.User.is_active == True,
        ).all()

    for recipient in recipients:
        create_persisted_notification(
            db,
            recipient_user_id=recipient.id,
            notification_type="system",
            priority="today",
            title=payload["title"],
            message=payload["content"],
            metadata={"target": target},
            source_type="admin-broadcast",
            source_id=None,
            commit=False,
        )
    db.commit()
    item = create_admin_broadcast_record(payload, len(recipients), db)
    append_admin_audit_log(actor=current_user.username, action="SEND_BROADCAST", target=target)
    return item


def delete_admin_broadcast_payload(notification_id: str, db: Session, current_user: models.User) -> Dict[str, str]:
    require_system_admin_user(current_user)
    if not delete_admin_broadcast_record(notification_id, db):
        raise HTTPException(status_code=404, detail="Notification not found")
    append_admin_audit_log(actor=current_user.username, action="DELETE_BROADCAST", target=notification_id)
    return {"message": "Notification deleted"}


def get_admin_audit_logs_payload(
    skip: int,
    limit: int,
    db: Session,
    current_user: models.User,
) -> List[Dict[str, Any]]:
    require_system_admin_user(current_user)
    ensure_audit_log_table(db)
    db_logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.time.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "time": log.time.isoformat() if log.time else datetime.now(timezone.utc).isoformat(),
            "user": log.user,
            "role": log.role,
            "action": log.action,
            "target": log.target,
            "org": log.org,
            "ip": log.ip,
        }
        for log in db_logs
    ]


def get_admin_settings_payload(db: Session, current_user: models.User) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    return get_admin_settings_snapshot(db)


def update_admin_settings_payload(payload: Mapping[str, Any], db: Session, current_user: models.User) -> Dict[str, Any]:
    require_system_admin_user(current_user)
    settings = update_admin_settings_values(payload, db)
    append_admin_audit_log(actor=current_user.username, action="UPDATE_SYSTEM_SETTINGS", target="admin.settings")
    return settings


def get_costs_payload() -> None:
    raise HTTPException(status_code=503, detail="Cost tracking temporarily disabled")


def get_feature_flags_payload(current_user: models.User) -> Dict[str, bool]:
    return feature_flags_for_user(current_user)
