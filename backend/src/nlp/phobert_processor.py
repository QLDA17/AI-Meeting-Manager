import logging
import os
import time
from typing import Dict, List, Optional

from .bartpho_corrector import BartPhoCorrector
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
        self.model_name = model_name or os.getenv("PHOBERT_MODEL", "vinai/phobert-base-v2")
        self.device = device or os.getenv("PHOBERT_DEVICE", "auto")
        self.max_length = max_length or int(os.getenv("PHOBERT_MAX_LENGTH", "256"))
        self.dialect_enabled = os.getenv("PHOBERT_DIALECT_ENABLED", "true").lower() == "true"
        self.mlm_enabled = os.getenv("PHOBERT_MLM_CORRECTION_ENABLED", "false").lower() == "true"
        self.classifier = DialectClassifier(self.model_name, self.device, self.max_length)
        self.corrector = ContextCorrectionPipeline()
        self.bartpho = BartPhoCorrector()

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
                "cleanup": {
                    "applied": True,
                },
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
        cleanup_result = self.corrector.correct_finalize(original_text)
        cleanup_text = str(cleanup_result["text"])
        cleanup_corrections = list(cleanup_result["corrections"])
        dialect = self.classifier.classify(original_text) if self.dialect_enabled else {
            "dialect_hint": "unknown",
            "confidence": 0.0,
            "scores": {},
            "markers": [],
            "method": "disabled",
        }
        technical_terms = self.corrector.extract_terms(cleanup_text)
        corrections = list(cleanup_corrections)

        processed_segments = []
        all_terms = set(technical_terms)
        low_confidence_phrases: List[Dict[str, object]] = []
        for segment in segments or []:
            original = str(segment.get("text", "") or "")
            cleanup_segment = self.corrector.correct_finalize(
                original,
                dialect_hint=str(dialect.get("dialect_hint", "unknown")),
            )
            segment_dialect = self.classifier.classify(original) if self.dialect_enabled else dialect
            segment_text = str(cleanup_segment["text"])
            segment_terms = self.corrector.extract_terms(segment_text)
            all_terms.update(segment_terms)
            confidence = segment.get("confidence_score", segment.get("confidence"))
            numeric_confidence = float(confidence) if confidence is not None else None
            if numeric_confidence is not None and numeric_confidence < 0.65:
                low_confidence_phrases.append({
                    "text": segment_text,
                    "confidence": numeric_confidence,
                    "speaker": segment.get("speaker") or segment.get("speaker_label") or "Speaker_01",
                })
            metadata = {
                "dialect_hint": segment_dialect.get("dialect_hint", "unknown"),
                "dialect_confidence": segment_dialect.get("confidence", 0.0),
                "terms": segment_terms,
                "correction_count": len(cleanup_segment["corrections"]),
                "corrections": cleanup_segment["corrections"],
            }
            new_segment = {
                **segment,
                "text": segment_text,
                "original_text": original,
                "nlp_metadata": metadata,
            }
            processed_segments.append(new_segment)

        semantic_analysis = self.classifier.analyze_semantics(cleanup_text, low_confidence_phrases)

        semantic_hints = {
            "dialect_hint": dialect.get("dialect_hint", "unknown"),
            "dialect_confidence": dialect.get("confidence", 0.0),
            "technical_terms": sorted(all_terms),
            "low_confidence_phrases": low_confidence_phrases,
            "anomaly_count": len(low_confidence_phrases),
            "candidate_scores": semantic_analysis.get("candidate_scores", []),
        }
        bartpho_result = self.bartpho.correct(cleanup_text, processed_segments, semantic_hints)
        corrected_text = str(bartpho_result.get("text") or cleanup_text)
        processed_segments = list(bartpho_result.get("segments") or processed_segments)
        corrections.extend(bartpho_result.get("corrections") or [])

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metadata = {
            "processor": "phobert-postprocessor",
            "mode": "finalize",
            "model": self.model_name,
            "duration_ms": duration_ms,
            "cleanup": {
                "applied": True,
                "correction_count": len(cleanup_corrections),
                "corrections": cleanup_corrections,
            },
            "phobert": {
                "model": self.model_name,
                "model_loaded": bool(semantic_analysis.get("model_loaded")),
                "embedding_available": bool(semantic_analysis.get("embedding_available")),
                "context_understanding": True,
                "candidate_reranking": True,
                "low_confidence_phrase_count": len(low_confidence_phrases),
                "anomaly_count": len(low_confidence_phrases),
                "candidate_scores": semantic_analysis.get("candidate_scores", []),
            },
            "bartpho": {
                "model": self.bartpho.model_name,
                "applied": bool(bartpho_result.get("applied")),
                "model_loaded": bool(bartpho_result.get("model_loaded")),
                "correction_count": int(bartpho_result.get("correction_count") or 0),
                "fallback_reason": bartpho_result.get("fallback_reason"),
            },
            "dialect_hint": dialect.get("dialect_hint", "unknown"),
            "dialect_confidence": dialect.get("confidence", 0.0),
            "dialect_scores": dialect.get("scores", {}),
            "dialect_markers": dialect.get("markers", []),
            "dialect_method": dialect.get("method", "rule"),
            "correction_count": len(corrections),
            "corrections": corrections,
            "terms": sorted(all_terms),
            "mlm_correction_enabled": self.mlm_enabled,
            "low_confidence_phrases": low_confidence_phrases,
        }
        return {
            "raw_text": original_text,
            "text": corrected_text,
            "raw_segments": original_segments,
            "segments": processed_segments,
            "nlp_metadata": metadata,
            "post_processed": True,
        }
