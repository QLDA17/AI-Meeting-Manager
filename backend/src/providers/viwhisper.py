import os
import logging
from typing import Dict, Any

try:
    from transformers import pipeline
    import torch
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False

logger = logging.getLogger(__name__)

class ViWhisperProvider:
    """ViWhisper (Vietnamese fine-tuned Whisper) STT adapter with lazy loading."""

    def __init__(self, model_id: str = "NhutP/ViWhisper-small", force_mock: bool = False):
        self.model_id = model_id
        self.pipe = None
        self._loaded = False
        self.force_mock = force_mock or os.getenv("STT_FORCE_MOCK") == "true"

        if not HAS_TRANSFORMERS:
            logger.warning("Transformers library not found. Falling back to mock.")
        elif self.force_mock:
            logger.warning("Force mock enabled. Falling back to mock.")

    def _ensure_loaded(self):
        """Lazy load model on first transcription request."""
        if self._loaded or self.force_mock:
            return
        self._loaded = True
        if not HAS_TRANSFORMERS:
            return
        try:
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading ViWhisper model: {self.model_id} on {device}...")
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self.model_id,
                device=device
            )
            logger.info(f"ViWhisper model loaded successfully on {device}")
        except Exception as e:
            logger.warning(f"Failed to load ViWhisper: {e}. Falling back to mock.")

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio via ViWhisper."""
        self._ensure_loaded()
        if self.pipe:
            try:
                logger.info(f"Transcribing audio with ViWhisper: {audio_path}")
                result = self.pipe(audio_path, return_timestamps=False)
                text = str(result.get("text", "")).strip()
                logger.info(f"ViWhisper result: {text[:100]}")
                return {
                    "text": text,
                    "segments": []
                }
            except Exception as e:
                logger.error(f"ViWhisper transcription failed: {type(e).__name__}: {e}", exc_info=True)

        # Fallback Mock
        logger.warning("Using mock ViWhisper fallback.")
        return {
            "text": "Đây là kết quả nhận dạng từ ViWhisper giả lập.",
            "segments": [
                {"start": 0.0, "end": 2.5, "text": "Đây là kết quả nhận dạng"},
                {"start": 2.5, "end": 5.0, "text": "từ ViWhisper giả lập."}
            ]
        }
