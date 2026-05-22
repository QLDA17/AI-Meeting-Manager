from src.api import _legacy_runtime as legacy

config = legacy.config
logger = legacy.logger
AUDIO_UPLOAD_DIR = legacy.AUDIO_UPLOAD_DIR
AVATAR_UPLOAD_DIR = legacy.AVATAR_UPLOAD_DIR
init_ai_services = legacy.init_ai_services


def get_cost_logger():
    return legacy.cost_logger


def get_adapter():
    return legacy.adapter
