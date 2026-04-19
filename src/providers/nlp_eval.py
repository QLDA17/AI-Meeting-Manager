import sacrebleu
from jiwer import wer
from typing import Dict, List, Any


class NLPEvaluationService:
    @staticmethod
    def calculate_bleu(reference: str, hypothesis: str) -> float:
        """Calculates BLEU score for translation quality."""
        try:
            bleu = sacrebleu.corpus_bleu([hypothesis], [[reference]])
            return round(bleu.score / 100.0, 4)  # Normalize to 0-1
        except Exception as e:
            print(f"Error calculating BLEU: {e}")
            return 0.0

    @staticmethod
    def calculate_wer(reference: str, hypothesis: str) -> float:
        """Calculates Word Error Rate for STT quality."""
        try:
            error_rate = wer(reference, hypothesis)
            return round(error_rate, 4)
        except Exception as e:
            print(f"Error calculating WER: {e}")
            return 1.0  # Max error

    @staticmethod
    def calculate_rouge_l(reference: str, hypothesis: str) -> float:
        """Simplified ROUGE-L implementation based on longest common subsequence."""
        # For simplicity in this demo, we'll use a placeholder or simplified logic.
        # In a real app, we'd use the 'rouge-score' library.
        def lcs(x: List[str], y: List[str]) -> int:
            n, m = len(x), len(y)
            table = [[0] * (m + 1) for _ in range(n + 1)]
            for i in range(1, n + 1):
                for j in range(1, m + 1):
                    if x[i - 1] == y[j - 1]:
                        table[i][j] = table[i - 1][j - 1] + 1
                    else:
                        table[i][j] = max(table[i - 1][j], table[i][j - 1])
            return table[n][m]

        ref_tokens = reference.split()
        hyp_tokens = hypothesis.split()
        if not ref_tokens or not hyp_tokens:
            return 0.0
        
        lcs_val = lcs(ref_tokens, hyp_tokens)
        precision = lcs_val / len(hyp_tokens)
        recall = lcs_val / len(ref_tokens)
        
        if precision + recall == 0:
            return 0.0
        
        f1 = (2 * precision * recall) / (precision + recall)
        return round(f1, 4)

    def evaluate_quality(self, reference: str, hypothesis: str) -> Dict[str, float]:
        """Comprehensive evaluation of text quality."""
        return {
            "bleu": self.calculate_bleu(reference, hypothesis),
            "wer": self.calculate_wer(reference, hypothesis),
            "rouge_l": self.calculate_rouge_l(reference, hypothesis)
        }
