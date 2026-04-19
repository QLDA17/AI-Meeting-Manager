from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class RouteResult:
    domain: str
    agent_id: str


class CrewRouter:
    """Deterministic keyword router for CrewAI task dispatch."""

    def __init__(self) -> None:
        self.rules: Dict[str, Dict[str, List[str]]] = {
            "technical": {
                "backend_audio_agent": ["audio", "noise", "chunk", "record"],
                "backend_core_agent": ["stt", "summary", "translate", "api"],
                "frontend_agent": ["dashboard", "ui", "websocket", "export"],
                "db_designer_agent": ["schema", "migration", "index", "seed"],
                "devops_agent": ["deploy", "docker", "ci", "cd"],
                "architect_agent": ["integrate", "architecture", "routing"],
            },
            "schedule_cost": {
                "cost_estimator_agent": ["cost", "budget", "token", "usd"],
                "resource_optimizer_agent": ["cache", "redis", "batch", "optimize"],
                "prompt_engineer_agent": ["prompt", "ab test", "yaml", "baseline"],
                "tech_writer_agent": ["readme", "doc", "changelog", "swagger"],
            },
            "quality": {
                "qa_tester_agent": ["test", "e2e", "regression", "integration"],
                "security_auditor_agent": ["security", "owasp", "tls", "injection"],
                "nlp_evaluator_agent": ["bleu", "rouge", "wer", "accuracy"],
                "diarization_specialist": ["speaker", "diarization", "der", "align"],
                "spellcheck_agent": ["spell", "proper noun", "glossary", "typo"],
            },
        }

    def route(self, task_text: str) -> RouteResult:
        text = task_text.strip().lower()
        best = ("technical", "architect_agent", -1)
        for domain, agents in self.rules.items():
            for agent_id, keywords in agents.items():
                score = sum(1 for kw in keywords if kw in text)
                if score > best[2]:
                    best = (domain, agent_id, score)
        return RouteResult(domain=best[0], agent_id=best[1])
