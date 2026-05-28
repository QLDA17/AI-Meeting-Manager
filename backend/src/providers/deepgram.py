import os
import logging
from typing import Dict, Any, Optional, List

try:
    from deepgram import DeepgramClient
    HAS_DEEPGRAM = True
except ImportError:
    HAS_DEEPGRAM = False

logger = logging.getLogger(__name__)

# Deepgram Nova-3 pricing: ~$0.0043/min = $0.0000717/sec
_COST_PER_SECOND = 0.0000717


def _read_attr(value: Any, key: str, default: Any = None) -> Any:
    if value is None:
        return default
    if isinstance(value, dict):
        return value.get(key, default)
    return getattr(value, key, default)


def _confidence_stats(alternative: Any, low_threshold: float = 0.6) -> Dict[str, Any]:
    """Aggregate per-word confidence into summary stats.

    Returns ``avg_confidence``, ``min_confidence`` and ``low_conf_word_ratio``
    (fraction of words below ``low_threshold``). The alternative-level
    ``confidence`` is included as ``alternative_confidence`` for reference.
    Empty / missing data yields ``None`` values rather than zeros so
    downstream code can distinguish "no data" from "all bad".
    """

    stats: Dict[str, Any] = {
        "alternative_confidence": _to_float(_read_attr(alternative, "confidence")),
        "avg_confidence": None,
        "min_confidence": None,
        "low_conf_word_ratio": None,
        "word_count": 0,
        "low_conf_word_count": 0,
    }
    words = _read_attr(alternative, "words", []) or []
    confidences: List[float] = []
    low_count = 0
    for word in words:
        value = _to_float(_read_attr(word, "confidence"))
        if value is None:
            continue
        confidences.append(value)
        if value < low_threshold:
            low_count += 1
    if confidences:
        stats["word_count"] = len(confidences)
        stats["low_conf_word_count"] = low_count
        stats["avg_confidence"] = round(sum(confidences) / len(confidences), 4)
        stats["min_confidence"] = round(min(confidences), 4)
        stats["low_conf_word_ratio"] = round(low_count / len(confidences), 4)
    return stats


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if result != result:  # NaN
        return None
    return result


def _collect_alternative(results: Any) -> Any:
    channels = _read_attr(results, "channels", []) or []
    first_channel = channels[0] if channels else None
    alternatives = _read_attr(first_channel, "alternatives", []) or []
    return alternatives[0] if alternatives else None


def _extract_transcript(results: Any, alternative: Any) -> str:
    transcript = str(_read_attr(alternative, "transcript", "") or "").strip()
    if transcript:
        return transcript
    utterances = _read_attr(results, "utterances", []) or []
    utterance_texts = [str(_read_attr(item, "transcript", "") or "").strip() for item in utterances]
    return " ".join(text for text in utterance_texts if text).strip()


