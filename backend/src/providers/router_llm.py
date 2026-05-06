import os
import json
import logging
from typing import Optional

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

logger = logging.getLogger(__name__)


class RouterLLMAdapter:
    """Router API adapter for LLM calls (OpenAI-compatible format)."""

    def __init__(self):
        self.api_url = os.getenv("ROUTER_API_URL", "")
        self.api_key = os.getenv("ROUTER_API_KEY", "")
        self.model = os.getenv("ROUTER_MODEL", "gpt-4o-mini")
        self.enabled = bool(self.api_url and self.api_key and HAS_REQUESTS)

        if not self.enabled:
            reasons = []
            if not self.api_url:
                reasons.append("ROUTER_API_URL not set")
            if not self.api_key:
                reasons.append("ROUTER_API_KEY not set")
            if not HAS_REQUESTS:
                reasons.append("requests library not installed")
            logger.warning(f"Router LLM disabled: {', '.join(reasons)}")

    def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> Optional[str]:
        """Call router API with OpenAI-compatible chat completion format."""
        if not self.enabled:
            logger.warning("Router LLM not configured, skipping.")
            return None

        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            }

            payload = {
                "model": self.model,
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
                timeout=60,
            )
            response.raise_for_status()

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            logger.info(f"Router LLM response received ({len(content)} chars)")
            return content

        except requests.exceptions.Timeout:
            logger.error("Router LLM request timed out (60s)")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Router LLM request failed: {e}")
            return None
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            logger.error(f"Router LLM response parsing failed: {e}")
            return None
