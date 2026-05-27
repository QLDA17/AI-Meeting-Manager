import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class Correction:
    original: str
    corrected: str
    source: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "original": self.original,
            "corrected": self.corrected,
            "source": self.source,
        }


class ContextCorrectionPipeline:
    """Cleanup and rule-based correction for Vietnamese STT text."""

    DEFAULT_REPLACEMENTS: Dict[str, str] = {
        "ka pi ai": "KPI",
        "k p i": "KPI",
        "a pi i": "API",
        "a p i": "API",
        "ci ai ci đi": "CI/CD",
        "ci cd": "CI/CD",
        "đốc cơ": "Docker",
        "cu bờ nét": "Kubernetes",
        "mi tinh": "meeting",
    }
    FILLER_PATTERNS = (
        r"\b(?:ờm|ừm|à|ờ|ơ|ờ thì|kiểu như)\b",
        r"\b(?:uh|um+|ah+)\b",
    )

    def __init__(self, enable_llm: Optional[bool] = None):
        self.enable_llm = (
            os.getenv("PHOBERT_LLM_CORRECTION_ENABLED", "false").lower() == "true"
            if enable_llm is None
            else enable_llm
        )

    def correct_rules(self, text: str) -> Dict[str, object]:
        corrected = self.basic_cleanup(text or "")
        corrections: List[Correction] = []

        for wrong, right in self.DEFAULT_REPLACEMENTS.items():
            corrected, count = self._replace_phrase(corrected, wrong, right)
            if count:
                corrections.append(Correction(wrong, right, "rule"))

        return {
            "text": corrected,
            "corrections": [item.to_dict() for item in corrections],
        }

    def basic_cleanup(self, text: str) -> str:
        cleaned = self._normalize_whitespace(text or "")
        cleaned = self._strip_fillers(cleaned)
        cleaned = self._normalize_whitespace(cleaned)
        cleaned = self._restore_spacing_around_punctuation(cleaned)
        cleaned = self._normalize_phrase_case(cleaned)
        return cleaned.strip()

    def correct_finalize(
        self,
        text: str,
        dialect_hint: str = "unknown",
    ) -> Dict[str, object]:
        rule_result = self.correct_rules(text)
        corrected = str(rule_result["text"])
        corrections = list(rule_result["corrections"])

        if self.enable_llm and corrected.strip():
            llm_text = self._correct_with_llm(corrected, dialect_hint)
            if llm_text and llm_text != corrected:
                corrections.append({
                    "original": corrected,
                    "corrected": llm_text,
                    "source": "llm",
                })
                corrected = llm_text

        return {
            "text": corrected,
            "corrections": corrections,
        }

    @staticmethod
    def extract_terms(text: str) -> List[str]:
        if not text:
            return []

        patterns = [
            r"\b[A-Z]{2,}(?:/[A-Z]{2,})*\b",
            r"\b[A-Z][a-z]+(?:/[A-Z][a-z]+)?\b",
            r"\bv\d+(?:\.\d+)+\b",
        ]
        terms: List[str] = []
        seen = set()
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                token = match.group(0)
                if token not in seen:
                    seen.add(token)
                    terms.append(token)
        return terms

    def _correct_with_llm(self, text: str, dialect_hint: str) -> Optional[str]:
        try:
            from src.providers.router_llm import RouterLLMAdapter

            system_prompt = (
                "You correct Vietnamese STT transcripts. Preserve meaning, speaker markers, timestamps, "
                "and line breaks where possible. Do not summarize. Return corrected transcript text only."
            )
            user_prompt = (
                f"Regional text hint: {dialect_hint}\n\n"
                f"Transcript:\n{text}"
            )
            router = RouterLLMAdapter()
            return router.chat_completion(system_prompt, user_prompt, temperature=0.1, max_tokens=4000)
        except Exception as exc:
            logger.warning("LLM correction skipped: %s", exc)
            return None

    @staticmethod
    def _replace_phrase(text: str, source: str, target: str) -> tuple[str, int]:
        pattern = re.compile(rf"(?<!\w){re.escape(source)}(?!\w)", flags=re.IGNORECASE | re.UNICODE)
        return pattern.subn(target, text)

    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        return re.sub(r"\s+", " ", text or "").strip()

    def _strip_fillers(self, text: str) -> str:
        cleaned = text
        for pattern in self.FILLER_PATTERNS:
            cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE | re.UNICODE)
        return cleaned

    @staticmethod
    def _restore_spacing_around_punctuation(text: str) -> str:
        compact = re.sub(r"\s+([,.!?;:])", r"\1", text)
        compact = re.sub(r"([,.!?;:])(?=\w)", r"\1 ", compact)
        return compact

    @staticmethod
    def _normalize_phrase_case(text: str) -> str:
        if not text:
            return ""
        return text[0].upper() + text[1:] if len(text) > 1 else text.upper()
