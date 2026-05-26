from contextlib import contextmanager

from jose import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from src.api import auth, models
from src.api.core.admin_runtime import get_admin_settings_snapshot
from src.api.database import SessionLocal, get_db


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        allowed_paths = {
            "/health",
            "/healthz",
            "/metrics",
            "/api/auth/login",
        }
        if path in allowed_paths:
            return await call_next(request)

        with self._session_from_request(request) as db:
            settings = get_admin_settings_snapshot(db)
        if not settings.get("maintenance_mode", False):
            return await call_next(request)

        if self._is_system_admin_request(request):
            return await call_next(request)

        return JSONResponse(
            status_code=503,
            content={"detail": "System is in maintenance mode"},
        )

    def _is_system_admin_request(self, request: Request) -> bool:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return False

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return False

        try:
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            username = payload.get("sub")
        except Exception:
            return False

        if not username:
            return False

        with self._session_from_request(request) as db:
            user = db.query(models.User).filter(models.User.username == username).first()
            return bool(user and user.role == "system-admin" and user.is_active)

    @contextmanager
    def _session_from_request(self, request: Request):
        override = request.app.dependency_overrides.get(get_db)
        if override is not None:
            generator = override()
            db = next(generator)
            try:
                yield db
            finally:
                try:
                    next(generator)
                except StopIteration:
                    pass
            return

        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
