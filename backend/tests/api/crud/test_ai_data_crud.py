import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.api import models
from src.api.database import Base
from src.api.crud import (
    create_user, get_user_by_username,
    create_organization, add_user_to_organization,
    create_meeting, get_meeting_by_id,
    create_audio_file, get_audio_file_by_id,
    create_transcript, get_transcript_by_id, create_transcript_segment,
    create_meeting_summary, get_meeting_summary,
    create_action_item, get_action_item_by_id, get_action_items
)
from src.api.routes.action_items import list_action_items

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "role": "member",
    }
    return create_user(db, user_data)


@pytest.fixture
def test_organization(db, test_user):
    """Create a test organization."""
    org = create_organization(db, {"name": "Test Organization"})
    add_user_to_organization(db, test_user.id, org.id, "org-admin")
    return org


@pytest.fixture
def test_meeting(db, test_user, test_organization):
    """Create a test meeting."""
    meeting_data = {
        "organization_id": test_organization.id,
        "title": "Test Meeting",
        "status": "processing",
    }
    return create_meeting(db, meeting_data, created_by=test_user.id)


@pytest.fixture
def test_audio_file(db, test_meeting):
    """Create a test audio file."""
    audio_data = {
        "meeting_id": test_meeting.id,
        "filename": "test_audio.wav",
        "original_filename": "test_audio.wav",
        "file_path": "/data/uploads/test_audio.wav",
        "file_size": 1024000,
        "format": "WAV",
        "upload_status": "UPLOADED",
    }
    return create_audio_file(db, audio_data)


def test_create_transcript(db, test_meeting, test_audio_file):
    """Test creating a transcript."""
    transcript_data = {
        "meeting_id": test_meeting.id,
        "audio_file_id": test_audio_file.id,
        "content": "This is a test transcript content.",
        "language": "vi",
        "word_count": 6,
        "processing_status": "COMPLETED",
        "stt_provider": "whisper",
    }
    transcript = create_transcript(db, transcript_data)
    
    assert transcript.id is not None
    assert transcript.meeting_id == test_meeting.id
    assert transcript.audio_file_id == test_audio_file.id
    assert transcript.content == "This is a test transcript content."
    assert transcript.language == "vi"
    assert transcript.processing_status == "COMPLETED"


def test_get_transcript_by_id(db, test_meeting, test_audio_file):
    """Test retrieving a transcript by ID."""
    transcript_data = {
        "meeting_id": test_meeting.id,
        "audio_file_id": test_audio_file.id,
        "content": "Test content",
    }
    created_transcript = create_transcript(db, transcript_data)
    
    retrieved_transcript = get_transcript_by_id(db, created_transcript.id)
    
    assert retrieved_transcript is not None
    assert retrieved_transcript.id == created_transcript.id
    assert retrieved_transcript.content == "Test content"


def test_create_transcript_segment(db, test_meeting, test_audio_file):
    """Test creating a transcript segment."""
    # First create a transcript
    transcript_data = {
        "meeting_id": test_meeting.id,
        "audio_file_id": test_audio_file.id,
        "content": "Full transcript",
    }
    transcript = create_transcript(db, transcript_data)
    
    # Create a segment
    segment_data = {
        "transcript_id": transcript.id,
        "speaker_label": "Speaker_1",
        "start_time": 0.0,
        "end_time": 5.5,
        "text": "Hello world",
        "confidence_score": 0.95,
        "word_count": 2,
    }
    segment = create_transcript_segment(db, segment_data)
    
    assert segment.id is not None
    assert segment.transcript_id == transcript.id
    assert segment.speaker_label == "Speaker_1"
    assert segment.start_time == 0.0
    assert segment.end_time == 5.5
    assert segment.text == "Hello world"


def test_create_meeting_summary(db, test_meeting):
    """Test creating a meeting summary."""
    summary_data = {
        "meeting_id": test_meeting.id,
        "language": "vi",
        "key_points": ["Point 1", "Point 2"],
        "decisions": ["Decision 1"],
        "meeting_summary": "This is a summary.",
        "ai_provider": "openai",
        "model_name": "gpt-4",
        "processing_status": "COMPLETED",
    }
    summary = create_meeting_summary(db, summary_data)
    
    assert summary.id is not None
    assert summary.meeting_id == test_meeting.id
    assert summary.key_points == ["Point 1", "Point 2"]
    assert summary.decisions == ["Decision 1"]
    assert summary.meeting_summary == "This is a summary."
    assert summary.processing_status == "COMPLETED"


def test_get_meeting_summary(db, test_meeting):
    """Test retrieving a meeting summary by meeting ID."""
    summary_data = {
        "meeting_id": test_meeting.id,
        "key_points": ["Point 1"],
    }
    create_meeting_summary(db, summary_data)
    
    retrieved_summary = get_meeting_summary(db, test_meeting.id)
    
    assert retrieved_summary is not None
    assert retrieved_summary.meeting_id == test_meeting.id
    assert retrieved_summary.key_points == ["Point 1"]


