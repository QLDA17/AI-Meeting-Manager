from typing import Dict, Any, List, Union
from src.providers.stt import WhisperProvider
from src.providers.phowhisper import PhowhisperProvider
from src.providers.google_stt import GoogleSTTProvider
import os

class STTService:
    """STT service coordinating Whisper or Phowhisper transcription."""
    
    def __init__(self, provider: Union[WhisperProvider, PhowhisperProvider, GoogleSTTProvider] = None):
        if provider:
            self.provider = provider
        elif os.getenv("LLM_PROVIDER") == "google":
            self.provider = GoogleSTTProvider()
        else:
            self.provider = WhisperProvider()

    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Convert audio file to transcript with segments."""
        return self.provider.transcribe(audio_path)
