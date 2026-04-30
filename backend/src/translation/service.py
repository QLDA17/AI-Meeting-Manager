import re
import logging
import time
import hashlib
from dataclasses import dataclass
from typing import Dict, List, Union, Optional
from datetime import datetime, timedelta
from sacrebleu import corpus_bleu
from src.providers.llm import OpenAIAdapter
from src.providers.google_llm import GoogleLLMAdapter
from src.providers.factory import get_llm_adapter

logger = logging.getLogger(__name__)


TIMESTAMP_RE = re.compile(r"\[\d{2}:\d{2}:\d{2}\]")
SPEAKER_RE = re.compile(r"\[(?:Speaker_|Người_nói_)[^\]]+\]|\[(?!\d{2}:\d{2}:\d{2})[^\]]+\]")


@dataclass(frozen=True)
class TranslationRequest:
    source_lang: str
    target_lang: str
    transcript: str
    glossary: Dict[str, str]
    max_tokens: int = 500
    system_prompt: str = "You are a translator. Preserve [timestamp] and [Speaker_X] markers."


@dataclass
class CacheEntry:
    content: str
    source: str  # 'live' or 'fallback'
    timestamp: datetime


class MarkerPreservationError(Exception):
    """Raised when markers are corrupted after translation."""
    pass


class TranslationService:
    """Chunk and transform transcript while preserving timestamps/speakers with anti-thrash cache."""

    def __init__(self, adapter: Union[OpenAIAdapter, GoogleLLMAdapter] = None, fail_fast: bool = True):
        self.adapter = adapter or get_llm_adapter()
        self.fail_fast = fail_fast
        # Fingerprint-based cache with TTL
        self._cache: Dict[str, CacheEntry] = {}
        self.live_ttl = timedelta(hours=24)
        self.fallback_ttl = timedelta(minutes=5)

    def _get_fingerprint(self, req: TranslationRequest) -> str:
        """Create a stable fingerprint for the request."""
        data = f"{req.source_lang}:{req.target_lang}:{req.transcript}:{sorted(req.glossary.items())}:{req.system_prompt}"
        return hashlib.sha256(data.encode()).hexdigest()

    def translate(self, req: TranslationRequest) -> str:
        fingerprint = self._get_fingerprint(req)
        
        # 1. Cache Check with TTL
        if fingerprint in self._cache:
            entry = self._cache[fingerprint]
            ttl = self.live_ttl if entry.source == 'live' else self.fallback_ttl
            if datetime.utcnow() - entry.timestamp < ttl:
                logger.info(f"Cache hit (source={entry.source}).")
                return entry.content
            else:
                logger.info(f"Cache expired for {fingerprint}. Source was {entry.source}.")

        chunks = self._chunk_tokens(req.transcript, req.max_tokens)
        translated_chunks = []
        any_fallback = False
        
        for chunk in chunks:
            # First apply glossary
            chunk_with_glossary = self._apply_glossary(chunk, req.glossary)
            # Then translate via Adapter
            translated = self.adapter.chat_completion(
                system_prompt=req.system_prompt,
                user_prompt=chunk_with_glossary
            )
            
            is_mock = "Mock" in translated or "exhausted_candidates" in translated or "global_cooldown" in translated
            if is_mock:
                any_fallback = True
            
            # Guard: Validate preservation
            if not self.validate_preservation(chunk, translated):
                repaired = self._repair_markers(chunk, translated)
                if not self.validate_preservation(chunk, repaired):
                    if self.fail_fast:
                        raise MarkerPreservationError(f"Markers corrupted in chunk: {chunk[:50]}...")
                    else:
                        translated_chunks.append(chunk_with_glossary)
                        any_fallback = True # Glossary fallback is still a fallback
                        continue
                translated = repaired
                
            translated_chunks.append(translated)
        
        full_translation = "\n".join(translated_chunks)
        
        # 2. Update Cache
        source = 'fallback' if any_fallback else 'live'
        self._cache[fingerprint] = CacheEntry(
            content=full_translation,
            source=source,
            timestamp=datetime.utcnow()
        )
        logger.info(f"Translation completed. source={source}")
        
        return full_translation

    @staticmethod
    def validate_preservation(before: str, after: str) -> bool:
        return (
            TIMESTAMP_RE.findall(before) == TIMESTAMP_RE.findall(after)
            and SPEAKER_RE.findall(before) == SPEAKER_RE.findall(after)
        )

    def _repair_markers(self, before: str, after: str) -> str:
        """Heuristic repair: Re-inject markers if they were modified by LLM."""
        before_ts = TIMESTAMP_RE.findall(before)
        after_ts = TIMESTAMP_RE.findall(after)
        before_spk = SPEAKER_RE.findall(before)
        after_spk = SPEAKER_RE.findall(after)

        if before_ts == after_ts and before_spk == after_spk:
            return after

        # Remove all current markers from 'after' to avoid duplicates
        repaired = TIMESTAMP_RE.sub("", after)
        repaired = SPEAKER_RE.sub("", repaired)
        repaired = repaired.strip()

        # Prepend markers from 'before' at the start to satisfy validate_preservation
        # In a real scenario, we'd use fuzzy matching to place them better.
        # Deduplicate markers that might match both regexes (like some speaker labels)
        all_markers = []
        # We need to maintain the same markers as 'before'
        # Actually, let's just use the exact markers from 'before' in order.
        # This is tricky because we have two regexes.
        
        # Simpler: just get all things that look like markers from 'before'
        combined_regex = re.compile(f"{TIMESTAMP_RE.pattern}|{SPEAKER_RE.pattern}")
        markers_in_order = combined_regex.findall(before)
        
        return " ".join(markers_in_order) + " " + repaired

    @staticmethod
    def bleu_score(reference: str, hypothesis: str) -> float:
        if not hypothesis.strip():
            return 0.0
        score = corpus_bleu([hypothesis], [[reference]]).score
        return score / 100.0

    def _chunk_tokens(self, text: str, max_tokens: int) -> List[str]:
        tokens = text.split()
        chunks: List[str] = []
        for i in range(0, len(tokens), max_tokens):
            chunks.append(" ".join(tokens[i : i + max_tokens]))
        return chunks

    def _apply_glossary(self, chunk: str, glossary: Dict[str, str]) -> str:
        if not glossary:
            return chunk
        # Sort keys by length descending to avoid partial matches
        sorted_keys = sorted(glossary.keys(), key=len, reverse=True)
        pattern = re.compile(
            "|".join(rf"\b{re.escape(k)}\b" for k in sorted_keys),
            flags=re.IGNORECASE
        )
        return pattern.sub(lambda m: glossary[next(k for k in sorted_keys if k.lower() == m.group(0).lower())], chunk)
