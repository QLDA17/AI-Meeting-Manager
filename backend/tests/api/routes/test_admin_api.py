from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api import models
from src.api.core.admin_runtime import update_admin_settings_values
from src.api.crud import create_user
from src.api.database import Base, get_db
from src.api.main import app


TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def make_user(db_session, username: str, email: str, role: str = "member") -> models.User:
    return create_user(
        db_session,
        {
            "username": username,
            "email": email,
            "password": "securepassword123",
            "role": role,
        },
    )


def auth_headers(client: TestClient, username: str) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "securepassword123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_stats_and_feature_flags(client: TestClient, db_session):
    make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    make_user(db_session, "member", "member@example.com")

    admin_headers = auth_headers(client, "sysadmin")
    member_headers = auth_headers(client, "member")

    stats_response = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_users"] == 2
    assert "total_organizations" in stats
    assert "active_meetings" in stats

    member_denied = client.get("/api/admin/stats", headers=member_headers)
    assert member_denied.status_code == 403

    admin_flags = client.get("/api/config/features", headers=admin_headers)
    member_flags = client.get("/api/config/features", headers=member_headers)
    assert admin_flags.status_code == 200
    assert admin_flags.json()["uploadEnabled"] is True
    assert member_flags.status_code == 200
    assert member_flags.json()["uploadEnabled"] is True


