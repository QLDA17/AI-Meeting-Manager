from typing import Dict, Any, List, Union
import os
import logging

logger = logging.getLogger(__name__)

class STTService:
    """STT service coordinating Whisper, Phowhisper, Deepgram, or Google transcription."""

    def __init__(self, provider=None):
        if provider and not isinstance(provider, str):
            # provider is an instance
            self.provider = provider
        else:
            stt_provider = (provider or os.getenv("STT_PROVIDER", "deepgram")).lower()
            if stt_provider == "deepgram":
                from src.providers.deepgram import DeepgramProvider
                self.provider = DeepgramProvider()
            elif stt_provider == "phowhisper":
                from src.providers.phowhisper import PhowhisperProvider
                self.provider = PhowhisperProvider()
            elif stt_provider == "viwhisper":
                from src.providers.viwhisper import ViWhisperProvider
                self.provider = ViWhisperProvider()
            elif stt_provider == "google":
                try:
                    from src.providers.google_stt import GoogleSTTProvider
                    self.provider = GoogleSTTProvider()
                except ImportError as e:
                    logger.warning(f"Google STT not available ({e}), falling back to Deepgram")
                    from src.providers.deepgram import DeepgramProvider
                    self.provider = DeepgramProvider()
            else:
                # Default fallback
                try:
                    from src.providers.stt import WhisperProvider
                    self.provider = WhisperProvider()
                except ImportError:
                    from src.providers.deepgram import DeepgramProvider
                    self.provider = DeepgramProvider()

    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Convert audio file to transcript with segments."""
        return self.provider.transcribe(audio_path)
