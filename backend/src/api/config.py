"""
Configuration validation and management for MultiMinutes AI.
Validates environment variables and provides typed config access.
"""
import os
import sys
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(BACKEND_ENV_PATH)


class ConfigError(Exception):
    """Raised when required configuration is missing"""
    pass


@dataclass
class DatabaseConfig:
    """Database configuration"""
    url: str
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False
    use_ssl: bool = False
    ssl_ca: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> "DatabaseConfig":
        return cls(
            url=os.getenv("DATABASE_URL", "sqlite:///./multiminutes.db"),
            pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
            pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "3600")),
            echo=os.getenv("DB_ECHO", "false").lower() == "true",
            use_ssl=os.getenv("DB_USE_SSL", "false").lower() == "true",
            ssl_ca=os.getenv("DB_SSL_CA"),
        )


@dataclass
class AIConfig:
    """AI/ML provider configuration"""
    provider: str = "google"  # "google", "openai", "anthropic"
    google_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-flash"
    whisper_model: str = "base"
    deepgram_api_key: Optional[str] = None
    deepgram_model: str = "nova-3"
    deepgram_language: str = "vi"
    phobert_enabled: bool = False
    phobert_model: str = "vinai/phobert-base"
    phobert_device: str = "auto"
    phobert_dialect_enabled: bool = True
    phobert_mlm_correction_enabled: bool = False
    phobert_max_length: int = 256
    temperature: float = 0.2
    max_retries: int = 3
    
    @classmethod
    def from_env(cls) -> "AIConfig":
        return cls(
            provider=os.getenv("LLM_PROVIDER", "google"),
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
            whisper_model=os.getenv("WHISPER_MODEL", "base"),
            deepgram_api_key=os.getenv("DEEPGRAM_API_KEY"),
            deepgram_model=os.getenv("DEEPGRAM_MODEL", "nova-3"),
            deepgram_language=os.getenv("DEEPGRAM_LANGUAGE", "vi"),
            phobert_enabled=os.getenv("PHOBERT_ENABLED", "false").lower() == "true",
            phobert_model=os.getenv("PHOBERT_MODEL", "vinai/phobert-base"),
            phobert_device=os.getenv("PHOBERT_DEVICE", "auto"),
            phobert_dialect_enabled=os.getenv("PHOBERT_DIALECT_ENABLED", "true").lower() == "true",
            phobert_mlm_correction_enabled=os.getenv("PHOBERT_MLM_CORRECTION_ENABLED", "false").lower() == "true",
            phobert_max_length=int(os.getenv("PHOBERT_MAX_LENGTH", "256")),
            temperature=float(os.getenv("AI_TEMPERATURE", "0.2")),
            max_retries=int(os.getenv("AI_MAX_RETRIES", "3")),
        )
    
    def validate(self) -> List[str]:
        """Validate AI configuration, return list of errors"""
        errors = []
        
        # In development, missing keys are just warnings, but in production they are errors
        env = os.getenv("ENVIRONMENT", "development")
        
        if self.provider == "google" and not self.google_api_key:
            if env == "production":
                errors.append("GOOGLE_API_KEY required when LLM_PROVIDER=google")
            else:
                logger.warning("GOOGLE_API_KEY is missing. AI features will be disabled.")
        elif self.provider == "openai" and not self.openai_api_key:
            if env == "production":
                errors.append("OPENAI_API_KEY required when LLM_PROVIDER=openai")
            else:
                logger.warning("OPENAI_API_KEY is missing. AI features will be disabled.")
        elif self.provider == "anthropic" and not self.anthropic_api_key:
            if env == "production":
                errors.append("ANTHROPIC_API_KEY required when LLM_PROVIDER=anthropic")
            else:
                logger.warning("ANTHROPIC_API_KEY is missing. AI features will be disabled.")
        
        if self.temperature < 0 or self.temperature > 2:
            errors.append("AI_TEMPERATURE must be between 0 and 2")
        
        if self.max_retries < 0:
            errors.append("AI_MAX_RETRIES must be non-negative")

        if self.phobert_device not in {"auto", "cpu", "cuda"}:
            errors.append("PHOBERT_DEVICE must be one of: auto, cpu, cuda")

        if self.phobert_max_length <= 0:
            errors.append("PHOBERT_MAX_LENGTH must be positive")
        
        return errors


