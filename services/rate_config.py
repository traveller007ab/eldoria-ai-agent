"""
Rate limiting configuration for Eldoria Bridge
Ultra-conservative limits for zero-budget operation
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

# ============================================================================
# TIER DEFINITIONS (per IP/user)
# ============================================================================

RATE_LIMITS = {
    # Tier 1: Free operations (high limits)
    "health": "120/minute",
    "static": "200/minute",
    # Tier 2: Low cost operations
    "chat": "5/minute",
    "simple_ai": "5/minute",
    # Tier 3: Expensive operations
    "proxy": "3/minute",
    "thesis": "1/minute",
    "research": "2/minute",
    # Tier 4: Critical/Connection operations
    "websocket": "10/minute",  # Connection attempts
    "auth": "5/minute",
    "register": "3/hour",
    # Tier 5: Resource intensive
    "simulation": "20/minute",
    "computation": "20/minute",
    # Tier 6: Dangerous operations
    "restart": "3/hour",
    "file_write": "30/minute",
    "file_read": "60/minute",
}


def get_user_or_ip_key(request: Request) -> str:
    """
    Use user ID if authenticated, fallback to IP
    This allows authenticated users higher limits
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            import services.db as db

            token = auth_header.replace("Bearer ", "")
            payload = db.decode_token(token)
            if payload and payload.get("sub"):
                return f"user:{payload.get('sub')}"
        except Exception:
            pass

    # Fallback to IP address
    return f"ip:{get_remote_address(request)}"


def get_websocket_key(websocket) -> str:
    """Get rate limit key for WebSocket connections"""
    return f"ws:{websocket.client.host}"


# ============================================================================
# LIMITER INITIALIZATION
# ============================================================================

# Try to use Redis if available, otherwise fallback to memory
redis_url = os.environ.get("REDIS_URL")
storage_uri = redis_url if redis_url else "memory://"

limiter = Limiter(
    key_func=get_user_or_ip_key,
    storage_uri=storage_uri,
    default_limits=["60/minute"],  # Global fallback
    headers_enabled=True,  # Include rate limit headers in responses
)


def is_rate_limit_enabled() -> bool:
    """Check if rate limiting is enabled (not disabled via env var)"""
    return os.environ.get("DISABLE_RATE_LIMITING", "false").lower() != "true"
