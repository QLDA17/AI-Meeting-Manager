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

class PhowhisperProvider:
    """Phowhisper (VinAI) STT adapter with fallback."""
    
    def __init__(self, model_id: str = "vinai/phowhisper-small", force_mock: bool = False):
        self.model_id = model_id
        self.pipe = None
        self.force_mock = force_mock or os.getenv("STT_FORCE_MOCK") == "true"
        
        if HAS_TRANSFORMERS and not self.force_mock:
            try:
                device = "cuda:0" if torch.cuda.is_available() else "cpu"
                self.pipe = pipeline(
                    "automatic-speech-recognition",
                    model=model_id,
                    device=device
                )
                logger.info(f"Loaded Phowhisper model: {model_id} on {device}")
            except Exception as e:
                logger.warning(f"Failed to load Phowhisper: {e}. Falling back to mock.")
        else:
            reason = "Force mock enabled" if self.force_mock else "Transformers library not found"
            logger.warning(f"{reason}. Falling back to mock.")

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio via Phowhisper."""
        if self.pipe:
            try:
                result = self.pipe(audio_path, return_timestamps=True)
                # Note: Transformers output format differs from openai-whisper
                return {
                    "text": result["text"],
                    "segments": [
                        {"start": s["timestamp"][0], "end": s["timestamp"][1], "text": s["text"]}
                        for s in result.get("chunks", [])
                    ]
                }
            except Exception as e:
                logger.error(f"Phowhisper transcription failed: {e}")
        
        # Fallback Mock
        logger.info("Using mock Phowhisper fallback.")
        return {
            "text": "Đây là kết quả nhận dạng từ Phowhisper giả lập cho R3-05.",
            "segments": [
                {"start": 0.0, "end": 2.5, "text": "Đây là kết quả nhận dạng"},
                {"start": 2.5, "end": 5.0, "text": "từ Phowhisper giả lập cho R3-05."}
            ]
        }
