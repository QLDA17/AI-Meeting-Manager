import os
import re
import time
from typing import Dict, List, Optional


class BartPhoTextEnhancer:
    """Lightweight Vietnamese transcript cleanup stage with explicit metadata.

    This adapter is intentionally conservative. If a true BARTpho runtime is not
    available, it applies only normalization-safe cleanup and reports fallback
    metadata instead of pretending to run a heavyweight model.
    """

    def __init__(self, enabled: Optional[bool] = None):
        self.enabled = (
            os.getenv("BARTPHO_ENABLED", "false").lower() == "true"
            if enabled is None
            else enabled
        )
        self.model_name = os.getenv("BARTPHO_MODEL", "vinai/bartpho-word-base")

    def process_finalize(
        self,
        text: str,
        segments: Optional[List[Dict[str, object]]] = None,
        *,
        language: str = "vi",
    ) -> Dict[str, object]:
        started = time.perf_counter()
        original_text = text or ""
        original_segments = [{**segment} for segment in (segments or [])]

        if not self.enabled or language.lower() not in {"vi", "auto"}:
            return {
                "raw_text": original_text,
                "text": original_text,
                "raw_segments": original_segments,
                "segments": original_segments,
                "post_processed": False,
                "nlp_metadata": {
                    "processor": "bartpho-enhancer",
                    "model": self.model_name,
                    "applied": False,
                    "mode": "finalize",
                    "reason": "disabled_or_language_unsupported",
                    "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            }

        cleaned_text = self._normalize_text(original_text)
        processed_segments: List[Dict[str, object]] = []
        for segment in original_segments:
            original_segment_text = str(segment.get("text", "") or "")
            cleaned_segment_text = self._normalize_text(original_segment_text)
            metadata = dict(segment.get("nlp_metadata") or {})
            metadata["bartpho_applied"] = cleaned_segment_text != original_segment_text
            updated_segment = {
                **segment,
                "text": cleaned_segment_text,
                "nlp_metadata": metadata,
            }
            if cleaned_segment_text != original_segment_text:
                updated_segment["original_text"] = segment.get("original_text") or original_segment_text
            processed_segments.append(updated_segment)

        return {
            "raw_text": original_text,
            "text": cleaned_text,
            "raw_segments": original_segments,
            "segments": processed_segments,
            "post_processed": cleaned_text != original_text or any(
                item.get("text") != original.get("text")
                for item, original in zip(processed_segments, original_segments)
            ),
            "nlp_metadata": {
                "processor": "bartpho-enhancer",
                "model": self.model_name,
                "applied": True,
                "mode": "finalize",
                "runtime": "fallback_normalizer",
                "duration_ms": round((time.perf_counter() - started) * 1000, 2),
            },
        }

    @staticmethod
    def _normalize_text(text: str) -> str:
        normalized = re.sub(r"\s+", " ", text or "").strip()
        normalized = re.sub(r"\s+([,.;:!?])", r"\1", normalized)
        normalized = re.sub(r"([,.;:!?])(?=\w)", r"\1 ", normalized)
        return normalized
