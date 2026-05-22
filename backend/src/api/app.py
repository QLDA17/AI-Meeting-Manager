import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.core.app_state import config, logger
from src.api.core.lifecycle import register_lifecycle
from src.api.logging_middleware import RequestLoggingMiddleware
from src.api.rate_limiting import RateLimitMiddleware
from src.api.routes.admin import router as admin_router
from src.api.routes.auth_profile import router as auth_profile_router
from src.api.routes.glossary_action_items import router as glossary_action_items_router
from src.api.routes.groups import router as groups_router
from src.api.routes.meetings import router as meetings_router
from src.api.routes.organizations import router as organizations_router
from src.api.routes.stt import router as stt_router
from src.api.routes.system import router as system_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="MultiMinutes AI API",
        version="1.0.0-beta",
        description="AI-powered meeting minutes generation system",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    app.router.redirect_slashes = False

    app.add_middleware(RequestLoggingMiddleware)

    if config.environment != "development":
        app.add_middleware(
            RateLimitMiddleware,
            requests_per_minute=int(os.getenv("RATE_LIMIT_RPM", "100")),
            window_size=int(os.getenv("RATE_LIMIT_WINDOW", "60")),
            exclude_paths=["/health", "/metrics", "/docs", "/openapi.json"],
        )
        logger.info("Rate limiting enabled")
    else:
        logger.info("Rate limiting disabled in development mode")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.server.cors_origins,
        allow_credentials=config.server.cors_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_lifecycle(app)

    app.include_router(auth_profile_router)
    app.include_router(organizations_router)
    app.include_router(groups_router)
    app.include_router(meetings_router)
    app.include_router(stt_router)
    app.include_router(admin_router)
    app.include_router(glossary_action_items_router)
    app.include_router(system_router)
    return app


app = create_app()
