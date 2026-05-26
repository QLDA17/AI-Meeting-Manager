import os
import json
import logging
import re
from typing import Optional

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

logger = logging.getLogger(__name__)


class RouterLLMAdapter:
    """Router API adapter for LLM calls (OpenAI-compatible format)."""

    FALLBACK_MODELS = [
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ]

    def __init__(self):
        self.api_base_url = os.getenv("ROUTER_API_BASE_URL", "https://api.groq.com/openai/v1")
        self.api_url = os.getenv("ROUTER_API_URL", "") or self._build_chat_completions_url(self.api_base_url)
        self.api_key = os.getenv("GROQ_API_KEY") or os.getenv("ROUTER_API_KEY") or os.getenv("AGENT_ROUTER_TOKEN", "")
        self.model = os.getenv("ROUTER_MODEL", "llama-3.3-70b-versatile")
        self.timeout_seconds = float(os.getenv("ROUTER_TIMEOUT_SECONDS", "60"))
        self.enabled = bool(self.api_url and self.api_key and HAS_REQUESTS)
        self.last_error: Optional[str] = None
        self.last_usage: Optional[dict] = None
        self.last_status_code: Optional[int] = None
        self.last_error_type: Optional[str] = None
        self.last_retry_after_seconds: Optional[float] = None

        if not self.enabled:
            reasons = []
            if not self.api_url:
                reasons.append("ROUTER_API_URL not set")
            if not self.api_key:
                reasons.append("GROQ_API_KEY not set (get key from https://console.groq.com/keys)")
            if not HAS_REQUESTS:
                reasons.append("requests library not installed")
            self.last_error = f"LLM disabled: {', '.join(reasons)}"
            logger.warning(self.last_error)
        else:
            logger.info(f"Groq LLM enabled: endpoint={self.api_url}, model={self.model}")

    @staticmethod
    def _build_chat_completions_url(base_url: str) -> str:
        normalized = (base_url or "").strip().rstrip("/")
        if not normalized:
            return ""
        if normalized.endswith("/chat/completions"):
            return normalized
        return f"{normalized}/chat/completions"

    def _is_content_blocked(self, status_code: int, body: str) -> bool:
        """Check if the error is a content moderation block."""
        body_lower = body.lower()
        if "unauthorized" in body_lower or "unauthenticated" in body_lower:
            return False  # Auth error, not content block
        if status_code == 400 and "content-blocked" in body_lower:
            return True
        if status_code == 403 and "content" in body_lower and "block" in body_lower:
            return True
        return False

    def _is_auth_error(self, status_code: int, body: str) -> bool:
        """Check if the error is an authentication/authorization failure."""
        if status_code in (401, 403):
            body_lower = body.lower()
            if "unauthorized" in body_lower or "unauthenticated" in body_lower or "invalid" in body_lower:
                return True
        return False

    def _is_rate_limit_error(self, status_code: int, body: str) -> bool:
        if status_code != 429:
            return False
        body_lower = body.lower()
        return "rate limit" in body_lower or "rate_limit_exceeded" in body_lower or "tokens per minute" in body_lower

    def _extract_retry_after_seconds(self, body: str) -> Optional[float]:
        match = re.search(r"try again in\s+([0-9]+(?:\.[0-9]+)?)s", body, re.IGNORECASE)
        if not match:
            return None
        try:
            return float(match.group(1))
        except ValueError:
            return None

    def _call_single_model(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> tuple[Optional[str], Optional[int], Optional[str]]:
        """Call a single model. Returns (content, http_status, error_body)."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        response = requests.post(
            self.api_url,
            headers=headers,
            json=payload,
            timeout=self.timeout_seconds,
        )

        if response.status_code != 200:
            body = (response.text or "")[:500]
            return None, response.status_code, body

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        # Extract usage info (Groq returns OpenAI-compatible usage)
        usage = data.get("usage", {})
        self.last_usage = {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "model": model,
        }
        return content, None, None

    def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> Optional[str]:
        """Call router API with automatic model fallback on content-blocked."""
        if not self.enabled:
            self.last_error = self.last_error or "Router LLM not configured"
            logger.warning("Router LLM not configured, skipping.")
            return None

        self.last_error = None
        self.last_status_code = None
        self.last_error_type = None
        self.last_retry_after_seconds = None

        # Build list of models to try: primary first, then fallbacks
        models_to_try = [self.model] + [m for m in self.FALLBACK_MODELS if m != self.model]

        for attempt_model in models_to_try:
            try:
                content, status_code, error_body = self._call_single_model(
                    attempt_model, system_prompt, user_prompt, temperature, max_tokens
                )

                if content is not None:
                    if attempt_model != self.model:
                        logger.info(f"Router LLM succeeded with fallback model: {attempt_model}")
                    else:
                        logger.info(f"Router LLM response received ({len(content)} chars)")
                    return content

                # Got an HTTP error
                err = error_body or ""

                # Auth error — stop immediately, no point retrying other models
                if status_code is not None and self._is_auth_error(status_code, err):
                    self.last_status_code = status_code
                    self.last_error_type = "auth"
                    self.last_error = f"Groq API authentication failed (HTTP {status_code}): API key is invalid or expired. Update GROQ_API_KEY in .env (get key from https://console.groq.com/keys)"
                    logger.error(self.last_error)
                    return None

                if status_code is not None and self._is_rate_limit_error(status_code, err):
                    self.last_status_code = status_code
                    self.last_error_type = "rate_limit"
                    self.last_retry_after_seconds = self._extract_retry_after_seconds(err)
                    self.last_error = f"Groq rate limit exceeded (HTTP {status_code}): {err}"
                    logger.error("Router LLM rate limit: status=%s, body=%s", status_code, err)
                    return None

                # Content-blocked — try next model
                if status_code is not None and self._is_content_blocked(status_code, err):
                    self.last_status_code = status_code
                    self.last_error_type = "content_blocked"
                    logger.warning(
                        f"Router LLM content-blocked on model={attempt_model}, "
                        f"status={status_code}. Trying next model..."
                    )
                    self.last_error = f"content-blocked on {attempt_model}"
                    continue

                # Other HTTP error — fail immediately
                self.last_status_code = status_code
                self.last_error_type = "http"
                self.last_error = f"Router LLM HTTP {status_code}: {err}"
                logger.error(f"Router LLM HTTP error: status={status_code}, body={err}")
                return None

            except requests.exceptions.Timeout:
                self.last_error_type = "timeout"
                self.last_error = f"Router LLM request timed out after {self.timeout_seconds:g}s"
                logger.error(self.last_error)
                return None
            except requests.exceptions.RequestException as e:
                self.last_error_type = "request"
                self.last_error = f"Router LLM request failed: {e}"
                logger.error(self.last_error)
                return None
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                self.last_error_type = "parse"
                self.last_error = f"Router LLM response parsing failed: {e}"
                logger.error(self.last_error)
                return None

        # All models were content-blocked
        self.last_error = f"All Router LLM models content-blocked (tried: {', '.join(models_to_try)})"
        logger.error(self.last_error)
        return None

    def structured_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> Optional[str]:
        """Call Router for structured JSON output.

        The transport protocol may change later; keep business logic decoupled
        from response parsing by routing all structured calls through this method.
        """
        return self.chat_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )
