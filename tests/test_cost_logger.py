from datetime import datetime

from src.cost.cost_logger import CostLogger


def test_budget_trigger():
    logger = CostLogger(monthly_hard_limit_usd=2.0)
    assert logger.add_event("gpt-4o-mini", 1000, 1.2) is False
    assert logger.add_event("gpt-4o-mini", 900, 0.9) is True


def test_admin_summary_and_sla():
    logger = CostLogger(monthly_hard_limit_usd=2.0)
    logger.add_event("gpt-4o-mini", 500, 0.5)
    summary = logger.admin_summary()
    assert summary["cost_usd"] == 0.5
    assert summary["budget_usage_pct"] == 25.0

    now = datetime.utcnow()
    due = logger.alert_due_at(now)
    assert (due - now).seconds <= 300
