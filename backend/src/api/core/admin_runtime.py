"""Persistent admin runtime state and audit helpers."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Optional

from sqlalchemy.orm import Session

from src.api import models
from src.api.database import SessionLocal, engine

SETTINGS_NAMESPACE = "settings"
PROMPTS_NAMESPACE = "prompts"

DEFAULT_ADMIN_PROMPTS: Dict[str, Dict[str, Any]] = {
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

DEFAULT_ADMIN_SETTINGS: Dict[str, Any] = {
    "public_registration_enabled": True,
    "storage_limit_gb_per_org": 50,
    "transcript_retention_policy": "forever",
    "maintenance_mode": False,
    "upload_enabled": True,
    "job_tracking_enabled": True,
    "llm_provider": "router",
    "router_model": "qwen/qwen3-32b",
    "router_api_key": "",
}


def ensure_admin_runtime_tables(db: Optional[Session] = None) -> None:
    bind = db.get_bind() if db is not None else engine
    models.AuditLog.__table__.create(bind=bind, checkfirst=True)
    models.AdminKV.__table__.create(bind=bind, checkfirst=True)
    models.AdminBroadcast.__table__.create(bind=bind, checkfirst=True)


def _seed_namespace(db: Session, namespace: str, values: Mapping[str, Any]) -> None:
    changed = False
    existing_keys = {
        row.key
        for row in db.query(models.AdminKV.key).filter(models.AdminKV.namespace == namespace).all()
    }
    for key, value in values.items():
        if key in existing_keys:
            continue
        db.add(models.AdminKV(key=key, namespace=namespace, value_json=value))
        changed = True
    if changed:
        db.commit()


def seed_admin_runtime_defaults(db: Session) -> None:
    ensure_admin_runtime_tables(db)
    _seed_namespace(db, SETTINGS_NAMESPACE, DEFAULT_ADMIN_SETTINGS)
    _seed_namespace(db, PROMPTS_NAMESPACE, DEFAULT_ADMIN_PROMPTS)


def _with_session(db: Optional[Session]) -> tuple[Session, bool]:
    if db is not None:
        return db, False
    session = SessionLocal()
    return session, True


def _close_session(db: Session, should_close: bool) -> None:
    if should_close:
        db.close()


def get_admin_settings_snapshot(db: Optional[Session] = None) -> Dict[str, Any]:
    session, should_close = _with_session(db)
    try:
        seed_admin_runtime_defaults(session)
        settings = dict(DEFAULT_ADMIN_SETTINGS)
        rows = session.query(models.AdminKV).filter(models.AdminKV.namespace == SETTINGS_NAMESPACE).all()
        for row in rows:
            settings[row.key] = row.value_json
        return settings
    finally:
        _close_session(session, should_close)


def update_admin_settings_values(payload: Mapping[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
    session, should_close = _with_session(db)
    try:
        seed_admin_runtime_defaults(session)
        for key, value in payload.items():
            row = session.get(models.AdminKV, key)
            if row and row.namespace == SETTINGS_NAMESPACE:
                row.value_json = value
            else:
                session.merge(models.AdminKV(key=key, namespace=SETTINGS_NAMESPACE, value_json=value))
        session.commit()
        return get_admin_settings_snapshot(session)
    finally:
        _close_session(session, should_close)


def get_admin_prompts_snapshot(db: Optional[Session] = None) -> Dict[str, Dict[str, Any]]:
    session, should_close = _with_session(db)
    try:
        seed_admin_runtime_defaults(session)
        prompts = {
            key: dict(value)
            for key, value in DEFAULT_ADMIN_PROMPTS.items()
        }
        rows = session.query(models.AdminKV).filter(models.AdminKV.namespace == PROMPTS_NAMESPACE).all()
        for row in rows:
            prompts[row.key] = dict(row.value_json or {})
        return prompts
    finally:
        _close_session(session, should_close)


def list_admin_prompts(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    prompts = get_admin_prompts_snapshot(db)
    return [prompts[key] for key in sorted(prompts.keys())]


def upsert_admin_prompt(prompt_key: str, payload: Mapping[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
    session, should_close = _with_session(db)
    try:
        seed_admin_runtime_defaults(session)
        existing = get_admin_prompts_snapshot(session).get(prompt_key, {})
        record = {
            "key": prompt_key,
            "name": payload["name"],
            "description": payload.get("description"),
            "content": payload["content"],
            "version": payload.get("version") or existing.get("version", "1.0.0"),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        row = session.get(models.AdminKV, prompt_key)
        if row and row.namespace == PROMPTS_NAMESPACE:
            row.value_json = record
        else:
            session.merge(models.AdminKV(key=prompt_key, namespace=PROMPTS_NAMESPACE, value_json=record))
        session.commit()
        return record
    finally:
        _close_session(session, should_close)


def list_admin_broadcasts(db: Optional[Session] = None) -> List[Dict[str, Any]]:
    session, should_close = _with_session(db)
    try:
        ensure_admin_runtime_tables(session)
        rows = (
            session.query(models.AdminBroadcast)
            .order_by(models.AdminBroadcast.sent_at.desc())
            .all()
        )
        return [
            {
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "type": row.type,
                "target": row.target,
                "status": row.status,
                "sentAt": row.sent_at.isoformat() if row.sent_at else None,
                "reach": row.reach,
            }
            for row in rows
        ]
    finally:
        _close_session(session, should_close)


def create_admin_broadcast_record(payload: Mapping[str, Any], reach: int, db: Optional[Session] = None) -> Dict[str, Any]:
    session, should_close = _with_session(db)
    try:
        ensure_admin_runtime_tables(session)
        record = models.AdminBroadcast(
            id=str(uuid.uuid4()),
            title=str(payload["title"]),
            content=str(payload["content"]),
            type=str(payload.get("type", "info")),
            target=str(payload.get("target", "all")),
            status="sent",
            reach=reach,
            sent_at=datetime.now(timezone.utc),
        )
        session.add(record)
        session.commit()
        return {
            "id": record.id,
            "title": record.title,
            "content": record.content,
            "type": record.type,
            "target": record.target,
            "status": record.status,
            "sentAt": record.sent_at.isoformat(),
            "reach": record.reach,
        }
    finally:
        _close_session(session, should_close)


def delete_admin_broadcast_record(notification_id: str, db: Optional[Session] = None) -> bool:
    session, should_close = _with_session(db)
    try:
        ensure_admin_runtime_tables(session)
        row = session.get(models.AdminBroadcast, notification_id)
        if not row:
            return False
        session.delete(row)
        session.commit()
        return True
    finally:
        _close_session(session, should_close)


def ensure_audit_log_table(db: Optional[Session] = None) -> None:
    ensure_admin_runtime_tables(db)


def append_admin_audit_log(
    actor: str,
    action: str,
    target: str,
    ip: str = "system",
    role: str = "System Admin",
    org: str = "System",
    db: Optional[Session] = None,
) -> None:
    actor_name = actor or "unknown"
    timestamp = datetime.now(timezone.utc)
    session, should_close = _with_session(db)
    try:
        ensure_admin_runtime_tables(session)
        session.add(
            models.AuditLog(
                id=str(uuid.uuid4()),
                time=timestamp,
                user=actor_name,
                role=role,
                action=action,
                target=target,
                org=org,
                ip=ip,
            )
        )
        session.commit()
    except Exception:
        session.rollback()
    finally:
        _close_session(session, should_close)
