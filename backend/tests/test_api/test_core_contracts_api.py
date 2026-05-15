import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.database import Base, get_db
from src.api.main import app
from src.api import models


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


app.dependency_overrides[get_db] = override_get_db


def activate_org(org_id: str):
    db = TestingSessionLocal()
    try:
        org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        org.settings = {"approval_status": "active"}
        db.commit()
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


def register_and_login(client: TestClient):
    client.post(
        "/api/auth/register",
        json={
            "username": "owner",
            "email": "owner@example.com",
            "password": "securepassword123",
            "orgName": "Contract Org",
        },
    )
    login_response = client.post(
        "/api/auth/login",
        json={"username": "owner", "password": "securepassword123"},
    )
    data = login_response.json()
    activate_org(data["user"]["orgMemberships"][0]["orgId"])
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "org_id": data["user"]["orgMemberships"][0]["orgId"],
    }


def test_register_with_org_name_bootstraps_membership(client: TestClient):
    auth_context = register_and_login(client)
    assert auth_context["org_id"]


def test_dashboard_stats_contract(client: TestClient):
    auth_context = register_and_login(client)
    response = client.get("/api/dashboard/stats", headers=auth_context["headers"])

    assert response.status_code == 200
    data = response.json()
    assert "totalMeetings" in data
    assert "totalHours" in data
    assert "processingCount" in data
    assert "features" in data
    assert data["features"]["uploadEnabled"] is False


def test_meeting_detail_contract_contains_flattened_fields(client: TestClient):
    auth_context = register_and_login(client)
    create_response = client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "title": "Contract Meeting",
            "status": "completed",
            "meeting_type": "MEETING",
        },
    )
    meeting_id = create_response.json()["id"]

    detail_response = client.get(f"/api/meetings/{meeting_id}", headers=auth_context["headers"])
    assert detail_response.status_code == 200
    data = detail_response.json()
    assert "organization" in data
    assert "group" in data
    assert "transcript_content" in data
    assert "meeting_summary_text" in data
    assert "key_points_text" in data
    assert "decisions_text" in data


def test_feature_flags_endpoint(client: TestClient):
    auth_context = register_and_login(client)
    response = client.get("/api/config/features", headers=auth_context["headers"])

    assert response.status_code == 200
    assert response.json()["uploadEnabled"] is False