def test_create_action_item(db, test_meeting, test_user):
    """Test creating an action item."""
    action_data = {
        "meeting_id": test_meeting.id,
        "title": "Complete task",
        "description": "Task description",
        "assignees": [
            {
                "user_id": test_user.id,
                "email": test_user.email,
                "display_name": test_user.username,
                "status": "PENDING",
            }
        ],
        "priority": "HIGH",
    }
    action = create_action_item(db, action_data, created_by=test_user.id)
    
    assert action.id is not None
    assert action.meeting_id == test_meeting.id
    assert action.title == "Complete task"
    assert action.assigned_to == test_user.id
    assert action.status == "PENDING"
    assert action.priority == "HIGH"
    assert len(action.assignees) == 1
    assert action.assignees[0].email == test_user.email


def test_create_action_item_normalizes_legacy_assignment(db, test_meeting, test_user):
    action = create_action_item(
        db,
        {
            "meeting_id": test_meeting.id,
            "title": "Legacy assignment",
            "assigned_to": test_user.id,
            "assigned_email": test_user.email,
        },
        created_by=test_user.id,
    )

    assert len(action.assignees) == 1
    assert action.assignees[0].user_id == test_user.id
    assert action.assignees[0].email == test_user.email


def test_get_action_item_by_id(db, test_meeting, test_user):
    """Test retrieving an action item by ID."""
    action_data = {
        "meeting_id": test_meeting.id,
        "title": "Test task",
    }
    created_action = create_action_item(db, action_data, created_by=test_user.id)
    
    retrieved_action = get_action_item_by_id(db, created_action.id)
    
    assert retrieved_action is not None
    assert retrieved_action.id == created_action.id
    assert retrieved_action.title == "Test task"


def test_get_action_items(db, test_meeting, test_user):
    """Test retrieving action items with filters."""
    # Create multiple action items
    for i in range(3):
        action_data = {
            "meeting_id": test_meeting.id,
            "title": f"Task {i}",
            "status": "PENDING" if i < 2 else "COMPLETED",
        }
        create_action_item(db, action_data, created_by=test_user.id)
    
    # Get all action items for meeting
    all_actions = get_action_items(db, meeting_id=test_meeting.id)
    assert len(all_actions) == 3
    
    # Filter by status
    pending_actions = get_action_items(db, meeting_id=test_meeting.id, status="PENDING")
    assert len(pending_actions) == 2
    
    completed_actions = get_action_items(db, meeting_id=test_meeting.id, status="COMPLETED")
    assert len(completed_actions) == 1


def test_action_item_with_summary(db, test_meeting, test_user):
    """Test creating an action item linked to a summary."""
    # Create summary first
    summary_data = {
        "meeting_id": test_meeting.id,
        "key_points": ["Point 1"],
    }
    summary = create_meeting_summary(db, summary_data)
    
    # Create action item linked to summary
    action_data = {
        "meeting_id": test_meeting.id,
        "summary_id": summary.id,
        "title": "Linked task",
    }
    action = create_action_item(db, action_data, created_by=test_user.id)
    
    assert action.summary_id == summary.id


def test_personal_action_item_list_visibility(db, test_meeting, test_user, test_organization):
    """Personal action list only shows assigned items and invited unassigned items."""
    assignee = create_user(db, {
        "username": "assignee",
        "email": "assignee@example.com",
        "password": "password123",
        "role": "member",
    })
    invited = create_user(db, {
        "username": "invited",
        "email": "invited@example.com",
        "password": "password123",
        "role": "member",
    })
    org_member = create_user(db, {
        "username": "orgmember",
        "email": "orgmember@example.com",
        "password": "password123",
        "role": "member",
    })
    add_user_to_organization(db, assignee.id, test_organization.id, "member")
    add_user_to_organization(db, invited.id, test_organization.id, "member")
    add_user_to_organization(db, org_member.id, test_organization.id, "member")

    db.add(models.MeetingParticipant(
        meeting_id=test_meeting.id,
        user_id=invited.id,
        email=invited.email,
        name="Invited User",
        invite_status="accepted",
    ))
    db.add(models.MeetingParticipant(
        meeting_id=test_meeting.id,
        user_id=assignee.id,
        email=assignee.email,
        name="Assignee User",
        invite_status="accepted",
    ))
    db.commit()

    assigned_to_assignee = create_action_item(db, {
        "meeting_id": test_meeting.id,
        "title": "Assigned to assignee",
        "assignees": [{"user_id": assignee.id, "email": assignee.email}],
    }, created_by=test_user.id)
    assigned_by_email = create_action_item(db, {
        "meeting_id": test_meeting.id,
        "title": "Assigned by email",
        "assignees": [{"email": invited.email}],
    }, created_by=test_user.id)
    unassigned_for_invitees = create_action_item(db, {
        "meeting_id": test_meeting.id,
        "title": "Unassigned meeting task",
    }, created_by=test_user.id)

    invited_items = list_action_items(db=db, current_user=invited)
    invited_ids = {item.id for item in invited_items}
    assert invited_ids == {assigned_by_email.id, unassigned_for_invitees.id}
    assert {item.meeting_title for item in invited_items} == {test_meeting.title}
    assert {
        option["email"]
        for item in invited_items
        for option in item.assignee_options
    } == {assignee.email, invited.email}

    assignee_items = list_action_items(db=db, current_user=assignee)
    assert {item.id for item in assignee_items} == {assigned_to_assignee.id, unassigned_for_invitees.id}
    assert {item.meeting_title for item in assignee_items} == {test_meeting.title}
    assert any(
        option["label"] == "Assignee User"
        for item in assignee_items
        for option in item.assignee_options
    )

    org_member_items = list_action_items(db=db, current_user=org_member)
    assert org_member_items == []
