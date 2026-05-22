import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.api import _legacy_runtime as legacy
from src.api._legacy_runtime import *  # noqa: F401,F403
from src.api.app import app
from src.api.notifications import send_email as notification_send_email


def send_email(*args, **kwargs):
    return notification_send_email(*args, **kwargs)

__all__ = ["app"]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
