import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DialectResult:
    dialect_hint: str
    confidence: float
    scores: Dict[str, float]
    markers: List[str]
    method: str

    def to_dict(self) -> Dict[str, object]:
        return {
            "dialect_hint": self.dialect_hint,
            "confidence": self.confidence,
            "scores": self.scores,
            "markers": self.markers,
            "method": self.method,
        }


class DialectClassifier:
    """Infer regional text hints from Vietnamese transcript text.

    This is not accent detection. It only uses transcript vocabulary/style, with
    optional PhoBERT loading kept lazy and best-effort for future embedding work.
    """

    MARKERS: Dict[str, Dict[str, float]] = {
        "north": {
            "vâng": 1.2,
            "ạ": 1.0,
            "thế": 0.8,
            "nhỉ": 0.8,
            "tôi": 0.5,
            "chúng tôi": 0.6,
        },
        "central": {
            "mô": 1.5,
            "răng": 1.5,
            "ni": 1.1,
            "tê": 1.1,
            "bữa": 0.6,
            "chi": 1.0,
            "eng": 1.2,
        },
        "south": {
            "dạ": 1.2,
            "nè": 1.0,
            "nha": 0.8,
            "luôn": 0.4,
            "quá": 0.4,
            "tui": 1.4,
            "tụi": 1.1,
            "vô": 0.9,
        },
    }

    def __init__(self, model_name: str = "vinai/phobert-base", device: str = "auto", max_length: int = 256):
        self.model_name = model_name
        self.device = device
        self.max_length = max_length
        self._loaded = False
        self._model = None
        self._tokenizer = None

    def classify(self, text: str) -> Dict[str, object]:
        normalized = self._normalize(text)
        if not normalized:
            return DialectResult("unknown", 0.0, {}, [], "empty").to_dict()

        scores = {dialect: 0.0 for dialect in self.MARKERS}
        matched: List[str] = []
        for dialect, markers in self.MARKERS.items():
            for marker, weight in markers.items():
                count = self._count_marker(normalized, marker)
                if count:
                    scores[dialect] += count * weight
                    matched.append(marker)

        total = sum(scores.values())
        if total <= 0:
            return DialectResult("unknown", 0.0, scores, [], "rule").to_dict()

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        top_dialect, top_score = ranked[0]
        second_score = ranked[1][1] if len(ranked) > 1 else 0.0
        confidence = round(min(0.95, top_score / total), 3)
        dialect_hint = top_dialect
        if second_score > 0 and (top_score - second_score) / max(top_score, 1.0) < 0.25:
            dialect_hint = "mixed"
            confidence = round(max(0.35, confidence - 0.2), 3)

        return DialectResult(
            dialect_hint=dialect_hint,
            confidence=confidence,
            scores={key: round(value, 3) for key, value in scores.items()},
            markers=sorted(set(matched)),
            method="rule",
        ).to_dict()

    def ensure_model_loaded(self) -> bool:
        """Best-effort lazy PhoBERT load for future embedding-based classifiers."""
        if self._loaded:
            return bool(self._model and self._tokenizer)
        self._loaded = True

        if os.getenv("PHOBERT_LOAD_MODEL", "false").lower() != "true":
            return False

        try:
            import torch
            from transformers import AutoModel, AutoTokenizer

            selected_device = "cuda" if self.device == "auto" and torch.cuda.is_available() else self.device
            if selected_device == "auto":
                selected_device = "cpu"
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModel.from_pretrained(self.model_name).to(selected_device)
            self._model.eval()
            logger.info("PhoBERT model loaded for dialect classifier: %s on %s", self.model_name, selected_device)
            return True
        except Exception as exc:
            logger.warning("PhoBERT model unavailable for dialect classifier: %s", exc)
            self._model = None
            self._tokenizer = None
            return False

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").lower()).strip()

    @staticmethod
    def _count_marker(text: str, marker: str) -> int:
        escaped = re.escape(marker.lower())
        return len(re.findall(rf"(?<!\w){escaped}(?!\w)", text, flags=re.UNICODE))
