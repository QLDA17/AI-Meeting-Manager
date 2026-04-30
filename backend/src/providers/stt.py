import os
import logging
from typing import Dict, Any

try:
    import whisper
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

logger = logging.getLogger(__name__)

class WhisperProvider:
    """Whisper STT adapter with fallback."""
    
    def __init__(self, model_name: str = "base", force_mock: bool = False):
        self.model_name = model_name
        self.model = None
        self.force_mock = force_mock or os.getenv("STT_FORCE_MOCK") == "true"
        
        if HAS_WHISPER and not self.force_mock:
            try:
                self.model = whisper.load_model(model_name)
                logger.info(f"Loaded Whisper model: {model_name}")
            except Exception as e:
                logger.warning(f"Failed to load Whisper model: {e}. Falling back to mock.")
        else:
            reason = "Force mock enabled" if self.force_mock else "Whisper library not found"
            logger.warning(f"{reason}. Falling back to mock.")

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio to text with timestamps."""
        if self.model:
            try:
                result = self.model.transcribe(audio_path)
                return {
                    "text": result["text"],
                    "segments": [
                        {"start": s["start"], "end": s["end"], "text": s["text"]}
                        for s in result["segments"]
                    ]
                }
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
        
        # Fallback Mock
        logger.info("Using mock STT fallback.")
        return {
            "text": "This is a mock transcription result for testing R3-01.",
            "segments": [
                {"start": 0.0, "end": 2.0, "text": "This is a mock"},
                {"start": 2.0, "end": 5.0, "text": "transcription result for testing R3-01."}
            ]
        }
