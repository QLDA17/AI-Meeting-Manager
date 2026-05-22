from src.api import _legacy_runtime as legacy

ADMIN_PROMPTS = legacy.ADMIN_PROMPTS
ADMIN_SYSTEM_SETTINGS = legacy.ADMIN_SYSTEM_SETTINGS
ADMIN_BROADCAST_HISTORY = legacy.ADMIN_BROADCAST_HISTORY
MAX_ADMIN_AUDIT_LOGS = legacy.MAX_ADMIN_AUDIT_LOGS

_load_admin_settings = legacy._load_admin_settings
_save_admin_settings = legacy._save_admin_settings
_load_admin_prompts = legacy._load_admin_prompts
_save_admin_prompts = legacy._save_admin_prompts
ensure_audit_log_table = legacy.ensure_audit_log_table
append_admin_audit_log = legacy.append_admin_audit_log
