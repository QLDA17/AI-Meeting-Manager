"""
Logging and monitoring middleware for MultiMinutes AI.
Provides structured logging, request tracking, and performance monitoring.
"""
import time
import logging
import json
import os
from typing import Callable
from fastapi import Request, Response
from fastapi.routing import APIRoute
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import uuid

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests with structured data"""
    
    def __init__(self, app: ASGIApp, **kwargs):
        super().__init__(app)
        self.request_id_header = kwargs.get("request_id_header", "X-Request-ID")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timer
        start_time = time.time()
        
        # Client info
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Log request
        logger.info(
            f"REQ {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "query_params": str(request.url.query),
                "client_ip": client_host,
                "user_agent": user_agent,
            }
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate latency
            process_time = (time.time() - start_time) * 1000
            response.headers["X-Process-Time"] = str(round(process_time, 2))
            response.headers["X-Request-ID"] = request_id
            
            # Log response
            logger.info(
                f"RESP {request.method} {request.url.path} {response.status_code}",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "latency_ms": round(process_time, 2),
                }
            )
            
            # Alert on slow requests
            if process_time > 1000:  # > 1s
                logger.warning(
                    f"Slow request detected: {request.method} {request.url.path} took {process_time:.0f}ms",
                    extra={"request_id": request_id, "latency_ms": process_time}
                )
            
            return response
            
        except Exception as exc:
            # Log error
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"ERR {request.method} {request.url.path} failed after {process_time:.0f}ms: {exc}",
                extra={
                    "request_id": request_id,
                    "error": str(exc),
                    "latency_ms": process_time,
                },
                exc_info=True
            )
            raise


class PerformanceLoggingRoute(APIRoute):
    """Custom route class with performance logging"""
    
    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()
        
        async def custom_route_handler(request: Request):
            start_time = time.time()
            response = await original_route_handler(request)
            process_time = (time.time() - start_time) * 1000
            
            # Log slow endpoints (>500ms)
            if process_time > 500:
                logger.warning(
                    f"Slow endpoint: {request.url.path} took {process_time:.0f}ms",
                    extra={
                        "path": request.url.path,
                        "method": request.method,
                        "latency_ms": process_time,
                    }
                )
            
            return response
        
        return custom_route_handler


def setup_logging(log_level: str = "INFO", json_format: bool = False):
    """Configure structured logging for the application"""
    
    # Get log level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatter
    if json_format:
        formatter = logging.Formatter(
            json.dumps({
                "timestamp": "%(asctime)s",
                "level": "%(levelname)s",
                "logger": "%(name)s",
                "message": "%(message)s",
                "module": "%(module)s",
                "function": "%(funcName)s",
                "line": "%(lineno)d",
            })
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if enabled)
    log_file = os.getenv("LOG_FILE", "logs/app.log")
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if os.getenv("DB_ECHO", "false").lower() == "true" else logging.WARNING
    )
