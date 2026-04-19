import os
import time
import sys
import uuid
import argparse
from pathlib import Path
from dotenv import load_dotenv
import logging
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add root to sys.path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.cost.cost_logger import CostLogger
from src.providers.google_llm import GoogleLLMAdapter
from src.translation.service import TranslationService, TranslationRequest

# Load environment variables
load_dotenv()

def run_hardened_smoke_test(profile: str = "quick"):
    iterations = 5 if profile == "quick" else 30
    os.environ["LLM_PROVIDER"] = "google"
    logger.info(f"--- Running Hardened Stability Smoke Test (R3-09E) - Profile: {profile} ({iterations} iterations) ---")

    cost_logger = CostLogger(monthly_hard_limit_usd=10.0)
    adapter = GoogleLLMAdapter(cost_logger=cost_logger)
    translation_service = TranslationService(adapter=adapter)

    results = []
    model_usage = Counter()
    
    # Base transcript to be made unique
    base_transcript = "[00:00:01] [Speaker_1] Stability test iteration {i}. Unique ID: {uid}."
    
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
            
            is_mock = any(m in translated for m in ["Mock", "exhausted_candidates", "global_cooldown"])
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
            
            # Inter-iteration sleep to stay within free-tier RPM
            if i < iterations:
                base_sleep = 10.0 if profile == "quick" else 20.0
                sleep_sec = base_sleep + (i % 5) * 2.0
                logger.info(f"Sleeping for {sleep_sec}s...")
                time.sleep(sleep_sec)
                
        except Exception as e:
            logger.error(f"Iteration {i} crashed: {e}")
            results.append({"iteration": i, "success": False, "error": str(e), "is_mock": False})

    # Metrics Calculation
    total = len(results)
    live_success_count = sum(1 for r in results if r.get("success") and not r.get("is_mock"))
    fallback_count = sum(1 for r in results if r.get("is_mock"))
    
    live_success_rate = (live_success_count / total) * 100
    fallback_rate = (fallback_count / total) * 100
    
    latencies = [r["latency"] for r in results if "latency" in r]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    p95_latency = sorted(latencies)[int(len(latencies)*0.95)] if latencies else 0.0
    
    logger.info("\n" + "="*40)
    logger.info(f"FINAL STABILITY REPORT ({profile.upper()})")
    logger.info("="*40)
    logger.info(f"Iterations:         {total}")
    logger.info(f"Live Success Rate:  {live_success_rate:.1f}%")
    logger.info(f"Fallback Rate:      {fallback_rate:.1f}%")
    logger.info(f"Avg Latency:        {avg_latency:.2f}s")
    logger.info(f"P95 Latency:        {p95_latency:.2f}s")
    
    summary = cost_logger.admin_summary()
    logger.info(f"Actual Cost USD:    {summary['actual_cost_usd']:.6f}")
    logger.info(f"Estimated Cost USD: {summary['estimated_cost_usd']:.6f}")
    
    # Model breakdown from adapter
    logger.info(f"Model Health:       { {m: adapter._get_health_score(m) for m in adapter.model_health} }")
    
    # Validation
    if live_success_rate >= 40.0:
        logger.info("\nStatus: PASS")
        return True
    elif live_success_rate >= 20.0:
        logger.warning(f"\nStatus: PASS_WITH_LIMITATIONS")
        return True
    else:
        logger.error("\nStatus: FAIL")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["quick", "soak"], default="quick")
    args = parser.parse_args()
    
    if run_hardened_smoke_test(profile=args.profile):
        sys.exit(0)
    else:
        sys.exit(1)
