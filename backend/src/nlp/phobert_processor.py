import logging
import os
import time
from typing import Dict, List, Optional

from .context_corrector import ContextCorrectionPipeline
from .dialect_classifier import DialectClassifier

logger = logging.getLogger(__name__)


class PhoBERTPostProcessor:
    """Orchestrates Vietnamese transcript post-processing.

    Chunk processing stays lightweight and does not load PhoBERT. Finalize may
    run dialect hinting, rule corrections, and optional LLM correction.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        max_length: Optional[int] = None,
    ):
        self.model_name = model_name or os.getenv("PHOBERT_MODEL", "vinai/phobert-base")
        self.device = device or os.getenv("PHOBERT_DEVICE", "auto")
        self.max_length = max_length or int(os.getenv("PHOBERT_MAX_LENGTH", "256"))
        self.dialect_enabled = os.getenv("PHOBERT_DIALECT_ENABLED", "true").lower() == "true"
        self.mlm_enabled = os.getenv("PHOBERT_MLM_CORRECTION_ENABLED", "false").lower() == "true"
        self.classifier = DialectClassifier(self.model_name, self.device, self.max_length)
        self.corrector = ContextCorrectionPipeline()

    def process_chunk(
        self,
        text: str,
        segments: Optional[List[Dict[str, object]]] = None,
    ) -> Dict[str, object]:
        started = time.perf_counter()
        result = self.corrector.correct_rules(text or "")
        corrected_text = str(result["text"])
        corrections = list(result["corrections"])

        processed_segments = []
        for segment in segments or []:
            original = str(segment.get("text", "") or "")
            segment_result = self.corrector.correct_rules(original)
            new_segment = {**segment, "text": segment_result["text"]}
            if segment_result["text"] != original:
                new_segment["original_text"] = original
            processed_segments.append(new_segment)

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        return {
            "text": corrected_text,
            "segments": processed_segments,
            "nlp_metadata": {
                "processor": "phobert-postprocessor",
                "mode": "chunk",
                "model": None,
                "duration_ms": duration_ms,
                "correction_count": len(corrections),
                "corrections": corrections,
            },
        }

    def process_finalize(
        self,
        text: str,
        segments: Optional[List[Dict[str, object]]] = None,
    ) -> Dict[str, object]:
        started = time.perf_counter()
        original_text = text or ""
        original_segments = [{**segment} for segment in (segments or [])]
        dialect = self.classifier.classify(original_text) if self.dialect_enabled else {
            "dialect_hint": "unknown",
            "confidence": 0.0,
            "scores": {},
            "markers": [],
            "method": "disabled",
        }
        correction_result = self.corrector.correct_finalize(
            original_text,
            dialect_hint=str(dialect.get("dialect_hint", "unknown")),
        )
        corrected_text = str(correction_result["text"])
        corrections = list(correction_result["corrections"])

        processed_segments = []
        all_terms = set(self.corrector.extract_terms(corrected_text))
        for segment in segments or []:
            original = str(segment.get("text", "") or "")
            segment_dialect = self.classifier.classify(original) if self.dialect_enabled else dialect
            segment_result = self.corrector.correct_rules(original)
            segment_terms = self.corrector.extract_terms(str(segment_result["text"]))
            all_terms.update(segment_terms)
            metadata = {
                "dialect_hint": segment_dialect.get("dialect_hint", "unknown"),
                "dialect_confidence": segment_dialect.get("confidence", 0.0),
                "terms": segment_terms,
                "correction_count": len(segment_result["corrections"]),
                "corrections": segment_result["corrections"],
            }
            new_segment = {
                **segment,
                "text": segment_result["text"],
                "original_text": original if segment_result["text"] != original else segment.get("original_text"),
                "nlp_metadata": metadata,
            }
            processed_segments.append(new_segment)

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metadata = {
            "processor": "phobert-postprocessor",
            "mode": "finalize",
            "model": self.model_name,
            "duration_ms": duration_ms,
            "dialect_hint": dialect.get("dialect_hint", "unknown"),
            "dialect_confidence": dialect.get("confidence", 0.0),
            "dialect_scores": dialect.get("scores", {}),
            "dialect_markers": dialect.get("markers", []),
            "dialect_method": dialect.get("method", "rule"),
            "correction_count": len(corrections),
            "corrections": corrections,
            "terms": sorted(all_terms),
            "mlm_correction_enabled": self.mlm_enabled,
        }
        return {
            "raw_text": original_text,
            "text": corrected_text,
            "raw_segments": original_segments,
            "segments": processed_segments,
            "nlp_metadata": metadata,
            "post_processed": True,
        }
