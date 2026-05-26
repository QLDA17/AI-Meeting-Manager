"""
Idempotent auth v2 migration.

Adds registration profile fields, indexed invitation token digest, and normalizes
global user roles to the simplified system-admin/member model.
"""
import sys
from pathlib import Path

from sqlalchemy import inspect, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from src.api.database import engine  # noqa: E402


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(engine)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def add_column_if_missing(conn, table_name: str, column_name: str, ddl: str) -> None:
    if not column_exists(table_name, column_name):
        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))
        print(f"Added {table_name}.{column_name}")
    else:
        print(f"Skipped {table_name}.{column_name}; already exists")


def create_index_if_missing(conn, index_name: str, table_name: str, column_name: str) -> None:
    inspector = inspect(engine)
    existing = {index["name"] for index in inspector.get_indexes(table_name)}
    if index_name in existing:
        print(f"Skipped index {index_name}; already exists")
        return

    unique_keyword = "UNIQUE " if index_name.startswith("uq_") else ""
    conn.execute(text(f"CREATE {unique_keyword}INDEX {index_name} ON {table_name} ({column_name})"))
    print(f"Created index {index_name}")


def main() -> None:
    with engine.begin() as conn:
        add_column_if_missing(conn, "users", "phone", "phone VARCHAR(20)")
        add_column_if_missing(conn, "users", "gender", "gender VARCHAR(10)")
        add_column_if_missing(conn, "users", "date_of_birth", "date_of_birth DATETIME")
        add_column_if_missing(conn, "invitations", "token_sha256", "token_sha256 VARCHAR(64)")

        create_index_if_missing(conn, "ix_invitations_token_sha256", "invitations", "token_sha256")
        conn.execute(text("UPDATE users SET role='member' WHERE role NOT IN ('system-admin','member')"))
        print("Normalized legacy global user roles")

    print("Auth v2 migration complete")


if __name__ == "__main__":
    main()
