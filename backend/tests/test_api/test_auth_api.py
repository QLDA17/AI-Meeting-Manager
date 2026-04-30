import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi import FastAPI, Depends
from src.api import auth, schemas
from src.api.crud import create_user, get_user_by_username
from src.api.database import get_db, Base
from src.api.main import app
from src.api import models

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Override database dependency for testing."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    """Create a test client."""
    # Create all tables using the test engine
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
    # Drop all tables after test
    Base.metadata.drop_all(bind=test_engine)


def test_register_user(client):
    """Test user registration endpoint."""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
            "role": "member",
            "first_name": "Test",
            "last_name": "User",
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "User created successfully"


def test_register_duplicate_username(client):
    """Test registering with duplicate username."""
    # Register first user
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test1@example.com",
            "password": "password123",
        }
    )
    
    # Try to register with same username
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test2@example.com",
            "password": "password123",
        }
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_success(client):
    """Test successful login."""
    # Register user first
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
        }
    )
    
    # Login
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "securepassword123",
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["username"] == "testuser"


def test_login_wrong_password(client):
    """Test login with wrong password."""
    # Register user first
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
        }
    )
    
    # Login with wrong password
    response = client.post(
        "/api/auth/login",
        json={
            "username": "testuser",
            "password": "wrongpassword",
        }
    )
    
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    """Test login with non-existent user."""
    response = client.post(
        "/api/auth/login",
        json={
            "username": "nonexistent",
            "password": "password123",
        }
    )

    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


def test_forgot_and_reset_password(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
        }
    )

    forgot_response = client.post("/api/auth/forgot-password", json={"email": "test@example.com"})
    assert forgot_response.status_code == 200
    otp = forgot_response.json().get("dev_otp")
    assert otp

    reset_response = client.post(
        "/api/auth/reset-password",
        json={"email": "test@example.com", "otp": otp, "newPassword": "newpassword123"},
    )
    assert reset_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "newpassword123"},
    )
    assert login_response.status_code == 200


def test_forgot_password_triggers_email_send(client, monkeypatch):
    sent_payload = {}

    def fake_send_email(recipient_email, subject, html_content):
        sent_payload["recipient_email"] = recipient_email
        sent_payload["subject"] = subject
        sent_payload["html_content"] = html_content
        return True

    monkeypatch.setattr("src.api.main.send_email", fake_send_email)

    client.post(
        "/api/auth/register",
        json={
            "username": "mailuser",
            "email": "mailuser@example.com",
            "password": "securepassword123",
        },
    )

    forgot_response = client.post("/api/auth/forgot-password", json={"email": "mailuser@example.com"})
    assert forgot_response.status_code == 200

    assert sent_payload["recipient_email"] == "mailuser@example.com"
    assert "dat lai mat khau" in sent_payload["subject"].lower()
    assert "mailuser@example.com" not in sent_payload["html_content"]


def test_profile_update(client):
    client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "securepassword123",
        }
    )
    login_response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "securepassword123"},
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.patch(
        "/api/profile",
        headers=headers,
        json={"first_name": "Updated", "language": "en", "timezone": "UTC"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["firstName"] == "Updated"
    assert data["language"] == "en"
    assert data["timezone"] == "UTC"


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    # Status can be "healthy" or "degraded" depending on database connection
    assert data["status"] in ["healthy", "degraded"]
    assert "timestamp" in data


def test_register_without_username_generates_unique_username(client):
    response_one = client.post(
        "/api/auth/register",
        json={
            "email": "same@example.com",
            "password": "securepassword123",
        },
    )
    assert response_one.status_code == 200

    response_two = client.post(
        "/api/auth/register",
        json={
            "email": "same@another.com",
            "password": "securepassword123",
        },
    )
    assert response_two.status_code == 200

    login_one = client.post(
        "/api/auth/login",
        json={"username": "same", "password": "securepassword123"},
    )
    assert login_one.status_code == 200

    login_two = client.post(
        "/api/auth/login",
        json={"username": "same-2", "password": "securepassword123"},
    )
    assert login_two.status_code == 200


def test_member_created_organization_requires_approval_then_promotes_creator(client):
    register_response = client.post(
        "/api/auth/register",
        json={
            "email": "creator@example.com",
            "password": "securepassword123",
            "firstName": "Org",
            "lastName": "Creator",
        },
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"username": "creator@example.com", "password": "securepassword123"},
    )
    member_token = login_response.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}

    create_org_response = client.post(
        "/api/organizations",
        headers=member_headers,
        json={"name": "Pending Org"},
    )
    assert create_org_response.status_code == 200
    organization = create_org_response.json()
    assert organization["approval_status"] == "pending"

    member_profile = client.get("/api/auth/me", headers=member_headers)
    assert member_profile.status_code == 200
    memberships = member_profile.json()["orgMemberships"]
    assert memberships[0]["role"] == "member"

    db: Session = TestingSessionLocal()
    try:
      create_user(
          db,
          {
              "username": "sysadmin",
              "email": "sysadmin@example.com",
              "password": "securepassword123",
              "role": "system-admin",
          },
      )
    finally:
      db.close()

    admin_login = client.post(
        "/api/auth/login",
        json={"username": "sysadmin", "password": "securepassword123"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    approve_response = client.post(
        f"/api/admin/organizations/{organization['id']}/approve",
        headers=admin_headers,
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["approval_status"] == "active"

    refreshed_member = client.get("/api/auth/me", headers=member_headers)
    assert refreshed_member.status_code == 200
    refreshed_memberships = refreshed_member.json()["orgMemberships"]
    assert refreshed_memberships[0]["role"] == "org-admin"
