import logging
import os
import re
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class BartPhoCorrector:
    """Best-effort transcript correction with optional BARTpho generation."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        device: Optional[str] = None,
        max_length: Optional[int] = None,
    ):
        self.model_name = model_name or os.getenv("BARTPHO_MODEL", "vinai/bartpho-word-base")
        self.device = device or os.getenv("BARTPHO_DEVICE", "auto")
        self.max_length = max_length or int(os.getenv("BARTPHO_MAX_LENGTH", "256"))
        self.enabled = os.getenv("BARTPHO_ENABLED", "true").lower() == "true"
        self.load_model = os.getenv("BARTPHO_LOAD_MODEL", "false").lower() == "true"
        self._loaded = False
        self._model = None
        self._tokenizer = None
        self._device = "cpu"

    def correct(
        self,
        text: str,
        segments: Optional[List[Dict[str, object]]] = None,
        semantic_hints: Optional[Dict[str, object]] = None,
    ) -> Dict[str, object]:
        base_segments = [{**segment} for segment in (segments or [])]
        if not self.enabled:
            return {
                "text": text or "",
                "segments": base_segments,
                "model_loaded": False,
                "applied": False,
                "correction_count": 0,
                "fallback_reason": "disabled",
            }

        corrections: List[Dict[str, str]] = []
        corrected_text = self._correct_text(text or "", semantic_hints)
        corrected_segments: List[Dict[str, object]] = []
        for segment in base_segments:
            source_text = str(segment.get("text") or "")
            corrected_segment_text = self._correct_text(source_text, semantic_hints)
            if corrected_segment_text != source_text:
                corrections.append({
                    "original": source_text,
                    "corrected": corrected_segment_text,
                    "source": "bartpho",
                })
            corrected_segments.append({
                **segment,
                "text": corrected_segment_text,
                "original_text": segment.get("original_text") or source_text,
            })

        return {
            "text": corrected_text,
            "segments": corrected_segments,
            "model_loaded": bool(self._model and self._tokenizer),
            "applied": bool(corrections),
            "correction_count": len(corrections),
            "corrections": corrections,
            "fallback_reason": None if corrections else ("model_unavailable" if self.load_model else "heuristic_only"),
        }

    def warm_up(self) -> bool:
        if not self.enabled:
            return False
        if not self.load_model:
            return False
        return self._ensure_model_loaded()

    def _correct_text(self, text: str, semantic_hints: Optional[Dict[str, object]]) -> str:
        normalized = self._normalize_spacing(text)
        if not normalized:
            return ""
        generated = self._generate_with_model(normalized)
        if generated:
            normalized = generated
        normalized = self._normalize_terms(normalized, semantic_hints)
        return self._ensure_sentence_punctuation(normalized)

    def _generate_with_model(self, text: str) -> Optional[str]:
        if not self.load_model:
            return None
        if not self._ensure_model_loaded():
            return None
        try:
            encoded = self._tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=self.max_length,
            )
            encoded = {key: value.to(self._device) for key, value in encoded.items()}
            output = self._model.generate(
                **encoded,
                max_new_tokens=min(self.max_length, 256),
                num_beams=4,
                early_stopping=True,
            )
            generated = self._tokenizer.batch_decode(output, skip_special_tokens=True)
            candidate = self._normalize_spacing(generated[0] if generated else "")
            return candidate or None
        except Exception as exc:
            logger.warning("BARTpho correction skipped: %s", exc)
            return None

    def _ensure_model_loaded(self) -> bool:
        if self._loaded:
            return bool(self._model and self._tokenizer)
        self._loaded = True
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            selected_device = "cuda" if self.device == "auto" and torch.cuda.is_available() else self.device
            if selected_device == "auto":
                selected_device = "cpu"
            self._tokenizer = self._load_tokenizer(AutoTokenizer)
            self._model = self._load_model(AutoModelForSeq2SeqLM).to(selected_device)
            self._model.eval()
            self._device = selected_device
            logger.info("BARTpho model loaded: %s on %s", self.model_name, selected_device)
            return True
        except Exception as exc:
            logger.warning("BARTpho model unavailable: %s", exc)
            self._tokenizer = None
            self._model = None
            self._device = "cpu"
            return False

    @staticmethod
    def _normalize_spacing(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").strip())

    @staticmethod
    def _ensure_sentence_punctuation(text: str) -> str:
        candidate = (text or "").strip()
        if not candidate:
            return ""
        if candidate[-1] in ".!?…":
            return candidate
        return f"{candidate}."

    @staticmethod
    def _normalize_terms(text: str, semantic_hints: Optional[Dict[str, object]]) -> str:
        normalized = text
        if isinstance(semantic_hints, dict):
            for term in semantic_hints.get("technical_terms") or []:
                if isinstance(term, str) and term:
                    normalized = re.sub(
                        rf"(?<!\w){re.escape(term.lower())}(?!\w)",
                        term,
                        normalized,
                        flags=re.IGNORECASE | re.UNICODE,
                    )
        normalized = re.sub(r"\bkpi\b", "KPI", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bapi\b", "API", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bci/cd\b", "CI/CD", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bdocker\b", "Docker", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bkubernetes\b", "Kubernetes", normalized, flags=re.IGNORECASE)
        return normalized

    @staticmethod
    def _recompose_text(original_text: str, segments: List[Dict[str, object]]) -> str:
        candidate_lines = [str(segment.get("text") or "").strip() for segment in segments if str(segment.get("text") or "").strip()]
        if candidate_lines:
            return " ".join(candidate_lines).strip()
        return original_text or ""

    def _load_tokenizer(self, loader_cls):
        offline_only = os.getenv("HF_HUB_OFFLINE", "false").lower() == "true" or os.getenv("TRANSFORMERS_OFFLINE", "false").lower() == "true"
        try:
            return loader_cls.from_pretrained(self.model_name, local_files_only=offline_only)
        except Exception:
            if offline_only:
                raise
            logger.info("BARTpho tokenizer online load failed, retrying from local cache: %s", self.model_name)
            return loader_cls.from_pretrained(self.model_name, local_files_only=True)

    def _load_model(self, loader_cls):
        offline_only = os.getenv("HF_HUB_OFFLINE", "false").lower() == "true" or os.getenv("TRANSFORMERS_OFFLINE", "false").lower() == "true"
        try:
            return loader_cls.from_pretrained(self.model_name, local_files_only=offline_only)
        except Exception:
            if offline_only:
                raise
            logger.info("BARTpho model online load failed, retrying from local cache: %s", self.model_name)
            return loader_cls.from_pretrained(self.model_name, local_files_only=True)
