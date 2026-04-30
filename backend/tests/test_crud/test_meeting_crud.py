import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.api.database import Base
from src.api.crud import (
    create_user,
    create_organization,
    add_user_to_organization,
    create_group,
    create_meeting,
    get_meeting_by_id,
    get_meetings,
    update_meeting,
    delete_meeting,
    add_meeting_participant,
)

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    return create_user(db, {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "role": "member",
    })


@pytest.fixture
def test_organization(db, test_user):
    org = create_organization(db, {
        "name": "Test Organization",
        "description": "A test organization",
    })
    add_user_to_organization(db, test_user.id, org.id, "org-admin")
    return org


@pytest.fixture
def test_group(db, test_organization, test_user):
    return create_group(db, {
        "organization_id": test_organization.id,
        "name": "Test Group",
        "privacy_level": "internal",
    }, created_by=test_user.id)


def meeting_payload(test_organization, **overrides):
    data = {
        "organization_id": test_organization.id,
        "title": "Test Meeting",
        "description": "A test meeting",
        "meeting_type": "MEETING",
        "status": "upcoming",
    }
    data.update(overrides)
    return data


def test_create_meeting(db, test_organization, test_user, test_group):
    meeting = create_meeting(db, meeting_payload(test_organization, group_id=test_group.id), created_by=test_user.id)

    assert meeting.id is not None
    assert meeting.title == "Test Meeting"
    assert meeting.organization_id == test_organization.id
    assert meeting.group_id == test_group.id
    assert meeting.created_by == test_user.id
    assert meeting.status == "upcoming"


def test_get_meeting_by_id(db, test_organization, test_user):
    created_meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    retrieved_meeting = get_meeting_by_id(db, created_meeting.id)

    assert retrieved_meeting is not None
    assert retrieved_meeting.id == created_meeting.id
    assert retrieved_meeting.title == "Test Meeting"


def test_get_meetings(db, test_organization, test_user):
    for i in range(3):
        create_meeting(db, meeting_payload(
            test_organization,
            title=f"Meeting {i}",
            status="upcoming" if i < 2 else "completed",
        ), created_by=test_user.id)

    all_meetings = get_meetings(db, organization_id=test_organization.id)
    assert len(all_meetings) == 3

    upcoming_meetings = get_meetings(db, organization_id=test_organization.id, status="upcoming")
    assert len(upcoming_meetings) == 2

    completed_meetings = get_meetings(db, organization_id=test_organization.id, status="completed")
    assert len(completed_meetings) == 1


def test_update_meeting(db, test_organization, test_user):
    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    updated_meeting = update_meeting(db, meeting.id, {
        "title": "Updated Title",
        "status": "processing",
        "description": "Updated description",
    })

    assert updated_meeting is not None
    assert updated_meeting.title == "Updated Title"
    assert updated_meeting.status == "processing"
    assert updated_meeting.description == "Updated description"


def test_delete_meeting(db, test_organization, test_user):
    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    success = delete_meeting(db, meeting.id)

    assert success is True
    assert get_meeting_by_id(db, meeting.id) is None


def test_add_meeting_participant(db, test_organization, test_user):
    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    participant = add_meeting_participant(
        db,
        meeting_id=meeting.id,
        user_id=test_user.id,
        role="PARTICIPANT",
    )

    assert participant is not None
    assert participant.meeting_id == meeting.id
    assert participant.user_id == test_user.id
    assert participant.role == "PARTICIPANT"


def test_add_meeting_participant_by_email(db, test_organization, test_user):
    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    participant = add_meeting_participant(
        db,
        meeting_id=meeting.id,
        email="external@example.com",
        name="External User",
        role="PARTICIPANT",
    )

    assert participant is not None
    assert participant.meeting_id == meeting.id
    assert participant.email == "external@example.com"
    assert participant.name == "External User"
    assert participant.user_id is None
