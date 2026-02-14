"""
Security utilities for file system access and path validation
"""

import os
from pathlib import Path
from typing import Optional, Tuple

# ============================================================================
# ALLOWED DIRECTORIES CONFIGURATION
# ============================================================================

ALLOWED_DIRECTORIES = [
    "/tmp",  # Temp files
    "/app/data",  # Railway app data
    "./data",  # Local development
    "./storage",  # Project storage
    os.path.expanduser("~/eldoria-projects"),  # User projects
]

# Add environment-configured path if set
env_storage = os.environ.get("PROJECT_STORAGE_PATH")
if env_storage:
    ALLOWED_DIRECTORIES.append(env_storage)

# ============================================================================
# BLOCKED PATTERNS
# ============================================================================

BLOCKED_PATHS = [
    "/etc/passwd",
    "/etc/shadow",
    "/etc/hosts",
    "/root",
    "/home/*/.ssh",
    "/proc",
    "/sys",
    "/dev",
    "/bin",
    "/sbin",
    "/usr/bin",
    "/usr/sbin",
    "/boot",
    "/lib",
    "/lib64",
    "/opt",
    "/var/log",
    "../",  # Directory traversal
    "..\\",  # Windows traversal
]

BLOCKED_EXTENSIONS = [
    ".exe",
    ".dll",
    ".so",
    ".dylib",  # Executables
    ".sh",
    ".bash",
    ".zsh",  # Shell scripts
    ".py",
    ".pyc",  # Python (for safety)
    ".env",  # Environment files
]

# ============================================================================
# PATH VALIDATION FUNCTIONS
# ============================================================================


def is_path_allowed(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Check if a file path is allowed for access
    Returns: (is_allowed, error_message)
    """
    if not file_path:
        return False, "Path cannot be empty"

    # Normalize path
    try:
        normalized = os.path.normpath(os.path.abspath(file_path))
    except Exception as e:
        return False, f"Invalid path: {str(e)}"

    # Check for blocked patterns
    for blocked in BLOCKED_PATHS:
        if blocked.endswith("*"):
            # Wildcard pattern
            prefix = blocked.rstrip("*")
            if normalized.startswith(prefix):
                return False, f"Access to paths starting with {prefix} is not allowed"
        elif blocked in normalized:
            return False, f"Access to {blocked} is not allowed"

    # Check for directory traversal attempts
    if ".." in normalized or "../" in normalized or "..\\" in normalized:
        return False, "Directory traversal is not allowed"

    # Check if path is within allowed directories
    for allowed in ALLOWED_DIRECTORIES:
        if not allowed:
            continue
        try:
            allowed_abs = os.path.abspath(allowed)
            if normalized.startswith(allowed_abs):
                # Additional check: ensure it's not escaping via symlinks
                real_path = os.path.realpath(normalized)
                if real_path.startswith(allowed_abs):
                    return True, None
        except Exception:
            continue

    return False, f"Path must be within allowed directories: {ALLOWED_DIRECTORIES}"


def is_write_allowed(file_path: str) -> Tuple[bool, Optional[str]]:
    """
    Additional checks for write operations
    """
    # First do standard path check
    allowed, error = is_path_allowed(file_path)
    if not allowed:
        return False, error

    # Check file extension
    _, ext = os.path.splitext(file_path.lower())
    if ext in BLOCKED_EXTENSIONS:
        return False, f"Writing files with extension {ext} is not allowed"

    return True, None


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent directory traversal and dangerous characters
    """
    # Remove path separators
    sanitized = filename.replace("/", "").replace("\\", "")
    # Remove null bytes
    sanitized = sanitized.replace("\0", "")
    # Remove control characters
    sanitized = "".join(char for char in sanitized if ord(char) >= 32)
    # Remove dangerous characters
    sanitized = sanitized.replace("..", "")
    sanitized = sanitized.replace("~", "")
    # Strip whitespace
    sanitized = sanitized.strip()
    # Limit length
    if len(sanitized) > 255:
        sanitized = sanitized[:255]

    return sanitized


def ensure_safe_path(base_dir: str, relative_path: str) -> Tuple[str, Optional[str]]:
    """
    Create an absolute path that's guaranteed to be within base_dir
    Returns: (absolute_path, error_message)
    """
    # Sanitize the relative path
    safe_relative = sanitize_filename(relative_path)

    # Create absolute path
    try:
        full_path = os.path.abspath(os.path.join(base_dir, safe_relative))
        base_abs = os.path.abspath(base_dir)

        # Ensure it's within base_dir
        if not full_path.startswith(base_abs):
            return "", "Path escapes base directory"

        return full_path, None
    except Exception as e:
        return "", f"Path construction error: {str(e)}"


def is_railway_environment() -> bool:
    """Detect if running on Railway cloud platform"""
    return bool(
        os.environ.get("RAILWAY_PUBLIC_DOMAIN")
        or os.environ.get("RAILWAY_SERVICE_NAME")
        or os.environ.get("RAILWAY_ENVIRONMENT")
        or os.environ.get("RAILWAY_STATIC_URL")
    )


# ============================================================================
# FILE SIZE LIMITS
# ============================================================================

MAX_READ_SIZE = 10 * 1024 * 1024  # 10MB
MAX_WRITE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB


def check_file_size(
    file_path: str, max_size: int = MAX_READ_SIZE
) -> Tuple[bool, Optional[str]]:
    """Check if file size is within limits"""
    try:
        size = os.path.getsize(file_path)
        if size > max_size:
            return False, f"File too large ({size} bytes, max {max_size} bytes)"
        return True, None
    except Exception as e:
        return False, f"Cannot check file size: {str(e)}"


# ============================================================================
# SECURITY MIDDLEWARE HELPERS
# ============================================================================


class SecurityContext:
    """Context manager for security operations"""

    def __init__(self, user_id: str = None, operation: str = ""):
        self.user_id = user_id
        self.operation = operation
        self.start_time = None

    def __enter__(self):
        import time

        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time

        duration = time.time() - self.start_time
        # Log security event (you can customize this)
        if self.user_id:
            print(
                f"[SECURITY] User {self.user_id} completed {self.operation} in {duration:.2f}s"
            )
        else:
            print(f"[SECURITY] Anonymous completed {self.operation} in {duration:.2f}s")
