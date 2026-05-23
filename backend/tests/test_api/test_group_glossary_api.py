import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api import auth, models
from src.api.core.glossary_action_item_operations import generate_glossary_suggestions_for_transcript
from src.api.core.nlp_support import build_glossary_dict
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
            "aliases": ["el em", "large language model"],
            "translation_vi": "Mô hình ngôn ngữ lớn",
            "category": "AI",
        },
    )

    assert create_response.status_code == 200
    term = create_response.json()
    assert term["term"] == "LLM"
    assert term["aliases"] == ["el em", "large language model"]

    list_response = client.get(
        f"/api/glossary?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    update_response = client.patch(
        f"/api/glossary/{term['id']}",
        headers=auth_context["headers"],
        json={"translation_en": "Large Language Model", "aliases": ["l l m", "model llm"]},
    )
    assert update_response.status_code == 200
    assert update_response.json()["translation_en"] == "Large Language Model"
    assert update_response.json()["aliases"] == ["l l m", "model llm"]

    delete_response = client.delete(f"/api/glossary/{term['id']}", headers=auth_context["headers"])
    assert delete_response.status_code == 200


def test_glossary_alias_conflict_rejected(client, auth_context):
    first = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "CI/CD",
            "aliases": ["ci cd"],
        },
    )
    assert first.status_code == 200

    conflict = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "Pipeline",
            "aliases": ["CI CD"],
        },
    )
    assert conflict.status_code == 409
    assert "alias conflict" in conflict.json()["detail"].lower()


def test_glossary_categories_import_export_and_builder(client, auth_context, db_session):
    create_response = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "OpenAI",
            "aliases": ["ô pen ai"],
            "category": "AI",
            "is_active": True,
        },
    )
    assert create_response.status_code == 200

    categories = client.get(
        f"/api/glossary/categories?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert categories.status_code == 200
    assert "AI" in categories.json()

    csv_content = """term,aliases,category,translation_vi,translation_en,translation_ja,translation_zh,translation_ko,is_active
KPI,ca pi ai;key performance indicator,Metrics,Chi so KPI,KPI,,,,true
Docker,doc co,Platform,Docker,Docker,,,,false
"""
    import_response = client.post(
        "/api/glossary/import",
        headers=auth_context["headers"],
        data={"organization_id": auth_context["org_id"]},
        files={"file": ("glossary.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
    )
    assert import_response.status_code == 200
    report = import_response.json()
    assert report["created"] == 2
    assert report["updated"] == 0
    assert report["errors"] == []

    export_response = client.get(
        f"/api/glossary/export?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert export_response.status_code == 200
    assert "term,aliases,category" in export_response.text
    assert "KPI,ca pi ai;key performance indicator,Metrics" in export_response.text

    glossary_dict = build_glossary_dict(db_session, auth_context["org_id"])
    assert glossary_dict["OpenAI"] == "OpenAI"
    assert glossary_dict["ô pen ai"] == "OpenAI"
    assert glossary_dict["ca pi ai"] == "KPI"
    assert "doc co" not in glossary_dict


def test_glossary_suggestion_generation_review_and_insights(client, auth_context, db_session):
    user = db_session.query(models.User).filter(models.User.email == "test@example.com").first()
    meeting = models.Meeting(
        organization_id=auth_context["org_id"],
        title="Glossary Suggestion Meeting",
        created_by=user.id,
        status="completed",
    )
    db_session.add(meeting)
    db_session.commit()

    suggestions = generate_glossary_suggestions_for_transcript(
        db_session,
        auth_context["org_id"],
        meeting.id,
        "OpenAI Agent la OpenAI Agent va API Gateway ket noi voi API Gateway de xu ly.",
        {
            "corrections": [
                {"original": "ô pen ai", "corrected": "OpenAI", "source": "glossary"},
                {"original": "a pi", "corrected": "API", "source": "glossary"},
            ]
        },
    )
    assert len(suggestions) >= 2

    listed = client.get(
        f"/api/glossary/suggestions?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert listed.status_code == 200
    pending = listed.json()
    assert any(item["canonical_term_candidate"] == "OpenAI Agent" for item in pending)

    run_response = client.post(
        "/api/glossary/suggestions/run",
        headers=auth_context["headers"],
        json={"organization_id": auth_context["org_id"]},
    )
    assert run_response.status_code == 200
    assert run_response.json()["processed_transcripts"] >= 0

    openai_agent = next(item for item in pending if item["canonical_term_candidate"] == "OpenAI Agent")
    approve = client.post(
        f"/api/glossary/suggestions/{openai_agent['id']}/approve",
        headers=auth_context["headers"],
        json={
          "organization_id": auth_context["org_id"],
          "term": "OpenAI Agent",
          "aliases": ["openaiagent", "OAA"],
          "translation_vi": "Tác nhân OpenAI",
          "is_active": True,
        },
    )
    assert approve.status_code == 200
    assert approve.json()["term"] == "OpenAI Agent"

    gateway_suggestion = next(item for item in pending if item["canonical_term_candidate"] == "API Gateway")
    existing = client.post(
        "/api/glossary",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "term": "Gateway",
            "aliases": ["gw"],
        },
    )
    assert existing.status_code == 200

    merge = client.post(
        f"/api/glossary/suggestions/{gateway_suggestion['id']}/merge",
        headers=auth_context["headers"],
        json={
            "organization_id": auth_context["org_id"],
            "target_term_id": existing.json()["id"],
            "aliases": gateway_suggestion["alias_candidates"],
        },
    )
    assert merge.status_code == 200
    assert len(merge.json()["aliases"]) >= 1

    rejected_source = generate_glossary_suggestions_for_transcript(
        db_session,
        auth_context["org_id"],
        meeting.id,
        "Docker Compose va Docker Compose duoc nhac lai nhieu lan.",
        {},
    )
    docker = next(item for item in rejected_source if item.canonical_term_candidate == "Docker Compose")
    reject = client.post(
        f"/api/glossary/suggestions/{docker.id}/reject",
        headers=auth_context["headers"],
        json={"organization_id": auth_context["org_id"]},
    )
    assert reject.status_code == 200
    assert reject.json()["status"] == "REJECTED"

    insights = client.get(
        f"/api/glossary/insights?organization_id={auth_context['org_id']}",
        headers=auth_context["headers"],
    )
    assert insights.status_code == 200
    payload = insights.json()
    assert payload["approved_count"] >= 1
    assert payload["rejected_count"] >= 1
    assert any(item["value"] == "ô pen ai" for item in payload["top_corrected_aliases"])


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
