"""Migration: Add reply_to_id column to group_messages table."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "multiminutes.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(group_messages)")
    columns = [row[1] for row in cursor.fetchall()]

    if "reply_to_id" in columns:
        print("Column reply_to_id already exists. Skipping.")
    else:
        cursor.execute("ALTER TABLE group_messages ADD COLUMN reply_to_id VARCHAR(36) DEFAULT NULL")
        print("Added reply_to_id column to group_messages.")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
