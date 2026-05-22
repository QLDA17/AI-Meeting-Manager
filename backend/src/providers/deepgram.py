import os
import logging
from typing import Dict, Any, Optional

try:
    from deepgram import DeepgramClient
    HAS_DEEPGRAM = True
except ImportError:
    HAS_DEEPGRAM = False

logger = logging.getLogger(__name__)

# Deepgram Nova-3 pricing: ~$0.0043/min = $0.0000717/sec
_COST_PER_SECOND = 0.0000717

class DeepgramProvider:
    """Deepgram cloud STT provider for Vietnamese."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPGRAM_API_KEY is required")
        if not HAS_DEEPGRAM:
            raise ImportError("deepgram-sdk not installed: pip install deepgram-sdk")
        self.client = DeepgramClient(api_key=self.api_key)
        self.last_duration_seconds = 0.0
        self.last_model = ""

    def transcribe(self, audio_path: str, model: str = None) -> Dict[str, Any]:
        """Transcribe audio file via Deepgram API.

        Args:
            audio_path: Path to audio file (supports: mp3, wav, webm, flac, ogg, m4a)
            model: Deepgram model to use. Default: nova-3. Options: nova-3, nova-2
        """
        try:
            model = model or os.getenv("DEEPGRAM_MODEL", "nova-3")

            with open(audio_path, "rb") as audio:
                source = audio.read()

            # Deepgram SDK v7 - pass options as keyword arguments
            # Force Vietnamese language
            response = self.client.listen.v1.media.transcribe_file(
                request=source,
                model=model,
                language="vi",
                smart_format=True,
                punctuate=True,
                diarize=True,
                utterances=True,
                paragraphs=True,
                filler_words=True,
            )

            # Extract usage metadata
            duration_seconds = 0.0
            try:
                if hasattr(response, 'metadata') and response.metadata:
                    duration_seconds = float(getattr(response.metadata, 'duration', 0) or 0)
            except Exception:
                pass
            self.last_duration_seconds = duration_seconds
            self.last_model = model

            results = response.results
            transcript = results.channels[0].alternatives[0].transcript

            # Chuyen doi segments theo format chuan cua he thong
            segments = []
            utterances = results.utterances
            if utterances:
                for utt in utterances:
                    segments.append({
                        "start": utt.start,
                        "end": utt.end,
                        "text": utt.transcript,
                        "speaker": f"Speaker {utt.speaker}" if hasattr(utt, "speaker") else None,
                    })
            else:
                # Fallback: dung words neu khong co utterances
                words = results.channels[0].alternatives[0].words
                if words:
                    current_text = []
                    current_speaker = None
                    seg_start = words[0].start
                    prev_end = words[0].end
                    for w in words:
                        word_speaker = getattr(w, "speaker", None)
                        # Tach segment khi doi speaker hoac du 5 giay
                        if current_text and (
                            (word_speaker is not None and word_speaker != current_speaker)
                            or (w.end - seg_start >= 5.0)
                        ):
                            seg = {
                                "start": seg_start,
                                "end": prev_end,
                                "text": " ".join(current_text),
                            }
                            if current_speaker is not None:
                                seg["speaker"] = f"Speaker {current_speaker}"
                            segments.append(seg)
                            current_text = []
                            seg_start = w.end
                        current_text.append(w.word)
                        if word_speaker is not None:
                            current_speaker = word_speaker
                        prev_end = w.end
                    if current_text:
                        seg = {
                            "start": seg_start,
                            "end": words[-1].end,
                            "text": " ".join(current_text),
                        }
                        if current_speaker is not None:
                            seg["speaker"] = f"Speaker {current_speaker}"
                        segments.append(seg)

            return {
                "text": transcript,
                "segments": segments,
                "duration_seconds": duration_seconds,
                "model": model,
            }

        except Exception as e:
            logger.error(f"Deepgram transcription failed: {e}", exc_info=True)
            return {
                "text": "",
                "segments": [],
                "error": str(e),
            }
