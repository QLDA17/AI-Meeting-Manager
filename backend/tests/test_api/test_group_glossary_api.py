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
        json={"username": "testuser", "password": "securepassword123"},
    )
    data = response.json()
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "org_id": data["user"]["orgMemberships"][0]["orgId"],
    }


def test_group_create_and_members(client, auth_context):
    create_response = client.post(
        "/api/groups",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "name": "Engineering",
            "description": "Engineering team",
            "privacy_level": "internal",
        },
    )

    assert create_response.status_code == 200
    group = create_response.json()
    assert group["name"] == "Engineering"

    members_response = client.get(f"/api/groups/{group['id']}/members", headers=auth_context["headers"])

    assert members_response.status_code == 200
    members = members_response.json()
    assert len(members) == 1
    assert members[0]["groupMemberships"][0]["role"] == "group-admin"


def test_group_settings_update(client, auth_context):
    create_response = client.post(
        "/api/groups",
        headers=auth_context["headers"],
        json={"organization_id": auth_context["org_id"], "name": "Engineering"},
    )
    group_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/groups/{group_id}",
        headers=auth_context["headers"],
        json={"privacy_level": "private", "settings": {"autoSummarize": True}},
    )

    assert update_response.status_code == 200
    data = update_response.json()
    assert data["privacy_level"] == "private"
    assert data["settings"] == {"autoSummarize": True}


def test_glossary_crud(client, auth_context):
    create_response = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "LLM",
            "translation_vi": "Mô hình ngôn ngữ lớn",
            "category": "AI",
        },
    )

    assert create_response.status_code == 200
    term = create_response.json()
    assert term["term"] == "LLM"

    list_response = client.get(
        f"/api/glossary?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.patch(
        f"/api/glossary/{term['id']}",
        headers=auth_context["headers"],
        json={"translation_en": "Large Language Model"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["translation_en"] == "Large Language Model"

    delete_response = client.delete(f"/api/glossary/{term['id']}", headers=auth_context["headers"])
    assert delete_response.status_code == 200
