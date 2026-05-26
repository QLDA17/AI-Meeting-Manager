"""
Idempotent notification migration.

Creates the persisted in-app notifications table used for invitations and
user-facing notification actions.
"""
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from src.api.database import engine  # noqa: E402
from src.api.models import Notification  # noqa: E402


def main() -> None:
    Notification.__table__.create(bind=engine, checkfirst=True)
    print("Notifications migration complete")


if __name__ == "__main__":
    main()
