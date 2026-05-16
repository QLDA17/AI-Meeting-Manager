import hashlib
from datetime import datetime, timedelta

import pytest

from src.api import auth, models
from src.api.crud import add_user_to_organization, create_group, create_organization, create_user
from src.api.main import ADMIN_SYSTEM_SETTINGS


def register_payload(**overrides):
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepassword123",
        "firstName": "New",
        "lastName": "User",
        "phone": "0901234567",
        "gender": "male",
        "dateOfBirth": "1995-01-01",
    }
    payload.update(overrides)
    return payload


def make_invitation(db, organization_id, invited_by, email, token="invite-token", group_id=None, role="member"):
    invitation = models.Invitation(
        email=email,
        organization_id=organization_id,
        group_id=group_id,
        role=role,
        token_hash=auth.get_password_hash(token),
        token_sha256=hashlib.sha256(token.encode("utf-8")).hexdigest(),
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7),
        invited_by=invited_by,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


def make_org_with_admin(db):
    admin = create_user(
        db,
        {
            "username": "admin",
            "email": "admin@example.com",
            "password": "securepassword123",
            "role": "member",
        },
    )
    org = create_organization(db, {"name": "Acme", "settings": {"approval_status": "active"}})
    add_user_to_organization(db, admin.id, org.id, "org-admin")
    return org, admin


def test_register_returns_token_and_user(client):
    response = client.post("/api/auth/register", json=register_payload())

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["nextStep"] == "setup_org"
    assert data["acceptedInvitation"] is False
    assert data["user"]["email"] == "newuser@example.com"


def test_register_with_invite_no_double_accept(client, db_session):
    org, admin = make_org_with_admin(db_session)
    invitation = make_invitation(db_session, org.id, admin.id, "invitee@example.com")

    response = client.post(
        "/api/auth/register",
        json=register_payload(username="invitee", email="invitee@example.com", inviteToken="invite-token"),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nextStep"] == "dashboard"
    assert data["acceptedInvitation"] is True

    db_session.refresh(invitation)
    assert invitation.status == "accepted"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    accept_again = client.post("/api/invitations/accept", headers=headers, json={"token": "invite-token"})
    assert accept_again.status_code == 200


def test_register_with_group_invite(client, db_session):
    org, admin = make_org_with_admin(db_session)
    group = create_group(
        db_session,
        {"organization_id": org.id, "name": "Product", "privacy_level": "private"},
        created_by=admin.id,
    )
    make_invitation(
        db_session,
        org.id,
        admin.id,
        "groupuser@example.com",
        token="group-token",
        group_id=group.id,
        role="group-admin",
    )

    response = client.post(
        "/api/auth/register",
        json=register_payload(username="groupuser", email="groupuser@example.com", inviteToken="group-token"),
    )

    assert response.status_code == 200
    user = db_session.query(models.User).filter(models.User.email == "groupuser@example.com").first()
    assert user is not None
    org_membership = db_session.query(models.UserOrganization).filter_by(user_id=user.id, organization_id=org.id).first()
    group_membership = db_session.query(models.GroupMembership).filter_by(user_id=user.id, group_id=group.id).first()
    assert org_membership is not None
    assert org_membership.role == "member"
    assert group_membership is not None
    assert group_membership.role == "group-admin"


def test_register_public_disabled(client, db_session):
    original = ADMIN_SYSTEM_SETTINGS["public_registration_enabled"]
    ADMIN_SYSTEM_SETTINGS["public_registration_enabled"] = False
    try:
        response = client.post("/api/auth/register", json=register_payload())
        assert response.status_code == 403

        org, admin = make_org_with_admin(db_session)
        make_invitation(db_session, org.id, admin.id, "allowed@example.com", token="allowed-token")
        invited_response = client.post(
            "/api/auth/register",
            json=register_payload(username="allowed", email="allowed@example.com", inviteToken="allowed-token"),
        )
        assert invited_response.status_code == 200
    finally:
        ADMIN_SYSTEM_SETTINGS["public_registration_enabled"] = original


def test_register_transaction_rollback(client, db_session, monkeypatch):
    def fail_add_user_to_organization(*args, **kwargs):
        raise RuntimeError("membership failure")

    monkeypatch.setattr("src.api.crud.add_user_to_organization", fail_add_user_to_organization)
    with pytest.raises(RuntimeError):
        client.post("/api/auth/register", json=register_payload(orgName="Broken Org"))

    user = db_session.query(models.User).filter(models.User.email == "newuser@example.com").first()
    assert user is None


def test_login_inactive_user(client, db_session):
    create_user(
        db_session,
        {
            "username": "inactive",
            "email": "inactive@example.com",
            "password": "securepassword123",
            "role": "member",
            "is_active": False,
        },
    )

    response = client.post(
        "/api/auth/login",
        json={"username": "inactive", "password": "securepassword123"},
    )
    assert response.status_code == 403


def test_register_with_phone_gender_dob(client, db_session):
    response = client.post("/api/auth/register", json=register_payload())
    assert response.status_code == 200

    user = db_session.query(models.User).filter(models.User.email == "newuser@example.com").first()
    assert user.phone == "0901234567"
    assert user.gender == "male"
    assert user.date_of_birth is not None
