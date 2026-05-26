import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api import models, scheduler
from src.api.database import Base


TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


def test_status_transition_loop_uses_valid_update_path(db_session, monkeypatch):
    now = datetime.now(timezone.utc)
    meeting = models.Meeting(
        id="meeting-upcoming",
        organization_id="org-1",
        title="Scheduler Meeting",
        description="Should become live via update_meeting",
        meeting_type="MEETING",
        status="upcoming",
        created_by="user-1",
        scheduled_start=now - timedelta(minutes=5),
    )
    db_session.add(meeting)
    db_session.commit()

    fresh_session = TestingSessionLocal()
    calls = []

    def fake_get_db():
        return fresh_session

    async def fake_sleep(_seconds: float):
        raise asyncio.CancelledError()

    from src.api.crud.crud_meeting import update_meeting as real_update_meeting

    def tracking_update_meeting(db, meeting_id, updates):
        calls.append((meeting_id, updates.copy()))
        return real_update_meeting(db, meeting_id, updates)

    monkeypatch.setattr(scheduler, "_get_db", fake_get_db)
    monkeypatch.setattr(scheduler, "update_meeting", tracking_update_meeting)
    monkeypatch.setattr(scheduler.asyncio, "sleep", fake_sleep)

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(scheduler.status_transition_loop())

    refreshed = fresh_session.query(models.Meeting).filter(models.Meeting.id == meeting.id).first()
    assert refreshed is not None
    assert refreshed.status == "live"
    assert refreshed.actual_start is not None
    assert any(call[0] == meeting.id and call[1]["status"] == "live" for call in calls)

    fresh_session.close()
