from typing import Dict, Any
import os
import logging

logger = logging.getLogger(__name__)

class STTService:
    """STT service coordinating the supported transcription providers."""

    def __init__(self, provider=None):
        if provider and not isinstance(provider, str):
            # provider is an instance
            self.provider = provider
        else:
            stt_provider = (provider or os.getenv("STT_PROVIDER", "deepgram")).lower()
            if stt_provider == "deepgram":
                from src.providers.deepgram import DeepgramProvider
                self.provider = DeepgramProvider()
            elif stt_provider == "viwhisper":
                from src.providers.viwhisper import ViWhisperProvider
                self.provider = ViWhisperProvider()
            else:
                logger.warning("Unsupported STT provider '%s', falling back to Deepgram", stt_provider)
                from src.providers.deepgram import DeepgramProvider
                self.provider = DeepgramProvider()

    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Convert audio file to transcript with segments."""
        return self.provider.transcribe(audio_path)
