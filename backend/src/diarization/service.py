from dataclasses import dataclass
from typing import Dict, List, Any
from src.providers.diarization import PyannoteDiarizationProvider


@dataclass(frozen=True)
class Segment:
    start: float
    end: float
    speaker: str


class DiarizationService:
    """Utilities for speaker segment alignment and DER estimation."""

    def __init__(self, provider: PyannoteDiarizationProvider = None):
        self.provider = provider or PyannoteDiarizationProvider()

    def diarize_audio(self, audio_path: str) -> List[Dict[str, Any]]:
        """Perform speaker diarization via provider."""
        return self.provider.diarize(audio_path)

    @staticmethod
    def align_to_transcript(
        transcript_chunks: List[Dict[str, float]],
        speaker_segments: List[Segment],
    ) -> List[Dict[str, str]]:
        aligned: List[Dict[str, str]] = []
        for chunk in transcript_chunks:
            mid = (chunk["start"] + chunk["end"]) / 2
            speaker = DiarizationService._speaker_at(mid, speaker_segments)
            aligned.append(
                {
                    "start": str(chunk["start"]),
                    "end": str(chunk["end"]),
                    "speaker": speaker,
                    "text": chunk["text"],
                }
            )
        return aligned

    @staticmethod
    def diarization_error_rate(
        reference: List[Segment], hypothesis: List[Segment], step: float = 0.1
    ) -> float:
        ref_map = DiarizationService._timeline_map(reference, step)
        hyp_map = DiarizationService._timeline_map(hypothesis, step)
        all_keys = set(ref_map.keys()) | set(hyp_map.keys())
        total = max(len(all_keys), 1)
        mismatch = sum(1 for i in all_keys if ref_map.get(i) != hyp_map.get(i))
        return mismatch / total

    @staticmethod
    def _timeline_map(segments: List[Segment], step: float) -> Dict[int, str]:
        timeline: Dict[int, str] = {}
        for seg in segments:
            s = int(seg.start / step)
            e = int(seg.end / step)
            for i in range(s, e):
                timeline[i] = seg.speaker
        return timeline

    @staticmethod
    def _speaker_at(timestamp: float, segments: List[Segment]) -> str:
        for seg in segments:
            if seg.start <= timestamp < seg.end:
                return seg.speaker
        return "Speaker_Unknown"
