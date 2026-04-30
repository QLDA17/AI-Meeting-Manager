from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Any


@dataclass
class CostEvent:
    at: datetime
    model: str
    tokens: int
    cost_usd: float
    is_estimated: bool = False


@dataclass
class CostLogger:
    monthly_hard_limit_usd: float = 2.0
    events: List[CostEvent] = field(default_factory=list)

    def add_event(self, model: str, tokens: int, cost_usd: float, is_estimated: bool = False) -> bool:
        self.events.append(
            CostEvent(at=datetime.utcnow(), model=model, tokens=tokens, cost_usd=cost_usd, is_estimated=is_estimated)
        )
        return self.current_month_cost() >= self.monthly_hard_limit_usd

    def current_month_cost(self) -> float:
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        return round(
            sum(e.cost_usd for e in self.events if e.at >= month_start),
            6,
        )

    def admin_summary(self) -> Dict[str, Any]:
        total_tokens = sum(e.tokens for e in self.events)
        total_cost = sum(e.cost_usd for e in self.events)
        actual_cost = sum(e.cost_usd for e in self.events if not e.is_estimated)
        estimated_cost = sum(e.cost_usd for e in self.events if e.is_estimated)
        avg_per_call = total_cost / max(len(self.events), 1)
        return {
            "events": float(len(self.events)),
            "tokens": float(total_tokens),
            "cost_usd": round(total_cost, 6),
            "actual_cost_usd": round(actual_cost, 6),
            "estimated_cost_usd": round(estimated_cost, 6),
            "avg_cost_usd": round(avg_per_call, 6),
            "budget_usage_pct": round((total_cost / self.monthly_hard_limit_usd) * 100, 2),
        }

    @staticmethod
    def alert_due_at(triggered_at: datetime) -> datetime:
        # Contract for "<5 minutes" alert SLA.
        return triggered_at + timedelta(minutes=5)
