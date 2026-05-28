import os
import logging
from typing import Dict, Any, List, Optional

try:
    from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _offline_mode_enabled() -> bool:
    return _env_flag("HF_HUB_OFFLINE") or _env_flag("TRANSFORMERS_OFFLINE")


class ViWhisperUnavailableError(RuntimeError):
    """Raised when ViWhisper is selected but the real model is unavailable."""


class ViWhisperProvider:
    """ViWhisper (Vietnamese fine-tuned Whisper) STT adapter with lazy loading."""

    def __init__(self, model_id: str = "NhutP/ViWhisper-small", force_mock: bool = False):
        self.model_id = os.getenv("VIWHISPER_MODEL_ID", model_id)
        self.pipe = None
        self._loaded = False
        self.force_mock = force_mock or _env_flag("STT_FORCE_MOCK")
        self.local_files_only = _env_flag("VIWHISPER_LOCAL_FILES_ONLY", default=_offline_mode_enabled())
        self._load_error: str | None = None

        if not HAS_TRANSFORMERS:
            logger.warning("Transformers library not found for ViWhisper.")
        elif self.force_mock:
            logger.warning("Force mock enabled for ViWhisper.")

    def _ensure_loaded(self):
        """Lazy load model on first transcription request."""
        if self.force_mock:
            return
        if self.pipe is not None:
            return
        if self._loaded and self._load_error:
            raise ViWhisperUnavailableError(self._load_error)
        self._loaded = True
        if not HAS_TRANSFORMERS:
            self._load_error = (
                "ViWhisper unavailable: missing 'transformers' runtime in backend environment."
            )
            raise ViWhisperUnavailableError(self._load_error)
        try:
            device = 0 if torch.cuda.is_available() else -1
            device_label = "cuda:0" if device == 0 else "cpu"
            model_device = "cuda:0" if device == 0 else "cpu"
            logger.info(f"Loading ViWhisper model: {self.model_id} on {device_label}...")
            model = AutoModelForSpeechSeq2Seq.from_pretrained(
                self.model_id,
                local_files_only=self.local_files_only,
            )
            processor = AutoProcessor.from_pretrained(
                self.model_id,
                local_files_only=self.local_files_only,
            )
            model.to(model_device)
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=model,
                tokenizer=processor.tokenizer,
                feature_extractor=processor.feature_extractor,
                device=device,
            )
            logger.info(f"ViWhisper model loaded successfully on {device_label}")
        except Exception as e:
            hint = (
                " Set VIWHISPER_MODEL_ID to a local model path and VIWHISPER_LOCAL_FILES_ONLY=true"
                if not self.local_files_only
                else " Check the configured local model path in VIWHISPER_MODEL_ID"
            )
            self._load_error = f"ViWhisper unavailable: failed to load model '{self.model_id}'. {e}.{hint}"
            logger.warning(self._load_error)
            raise ViWhisperUnavailableError(self._load_error) from e

    def _build_segments(
        self,
        chunks: Any,
        *,
        language: Optional[str] = "vi",
    ) -> List[Dict[str, Any]]:
        segments: List[Dict[str, Any]] = []
        for index, chunk in enumerate(chunks or []):
            if not isinstance(chunk, dict):
                continue
            text = str(chunk.get("text") or "").strip()
            if not text:
                continue
            timestamp = chunk.get("timestamp") or chunk.get("timestamps")
            start = end = None
            if isinstance(timestamp, (list, tuple)) and len(timestamp) >= 2:
                raw_start, raw_end = timestamp[0], timestamp[1]
                start = float(raw_start) if raw_start is not None else None
                end = float(raw_end) if raw_end is not None else None
            if start is None:
                start = float(index * 5)
            if end is None or end <= start:
                end = start + 5.0
            segments.append({
                "start": start,
                "end": end,
                "text": text,
                "language": language,
            })
        return segments

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio via ViWhisper."""
        if self.force_mock:
            logger.warning("Using mock ViWhisper fallback.")
            return {
                "text": "Đây là kết quả nhận dạng từ ViWhisper giả lập.",
                "segments": [
                    {"start": 0.0, "end": 2.5, "text": "Đây là kết quả nhận dạng"},
                    {"start": 2.5, "end": 5.0, "text": "từ ViWhisper giả lập."}
                ]
            }

        self._ensure_loaded()
        if self.pipe is None:
            raise ViWhisperUnavailableError(self._load_error or "ViWhisper unavailable")

        try:
            logger.info(f"Transcribing audio with ViWhisper: {audio_path}")
            result = self.pipe(audio_path, return_timestamps=True)
            text = str(result.get("text", "")).strip()
            segments = self._build_segments(result.get("chunks"), language="vi")
            if text and not segments:
                segments = [{
                    "start": 0.0,
                    "end": 5.0,
                    "text": text,
                    "language": "vi",
                }]
            logger.info(f"ViWhisper result: {text[:100]}")
            return {
                "text": text,
                "segments": segments,
            }
        except Exception as e:
            logger.error(f"ViWhisper transcription failed: {type(e).__name__}: {e}", exc_info=True)
            raise ViWhisperUnavailableError(f"ViWhisper transcription failed: {e}") from e