def _extract_segments(results: Any, alternative: Any) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    utterances = _read_attr(results, "utterances", []) or []
    if utterances:
        for utterance in utterances:
            text = str(_read_attr(utterance, "transcript", "") or "").strip()
            if not text:
                continue
            speaker = _read_attr(utterance, "speaker")
            segments.append({
                "start": float(_read_attr(utterance, "start", 0) or 0),
                "end": float(_read_attr(utterance, "end", 0) or 0),
                "text": text,
                "speaker": f"Speaker {speaker}" if speaker is not None else None,
            })
        if segments:
            return segments

    words = _read_attr(alternative, "words", []) or []
    if words:
        current_text: List[str] = []
        current_speaker = None
        seg_start = float(_read_attr(words[0], "start", 0) or 0)
        prev_end = float(_read_attr(words[0], "end", seg_start) or seg_start)
        for word_item in words:
            word_text = str(_read_attr(word_item, "word", "") or "").strip()
            if not word_text:
                continue
            word_start = float(_read_attr(word_item, "start", prev_end) or prev_end)
            word_end = float(_read_attr(word_item, "end", word_start) or word_start)
            word_speaker = _read_attr(word_item, "speaker")
            if current_text and (
                (word_speaker is not None and word_speaker != current_speaker)
                or (word_end - seg_start >= 5.0)
            ):
                segment = {
                    "start": seg_start,
                    "end": prev_end,
                    "text": " ".join(current_text),
                }
                if current_speaker is not None:
                    segment["speaker"] = f"Speaker {current_speaker}"
                segments.append(segment)
                current_text = []
                seg_start = word_start
            current_text.append(word_text)
            if word_speaker is not None:
                current_speaker = word_speaker
            prev_end = word_end
        if current_text:
            segment = {
                "start": seg_start,
                "end": prev_end,
                "text": " ".join(current_text),
            }
            if current_speaker is not None:
                segment["speaker"] = f"Speaker {current_speaker}"
            segments.append(segment)
    return segments

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

    def transcribe(
        self,
        audio_path: str,
        model: str = None,
        language: Optional[str] = None,
        diarize: bool = True,
    ) -> Dict[str, Any]:
        """Transcribe audio file via Deepgram API.

        Args:
            audio_path: Path to audio file (supports: mp3, wav, webm, flac, ogg, m4a)
            model: Deepgram model to use. Default: nova-3. Options: nova-3, nova-2
        """
        try:
            model = model or os.getenv("DEEPGRAM_MODEL", "nova-3")

            with open(audio_path, "rb") as audio:
                source = audio.read()

            request_options = {
                "request": source,
                "model": model,
                "smart_format": True,
                "punctuate": True,
                "diarize": diarize,
                "utterances": True,
                "paragraphs": True,
                "filler_words": True,
            }
            selected_language = (language or os.getenv("DEEPGRAM_LANGUAGE", "vi")).strip().lower() if language is not None else os.getenv("DEEPGRAM_LANGUAGE", "vi")
            if selected_language and selected_language != "auto":
                request_options["language"] = selected_language

            response = self.client.listen.v1.media.transcribe_file(**request_options)

            # Extract usage metadata
            duration_seconds = 0.0
            request_id: Optional[str] = None
            try:
                metadata = getattr(response, "metadata", None)
                if metadata:
                    duration_seconds = float(_read_attr(metadata, "duration", 0) or 0)
                    request_id = _read_attr(metadata, "request_id") or _read_attr(metadata, "requestId")
            except Exception:
                pass
            self.last_duration_seconds = duration_seconds
            self.last_model = model

            results = response.results
            alternative = _collect_alternative(results)
            transcript = _extract_transcript(results, alternative)
            segments = _extract_segments(results, alternative)
            if transcript and not segments:
                fallback_end = duration_seconds if duration_seconds > 0 else 5.0
                segments = [{
                    "start": 0.0,
                    "end": fallback_end,
                    "text": transcript,
                }]

            confidence = _confidence_stats(alternative)
            quality = {
                "request_id": request_id,
                "model": model,
                "language": selected_language,
                "diarize": diarize,
                "duration_seconds": duration_seconds,
                "segment_count": len(segments),
                "transcript_length": len(transcript),
                **confidence,
            }
            logger.info(
                "Deepgram transcribe rid=%s model=%s lang=%s diarize=%s duration=%.2f text_len=%s segments=%s avg_conf=%s low_conf_ratio=%s",
                request_id,
                model,
                selected_language,
                diarize,
                duration_seconds,
                len(transcript),
                len(segments),
                confidence.get("avg_confidence"),
                confidence.get("low_conf_word_ratio"),
            )

            return {
                "text": transcript,
                "segments": segments,
                "duration_seconds": duration_seconds,
                "model": model,
                "language": selected_language if selected_language != "auto" else None,
                "quality": quality,
            }

        except Exception as e:
            logger.error(f"Deepgram transcription failed: {e}", exc_info=True)
            return {
                "text": "",
                "segments": [],
                "error": str(e),
            }
