


from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import re
import subprocess
import threading
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


_HASH_HEAD_BYTES = 64 * 1024
_FFMPEG_TIMEOUT_SECONDS = 90
_FFPROBE_TIMEOUT_SECONDS = 20

_CACHE_LOCK = threading.Lock()
_CACHE: Dict[str, "AudioMetrics"] = {}
_CACHE_MAX = 256


@dataclass
class AudioMetrics:
    """Metrics extracted from a single audio file.

    All level fields use dBFS / LUFS as reported by ffmpeg. None means the
    underlying probe failed or the value could not be parsed; callers should
    treat None as "unknown" rather than zero.
    """

    duration_seconds: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    codec: Optional[str] = None
    container: Optional[str] = None
    bit_rate: Optional[int] = None

    loudness_lufs: Optional[float] = None
    loudness_range_lu: Optional[float] = None
    true_peak_dbtp: Optional[float] = None
    peak_dbfs: Optional[float] = None
    mean_volume_dbfs: Optional[float] = None

    noise_floor_dbfs: Optional[float] = None
    snr_db: Optional[float] = None
    silence_ratio: Optional[float] = None
    clipping_ratio: Optional[float] = None

    warnings: list = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def compute_audio_metrics(audio_path: str, *, use_cache: bool = True) -> AudioMetrics:
    """Compute audio quality metrics for ``audio_path``.

    Runs three ffmpeg passes plus ffprobe. Results are cached by a cheap
    fingerprint (size + first 64KB hash) so re-running on the same source
    file is free. Each ffmpeg pass is independently fault-tolerant — if one
    fails, the corresponding fields stay None and a warning is appended.
    """

    if not audio_path or not os.path.exists(audio_path):
        raise FileNotFoundError(f"audio_path does not exist: {audio_path}")

    cache_key = _fingerprint(audio_path) if use_cache else None
    if cache_key:
        with _CACHE_LOCK:
            cached = _CACHE.get(cache_key)
            if cached is not None:
                return cached

    metrics = AudioMetrics()
    _populate_probe(audio_path, metrics)
    _populate_ebur128(audio_path, metrics)
    _populate_volume(audio_path, metrics)
    _populate_silence(audio_path, metrics)
    _derive_snr(metrics)

    if cache_key:
        with _CACHE_LOCK:
            if len(_CACHE) >= _CACHE_MAX:
                _CACHE.pop(next(iter(_CACHE)))
            _CACHE[cache_key] = metrics

    return metrics


def _fingerprint(audio_path: str) -> str:
    try:
        size = os.path.getsize(audio_path)
        digest = hashlib.sha256()
        digest.update(str(size).encode())
        with open(audio_path, "rb") as fh:
            digest.update(fh.read(_HASH_HEAD_BYTES))
        return digest.hexdigest()
    except OSError as exc:
        logger.debug("audio fingerprint failed for %s: %s", audio_path, exc)
        return f"path:{os.path.abspath(audio_path)}"


def _run_ffmpeg_filter(audio_path: str, filter_chain: str) -> str:
    """Run ffmpeg with a filter and return the combined stderr/stdout.

    ffmpeg writes filter measurements (ebur128, volumedetect, silencedetect)
    to stderr by design. We capture both streams and return them joined so
    callers can regex against the full output.
    """

    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-i",
            audio_path,
            "-af",
            filter_chain,
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        timeout=_FFMPEG_TIMEOUT_SECONDS,
    )
    return f"{proc.stderr or ''}\n{proc.stdout or ''}"


def _populate_probe(audio_path: str, metrics: AudioMetrics) -> None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "format=format_name,duration,bit_rate:stream=codec_name,sample_rate,channels,bit_rate",
                "-of",
                "json",
                audio_path,
            ],
            capture_output=True,
            text=True,
            timeout=_FFPROBE_TIMEOUT_SECONDS,
            check=True,
        )
        payload = json.loads(result.stdout or "{}")
        fmt = payload.get("format") or {}
        streams = payload.get("streams") or []
        astream = streams[0] if streams else {}

        metrics.container = (
            str(fmt.get("format_name") or "").split(",", 1)[0].strip() or None
        )
        metrics.codec = str(astream.get("codec_name") or "").strip().lower() or None
        metrics.sample_rate = _to_int(astream.get("sample_rate"))
        metrics.channels = _to_int(astream.get("channels"))
        metrics.bit_rate = _to_int(astream.get("bit_rate") or fmt.get("bit_rate"))
        metrics.duration_seconds = _to_float(fmt.get("duration"))
    except Exception as exc:
        metrics.warnings.append(f"ffprobe failed: {exc}")
        logger.debug("ffprobe failed for %s: %s", audio_path, exc)


