import os
import logging
from typing import List, Dict, Any

try:
    from pyannote.audio import Pipeline
    HAS_PYANNOTE = True
except ImportError:
    HAS_PYANNOTE = False

logger = logging.getLogger(__name__)

class PyannoteDiarizationProvider:
    """Pyannote diarization adapter with fallback."""
    
    def __init__(self, auth_token: str = None):
        self.auth_token = auth_token or os.getenv("HUGGINGFACE_TOKEN")
        self.pipeline = None
        if HAS_PYANNOTE and self.auth_token:
            try:
                self.pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=self.auth_token
                )
                logger.info("Loaded Pyannote pipeline.")
            except Exception as e:
                logger.warning(f"Failed to load Pyannote: {e}. Falling back to mock.")
        else:
            logger.warning("Pyannote or auth token not available. Falling back to mock.")

    def diarize(self, audio_path: str) -> List[Dict[str, Any]]:
        """Perform speaker diarization."""
        if self.pipeline:
            try:
                diarization = self.pipeline(audio_path)
                segments = []
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    segments.append({
                        "start": turn.start,
                        "end": turn.end,
                        "speaker": speaker
                    })
                return segments
            except Exception as e:
                logger.error(f"Pyannote diarization failed: {e}")

        # Fallback Mock
        logger.info("Using mock Diarization fallback.")
        return [
            {"start": 0.0, "end": 2.0, "speaker": "SPEAKER_00"},
            {"start": 2.0, "end": 5.0, "speaker": "SPEAKER_01"}
        ]