@dataclass
class ServerConfig:
    """Server/application configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    reload: bool = False
    workers: int = 1
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    cors_credentials: bool = True
    request_timeout: int = 300  # 5 minutes
    max_upload_size: int = 50 * 1024 * 1024  # 50MB
    
    @classmethod
    def from_env(cls) -> "ServerConfig":
        return cls(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            debug=os.getenv("DEBUG", "false").lower() == "true",
            reload=os.getenv("RELOAD", "false").lower() == "true",
            workers=int(os.getenv("WORKERS", "1")),
            cors_origins=os.getenv("CORS_ORIGINS", "*").split(","),
            cors_credentials=os.getenv("CORS_CREDENTIALS", "true").lower() == "true",
            request_timeout=int(os.getenv("REQUEST_TIMEOUT", "300")),
            max_upload_size=int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024))),
        )


@dataclass
class CostConfig:
    """Cost tracking configuration"""
    monthly_limit_usd: float = 10.0
    daily_limit_usd: float = 1.0
    alert_threshold: float = 0.8  # 80% alert
    enabled: bool = True
    
    @classmethod
    def from_env(cls) -> "CostConfig":
        return cls(
            monthly_limit_usd=float(os.getenv("COST_MONTHLY_LIMIT", "10.0")),
            daily_limit_usd=float(os.getenv("COST_DAILY_LIMIT", "1.0")),
            alert_threshold=float(os.getenv("COST_ALERT_THRESHOLD", "0.8")),
            enabled=os.getenv("COST_TRACKING_ENABLED", "true").lower() == "true",
        )


@dataclass
class AppConfig:
    """Main application configuration"""
    # Sub-configs
    database: DatabaseConfig = field(default_factory=DatabaseConfig.from_env)
    ai: AIConfig = field(default_factory=AIConfig.from_env)
    server: ServerConfig = field(default_factory=ServerConfig.from_env)
    cost: CostConfig = field(default_factory=CostConfig.from_env)
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    testing: bool = os.getenv("TESTING", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    secret_key: Optional[str] = os.getenv("SECRET_KEY")
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        errors = []
        
        # Check AI config
        ai_errors = self.ai.validate()
        errors.extend(ai_errors)
        
        # Validate secret key in production
        if self.environment == "production" and not self.secret_key:
            errors.append("SECRET_KEY required in production")
        
        # Validate log level
        if self.log_level.upper() not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            errors.append(f"Invalid LOG_LEVEL: {self.log_level}")
        
        if errors:
            raise ConfigError("\n".join(errors))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary (for logging/debugging)"""
        return {
            "environment": self.environment,
            "log_level": self.log_level,
            "database": {
                "url": self.database.url.split("@")[0] if "@" in self.database.url else self.database.url,  # Hide credentials
                "pool_size": self.database.pool_size,
                "echo": self.database.echo,
            },
            "ai": {
                "provider": self.ai.provider,
                "model": self.ai.gemini_model if self.ai.provider == "google" else self.ai.openai_api_key[:10] + "..." if self.ai.openai_api_key else None,
                "temperature": self.ai.temperature,
                "phobert_enabled": self.ai.phobert_enabled,
                "phobert_model": self.ai.phobert_model,
            },
            "server": {
                "host": self.server.host,
                "port": self.server.port,
                "debug": self.server.debug,
            },
        }


def get_config() -> AppConfig:
    """Get validated application configuration"""
    try:
        config = AppConfig()
        logger.info("Configuration validated successfully", extra=config.to_dict())
        return config
    except ConfigError as e:
        logger.error(f"Configuration error: {e}")
        print(f"\n❌ Configuration Error:\n{e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected config error: {e}")
        raise


# Global config instance (initialize lazily)
_config: Optional[AppConfig] = None


def init_config() -> AppConfig:
    """Initialize and return global config"""
    global _config
    if _config is None:
        _config = get_config()
    return _config


def get() -> AppConfig:
    """Get current config (initializes if needed)"""
    return init_config()
