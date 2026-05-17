"""Add PhoBERT post-processing metadata columns.

This migration is intentionally additive and mirrors the lightweight startup
guards in src/api/main.py for deployments that run scripts explicitly.
"""

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from src.api.database import engine


def ensure_column(table_name: str, column_name: str, ddl: str) -> None:
    with engine.begin() as connection:
        dialect = connection.dialect.name
        if dialect == "sqlite":
            existing = [row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})").fetchall()]
            if column_name not in existing:
                connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")
        elif dialect in {"mysql", "mariadb"}:
            exists = connection.exec_driver_sql(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = %s
                  AND column_name = %s
                """,
                (table_name, column_name),
            ).scalar()
            if not exists:
                connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {ddl}")
        else:
            raise RuntimeError(f"Unsupported database dialect: {dialect}")


def main() -> None:
    ensure_column("transcripts", "post_processed", "post_processed BOOLEAN DEFAULT FALSE")
    ensure_column("transcripts", "nlp_metadata", "nlp_metadata JSON")
    ensure_column("transcript_segments", "original_text", "original_text TEXT")
    ensure_column("transcript_segments", "nlp_metadata", "nlp_metadata JSON")
    print("PhoBERT metadata columns are ready.")


if __name__ == "__main__":
    main()
