import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api import auth, models
from src.api.crud import add_user_to_group, add_user_to_organization, create_user
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
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def register_payload(**overrides):
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
        "firstName": "Test",
        "lastName": "User",
        "dateOfBirth": "1995-01-01",
        "orgName": "Test Organization",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def auth_context(client, db_session):
    register_response = client.post("/api/auth/register", json=register_payload())
    user_id = register_response.json()["user"]["id"]
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "securepassword123"},
    )
    data = response.json()
    org_id = data["user"]["orgMemberships"][0]["orgId"]
    org = db_session.query(models.Organization).filter(models.Organization.id == org_id).first()
    membership = db_session.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == user_id,
        models.UserOrganization.organization_id == org_id,
    ).first()
    org.settings = {**(org.settings or {}), "approval_status": "active"}
    membership.role = "org-admin"
    db_session.commit()
    return {
        "headers": {"Authorization": f"Bearer {data['access_token']}"},
        "org_id": org_id,
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


def test_group_user_search_short_query_and_excludes_existing_members(client, auth_context, db_session):
    candidate = create_user(
        db_session,
        {
            "username": "candidate",
            "email": "candidate@example.com",
            "password": "securepassword123",
            "role": "member",
        },
    )
    existing_member = create_user(
        db_session,
        {
            "username": "existingmember",
            "email": "existingmember@example.com",
            "password": "securepassword123",
            "role": "member",
        },
    )
    add_user_to_organization(db_session, candidate.id, auth_context["org_id"], "member")
    add_user_to_organization(db_session, existing_member.id, auth_context["org_id"], "member")

    group = client.post(
        "/api/groups",
        headers=auth_context["headers"],
        json={"organization_id": auth_context["org_id"], "name": "Searchable Team"},
    ).json()
    add_user_to_group(db_session, group["id"], existing_member.id, "member")

    response = client.get(
        f"/api/groups/{group['id']}/users/search?q=a",
        headers=auth_context["headers"],
    )

    assert response.status_code == 200
    emails = {item["email"] for item in response.json()}
    assert "candidate@example.com" in emails
    assert "existingmember@example.com" not in emails
    assert "test@example.com" not in emails


def test_group_invite_by_email_errors_and_message_latest(client, auth_context, db_session):
    outsider = create_user(
        db_session,
        {
            "username": "outsider",
            "email": "outsider@example.com",
            "password": "securepassword123",
            "role": "member",
        },
    )
    teammate = create_user(
        db_session,
        {
            "username": "teammate",
            "email": "teammate@example.com",
            "password": "securepassword123",
            "role": "member",
        },
    )
    add_user_to_organization(db_session, teammate.id, auth_context["org_id"], "member")

    create_response = client.post(
        "/api/groups",
        headers=auth_context["headers"],
        json={"organization_id": auth_context["org_id"], "name": "Invite Team"},
    )
    group_id = create_response.json()["id"]

    missing_account = client.post(
        f"/api/groups/{group_id}/members/invite-by-email",
        headers=auth_context["headers"],
        json={"email": "missing@example.com", "role": "member"},
    )
    assert missing_account.status_code == 404

    not_in_org = client.post(
        f"/api/groups/{group_id}/members/invite-by-email",
        headers=auth_context["headers"],
        json={"email": outsider.email, "role": "member"},
    )
    assert not_in_org.status_code == 400

    first_add = client.post(
        f"/api/groups/{group_id}/members/invite-by-email",
        headers=auth_context["headers"],
        json={"email": teammate.email, "role": "member"},
    )
    assert first_add.status_code == 200

    duplicate_add = client.post(
        f"/api/groups/{group_id}/members/invite-by-email",
        headers=auth_context["headers"],
        json={"email": teammate.email, "role": "member"},
    )
    assert duplicate_add.status_code == 409

    latest_empty = client.get(
        f"/api/groups/{group_id}/messages/latest",
        headers=auth_context["headers"],
    )
    assert latest_empty.status_code == 200
    assert latest_empty.json() is None

    posted = client.post(
        f"/api/groups/{group_id}/messages",
        headers=auth_context["headers"],
        json={"text": "Hello team"},
    )
    assert posted.status_code == 200

    latest = client.get(
        f"/api/groups/{group_id}/messages/latest",
        headers=auth_context["headers"],
    )
    assert latest.status_code == 200
    assert latest.json()["text"] == "Hello team"


def test_global_glossary_requires_system_admin_and_member_sees_global_terms(client, auth_context, db_session):
    system_admin = create_user(
        db_session,
        {
            "username": "sysadmin",
            "email": "sysadmin@example.com",
            "password": "securepassword123",
            "role": "system-admin",
        },
    )
    system_headers = {"Authorization": f"Bearer {auth.create_access_token({'sub': system_admin.username})}"}

    forbidden = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={"term": "GPU", "translation_vi": "Bộ xử lý đồ họa"},
    )
    assert forbidden.status_code == 403

    global_term = client.post(
        "/api/glossary",
        headers=system_headers,
        json={"term": "GPU", "translation_vi": "Bộ xử lý đồ họa"},
    )
    assert global_term.status_code == 200

    org_term = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "RAG",
            "translation_vi": "Truy xuất tăng cường",
        },
    )
    assert org_term.status_code == 200

    visible = client.get("/api/glossary", headers=auth_context["headers"])
    assert visible.status_code == 200
    terms = {item["term"] for item in visible.json()}
    assert "GPU" in terms
    assert "RAG" in terms
