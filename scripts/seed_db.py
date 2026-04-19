from sqlalchemy.orm import Session
from src.api.database import SessionLocal, engine, Base
from src.api import models, auth, crud
import uuid
from datetime import datetime

def seed_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            print("Creating admin user...")
            admin = crud.create_user(db, {
                "username": "admin",
                "password": "admin123", # Change this in production!
                "email": "admin@multiminutes.ai",
                "role": "admin",
                "full_name": "System Administrator"
            })
            
            # Create sample meeting for admin
            print("Creating sample meeting...")
            meeting_id = "sample-meeting-1"
            meeting_data = {
                "id": meeting_id,
                "title": "Welcome to MultiMinutes AI",
                "description": "This is a sample meeting to demonstrate the system.",
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "duration": "10m",
                "speaker_count": 2,
                "status": "completed",
                "llm_source": "google"
            }
            meeting = crud.create_meeting(db, meeting_data, creator_id=admin.id)
            
            # Add Transcript
            db_transcript = models.Transcript(
                meeting_id=meeting.id,
                content="[00:00] [Speaker_1] Chào mừng bạn đến với MultiMinutes AI.\n[00:05] [Speaker_2] Đây là hệ thống tóm tắt cuộc họp thông minh.\n[00:10] [Speaker_1] Hãy thử upload file audio để trải nghiệm nhé.",
                speakers=["Speaker_1", "Speaker_2"],
                word_count=30
            )
            db.add(db_transcript)
            
            # Add Summary
            summary_data = {
                "meeting_summary": "Cuộc họp giới thiệu hệ thống MultiMinutes AI.",
                "key_points": ["Giới thiệu hệ thống", "Hướng dẫn sử dụng cơ bản"],
                "decisions": ["Sử dụng Google Gemini làm AI chính"],
            }
            crud.create_or_update_summary(db, meeting.id, summary_data)
            
            # Add Action Items
            action_items = [
                {"task": "Upload audio file đầu tiên", "owner": "Admin", "deadline": "Ngay bây giờ", "status": "pending"},
                {"task": "Kiểm tra tính năng export", "owner": "Admin", "deadline": "Hôm nay", "status": "pending"}
            ]
            crud.update_action_items(db, meeting.id, action_items)
            
            db.commit()
            print("Database seeded successfully!")
        else:
            print("Database already contains data, skipping seed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    import os
    # Add project root to path
    sys.path.append(os.getcwd())
    seed_db()
