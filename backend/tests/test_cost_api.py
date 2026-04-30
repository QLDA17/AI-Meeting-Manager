from src.cost.api import get_admin_costs, logger


def test_admin_costs_endpoint_contract():
    logger.events.clear()
    logger.add_event("gpt-4o-mini", 100, 0.1)
    payload = get_admin_costs()
    assert "cost_usd" in payload
    assert "budget_usage_pct" in payload
    assert payload["cost_usd"] >= 0.1