def _populate_ebur128(audio_path: str, metrics: AudioMetrics) -> None:
    """Parse the ebur128 summary block emitted at the end of analysis."""

    try:
        output = _run_ffmpeg_filter(audio_path, "ebur128=peak=true")
    except Exception as exc:
        metrics.warnings.append(f"ebur128 failed: {exc}")
        return

    summary_match = re.search(r"Summary:\s*(.*?)\Z", output, re.DOTALL)
    block = summary_match.group(1) if summary_match else output

    metrics.loudness_lufs = _extract_float(block, r"Integrated loudness:\s*\n?\s*I:\s*(-?\d+(?:\.\d+)?)")
    metrics.loudness_range_lu = _extract_float(block, r"Loudness range:\s*\n?\s*LRA:\s*(-?\d+(?:\.\d+)?)")
    metrics.true_peak_dbtp = _extract_float(block, r"True peak:\s*\n?\s*Peak:\s*(-?\d+(?:\.\d+)?)")


def _populate_volume(audio_path: str, metrics: AudioMetrics) -> None:
    try:
        output = _run_ffmpeg_filter(audio_path, "volumedetect")
    except Exception as exc:
        metrics.warnings.append(f"volumedetect failed: {exc}")
        return

    metrics.mean_volume_dbfs = _extract_float(output, r"mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB")
    metrics.peak_dbfs = _extract_float(output, r"max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB")

    histogram = re.findall(r"histogram_(-?\d+)db:\s*(\d+)", output)
    if histogram:
        # ffmpeg volumedetect bins are absolute dBFS magnitudes:
        # ``histogram_0db`` counts samples at full scale (clipping),
        # ``histogram_6db`` counts samples at -6 dBFS, etc.
        bins = [(int(db), int(count)) for db, count in histogram]
        total = sum(count for _, count in bins)
        if total > 0:
            clipped = sum(count for db, count in bins if db == 0)
            metrics.clipping_ratio = clipped / total


def _populate_silence(audio_path: str, metrics: AudioMetrics) -> None:
    """Run silencedetect at three thresholds to triangulate noise floor.

    -50 dB silence ratio close to -40 dB ratio means the floor is below
    -50 dB (clean recording). If the -50 dB ratio is much smaller than the
    -30 dB ratio, the floor sits between the two thresholds.
    """

    samples: Dict[int, float] = {}
    duration = metrics.duration_seconds or 0.0

    for threshold in (-50, -40, -30):
        try:
            output = _run_ffmpeg_filter(
                audio_path,
                f"silencedetect=noise={threshold}dB:duration=0.4",
            )
        except Exception as exc:
            metrics.warnings.append(f"silencedetect@{threshold}dB failed: {exc}")
            continue

        silences = re.findall(r"silence_duration:\s*([\d.]+)", output)
        total_silence = sum(float(value) for value in silences)
        if duration > 0:
            samples[threshold] = max(0.0, min(1.0, total_silence / duration))

    if -40 in samples:
        metrics.silence_ratio = samples[-40]

    metrics._silence_by_threshold = samples  # type: ignore[attr-defined]


def _derive_snr(metrics: AudioMetrics) -> None:
    """Estimate noise floor and SNR.

    Noise floor is derived from the silencedetect ladder collected by
    :func:`_populate_silence`. We pick the lowest threshold whose silence
    ratio is meaningfully larger than the next-lower threshold's ratio —
    that's where the floor sits. Falls back to a conservative estimate
    based on mean volume if the ladder is unavailable.
    """

    samples: Dict[int, float] = getattr(metrics, "_silence_by_threshold", {})
    mean = metrics.mean_volume_dbfs

    if samples:
        ordered = sorted(samples.items())
        floor: Optional[float] = None
        for index in range(len(ordered) - 1):
            lower_db = ordered[index][0]
            lower_ratio = ordered[index][1]
            upper_ratio = ordered[index + 1][1]
            if upper_ratio - lower_ratio > 0.05:
                floor = float(lower_db)
                break
        if floor is None:
            floor = float(ordered[-1][0])
        metrics.noise_floor_dbfs = floor
    elif mean is not None:
        metrics.noise_floor_dbfs = min(-40.0, mean - 6.0)

    if mean is not None and metrics.noise_floor_dbfs is not None:
        metrics.snr_db = max(0.0, mean - metrics.noise_floor_dbfs)

    if hasattr(metrics, "_silence_by_threshold"):
        delattr(metrics, "_silence_by_threshold")


def _to_float(value: Any) -> Optional[float]:
    if value in (None, ""):
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _to_int(value: Any) -> Optional[int]:
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _extract_float(text: str, pattern: str) -> Optional[float]:
    match = re.search(pattern, text)
    if not match:
        return None
    return _to_float(match.group(1))