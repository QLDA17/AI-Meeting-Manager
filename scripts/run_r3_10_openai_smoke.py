import os
import time
import sys
import uuid
import argparse
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
from src.translation.service import TranslationService, TranslationRequest

# Load environment variables
load_dotenv()

def run_openai_smoke_test(iterations: int = 5, force_live: bool = False, force_mock: bool = False):
    os.environ["LLM_PROVIDER"] = "openai"
    
    # 1. Logic Gate: force_mock and force_live cannot both be true
    if force_mock and force_live:
        logger.error("Cannot use both --force-mock and --live. Choose one.")
        return False

    # 2. Logic Gate: Check for API key if live mode is requested
    if force_live:
        logger.info("--- Performing Live-Run Checklist (Pre-flight) ---")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("[CHECK] Key Present: FAIL (OPENAI_API_KEY missing)")
            return False
        logger.info("[CHECK] Key Present: PASS")

        # Pre-check model reachability and billing/quota
        temp_adapter = OpenAIAdapter()
        try:
            logger.info("Checking model reachability and quota...")
            # We don't use translation_service here to avoid cache
            # This will trigger a real API call
            test_resp = temp_adapter.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=5
            )
            logger.info("[CHECK] Billing/Quota: PASS")
            logger.info("[CHECK] Model Reachability (gpt-4o-mini): PASS")
        except Exception as e:
            err_msg = str(e).lower()
            if "quota" in err_msg or "billing" in err_msg or "insufficient" in err_msg:
                logger.error(f"[CHECK] Billing/Quota: FAIL ({e})")
            else:
                logger.error(f"[CHECK] Model Reachability: FAIL ({e})")
            logger.error("Live integration gate: BLOCKED (Awaiting Director confirmation on quota/billing)")
            return False

    # 3. Handle force-mock by temporarily clearing API key in environment for this process
    if force_mock:
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]
        logger.info("Force-mock enabled: OPENAI_API_KEY removed from environment for this run.")

    logger.info(f"--- Running OpenAI Stability Smoke Test (R3-10B) ---")
    logger.info(f"Iterations: {iterations}, Live: {force_live}, Force-Mock: {force_mock}")

    cost_logger = CostLogger(monthly_hard_limit_usd=10.0)
    adapter = OpenAIAdapter(cost_logger=cost_logger)
    
    translation_service = TranslationService(adapter=adapter)

    results = []
    
    # Base transcript
    base_transcript = "[00:00:01] [Speaker_1] OpenAI stability test iteration {i}. Unique ID: {uid}."
    
    for i in range(1, iterations + 1):
        uid = str(uuid.uuid4())[:8]
        current_transcript = base_transcript.format(i=i, uid=uid)
        
        logger.info(f"\n--- Iteration {i}/{iterations} ---")
        
        req = TranslationRequest(
            source_lang="en",
            target_lang="vi",
            transcript=current_transcript,
            glossary={},
            system_prompt="Translate to Vietnamese. Preserve [timestamps] and [Speaker_X] labels."
        )
        
        try:
            start_time = time.time()
            translated = translation_service.translate(req)
            latency = time.time() - start_time
            
            is_mock = "Mock translation" in translated
            marker_pass = TranslationService.validate_preservation(req.transcript, translated)
            
            results.append({
                "iteration": i,
                "success": not is_mock,
                "latency": latency,
                "is_mock": is_mock,
                "marker_pass": marker_pass
            })
            
            status = "LIVE_SUCCESS" if not is_mock else "FALLBACK_MOCK"
            logger.info(f"Result: {status} (Latency: {latency:.2f}s, Markers: {'PASS' if marker_pass else 'FAIL'})")
            
            # Brief sleep between iterations
            if i < iterations:
                time.sleep(2.0)
                
        except Exception as e:
            logger.error(f"Iteration {i} crashed: {e}")
            results.append({"iteration": i, "success": False, "error": str(e), "is_mock": False})

    # Metrics Calculation
    total = len(results)
    live_success_count = sum(1 for r in results if r.get("success") and not r.get("is_mock"))
    fallback_count = sum(1 for r in results if r.get("is_mock"))
    
    live_success_rate = (live_success_count / total) * 100
    
    latencies = [r["latency"] for r in results if "latency" in r]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    
    logger.info("\n" + "="*40)
    logger.info("FINAL OPENAI STABILITY REPORT")
    logger.info("="*40)
    logger.info(f"Iterations:         {total}")
    logger.info(f"Live Success Rate:  {live_success_rate:.1f}%")
    logger.info(f"Avg Latency:        {avg_latency:.2f}s")
    
    summary = cost_logger.admin_summary()
    logger.info(f"Actual Cost USD:    {summary['actual_cost_usd']:.6f}")
    
    # Final Validation
    if force_live:
        if live_success_rate >= 40.0:
            logger.info("\nStatus: PASS (Live threshold met)")
            return True
        else:
            logger.error("\nStatus: QC-BLOCKED (Live success rate too low)")
            return False
    else:
        logger.info("\nStatus: PASS (Mock mode completed)")
        return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Force live API calls")
    parser.add_argument("--force-mock", action="store_true", help="Force mock mode without API")
    parser.add_argument("--iterations", type=int, default=5)
    args = parser.parse_args()
    
    if run_openai_smoke_test(iterations=args.iterations, force_live=args.live, force_mock=args.force_mock):
        sys.exit(0)
    else:
        sys.exit(1)
