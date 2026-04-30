from fastapi import FastAPI
import random
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.cost.cost_logger import CostLogger
from src.api.database import SessionLocal
from src.api import models


app = FastAPI(title="Cost Admin API")
logger = CostLogger(monthly_hard_limit_usd=2.0)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "timestamp": str(datetime.now())}


@app.get("/admin/costs")
def get_admin_costs() -> dict:
    db: Session = SessionLocal()
    try:
        # Fetch costs from DB
        logs = db.query(models.AICostLog).all()
        total_cost = sum(log.cost_usd for log in logs)
        total_tokens = sum(log.tokens_input + log.tokens_output for log in logs)
        
        return {
            "events": len(logs),
            "tokens": total_tokens,
            "cost_usd": round(total_cost, 6),
            "actual_cost_usd": round(total_cost, 6), # For now, same as total
            "estimated_cost_usd": 0.0,
            "avg_cost_usd": round(total_cost / max(len(logs), 1), 6),
            "budget_usage_pct": round((total_cost / 2.0) * 100, 2),
        }
    finally:
        db.close()


@app.get("/admin/performance")
def get_admin_performance() -> dict:
    db: Session = SessionLocal()
    try:
        # Fetch metrics from DB
        metrics = db.query(models.AIQualityMetric).all()
        if not metrics:
            return {
                "stt_quality": {"wer": 0.0, "confidence": 0.0, "der": 0.0},
                "llm_quality": {"bleu": 0.0, "rouge_l": 0.0, "latency_sec": 0.0},
                "cost_efficiency": {"avg_cost_per_min": 0.0, "tokens_per_meeting": 0}
            }
        
        avg_bleu = sum(m.bleu_score for m in metrics) / len(metrics)
        avg_rouge = sum(m.rouge_l_score for m in metrics) / len(metrics)
        avg_wer = sum(m.wer_score for m in metrics) / len(metrics)
        avg_der = sum(m.der_score for m in metrics) / len(metrics)
        avg_latency = sum(m.latency_sec for m in metrics) / len(metrics)
        avg_confidence = sum(m.confidence_score for m in metrics) / len(metrics)
        
        return {
            "stt_quality": {
                "wer": round(avg_wer, 3),
                "confidence": round(avg_confidence, 3),
                "der": round(avg_der, 3)
            },
            "llm_quality": {
                "bleu": round(avg_bleu, 3),
                "rouge_l": round(avg_rouge, 3),
                "latency_sec": round(avg_latency, 2)
            },
            "cost_efficiency": {
                "avg_cost_per_min": 0.005,
                "tokens_per_meeting": 1500 # Simulated avg
            }
        }
    finally:
        db.close()
