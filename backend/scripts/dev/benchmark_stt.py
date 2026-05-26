import time
import sys
import os
from pathlib import Path
from typing import Dict, Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.providers.stt import WhisperProvider
from src.providers.phowhisper import PhowhisperProvider

try:
    from jiwer import wer
except ImportError:
    print("Error: 'jiwer' library is mandatory for benchmark.")
    sys.exit(1)

def run_benchmark(audio_path: str, reference_text: str):
    # Check if we should use mock or real
    force_mock = os.getenv("STT_FORCE_MOCK", "false").lower() == "true"
    mode_str = "MOCK" if force_mock else "REAL"
    print(f"--- STT Benchmark ({mode_str} MODE): {audio_path} ---")
    
    whisper_p = WhisperProvider(force_mock=force_mock)
    phowhisper_p = PhowhisperProvider(force_mock=force_mock)
    
    # 1. Whisper Benchmark
    start = time.time()
    res_w = whisper_p.transcribe(audio_path)
    latency_w = time.time() - start
    wer_w = wer(reference_text, res_w["text"])
    
    # 2. Phowhisper Benchmark
    start = time.time()
    res_p = phowhisper_p.transcribe(audio_path)
    latency_p = time.time() - start
    wer_p = wer(reference_text, res_p["text"])
    
    # 3. Cost Estimation (Simplified)
    # Whisper base (local): ~0.00$ / hour
    # Phowhisper (local): ~0.00$ / hour
    # If using API (e.g. OpenAI Whisper): 0.006$ / minute
    # Let's assume a hypothetical cost for comparison
    cost_w = 0.00 # Assuming local
    cost_p = 0.00 # Assuming local
    
    # 4. Output results
    print(f"Whisper: Latency={latency_w:.2f}s, WER={wer_w:.2f}, Est. Cost=${cost_w:.4f}")
    print(f"Phowhisper: Latency={latency_p:.2f}s, WER={wer_p:.2f}, Est. Cost=${cost_p:.4f}")
    
    # Decision Logic
    # Preference for lower WER. If WER is similar, prefer lower latency.
    if abs(wer_p - wer_w) < 0.05:
        winner = "Whisper" if latency_w < latency_p else "Phowhisper"
    else:
        winner = "Phowhisper" if wer_p < wer_w else "Whisper"
        
    reason = f"Lower {'WER' if abs(wer_p - wer_w) >= 0.05 else 'latency'}"
    print(f"Winner: {winner} ({reason})")
    
    print("\n--- Recommendation ---")
    if winner == "Phowhisper":
        print("Default backend: Phowhisper")
        print("Reason: Phowhisper is fine-tuned for Vietnamese, offering significantly lower WER for local dialect/accent.")
    else:
        print("Default backend: Whisper")
        print("Reason: Whisper offers better balance of latency and broad language support (or Phowhisper failed to load).")
        
    return {
        "whisper": {"latency": latency_w, "wer": wer_w, "cost": cost_w},
        "phowhisper": {"latency": latency_p, "wer": wer_p, "cost": cost_p},
        "winner": winner,
        "mode": mode_str
    }

if __name__ == "__main__":
    sample_audio = "data/sample_meeting_vi.wav"
    ref_text = "Chào mọi người hôm nay chúng ta sẽ bàn về tiến độ dự án."
    run_benchmark(sample_audio, ref_text)
