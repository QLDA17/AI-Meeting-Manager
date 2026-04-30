import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.api.main import app
from src.api.database import get_db, Base

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


@pytest.fixture(scope="function")
def client():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def auth_context(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
            "orgName": "Test Organization",
        },
    )

    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "securepassword123",
        },
    )
    data = response.json()
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "org_id": data["user"]["orgMemberships"][0]["orgId"],
    }


def meeting_payload(auth_context, **overrides):
    data = {
        "organization_id": auth_context["org_id"],
        "title": "Test Meeting",
        "description": "A test meeting",
        "meeting_type": "MEETING",
        "status": "upcoming",
    }
    data.update(overrides)
    return data


def test_create_meeting(client, auth_context):
    response = client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Meeting"
    assert data["status"] == "upcoming"
    assert data["meeting_type"] == "MEETING"
    assert data["organization_id"] == auth_context["org_id"]
    assert "id" in data


def test_create_meeting_unauthorized(client):
    response = client.post(
        "/api/meetings",
        json={"title": "Test Meeting"},
    )

    assert response.status_code == 401


def test_get_meetings(client, auth_context):
    client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context, title="Test Meeting 1"),
    )
    client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context, title="Test Meeting 2"),
    )

    response = client.get("/api/meetings", headers=auth_context["headers"])

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2


def test_get_meeting_by_id(client, auth_context):
    create_response = client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context),
    )
    meeting_id = create_response.json()["id"]

    response = client.get(f"/api/meetings/{meeting_id}", headers=auth_context["headers"])

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == meeting_id
    assert data["title"] == "Test Meeting"


def test_get_meeting_not_found(client, auth_context):
    response = client.get("/api/meetings/nonexistent-id", headers=auth_context["headers"])

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_update_meeting(client, auth_context):
    create_response = client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context, title="Original Title"),
    )
    meeting_id = create_response.json()["id"]

    response = client.put(
        f"/api/meetings/{meeting_id}",
        headers=auth_context["headers"],
        json={
            "title": "Updated Title",
            "status": "processing",
            "description": "Updated description",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["status"] == "processing"
    assert data["description"] == "Updated description"


def test_delete_meeting(client, auth_context):
    create_response = client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context),
    )
    meeting_id = create_response.json()["id"]

    response = client.delete(f"/api/meetings/{meeting_id}", headers=auth_context["headers"])

    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"].lower()

    get_response = client.get(f"/api/meetings/{meeting_id}", headers=auth_context["headers"])
    assert get_response.status_code == 404


def test_get_meetings_with_filters(client, auth_context):
    client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context, title="Upcoming Meeting", status="upcoming"),
    )
    client.post(
        "/api/meetings",
        headers=auth_context["headers"],
        json=meeting_payload(auth_context, title="Completed Meeting", status="completed"),
    )

    response = client.get("/api/meetings?status=upcoming", headers=auth_context["headers"])

    assert response.status_code == 200
    data = response.json()
    assert all(m["status"] == "upcoming" for m in data)


def test_get_meetings_unauthorized(client):
    response = client.get("/api/meetings")

    assert response.status_code == 401
