"""Meeting STT settings/runtime helpers."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, Optional


STT_CAPABILITIES: Dict[str, Dict[str, bool]] = {
    "deepgram": {"realtime": True, "deferred": True},
    "viwhisper": {"realtime": False, "deferred": True},
}

DEFAULT_STT_PROVIDER = "deepgram"
DEFAULT_TRANSCRIPTION_MODE = "realtime"

DEFAULT_TRANSCRIPTION_RUNTIME: Dict[str, Any] = {
    "provider": DEFAULT_STT_PROVIDER,
    "mode": DEFAULT_TRANSCRIPTION_MODE,
    "status": "idle",
    "stored_chunk_count": 0,
    "processed_chunk_count": 0,
    "last_error": None,
    "finalization_status": "pending",
}


def normalize_stt_provider(provider: Optional[str]) -> str:
    normalized = (provider or DEFAULT_STT_PROVIDER).strip().lower()
    return normalized if normalized in STT_CAPABILITIES else DEFAULT_STT_PROVIDER


def normalize_transcription_mode(provider: Optional[str], mode: Optional[str]) -> str:
    normalized_provider = normalize_stt_provider(provider)
    requested_mode = (mode or DEFAULT_TRANSCRIPTION_MODE).strip().lower()
    capabilities = STT_CAPABILITIES.get(normalized_provider, STT_CAPABILITIES[DEFAULT_STT_PROVIDER])
    if requested_mode == "realtime" and not capabilities.get("realtime", False):
        return "deferred"
    if requested_mode == "deferred" and capabilities.get("deferred", False):
        return "deferred"
    return DEFAULT_TRANSCRIPTION_MODE if capabilities.get(DEFAULT_TRANSCRIPTION_MODE, False) else "deferred"


def normalize_meeting_settings(settings: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    source = dict(settings or {})
    provider = normalize_stt_provider(source.get("sttProvider") or source.get("stt_provider"))
    mode = normalize_transcription_mode(provider, source.get("transcriptionMode") or source.get("transcription_mode"))

    runtime_source = dict(source.get("transcription_runtime") or source.get("transcriptionRuntime") or {})
    runtime = deepcopy(DEFAULT_TRANSCRIPTION_RUNTIME)
    runtime.update(runtime_source)
    runtime["provider"] = provider
    runtime["mode"] = mode
    runtime["status"] = str(runtime.get("status") or "idle").lower()
    runtime["stored_chunk_count"] = max(0, int(runtime.get("stored_chunk_count") or 0))
    runtime["processed_chunk_count"] = max(0, int(runtime.get("processed_chunk_count") or 0))
    runtime["finalization_status"] = str(runtime.get("finalization_status") or "pending").lower()

    normalized = {
        **source,
        "sttProvider": provider,
        "transcriptionMode": mode,
        "transcription_runtime": runtime,
    }
    normalized.pop("stt_provider", None)
    normalized.pop("transcription_mode", None)
    normalized.pop("transcriptionRuntime", None)
    return normalized


def get_meeting_settings(meeting: Any) -> Dict[str, Any]:
    return normalize_meeting_settings(getattr(meeting, "settings", None))


def get_transcription_runtime(meeting: Any) -> Dict[str, Any]:
    return get_meeting_settings(meeting).get("transcription_runtime", deepcopy(DEFAULT_TRANSCRIPTION_RUNTIME))


def merge_meeting_settings(
    current_settings: Optional[Dict[str, Any]],
    *,
    settings_updates: Optional[Dict[str, Any]] = None,
    runtime_updates: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    normalized = normalize_meeting_settings(current_settings)
    if settings_updates:
        normalized.update(settings_updates)
    if runtime_updates:
        runtime = dict(normalized.get("transcription_runtime") or DEFAULT_TRANSCRIPTION_RUNTIME)
        runtime.update(runtime_updates)
        normalized["transcription_runtime"] = runtime
    return normalize_meeting_settings(normalized)