def test_admin_user_status_and_role_updates(client: TestClient, db_session):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    member = make_user(db_session, "member", "member@example.com")
    admin_headers = auth_headers(client, admin.username)

    list_response = client.get("/api/admin/users", headers=admin_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 2

    status_response = client.patch(
        f"/api/admin/users/{member.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert status_response.status_code == 200
    assert status_response.json()["isActive"] is False

    role_response = client.patch(
        f"/api/admin/users/{member.id}/role",
        headers=admin_headers,
        json={"role": "system-admin"},
    )
    assert role_response.status_code == 200
    assert role_response.json()["role"] == "system-admin"

    delete_response = client.delete(f"/api/admin/users/{member.id}", headers=admin_headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["user_id"] == member.id
    assert delete_response.json()["detail"] == "User account deactivated"


def test_admin_user_management_guards(client: TestClient, db_session):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    admin_headers = auth_headers(client, admin.username)

    self_suspend = client.patch(
        f"/api/admin/users/{admin.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert self_suspend.status_code == 400

    self_demote = client.patch(
        f"/api/admin/users/{admin.id}/role",
        headers=admin_headers,
        json={"role": "member"},
    )
    assert self_demote.status_code == 400

    self_deactivate = client.delete(f"/api/admin/users/{admin.id}", headers=admin_headers)
    assert self_deactivate.status_code == 400


def test_cannot_disable_last_active_system_admin(client: TestClient, db_session):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    admin_headers = auth_headers(client, admin.username)

    suspend_response = client.patch(
        f"/api/admin/users/{admin.id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert suspend_response.status_code == 400

    demote_response = client.patch(
        f"/api/admin/users/{admin.id}/role",
        headers=admin_headers,
        json={"role": "member"},
    )
    assert demote_response.status_code == 400


def test_admin_ai_services_and_usage(client: TestClient, db_session, monkeypatch):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    admin_headers = auth_headers(client, admin.username)

    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-test-key")
    monkeypatch.setenv("LLM_PROVIDER", "google")
    monkeypatch.setenv("STT_PROVIDER", "deepgram")
    monkeypatch.setenv("PHOBERT_ENABLED", "true")
    update_admin_settings_values(
        {
            "llm_provider": "router",
            "router_model": "qwen/qwen3-32b",
            "router_api_key": "admin-router-key",
        },
        db_session,
    )

    db_session.add(
        models.CostTracking(
            service="llm",
            api_endpoint="/v1/chat/completions",
            model_name="gpt-test",
            input_tokens=11,
            output_tokens=7,
            cost_usd=0.123456,
        )
    )
    db_session.commit()

    services_response = client.get("/api/admin/ai-services", headers=admin_headers)
    assert services_response.status_code == 200
    services = services_response.json()
    assert services["llm"]["provider"] == "router"
    assert len(services["llm"]["services"]) == 2
    assert services["llm"]["router_model"] == "qwen/qwen3-32b"
    assert services["llm"]["router_api_key_set"] is True
    assert services["stt"]["provider"] == "deepgram"
    assert services["nlp"]["services"][0]["enabled"] is True

    usage_response = client.get("/api/admin/ai-services/usage", headers=admin_headers)
    assert usage_response.status_code == 200
    usage = usage_response.json()
    assert usage["monthly_cost_usd"] > 0
    assert usage["services"][0]["service"] == "llm"
    assert usage["services"][0]["request_count"] == 1


def test_admin_prompts_settings_broadcasts_and_audit_logs(client: TestClient, db_session):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    member = make_user(db_session, "member", "member@example.com")
    admin_headers = auth_headers(client, admin.username)

    prompt_response = client.put(
        "/api/admin/prompts/custom_prompt",
        headers=admin_headers,
        json={
            "key": "custom_prompt",
            "name": "Custom Prompt",
            "description": "admin managed prompt",
            "content": "Hello from admin",
            "version": "9.9.9",
        },
    )
    assert prompt_response.status_code == 200
    assert prompt_response.json()["content"] == "Hello from admin"

    prompts_response = client.get("/api/admin/prompts", headers=admin_headers)
    assert prompts_response.status_code == 200
    assert any(item["key"] == "custom_prompt" for item in prompts_response.json())

    settings_response = client.patch(
        "/api/admin/settings",
        headers=admin_headers,
        json={
            "llm_provider": "router",
            "router_model": "qwen/qwen3-32b",
            "router_api_key": "fresh-key",
        },
    )
    assert settings_response.status_code == 200
    settings_payload = settings_response.json()
    assert settings_payload["llm_provider"] == "router"
    assert settings_payload["router_model"] == "qwen/qwen3-32b"
    assert settings_payload["router_api_key"] == ""
    assert settings_payload["router_api_key_set"] is True

    settings_response = client.patch(
        "/api/admin/settings",
        headers=admin_headers,
        json={"maintenance_mode": True, "storage_limit_gb_per_org": 99},
    )
    assert settings_response.status_code == 200
    assert settings_response.json()["maintenance_mode"] is True
    assert settings_response.json()["storage_limit_gb_per_org"] == 99

    get_settings_response = client.get("/api/admin/settings", headers=admin_headers)
    assert get_settings_response.status_code == 200
    assert get_settings_response.json()["maintenance_mode"] is True

    broadcast_response = client.post(
        "/api/admin/notifications",
        headers=admin_headers,
        json={
            "title": "System notice",
            "content": "This is a broadcast",
            "type": "info",
            "target": "all",
        },
    )
    assert broadcast_response.status_code == 200
    broadcast = broadcast_response.json()
    assert broadcast["reach"] == 2

    notifications = db_session.query(models.Notification).order_by(models.Notification.created_at.asc()).all()
    assert len(notifications) == 2
    assert {item.recipient_user_id for item in notifications} == {admin.id, member.id}

    list_broadcasts_response = client.get("/api/admin/notifications", headers=admin_headers)
    assert list_broadcasts_response.status_code == 200
    assert list_broadcasts_response.json()[0]["id"] == broadcast["id"]

    delete_broadcast_response = client.delete(
        f"/api/admin/notifications/{broadcast['id']}",
        headers=admin_headers,
    )
    assert delete_broadcast_response.status_code == 200

    audit_log = models.AuditLog(
        id="audit-1",
        time=datetime.now(timezone.utc),
        user="sysadmin",
        role="System Admin",
        action="TEST_ACTION",
        target="target",
        org="System",
        ip="127.0.0.1",
    )
    db_session.add(audit_log)
    db_session.commit()

    audit_logs_response = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert audit_logs_response.status_code == 200
    assert audit_logs_response.json()[0]["action"] == "TEST_ACTION"


def test_maintenance_mode_blocks_members_but_allows_system_admin(client: TestClient, db_session):
    admin = make_user(db_session, "sysadmin", "sysadmin@example.com", role="system-admin")
    member = make_user(db_session, "member", "member@example.com")
    admin_headers = auth_headers(client, admin.username)
    member_headers = auth_headers(client, "member")

    update_admin_settings_values({"maintenance_mode": True}, db_session)

    member_response = client.get("/api/profile", headers=member_headers)
    assert member_response.status_code == 503

    admin_response = client.get("/api/admin/stats", headers=admin_headers)
    assert admin_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"username": "member", "password": "securepassword123"},
    )
    assert login_response.status_code == 200
