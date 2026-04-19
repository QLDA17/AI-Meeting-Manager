import os
import time
import sys
from pathlib import Path
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add root to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.cost.cost_logger import CostLogger
from src.providers.google_llm import GoogleLLMAdapter
from src.translation.service import TranslationService, TranslationRequest, MarkerPreservationError

# Load environment variables
load_dotenv()

def run_google_smoke_test():
    os.environ["LLM_PROVIDER"] = "google"
    logger.info("--- Running Google LLM Live Smoke Test (R3-08) ---")

    # 1. Initialize Adapter
    cost_logger = CostLogger(monthly_hard_limit_usd=float(os.getenv("COST_HARD_LIMIT_USD", "2.0")))
    adapter = GoogleLLMAdapter(cost_logger=cost_logger)
    
    if not adapter.client:
        logger.error("Google client not initialized. Check GOOGLE_API_KEY.")
        return False

    # 2. List Models
    logger.info("\n--- Step 1: Listing Available Models ---")
    available_models = adapter.list_available_models()
    logger.info(f"Available models: {available_models}")

    # 3. Select Models to try
    # We will try these models in order if we hit 429
    candidate_models = [
        "models/gemini-2.0-flash-lite-preview",
        "models/gemini-2.0-flash-lite",
        "models/gemini-1.5-flash-lite-latest",
        "models/gemini-flash-latest",
        "models/gemini-1.5-flash",
        "models/gemini-2.0-flash"
    ]
    
    # Filter only available ones
    models_to_try = [m for m in candidate_models if m in available_models]
    if not models_to_try:
        # Fallback to whatever is available if candidates not found
        models_to_try = [m for m in available_models if "flash" in m][:3]
    
    if not models_to_try:
         models_to_try = ["models/gemini-2.0-flash"]

    logger.info(f"Models to try in sequence: {models_to_try}")

    # 4. Run Live Translation with Multi-Model Fallback and Retry
    logger.info("\n--- Step 2: Running Live Translation ---")
    translation_service = TranslationService(adapter=adapter, fail_fast=True)
    
    sample_transcript = "[00:00:01] [Speaker_1] Chào buổi sáng. Đây là bài test tích hợp Google Gemini SDK mới."
    req = TranslationRequest(
        source_lang="vi",
        target_lang="en",
        transcript=sample_transcript,
        glossary={"Google Gemini": "Google's Gemini SDK"},
        system_prompt="You are a professional translator. Preserve all [timestamps] and [speaker labels] exactly as they are. Translate the text."
    )
    
    success = False
    for current_model in models_to_try:
        logger.info(f"Testing with model: {current_model}...")
        
        max_retries = 2
        retry_delay = 2 # seconds
        
        for attempt in range(max_retries):
            try:
                # We need to pass the model to the adapter
                # Since TranslationService uses adapter.chat_completion(..., model="...")
                # and currently it's hardcoded to "gemini-2.0-flash" in the call if not specified.
                # Let's override the adapter's chat_completion or pass it via req.
                
                # For this smoke test, we'll manually call adapter.chat_completion
                translated_text = adapter.chat_completion(
                    system_prompt=req.system_prompt,
                    user_prompt=req.transcript,
                    model=current_model
                )
                
                # Check for mock fallback in output
                if "Mock Google translation" in translated_text:
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} for {current_model} returned mock (Rate Limit?). Retrying...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        logger.warning(f"Model {current_model} failed (Mock Fallback). Trying next model...")
                        break # Try next model

                logger.info(f"SUCCESS with model {current_model}!")
                logger.info(f"Original: {sample_transcript}")
                logger.info(f"Translated: {translated_text}")
                success = True
                break # Success with this model!

            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} for {current_model} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    break # Try next model
        
        if success:
            break
    
    if not success:
        logger.error("Test FAILED: All models failed or fell back to mock.")
        return False

    # 5. Validate Markers
    try:
        if TranslationService.validate_preservation(sample_transcript, translated_text):
            logger.info("Marker preservation: PASSED")
        else:
            logger.error("Marker preservation: FAILED")
            return False

        # 6. Verify Cost Logging
        logger.info("\n--- Step 3: Verifying Cost Logging ---")
        current_cost = cost_logger.current_month_cost()
        if current_cost > 0:
            logger.info(f"Cost recorded: ${current_cost:.8f}")
            last_event = cost_logger.events[-1] if cost_logger.events else None
            logger.info(f"Last cost event: {last_event}")
            logger.info("Cost logging: PASSED")
        else:
            logger.error("Cost logging: FAILED. No cost recorded.")
            return False

    except MarkerPreservationError as e:
        logger.error(f"Marker preservation error: {e}")
        return False
    except Exception as e:
        logger.error(f"Post-translation validation failed: {e}")
        return False

    logger.info("\n--- Google LLM Live Smoke Test: ALL PASSED ---")
    return True

if __name__ == "__main__":
    if run_google_smoke_test():
        sys.exit(0)
    else:
        sys.exit(1)
