from fastapi import FastAPI

from src.api import _legacy_runtime as legacy

_ensure_column = legacy._ensure_column
_ensure_meeting_runtime_columns = legacy._ensure_meeting_runtime_columns
_ensure_action_item_assignee_backfill = legacy._ensure_action_item_assignee_backfill


async def startup_event():
    await legacy.startup_event()


async def shutdown_event():
    await legacy.shutdown_event()


def register_lifecycle(app: FastAPI) -> None:
    app.on_event("startup")(startup_event)
    app.on_event("shutdown")(shutdown_event)
