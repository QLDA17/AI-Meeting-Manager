import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
import pymysql
import logging

logger = logging.getLogger(__name__)
load_dotenv()


def parse_database_url():
    database_url = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://multiminutes:multiminutes_password@localhost:3306/multiminutes",
    )
    parsed = urlparse(database_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": parsed.username or "root",
        "password": parsed.password or "",
        "database": (parsed.path or "/").lstrip("/"),
    }


def read_schema_file() -> str:
    """Read the full MySQL schema SQL file"""
    schema_path = Path(__file__).parent.parent / "database" / "mysql_schema.sql"
    if not schema_path.exists():
        logger.warning(f"Schema file not found: {schema_path}")
        return None
    with open(schema_path, 'r', encoding='utf-8') as f:
        return f.read()


def main():
    cfg = parse_database_url()
    print(f"[INFO] Connecting MySQL at {cfg['host']}:{cfg['port']} ...")

    # Connect as root to create database
    root_conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        charset="utf8mb4",
        autocommit=True,
    )

    with root_conn:
        with root_conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{cfg['database']}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            print(f"[OK] Database `{cfg['database']}` created/verified.")

    # Connect to target database
    db_conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        charset="utf8mb4",
        autocommit=True,
    )

    # Read and execute full schema
    schema_sql = read_schema_file()
    if schema_sql:
        with db_conn:
            with db_conn.cursor() as cur:
                statements = []
                current_statement = []
                for line in schema_sql.split('\n'):
                    stripped = line.strip()
                    if stripped.startswith('--') or stripped.startswith('#') or not stripped:
                        continue
                    clean_line = stripped.split('--')[0].rstrip() if '--' in stripped else stripped
                    current_statement.append(clean_line)
                    if clean_line.endswith(';'):
                        statement = ' '.join(current_statement)
                        if statement.strip():
                            statements.append(statement.strip())
                        current_statement = []
                
                # Execute each statement
                for i, statement in enumerate(statements, 1):
                    try:
                        cur.execute(statement)
                        print(f"  [OK] Executed statement {i}/{len(statements)}")
                    except (pymysql.err.ProgrammingError, pymysql.err.OperationalError) as e:
                        # Ignore "already exists" errors for idempotency
                        err_str = str(e).lower()
                        err_code = getattr(e, 'args', [0])[0] if hasattr(e, 'args') else 0
                        if "already exists" in err_str or err_code == 1061:
                            print(f"  [SKIP] Skipped (already exists): statement {i}")
                        else:
                            print(f"  [ERROR] Statement {i} failed: {e}")
                            print(f"  [SQL] >>> {statement[:200]}...")  # Print first 200 chars
                            raise
                print(f"[OK] Schema initialized successfully ({len(statements)} statements).")
    else:
        print("[WARN] Schema file not found, using legacy single-table creation.")
        with db_conn:
            with db_conn.cursor() as cur:
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
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                print("[OK] Legacy meetings table created/verified.")

    print("[OK] MySQL initialization complete.")


if __name__ == "__main__":
    main()
