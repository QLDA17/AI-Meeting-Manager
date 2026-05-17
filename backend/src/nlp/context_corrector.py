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
    """Rule/glossary correction for STT text, with optional finalize-only LLM pass."""

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

    def __init__(self, enable_llm: Optional[bool] = None):
        self.enable_llm = (
            os.getenv("PHOBERT_LLM_CORRECTION_ENABLED", "false").lower() == "true"
            if enable_llm is None
            else enable_llm
        )

    def correct_rules(self, text: str, glossary: Optional[Dict[str, str]] = None) -> Dict[str, object]:
        corrected = text or ""
        corrections: List[Correction] = []

        for wrong, right in self.DEFAULT_REPLACEMENTS.items():
            corrected, count = self._replace_phrase(corrected, wrong, right)
            if count:
                corrections.append(Correction(wrong, right, "rule"))

        for term, canonical in (glossary or {}).items():
            if not term or not canonical:
                continue
            corrected, count = self._replace_phrase(corrected, term, canonical)
            if count and term != canonical:
                corrections.append(Correction(term, canonical, "glossary"))

        return {
            "text": corrected,
            "corrections": [item.to_dict() for item in corrections],
        }

    def correct_finalize(
        self,
        text: str,
        glossary: Optional[Dict[str, str]] = None,
        dialect_hint: str = "unknown",
    ) -> Dict[str, object]:
        rule_result = self.correct_rules(text, glossary)
        corrected = str(rule_result["text"])
        corrections = list(rule_result["corrections"])

        if self.enable_llm and corrected.strip():
            llm_text = self._correct_with_llm(corrected, glossary or {}, dialect_hint)
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
    def extract_terms(text: str, glossary: Optional[Dict[str, str]] = None) -> List[str]:
        haystack = (text or "").lower()
        terms = []
        for term in (glossary or {}):
            if term and re.search(rf"(?<!\w){re.escape(term.lower())}(?!\w)", haystack, flags=re.UNICODE):
                terms.append(term)
        return sorted(set(terms))

    def _correct_with_llm(self, text: str, glossary: Dict[str, str], dialect_hint: str) -> Optional[str]:
        try:
            from src.providers.router_llm import RouterLLMAdapter

            glossary_lines = "\n".join(f"- {k} => {v}" for k, v in list(glossary.items())[:80])
            system_prompt = (
                "You correct Vietnamese STT transcripts. Preserve meaning, speaker markers, timestamps, "
                "and line breaks where possible. Do not summarize. Return corrected transcript text only."
            )
            user_prompt = (
                f"Regional text hint: {dialect_hint}\n"
                f"Glossary:\n{glossary_lines or '(none)'}\n\n"
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
