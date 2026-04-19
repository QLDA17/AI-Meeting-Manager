import os
import logging
import re
import os
import logging
import re
import time
import random
from typing import Dict, Any, List, Optional
from src.providers.errors import ProviderError, ProviderErrorCode

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

from src.cost.cost_logger import CostLogger

logger = logging.getLogger(__name__)

class OpenAIAdapter:
    """OpenAI adapter for translation/summarization with standardized errors and retry logic."""
    
    def __init__(self, api_key: str = None, cost_logger: CostLogger = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.cost_logger = cost_logger
        self.client = None
        if HAS_OPENAI and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                logger.info("OpenAI client initialized.")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}. Falling back to mock.")
        else:
            logger.warning("OpenAI library or API key not found. Falling back to mock.")

    def chat_completion(self, system_prompt: str, user_prompt: str, model: str = "gpt-4o-mini") -> str:
        """Call chat completion API with standardized error handling and retry backoff."""
        if not self.client:
            return self._mock_fallback(user_prompt, model)

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    timeout=30.0
                )
                
                # Success! Log cost and return
                if self.cost_logger:
                    self._log_usage(model, response)
                
                return response.choices[0].message.content

            except Exception as e:
                err_msg = str(e).lower()
                code = self._map_error_code(err_msg)
                
                logger.error(f"OpenAI error [Attempt {attempt+1}/{max_retries}] [{code.value}]: {e}")
                
                # Retryable errors: 429 (Rate Limit), 500/502/503/504 (Server errors)
                if code in [ProviderErrorCode.RATE_LIMIT_HIT, ProviderErrorCode.QUOTA_EXHAUSTED, ProviderErrorCode.SERVICE_UNAVAILABLE] and attempt < max_retries - 1:
                    sleep_time = (2 ** attempt) + random.uniform(0.5, 1.5)
                    logger.info(f"Retrying OpenAI in {sleep_time:.2f}s...")
                    time.sleep(sleep_time)
                    continue
                else:
                    # Non-retryable or max retries reached
                    break

        return self._mock_fallback(user_prompt, model)

    def _map_error_code(self, err_msg: str) -> ProviderErrorCode:
        """Map raw error messages to internal ProviderErrorCode."""
        if "quota" in err_msg or "billing" in err_msg:
            return ProviderErrorCode.QUOTA_EXHAUSTED
        elif "rate_limit" in err_msg or "429" in err_msg:
            return ProviderErrorCode.RATE_LIMIT_HIT
        elif "timeout" in err_msg:
            return ProviderErrorCode.TIMEOUT
        elif "unavailable" in err_msg or "503" in err_msg or "502" in err_msg or "504" in err_msg:
            return ProviderErrorCode.SERVICE_UNAVAILABLE
        elif "model_not_found" in err_msg or "404" in err_msg:
            return ProviderErrorCode.MODEL_NOT_FOUND
        elif "invalid_api_key" in err_msg or "401" in err_msg:
            return ProviderErrorCode.INVALID_API_KEY
        return ProviderErrorCode.UNKNOWN_ERROR

    def _log_usage(self, model: str, response: Any):
        """Standardized cost logging for OpenAI."""
        try:
            prompt_tokens = response.usage.prompt_tokens
            completion_tokens = response.usage.completion_tokens
            total_tokens = response.usage.total_tokens
            
            # Pricing for gpt-4o-mini ($0.15/1M in, $0.60/1M out)
            cost = (prompt_tokens * 0.15 / 1_000_000) + (completion_tokens * 0.60 / 1_000_000)
            self.cost_logger.add_event(f"openai:{model}", total_tokens, cost, is_estimated=False)
        except Exception as e:
            logger.warning(f"Failed to log OpenAI usage: {e}")

    def _mock_fallback(self, user_prompt: str, model: str) -> str:
        """Mock fallback for OpenAI."""
        logger.info(f"Using mock LLM fallback for OpenAI:{model}.")
        return f"Mock translation of: {user_prompt[:100]}..."
