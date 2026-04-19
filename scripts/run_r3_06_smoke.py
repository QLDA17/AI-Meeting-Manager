import os
import time
import sys
import requests
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
from src.providers.llm import OpenAIAdapter
from src.translation.service import TranslationService, TranslationRequest, MarkerPreservationError

# Load environment variables
load_dotenv()

def run_openai_smoke_test():
    logger.info("--- Running OpenAI Live Integration Smoke Test (R3-06) ---")

    # 1. Initialize CostLogger and OpenAIAdapter
    cost_logger = CostLogger(monthly_hard_limit_usd=float(os.getenv("COST_HARD_LIMIT_USD", "2.0")))
    openai_adapter = OpenAIAdapter(api_key=os.getenv("OPENAI_API_KEY"), cost_logger=cost_logger)
    translation_service = TranslationService(adapter=openai_adapter)

    # Check if OpenAI client was initialized (i.e., API key is present and valid)
    if not openai_adapter.client:
        logger.error("OpenAI client not initialized. Skipping live tests. Ensure OPENAI_API_KEY is set correctly.")
        return False

    # 2. Translation and Marker Preservation Guard
    logger.info("\n--- Testing Translation and Marker Preservation ---")
    sample_transcript = "[00:00:01] [Speaker_1] Hello." # Minimal payload
    sample_glossary = {} # No glossary for minimal test
    
    max_retries = 3
    initial_delay = 10 # seconds
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempt {attempt + 1}/{max_retries} for OpenAI translation...")
            req = TranslationRequest(
                source_lang="en", # Use English for minimal test
                target_lang="vi",
                transcript=sample_transcript,
                glossary=sample_glossary,
                system_prompt="You are a professional translator. Preserve all [timestamps] and [speaker labels] exactly as they are. Translate the text."
            )
            translated_text = translation_service.translate(req)
            logger.info(f"Original: {sample_transcript}")
            logger.info(f"Translated: {translated_text}")

            if TranslationService.validate_preservation(sample_transcript, translated_text):
                logger.info("Marker preservation: PASSED")
            else:
                logger.error("Marker preservation: FAILED. Translated text corrupted markers.")
                return False
                
            # If successful, break retry loop
            break
            
        except MarkerPreservationError as e:
            logger.error(f"Marker preservation error: {e}")
            return False
        except Exception as e:
            error_message = str(e)
            status_code = getattr(e, 'status_code', None)
            response_body = getattr(e, 'response', None) and getattr(e.response, 'text', None)
            request_id = getattr(e, 'request_id', None)
            
            logger.error(f"OpenAI translation failed (Attempt {attempt + 1}): {error_message}")
            if status_code:
                logger.error(f"Status Code: {status_code}")
            if response_body:
                logger.error(f"Response Body: {response_body}")
            if request_id:
                logger.error(f"Request ID: {request_id}")

            # Classify error
            if status_code in [401, 403]:
                logger.error("Error Type: Authentication/Permission (401/403). Check API key or billing.")
                return False # Fatal error, no retry
            elif status_code == 429:
                logger.warning("Error Type: Rate Limit (429). Retrying with backoff.")
            elif status_code and status_code >= 500:
                logger.warning("Error Type: Server Error (5xx). Retrying with backoff.")
            else:
                logger.warning("Error Type: Unknown/Other. Retrying with backoff.")
            
            if attempt < max_retries - 1:
                delay = initial_delay * (2 ** attempt)
                logger.info(f"Waiting {delay:.2f}s before next retry...")
                time.sleep(delay)
            else:
                logger.error(f"OpenAI translation failed after {max_retries} attempts. Fallback to mock active.")
                # If all retries fail, the service will use its internal mock fallback.
                # For this smoke test, we consider it a failure to integrate live.
                return False

    else: # This else block executes if the loop completes without a 'break'
        logger.error("OpenAI translation failed after all retries. Live integration failed.")
        return False

    # 3. Cost Validation
    logger.info("\n--- Testing Cost Logging ---")
    current_cost = cost_logger.current_month_cost()
    if current_cost > 0:
        logger.info(f"CostLogger recorded cost: ${current_cost:.6f}")
        logger.info("Cost logging: PASSED")
    else:
        logger.error("Cost logging: FAILED. No cost recorded after successful OpenAI call.")
        return False

    # 4. Health and Reliability (FastAPI endpoints)
    logger.info("\n--- Testing FastAPI Endpoints ---")
    fastapi_base_url = "http://localhost:8000" # Assuming FastAPI runs on this port

    try:
        health_response = requests.get(f"{fastapi_base_url}/health")
        if health_response.status_code == 200 and health_response.json().get("status") == "ok":
            logger.info(f"GET /health: PASSED ({health_response.json()})")
        else:
            logger.error(f"GET /health: FAILED ({health_response.status_code} - {health_response.text})")
            return False
    except requests.exceptions.ConnectionError:
        logger.warning(f"FastAPI server not running at {fastapi_base_url}. Skipping API endpoint tests.")
        # This is a warning, not a hard fail for the smoke test, as FastAPI might not be running yet.
    except Exception as e:
        logger.error(f"Error testing /health endpoint: {e}")
        return False

    try:
        admin_costs_response = requests.get(f"{fastapi_base_url}/admin/costs")
        if admin_costs_response.status_code == 200 and "cost_usd" in admin_costs_response.json():
            logger.info(f"GET /admin/costs: PASSED ({admin_costs_response.json()})")
        else:
            logger.error(f"GET /admin/costs: FAILED ({admin_costs_response.status_code} - {admin_costs_response.text})")
            return False
    except requests.exceptions.ConnectionError:
        logger.warning(f"FastAPI server not running at {fastapi_base_url}. Skipping API endpoint tests.")
    except Exception as e:
        logger.error(f"Error testing /admin/costs endpoint: {e}")
        return False

    logger.info("\n--- OpenAI Live Integration Smoke Test: ALL PASSED (with warnings if FastAPI not running) ---")
    return True

if __name__ == "__main__":
    if run_openai_smoke_test():
        sys.exit(0)
    else:
        sys.exit(1)
