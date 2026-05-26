"""Migration: Add reply_to_id column to group_messages (MySQL)."""
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from src.api.database import engine

def migrate():
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(
            text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_messages' AND COLUMN_NAME = 'reply_to_id'")
        )
        if result.fetchone():
            print("Column reply_to_id already exists. Skipping.")
            return

        conn.execute(
            text("ALTER TABLE group_messages "
            "ADD COLUMN reply_to_id VARCHAR(36) DEFAULT NULL, "
            "ADD CONSTRAINT fk_gm_msg_reply FOREIGN KEY (reply_to_id) REFERENCES group_messages (id) ON DELETE SET NULL")
        )
        conn.commit()
        print("Added reply_to_id column to group_messages (MySQL).")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
