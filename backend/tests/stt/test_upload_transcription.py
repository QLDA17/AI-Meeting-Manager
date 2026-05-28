from src.api.core import upload_jobs
from src.api.core.transcript_support import build_transcript_artifacts


class _FakeProvider:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def transcribe(self, audio_path, **kwargs):
        self.calls.append({"audio_path": audio_path, **kwargs})
        return self.responses.pop(0)


def test_transcribe_audio_path_retries_deepgram_auto_with_vi(monkeypatch):
    provider = _FakeProvider([
        {"text": "", "segments": []},
        {"text": "xin chao", "segments": []},
    ])

    monkeypatch.setenv("DEEPGRAM_LANGUAGE", "vi")
    monkeypatch.setattr(upload_jobs, "STTService", lambda provider=None: type("Svc", (), {"provider": provider_obj})())
    provider_obj = provider

    result = upload_jobs.transcribe_audio_path(
        provider_name="deepgram",
        audio_path="fake.wav",
        language="auto",
        enable_diarization=True,
    )

    assert [call["language"] for call in provider.calls] == ["auto", "vi"]
    assert result["text"] == "xin chao"
    assert result["language_used"] == "vi"


def test_transcribe_audio_path_preserves_provider_error(monkeypatch):
    provider = _FakeProvider([
        {"text": "", "segments": [], "error": "Deepgram provider timeout"},
    ])

    monkeypatch.setattr(upload_jobs, "STTService", lambda provider=None: type("Svc", (), {"provider": provider_obj})())
    provider_obj = provider

    result = upload_jobs.transcribe_audio_path(
        provider_name="deepgram",
        audio_path="fake.wav",
        language="vi",
        enable_diarization=True,
    )

    assert result["error"] == "Deepgram provider timeout"
    assert result["provider"] == "deepgram"


def test_select_preprocess_strategy_preserves_m4a_speech_for_deepgram():
    plan = upload_jobs.select_preprocess_strategy(
        original_filename="voice-note.m4a",
        provider_name="deepgram",
        audio_profile={
            "container": "mov",
            "codec": "aac",
            "sample_rate": 44100,
            "channels": 1,
            "bit_rate": 64000,
        },
        enable_noise_cleanup=True,
    )

    assert plan["strategy"] == "m4a_preserve_speech"
    assert plan["cleanup_mode"] == "none"
    assert plan["cleanup_applied"] is False
    assert plan["audio_profile"]["compressed_low_bitrate"] is True


def test_select_preprocess_strategy_uses_fast_path_for_clean_deepgram_audio():
    plan = upload_jobs.select_preprocess_strategy(
        original_filename="meeting.mp3",
        provider_name="deepgram",
        audio_profile={
            "container": "mp3",
            "codec": "mp3",
            "sample_rate": 44100,
            "channels": 2,
            "bit_rate": 192000,
        },
        enable_noise_cleanup=True,
    )

    assert plan["strategy"] == "deepgram_fast_path"
    assert plan["cleanup_mode"] == "none"
    assert plan["cleanup_applied"] is False


def test_build_transcript_artifacts_merges_upload_quality_metadata():
    artifacts = build_transcript_artifacts(
        text="xin chao",
        segments=[{"speaker": "Speaker_01", "start": 0, "end": 1, "text": "xin chao", "language": "vi"}],
        language="vi",
        provider_name="deepgram",
        quality_metadata_overrides={
            "audio_profile": {"codec": "aac", "source_extension": ".m4a"},
            "preprocess_strategy": "m4a_preserve_speech",
            "cleanup_applied": False,
        },
    )

    assert artifacts["quality_metadata"]["preprocess_strategy"] == "m4a_preserve_speech"
    assert artifacts["quality_metadata"]["cleanup_applied"] is False
    assert artifacts["quality_metadata"]["audio_profile"]["codec"] == "aac"
