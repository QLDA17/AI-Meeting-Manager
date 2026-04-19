from enum import Enum

class ProviderErrorCode(Enum):
    QUOTA_EXHAUSTED = "QUOTA_EXHAUSTED"
    RATE_LIMIT_HIT = "RATE_LIMIT_HIT"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND"
    INVALID_API_KEY = "INVALID_API_KEY"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    TIMEOUT = "TIMEOUT"

class ProviderError(Exception):
    def __init__(self, code: ProviderErrorCode, message: str, original_error: Exception = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.original_error = original_error
