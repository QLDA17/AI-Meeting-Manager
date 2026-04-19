import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse

try:
    import pymysql
except Exception:
    pymysql = None

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data"
)
MEETINGS_FILE = os.path.join(DATA_DIR, "meetings.json")
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", "")


def _mysql_config_from_url() -> Optional[Dict]:
    if not DATABASE_URL or not DATABASE_URL.startswith("mysql") or pymysql is None:
        return None
    parsed = urlparse(DATABASE_URL)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": parsed.username or "root",
        "password": parsed.password or "",
        "database": (parsed.path or "/").lstrip("/"),
    }


def _get_mysql_connection(with_database: bool = True):
    cfg = _mysql_config_from_url()
    if not cfg:
        return None
    conn_kwargs = {
        "host": cfg["host"],
        "port": cfg["port"],
        "user": cfg["user"],
        "password": cfg["password"],
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": True,
    }
    if with_database:
        conn_kwargs["database"] = cfg["database"]
    return pymysql.connect(**conn_kwargs)


def _ensure_mysql_schema() -> bool:
    cfg = _mysql_config_from_url()
    if not cfg:
        return False
    try:
        root_conn = _get_mysql_connection(with_database=False)
        if not root_conn:
            return False
        with root_conn:
            with root_conn.cursor() as cur:
                cur.execute(
                    f"CREATE DATABASE IF NOT EXISTS `{cfg['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
        conn = _get_mysql_connection(with_database=True)
        if not conn:
            return False
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS meetings (
                        id VARCHAR(64) PRIMARY KEY,
                        title VARCHAR(500) NOT NULL,
                        meeting_date VARCHAR(64) NOT NULL,
                        duration VARCHAR(64) NOT NULL,
                        speaker_count INT NOT NULL DEFAULT 0,
                        transcript LONGTEXT NULL,
                        summary_json LONGTEXT NULL,
                        status VARCHAR(32) NOT NULL,
                        llm_source VARCHAR(32) NOT NULL,
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
        return True
    except Exception:
        return False


def _summary_to_json(summary) -> Optional[str]:
    if summary is None:
        return None
    return json.dumps(summary, ensure_ascii=False)


def _summary_from_json(summary_json: Optional[str]):
    if not summary_json:
        return None
    try:
        return json.loads(summary_json)
    except json.JSONDecodeError:
        return None


def _row_to_meeting(row: Dict) -> Dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "date": row["meeting_date"],
        "duration": row["duration"],
        "speaker_count": row["speaker_count"],
        "transcript": row["transcript"],
        "summary": _summary_from_json(row.get("summary_json")),
        "status": row["status"],
        "llm_source": row["llm_source"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


def _load_meetings_file() -> List[Dict]:
    if not os.path.exists(MEETINGS_FILE):
        return []
    try:
        with open(MEETINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_meetings(meetings: List[Dict]) -> None:
    with open(MEETINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(meetings, f, ensure_ascii=False, indent=2)


def _upsert_meeting_mysql(conn, meeting: Dict) -> None:
    now = datetime.now()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO meetings (
                id, title, meeting_date, duration, speaker_count, transcript,
                summary_json, status, llm_source, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                title=VALUES(title),
                meeting_date=VALUES(meeting_date),
                duration=VALUES(duration),
                speaker_count=VALUES(speaker_count),
                transcript=VALUES(transcript),
                summary_json=VALUES(summary_json),
                status=VALUES(status),
                llm_source=VALUES(llm_source),
                updated_at=VALUES(updated_at)
            """,
            (
                meeting["id"],
                meeting.get("title", "Untitled Meeting"),
                meeting.get("date", datetime.now().strftime("%Y-%m-%d %H:%M")),
                meeting.get("duration", "pending"),
                int(meeting.get("speaker_count", 0)),
                meeting.get("transcript"),
                _summary_to_json(meeting.get("summary")),
                meeting.get("status", "queued"),
                meeting.get("llm_source", "none"),
                now,
                now,
            ),
        )


def _migrate_file_to_mysql_if_needed() -> None:
    if not _ensure_mysql_schema():
        return
    try:
        conn = _get_mysql_connection(with_database=True)
        if not conn:
            return
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS total FROM meetings")
                count = cur.fetchone()["total"]
            if count > 0:
                return
            for meeting in _load_meetings_file():
                if "id" in meeting:
                    _upsert_meeting_mysql(conn, meeting)
    except Exception:
        return


def _load_meetings_mysql() -> List[Dict]:
    if not _ensure_mysql_schema():
        return []
    _migrate_file_to_mysql_if_needed()
    conn = _get_mysql_connection(with_database=True)
    if not conn:
        return []
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM meetings ORDER BY created_at DESC")
            rows = cur.fetchall()
            return [_row_to_meeting(r) for r in rows]


def load_meetings() -> List[Dict]:
    meetings = _load_meetings_mysql()
    if meetings:
        return meetings
    if _mysql_config_from_url():
        # Database configured but empty/unavailable: still return file data as safe fallback.
        return _load_meetings_file()
    return _load_meetings_file()


def get_meeting_by_id(meeting_id: str) -> Optional[Dict]:
    if _ensure_mysql_schema():
        try:
            conn = _get_mysql_connection(with_database=True)
            if conn:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT * FROM meetings WHERE id = %s", (meeting_id,))
                        row = cur.fetchone()
                        if row:
                            return _row_to_meeting(row)
        except Exception:
            pass
    meetings = _load_meetings_file()
    return next((m for m in meetings if m["id"] == meeting_id), None)


def update_meeting(meeting_id: str, updates: Dict) -> bool:
    existing = get_meeting_by_id(meeting_id)
    if not existing:
        return False
    existing.update(updates)
    if _ensure_mysql_schema():
        try:
            conn = _get_mysql_connection(with_database=True)
            if conn:
                with conn:
                    _upsert_meeting_mysql(conn, existing)
                    return True
        except Exception:
            pass
    meetings = _load_meetings_file()
    for i, m in enumerate(meetings):
        if m["id"] == meeting_id:
            meetings[i].update(updates)
            save_meetings(meetings)
            return True
    return False


def add_meeting(meeting: Dict) -> str:
    meetings = load_meetings()
    meeting_id = meeting.get("id", f"m{len(meetings) + 1}")
    meeting["id"] = meeting_id
    meeting["created_at"] = datetime.now().isoformat()

    if _ensure_mysql_schema():
        try:
            conn = _get_mysql_connection(with_database=True)
            if conn:
                with conn:
                    _upsert_meeting_mysql(conn, meeting)
                    return meeting_id
        except Exception:
            pass

    meetings_file = _load_meetings_file()
    meetings_file.append(meeting)
    save_meetings(meetings_file)
    return meeting_id


def delete_meeting(meeting_id: str) -> bool:
    if _ensure_mysql_schema():
        try:
            conn = _get_mysql_connection(with_database=True)
            if conn:
                with conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM meetings WHERE id = %s", (meeting_id,))
                        if cur.rowcount > 0:
                            return True
        except Exception:
            pass
    meetings = _load_meetings_file()
    new_meetings = [m for m in meetings if m["id"] != meeting_id]
    if len(new_meetings) == len(meetings):
        return False
    save_meetings(new_meetings)
    return True
