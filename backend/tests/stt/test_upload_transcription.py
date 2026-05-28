from src.api.core import upload_jobs


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
