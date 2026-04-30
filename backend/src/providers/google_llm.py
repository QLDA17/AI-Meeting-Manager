import os
import logging
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Deque
from collections import deque
from datetime import datetime, timedelta

try:
    from google import genai
    from google.genai import types
    HAS_GOOGLE_GENAI = True
except ImportError:
    HAS_GOOGLE_GENAI = False

from src.cost.cost_logger import CostLogger
from src.providers.errors import ProviderError, ProviderErrorCode

logger = logging.getLogger(__name__)

class GoogleLLMAdapter:
    """Google Gemini adapter using the new google-genai SDK with adaptive traffic shaping and health scores."""
    
    def __init__(self, api_key: str = None, cost_logger: CostLogger = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        self.cost_logger = cost_logger
        self.client = None
        # Per-model cooldown tracking
        self.model_cooldowns: Dict[str, datetime] = {}
        # Per-model health scores (rolling window of last 10 attempts)
        self.model_health: Dict[str, Deque[bool]] = {}
        
        # Adaptive traffic shaping: base delay multiplier
        self.adaptive_delay_multiplier = 1.0
        
        # Priority list for model rotation
        self.preferred_models = [
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ]
        
        # Global cooldown across all models to prevent spamming
        self.global_cooldown_until: Optional[datetime] = None
        
        if HAS_GOOGLE_GENAI and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized.")
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI client: {e}. Falling back to mock.")
        else:
            logger.warning("google-genai library or API key not found. Falling back to mock.")

    def list_available_models(self) -> List[str]:
        """List available models for the current API key."""
        if not self.client:
            return []
        try:
            models = []
            for model in self.client.models.list():
                # The response object is a simple namespace or object, not a dict
                models.append(model.name)
            return models
        except Exception as e:
            logger.error(f"Failed to list Google models: {e}")
            return [f"models/{m}" for m in self.preferred_models]

    def _get_cooldown_wait(self, model: str) -> float:
        """Check if a specific model is in cooldown."""
        cooldown_until = self.model_cooldowns.get(model)
        if cooldown_until and datetime.utcnow() < cooldown_until:
            return (cooldown_until - datetime.utcnow()).total_seconds()
        return 0.0

    def _update_health(self, model: str, success: bool):
        """Update the health score of a model (success/fail)."""
        if model not in self.model_health:
            self.model_health[model] = deque(maxlen=10)
        self.model_health[model].append(success)
        
        # Adaptive scaling: on failure increase delay multiplier, on success slowly decrease it
        if not success:
            self.adaptive_delay_multiplier = min(5.0, self.adaptive_delay_multiplier * 1.5)
            logger.info(f"Health check failed for {model}. Delay multiplier increased to {self.adaptive_delay_multiplier:.2f}")
        else:
            self.adaptive_delay_multiplier = max(1.0, self.adaptive_delay_multiplier * 0.9)
            logger.info(f"Health check passed for {model}. Delay multiplier decreased to {self.adaptive_delay_multiplier:.2f}")

    def _get_health_score(self, model: str) -> float:
        """Calculate success rate for a model (default 1.0)."""
        if model not in self.model_health or not self.model_health[model]:
            return 1.0
        history = self.model_health[model]
        return sum(1 for x in history if x) / len(history)

    def chat_completion(self, system_prompt: str, user_prompt: str, model: str = None) -> str:
        """Call Gemini with adaptive traffic shaping, health scores, and model rotation."""
        if not self.client:
            return self._mock_fallback(user_prompt, model or "unknown")

        # 0. Check global cooldown
        if self.global_cooldown_until and datetime.utcnow() < self.global_cooldown_until:
            wait_sec = (self.global_cooldown_until - datetime.utcnow()).total_seconds()
            logger.warning(f"Global cooldown active for {wait_sec:.1f}s. Using mock fallback.")
            return self._mock_fallback(user_prompt, "global_cooldown")

        # 1. Prepare candidates: sorted by health score
        available_models = self.list_available_models()
        candidates = []
        if model:
            candidates.append(model if model.startswith("models/") else f"models/{model}")
        
        for p_model in self.preferred_models:
            full_p = f"models/{p_model}"
            if full_p in available_models and full_p not in candidates:
                candidates.append(full_p)
        
        # Sort candidates by health score descending (higher success rate first)
        candidates.sort(key=lambda m: self._get_health_score(m), reverse=True)
        
        # 2. Try candidates
        max_retries_per_model = 2
        
        for target_model in candidates:
            # Check per-model cooldown
            wait_sec = self._get_cooldown_wait(target_model)
            if wait_sec > 0:
                logger.info(f"Model {target_model} in cooldown for {wait_sec:.1f}s. Skipping.")
                continue

            for attempt in range(max_retries_per_model):
                try:
                    # Adaptive delay before each attempt (except the first if no errors recently)
                    if self.adaptive_delay_multiplier > 1.0:
                        sleep_time = random.uniform(2.0, 5.0) * self.adaptive_delay_multiplier
                        logger.info(f"Adaptive shaping: sleeping for {sleep_time:.1f}s...")
                        time.sleep(sleep_time)

                    logger.info(f"Attempting {target_model} (Attempt {attempt+1})...")
                    response = self.client.models.generate_content(
                        model=target_model,
                        contents=user_prompt,
                        config={
                            'system_instruction': system_prompt,
                            'temperature': 0.1
                        }
                    )
                    
                    # Success!
                    self._update_health(target_model, True)
                    if self.cost_logger:
                        self._log_usage(target_model, system_prompt, user_prompt, response)
                    
                    return response.text

                except Exception as e:
                    self._update_health(target_model, False)
                    err_msg = str(e).lower()
                    
                    if "429" in err_msg or "quota" in err_msg:
                        # Per-model cooldown: increased on fail
                        jitter = random.uniform(5.0, 15.0)
                        cooldown_secs = 30.0 * self.adaptive_delay_multiplier + jitter
                        self.model_cooldowns[target_model] = datetime.utcnow() + timedelta(seconds=cooldown_secs)
                        logger.error(f"Google API 429 for {target_model}. Cooldown: {cooldown_secs:.1f}s.")
                        
                        if attempt == max_retries_per_model - 1:
                            global_jitter = random.uniform(10.0, 20.0)
                            self.global_cooldown_until = datetime.utcnow() + timedelta(seconds=20.0 + global_jitter)
                            logger.warning(f"Model {target_model} exhausted. Global cooldown set.")
                        
                        # Standardized error wrapping
                        p_error = ProviderError(ProviderErrorCode.QUOTA_EXHAUSTED, f"Quota hit for {target_model}", e)
                        
                        if attempt < max_retries_per_model - 1:
                            sleep_time = (5 ** attempt) * self.adaptive_delay_multiplier + random.uniform(1.0, 3.0)
                            logger.info(f"Retrying same model in {sleep_time:.1f}s...")
                            time.sleep(sleep_time)
                        else:
                            break # Try next model
                    
                    elif "404" in err_msg:
                        logger.error(f"Model {target_model} not found.")
                        break
                    elif "503" in err_msg or "unavailable" in err_msg:
                        logger.error(f"Google service unavailable for {target_model}.")
                        # Small cooldown for 503
                        self.model_cooldowns[target_model] = datetime.utcnow() + timedelta(seconds=15.0)
                        break
                    else:
                        logger.error(f"Google API error for {target_model}: {e}")
                        break

        # 3. Final Fallback if all candidates fail
        return self._mock_fallback(user_prompt, "exhausted_candidates")

    def _log_usage(self, model: str, system_prompt: str, user_prompt: str, response: Any):
        """Log token usage and cost."""
        prompt_tokens = 0
        completion_tokens = 0
        is_estimated = False
        
        try:
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                prompt_tokens = response.usage_metadata.prompt_token_count or 0
                completion_tokens = response.usage_metadata.candidates_token_count or 0
        except Exception:
            pass
        
        if prompt_tokens == 0:
            prompt_tokens = len(user_prompt + system_prompt) // 4
            completion_tokens = len(response.text) // 4
            is_estimated = True
        
        # Approximate Pricing ($0.075 / 1M in, $0.30 / 1M out)
        cost = (prompt_tokens * 0.075 / 1_000_000) + (completion_tokens * 0.30 / 1_000_000)
        self.cost_logger.add_event(f"google:{model}", prompt_tokens + completion_tokens, cost, is_estimated=is_estimated)

    def _mock_fallback(self, user_prompt: str, model: str) -> str:
        """Final safety net."""
        logger.info(f"All Google models failed. Using mock fallback for {model}.")
        return f"Mock Google translation of: {user_prompt[:100]}..."
