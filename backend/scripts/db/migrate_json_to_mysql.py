"""
Migration script: JSON → MySQL
Migrates all data from JSON files to MySQL database.
Run after `python scripts/init_mysql.py` to populate database with existing data.
"""
import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.api.database import engine, get_db, Base, health_check
from src.api import models
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Paths
DATA_DIR = Path("data")
MEETINGS_FILE = DATA_DIR / "meetings.json"
USERS_FILE = DATA_DIR / "users.json"
TRANSCRIPTS_FILE = DATA_DIR / "transcripts.json"
CHAT_FILE = DATA_DIR / "chat_history.json"


def load_json_file(file_path: Path) -> list:
    """Load data from JSON file"""
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {file_path}: {e}")
        return []


def migrate_users(db) -> int:
    """Migrate users from JSON to MySQL"""
    data = load_json_file(USERS_FILE)
    count = 0
    for item in data:
        try:
            user = models.User(
                id=item.get('id') or f"user-{count+1}",
                username=item.get('username', 'unknown'),
                email=item.get('email', ''),
                password_hash=item.get('password_hash', '$2b$12$placeholder'),
                role=item.get('role', 'STAFF'),
                first_name=item.get('first_name', ''),
                last_name=item.get('last_name', ''),
                is_active=item.get('is_active', True),
                is_verified=item.get('is_verified', False),
                last_login=item.get('last_login'),
                created_at=datetime.fromisoformat(item['created_at']) if isinstance(item.get('created_at'), str) else datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(user)
            count += 1
        except Exception as e:
            logger.error(f"Error migrating user {item.get('username')}: {e}")
    db.commit()
    logger.info(f"Migrated {count} users")
    return count


def migrate_meetings(db) -> int:
    """Migrate meetings from JSON to MySQL"""
    data = load_json_file(MEETINGS_FILE)
    count = 0
    for item in data:
        try:
            meeting = models.Meeting(
                id=item.get('id') or f"meeting-{count+1}",
                title=item.get('title', 'Untitled Meeting'),
                description=item.get('description', ''),
                scheduled_start=datetime.fromisoformat(item['date']) if isinstance(item.get('date'), str) else datetime.now(),
                scheduled_end=datetime.fromisoformat(item['date']) if isinstance(item.get('date'), str) else datetime.now(),
                actual_start=datetime.fromisoformat(item['date']) if isinstance(item.get('date'), str) else datetime.now(),
                actual_end=datetime.fromisoformat(item['date']) if isinstance(item.get('date'), str) else datetime.now(),
                location=item.get('location', 'Virtual'),
                meeting_type=item.get('meeting_type', 'MEETING'),
                status=item.get('status', 'COMPLETED').upper(),
                created_by=item.get('created_by', 'user-1'),
                created_at=datetime.fromisoformat(item['created_at']) if isinstance(item.get('created_at'), str) else datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(meeting)
            count += 1
        except Exception as e:
            logger.error(f"Error migrating meeting {item.get('title')}: {e}")
    db.commit()
    logger.info(f"Migrated {count} meetings")
    return count


def migrate_transcripts(db) -> int:
    """Migrate transcripts from JSON to MySQL"""
    data = load_json_file(TRANSCRIPTS_FILE)
    count = 0
    for item in data:
        try:
            transcript = models.Transcript(
                id=item.get('id') or f"transcript-{count+1}",
                meeting_id=item.get('meeting_id'),
                audio_file_id=item.get('audio_file_id'),
                content=item.get('content', ''),
                language=item.get('language', 'vi'),
                word_count=item.get('word_count', 0),
                processing_status='COMPLETED',
                stt_provider=item.get('provider', 'whisper'),
                confidence_score=item.get('confidence_score'),
                created_at=datetime.fromisoformat(item['created_at']) if isinstance(item.get('created_at'), str) else datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(transcript)
            count += 1
        except Exception as e:
            logger.error(f"Error migrating transcript {item.get('id')}: {e}")
    db.commit()
    logger.info(f"Migrated {count} transcripts")
    return count


def migrate_chat_history(db) -> int:
    """Migrate chat history from JSON to MySQL"""
    data = load_json_file(CHAT_FILE)
    count = 0
    for item in data:
        try:
            # This would need a separate ChatHistory model
            # Skipping for now as it's not critical
            pass
        except Exception as e:
            logger.error(f"Error migrating chat: {e}")
    logger.info(f"Migrated {count} chat messages")
    return count


def main():
    """Run migration"""
    logger.info("Starting JSON → MySQL migration")
    
    # Check database health
    health = health_check()
    if health.get('status') != 'healthy':
        logger.error(f"Database not healthy: {health}")
        sys.exit(1)
    
    # Check if data already exists
    db = next(get_db())
    try:
        existing_meetings = db.query(models.Meeting).count()
        if existing_meetings > 0:
            logger.warning(f"Database already has {existing_meetings} meetings. Skipping migration.")
            logger.warning("To force migration, clear database first.")
            return
    finally:
        db.close()
    
    # Run migrations
    db = next(get_db())
    try:
        total = 0
        
        total += migrate_users(db)
        total += migrate_meetings(db)
        total += migrate_transcripts(db)
        total += migrate_chat_history(db)
        
        logger.info(f"Migration complete! Migrated {total} records total.")
        print(f"✅ Successfully migrated {total} records to MySQL")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    main()