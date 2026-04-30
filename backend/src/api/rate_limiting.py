"""
Rate limiting middleware for API protection.
Uses sliding window algorithm with in-memory storage (safe for single instance).
For distributed deployment, replace with Redis backend.
"""
import time
import asyncio
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """Simple in-memory rate limiter using sliding window"""
    
    def __init__(self, window_size: int = 60, max_requests: int = 100):
        """
        Args:
            window_size: Time window in seconds
            max_requests: Max requests per window per IP
        """
        self.window_size = window_size
        self.max_requests = max_requests
        self._store: Dict[str, list] = {}  # ip -> list of timestamps
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, identifier: str) -> Tuple[bool, Dict]:
        """
        Check if request is allowed.
        Returns (allowed, metadata)
        """
        async with self._lock:
            now = time.time()
            timestamps = self._store.get(identifier, [])
            
            # Remove old timestamps outside window
            cutoff = now - self.window_size
            timestamps = [t for t in timestamps if t > cutoff]
            
            # Check limit
            allowed = len(timestamps) < self.max_requests
            
            if allowed:
                timestamps.append(now)
                self._store[identifier] = timestamps
            
            # Calculate reset time
            reset_at = cutoff + self.window_size if timestamps else now
            
            metadata = {
                "remaining": max(0, self.max_requests - len(timestamps)),
                "reset_at": reset_at,
                "limit": self.max_requests,
                "window_size": self.window_size,
            }
            
            return allowed, metadata
    
    def clear(self):
        """Clear all rate limit data (for testing)"""
        self._store.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware.
    Apply globally or per-route via dependencies.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        *,
        requests_per_minute: int = 100,
        window_size: int = 60,
        enable_for_paths: Optional[list] = None,
        exclude_paths: Optional[list] = None,
    ):
        super().__init__(app)
        self.limiter = InMemoryRateLimiter(window_size, requests_per_minute)
        self.enable_for_paths = enable_for_paths
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/redoc"]
        self.identifier_header = "X-Forwarded-For"  # Use proxy header if available
    
    async def dispatch(self, request: Request, call_next):
        # Skip if path excluded
        if any(request.url.path.startswith(p) for p in self.exclude_paths):
            return await call_next(request)
        
        # Skip if enable_for_paths set and path not in list
        if self.enable_for_paths and not any(request.url.path.startswith(p) for p in self.enable_for_paths):
            return await call_next(request)
        
        # Skip OPTIONS (preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client identifier
        identifier = self._get_client_id(request)
        
        # Check rate limit
        allowed, metadata = await self.limiter.is_allowed(identifier)
        
        if not allowed:
            logger.warning(
                f"Rate limit exceeded for {identifier} on {request.url.path}",
                extra={"client_ip": identifier, "path": request.url.path}
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Too many requests.",
                headers={
                    "X-RateLimit-Limit": str(metadata["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(metadata["reset_at"])),
                    "Retry-After": str(int(metadata["reset_at"] - time.time())),
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(metadata["limit"])
        response.headers["X-RateLimit-Remaining"] = str(metadata["remaining"])
        response.headers["X-RateLimit-Reset"] = str(int(metadata["reset_at"]))
        
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Extract client identifier from request"""
        # Check X-Forwarded-For header (proxy)
        forwarded_for = request.headers.get(self.identifier_header)
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Fall back to direct client
        if request.client:
            return request.client.host
        
        return "unknown"


# Global rate limiter instance (can be configured)
default_rate_limiter = RateLimitMiddleware


def rate_limit(
    requests_per_minute: int = 100,
    window_size: int = 60,
    exclude_paths: Optional[list] = None,
):
    """
    Dependency factory for per-route rate limiting.
    
    Usage:
        @app.post("/api/upload")
        @rate_limit(requests_per_minute=10)  # 10 uploads per minute
        async def upload_file(...):
            ...
    """
    from fastapi import Depends
    
    limiter = InMemoryRateLimiter(window_size, requests_per_minute)
    
    async def check_rate_limit(request: Request):
        identifier = request.client.host if request.client else "unknown"
        allowed, metadata = await limiter.is_allowed(identifier)
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(metadata["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(metadata["reset_at"])),
                }
            )
        
        # Add headers via response middleware (this is just to raise exception)
        return True
    
    return Depends(check_rate_limit)
