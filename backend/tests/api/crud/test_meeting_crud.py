import pytest
from datetime import datetime
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
    create_audio_file,
)
from src.api import models
from src.api.crud import crud_meeting

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


def test_create_live_meeting_does_not_persist_planned_duration(db, test_organization, test_user):
    meeting = create_meeting(
        db,
        meeting_payload(
            test_organization,
            status="live",
            scheduled_start=datetime(2026, 5, 26, 9, 0, 0),
            scheduled_end=datetime(2026, 5, 26, 10, 0, 0),
            actual_start=datetime(2026, 5, 26, 9, 0, 0),
        ),
        created_by=test_user.id,
    )

    assert meeting.duration == 0


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
        "status": "live",
        "description": "Updated description",
    })

    assert updated_meeting is not None
    assert updated_meeting.title == "Updated Title"
    assert updated_meeting.status == "live"
    assert updated_meeting.description == "Updated description"


def test_delete_meeting(db, test_organization, test_user):
    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)

    success = delete_meeting(db, meeting.id)

    assert success is True
    assert get_meeting_by_id(db, meeting.id) is None


def test_delete_meeting_removes_audio_files_and_dirs(db, test_organization, test_user, tmp_path, monkeypatch):
    canonical_root = tmp_path / "uploads" / "audio"
    legacy_root = tmp_path / "data" / "meetings" / "audio"
    monkeypatch.setattr(crud_meeting, "AUDIO_UPLOAD_DIR", str(canonical_root))
    monkeypatch.setattr(crud_meeting, "LEGACY_AUDIO_UPLOAD_DIR", str(legacy_root))
    monkeypatch.setattr(crud_meeting, "resolve_audio_storage_path", lambda path: path)

    meeting = create_meeting(db, meeting_payload(test_organization), created_by=test_user.id)
    canonical_dir = canonical_root / meeting.id
    canonical_dir.mkdir(parents=True)
    canonical_file = canonical_dir / "recording.wav"
    canonical_file.write_bytes(b"audio")

    legacy_dir = legacy_root / meeting.id
    legacy_dir.mkdir(parents=True)
    legacy_file = legacy_dir / "chunk-001.wav"
    legacy_file.write_bytes(b"legacy-audio")

    create_audio_file(db, {
        "meeting_id": meeting.id,
        "filename": canonical_file.name,
        "original_filename": canonical_file.name,
        "file_path": str(canonical_file),
        "file_size": canonical_file.stat().st_size,
        "format": "wav",
        "upload_status": "UPLOADED",
    })

    success = delete_meeting(db, meeting.id)

    assert success is True
    assert get_meeting_by_id(db, meeting.id) is None
    assert db.query(models.AudioFile).filter(models.AudioFile.meeting_id == meeting.id).count() == 0
    assert not canonical_file.exists()
    assert not canonical_dir.exists()
    assert not legacy_file.exists()
    assert not legacy_dir.exists()


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
