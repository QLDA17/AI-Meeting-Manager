from sqlalchemy.orm import Session
from src.api.database import SessionLocal, engine, Base
from src.api import models, auth, crud
import uuid
from datetime import datetime, date

def seed_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Create Organization
        org = db.query(models.Organization).filter(models.Organization.name == "MultiMinutes AI").first()
        if not org:
            print("Creating organization...")
            org = models.Organization(
                id=str(uuid.uuid4()),
                name="MultiMinutes AI",
                description="Hệ thống quản lý cuộc họp AI"
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        # 2. Check if admin user exists
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            print("Creating admin user...")
            # Use raw model insert for seeding if crud is too strict, 
            # but let's try crud.create_user first.
            admin = crud.create_user(db, {
                "username": "admin",
                "password": "admin123", 
                "email": "admin@multiminutes.ai",
                "role": "system-admin",
                "first_name": "System",
                "last_name": "Admin"
            })
            
            # Add admin to organization
            crud.add_user_to_organization(db, admin.id, org.id, "org-admin")
            
            # 3. Create sample meeting
            print("Creating sample meeting...")
            meeting_data = {
                "title": "Cuộc họp chào mừng",
                "description": "Đây là cuộc họp mẫu để trải nghiệm hệ thống.",
                "organization_id": org.id,
                "status": "completed",
                "meeting_type": "MEETING"
            }
            meeting = crud.create_meeting(db, meeting_data, created_by=admin.id)
            
            # 4. Add Transcript
            print("Adding transcript...")
            transcript_data = {
                "meeting_id": meeting.id,
                "content": "[00:00] [Speaker_1] Chào mừng bạn đến với MultiMinutes AI.\n[00:05] [Speaker_2] Đây là hệ thống tóm tắt cuộc họp thông minh.\n[00:10] [Speaker_1] Hãy thử upload file audio để trải nghiệm nhé.",
                "word_count": 30,
                "processing_status": "COMPLETED"
            }
            transcript = crud.create_transcript(db, transcript_data)
            
            # 5. Add Summary
            print("Adding summary...")
            summary_data = {
                "meeting_id": meeting.id,
                "meeting_summary": "Cuộc họp giới thiệu hệ thống MultiMinutes AI.",
                "key_points": ["Giới thiệu hệ thống", "Hướng dẫn sử dụng cơ bản"],
                "decisions": ["Sử dụng Google Gemini làm AI chính"],
                "processing_status": "COMPLETED"
            }
            summary = crud.create_meeting_summary(db, summary_data)
            
            # 6. Add Action Items
            print("Adding action items...")
            action_items_data = [
                {"title": "Upload audio file đầu tiên", "status": "PENDING", "priority": "HIGH"},
                {"title": "Kiểm tra tính năng export", "status": "PENDING", "priority": "MEDIUM"}
            ]
            for item in action_items_data:
                item["meeting_id"] = meeting.id
                item["summary_id"] = summary.id
                crud.create_action_item(db, item, created_by=admin.id)
            
            db.commit()
            print("Database seeded successfully!")
        else:
            print("Database already contains data, skipping seed.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    import os
    # Add project root to path
    sys.path.append(os.getcwd())
    seed_db()
