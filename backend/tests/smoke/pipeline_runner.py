import asyncio
import os
import sys
from sqlalchemy.orm import Session
from src.api.database import SessionLocal, engine, Base
from src.api import crud, models
from src.api.jobs import MeetingProcessingJob
from src.cost.cost_logger import CostLogger

# Run this script from the backend/ directory so the `src` package resolves cleanly.
sys.path.append(os.getcwd())

async def test_pipeline():
    # Initialize DB
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    
    # Create a test meeting
    meeting_data = {
        "title": "Test Meeting AI",
        "date": "2024-04-11",
        "status": "queued"
    }
    db_meeting = crud.create_meeting(db, meeting_data)
    print(f"Created meeting: {db_meeting.id}")
    
    cost_logger = CostLogger(monthly_hard_limit_usd=2.0)
    job = MeetingProcessingJob(db_meeting.id, db_meeting.title, cost_logger)
    
    print("Starting job...")
    try:
        results = await job.run()
        print("Job completed successfully!")
        print(f"Transcript: {results.get('transcript')}")
        print(f"Summary: {results.get('summary', {}).get('meeting_summary')}")
    except Exception as e:
        print(f"Job failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_pipeline())
