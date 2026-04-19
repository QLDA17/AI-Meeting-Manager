import os
from urllib.parse import urlparse

import pymysql


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


def main():
    cfg = parse_database_url()
    print(f"Connecting MySQL at {cfg['host']}:{cfg['port']} ...")

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
                f"CREATE DATABASE IF NOT EXISTS `{cfg['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )

    db_conn = pymysql.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        database=cfg["database"],
        charset="utf8mb4",
        autocommit=True,
    )

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

    print("MySQL schema initialized successfully.")


if __name__ == "__main__":
    main()
