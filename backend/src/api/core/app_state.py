"""Application state: config, logger, directories, and lazy AI service initialization."""

import os

from src.api.config import get_config
from src.api.logging_middleware import setup_logging

config = get_config()
setup_logging(log_level=config.log_level, json_format=config.environment == "production")

import logging
logger = logging.getLogger(__name__)
logger.info("Logging initialized", extra=config.to_dict())

AUDIO_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "audio")
AVATAR_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars")

cost_logger = None
adapter = None


def init_ai_services():
    """Lazy initialization of AI services (called on first use)"""
    global cost_logger, adapter
    if cost_logger is None or adapter is None:
        try:
            from src.cost.cost_logger import CostLogger
            from src.providers.google_llm import GoogleLLMAdapter
            cost_logger = CostLogger(monthly_hard_limit_usd=config.cost.monthly_limit_usd)
            adapter = GoogleLLMAdapter(cost_logger=cost_logger)
            logger.info("AI services initialized")
        except Exception as e:
            logger.error(f"Failed to initialize AI services: {e}")
            cost_logger = False
            adapter = False


def get_cost_logger():
    return cost_logger


def get_adapter():
    return adapter
