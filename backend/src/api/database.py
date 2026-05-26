"""
Database connection and session management for MultiMinutes AI.
Hardened with connection pooling, retry logic, and monitoring.
"""
import os
import time
import logging
from pathlib import Path
from typing import Generator, Optional
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(BACKEND_ENV_PATH)

logger = logging.getLogger(__name__)

# Database configuration
DEFAULT_DB_URL = "sqlite:///./multiminutes.db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB_URL)

# Connection pool settings
POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))
MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "20"))
POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "3600"))  # 1 hour

# Retry settings
DB_RETRY_ATTEMPTS = int(os.getenv("DB_RETRY_ATTEMPTS", "3"))
DB_RETRY_DELAY = int(os.getenv("DB_RETRY_DELAY", "2"))

# Determine DB dialect
is_sqlite = DATABASE_URL.startswith("sqlite")
is_mysql = DATABASE_URL.startswith("mysql")

# Connection arguments based on dialect
connect_args = {}
if is_sqlite:
    connect_args = {"check_same_thread": False}
elif is_mysql:
    # MySQL-specific settings
    connect_args = {
        "charset": "utf8mb4",
        "autocommit": False,
    }
    # Add SSL if configured
    if os.getenv("DB_USE_SSL", "false").lower() == "true":
        connect_args["ssl"] = {"ca": os.getenv("DB_SSL_CA")}

# Create engine with pooling (SQLite uses StaticPool internally, pool params ignored)
engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "echo": os.getenv("DB_ECHO", "false").lower() == "true",
}
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": POOL_SIZE,
        "max_overflow": MAX_OVERFLOW,
        "pool_timeout": POOL_TIMEOUT,
        "pool_recycle": POOL_RECYCLE,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

# SQLite pragmas for better concurrency
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=1000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.close()

# MySQL session variables for better performance
@event.listens_for(engine, "connect")
def set_mysql_session(dbapi_connection, connection_record):
    if is_mysql:
        cursor = dbapi_connection.cursor()
        cursor.execute("SET SESSION wait_timeout=28800")
        cursor.execute("SET SESSION interactive_timeout=28800")
        cursor.execute("SET SESSION sql_mode='STRICT_TRANS_TABLES'")
        cursor.close()

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,  # Keep objects accessible after commit
)

Base = declarative_base()

@retry(
    stop=stop_after_attempt(DB_RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=DB_RETRY_DELAY, max=10),
    retry=retry_if_exception_type((OperationalError, DisconnectionError)),
    reraise=True,
)
def get_db_with_retry() -> Session:
    """Get database session with retry logic"""
    db = SessionLocal()
    try:
        # Test connection
        db.execute(text("SELECT 1"))
        return db
    except Exception as e:
        db.close()
        logger.error(f"Database connection failed: {e}")
        raise

def get_db() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI routes.
    Yields a database session with automatic cleanup.
    """
    db = SessionLocal()
    try:
        # Test connection health
        db.execute(text("SELECT 1"))
        yield db
    except OperationalError as e:
        logger.error(f"Database operational error: {e}")
        db.close()
        raise
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.close()
        raise
    finally:
        db.close()

def health_check() -> dict:
    """
    Check database health and return status.
    Returns: dict with status, connection count, and pool info
    """
    try:
        db = SessionLocal()
        start = time.time()
        db.execute(text("SELECT 1"))
        latency = (time.time() - start) * 1000  # ms
        
        pool = engine.pool
        status = {
            "status": "healthy",
            "latency_ms": round(latency, 2),
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "dialect": "mysql" if is_mysql else "sqlite",
        }
        db.close()
        return status
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }

def close_db_connections():
    """Close all database connections (for shutdown)"""
    engine.dispose()
    logger.info("Database connections closed")
