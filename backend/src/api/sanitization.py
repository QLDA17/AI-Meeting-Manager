import re
from typing import Any, Dict, List, Optional, Union


def sanitize_input(value: Any, max_length: int = 255) -> str:
    if value is None:
        return ""
    s = str(value).strip()
    if len(s) > max_length:
        s = s[:max_length]
    return s


def sanitize_html(value: str) -> str:
    dangerous_chars = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "/": "&#x2F;",
    }
    for char, escaped in dangerous_chars.items():
        value = value.replace(char, escaped)
    return value


def sanitize_sql(value: str) -> str:
    dangerous_patterns = [
        r"(\bOR\b.*=.*)",
        r"(\bUNION\b)",
        r"(\bSELECT\b)",
        r"(\bINSERT\b)",
        r"(\bDELETE\b)",
        r"(\bDROP\b)",
        r"(--)",
        r"(;)",
    ]
    for pattern in dangerous_patterns:
        value = re.sub(pattern, "", value, flags=re.IGNORECASE)
    return value


def is_safe_filename(filename: str) -> bool:
    dangerous_chars = ["/", "\\", "..", ":", "*", "?", '"', "<", ">", "|"]
    for char in dangerous_chars:
        if char in filename:
            return False
    return True


def sanitize_filename(filename: str) -> str:
    filename = re.sub(r"[^\w\s\-\.]", "", filename)
    filename = filename.strip()
    if not filename:
        filename = "unnamed"
    return filename[:255]
