from dataclasses import dataclass
import json
from pathlib import Path
from typing import List
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.translation.service import TranslationService


@dataclass
class PromptVariantResult:
    prompt_id: str
    bleu: float
    rouge_l: float
    est_cost_usd: float


def choose_best(results: List[PromptVariantResult]) -> PromptVariantResult:
    # Weighted for quality first, then cost.
    return sorted(
        results, key=lambda r: (r.bleu * 0.7 + r.rouge_l * 0.3 - r.est_cost_usd)
    )[-1]


def main() -> None:
    svc = TranslationService()
    dataset_path = ROOT / "data" / "ab_test_dataset.jsonl"
    rows = []
    with dataset_path.open("r", encoding="utf-8") as f:
        for line in f:
            rows.append(json.loads(line))

    def avg_bleu(key: str) -> float:
        scores = [svc.bleu_score(r["reference"], r[key]) for r in rows]
        return sum(scores) / max(len(scores), 1)

    def avg_rouge(key: str) -> float:
        scores = [r[key] for r in rows]
        return sum(scores) / max(len(scores), 1)

    candidates = [
        PromptVariantResult("translation_v1", avg_bleu("v1"), avg_rouge("rouge_v1"), 0.0008),
        PromptVariantResult("translation_v2", avg_bleu("v2"), avg_rouge("rouge_v2"), 0.0009),
        PromptVariantResult("translation_v3", avg_bleu("v3"), avg_rouge("rouge_v3"), 0.0010),
    ]
    winner = choose_best(candidates)
    baseline = candidates[0]
    quality_delta = ((winner.bleu - baseline.bleu) / max(baseline.bleu, 1e-9)) * 100
    print("A/B Summary")
    for item in candidates:
        print(
            f"{item.prompt_id}: BLEU={item.bleu:.2f}, RougeL={item.rouge_l:.2f}, Cost={item.est_cost_usd:.4f}"
        )
    print(f"Winner: {winner.prompt_id}")
    print(f"Improvement_vs_baseline: {quality_delta:.2f}%")


if __name__ == "__main__":
    main()
