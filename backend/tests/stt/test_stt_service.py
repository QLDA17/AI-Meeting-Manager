from src.stt.service import STTService
from src.providers import viwhisper as viwhisper_module
from src.providers.viwhisper import ViWhisperProvider, ViWhisperUnavailableError

def test_stt_service_mock_fallback():
    # Force mock via flag
    provider = ViWhisperProvider(force_mock=True)
    svc = STTService(provider=provider)
    res = svc.transcribe_audio("fake_path.wav")
    assert "text" in res
    assert "segments" in res
    assert len(res["segments"]) > 0
    assert "viwhisper" in res["text"].lower()


def test_stt_service_env_force_mock(monkeypatch):
    # Force mock via environment variable
    monkeypatch.setenv("STT_FORCE_MOCK", "true")
    provider = ViWhisperProvider()
    assert provider.force_mock is True
    svc = STTService(provider=provider)
    res = svc.transcribe_audio("fake_path.wav")
    assert "viwhisper" in res["text"].lower()


def test_viwhisper_raises_when_runtime_unavailable(monkeypatch):
    monkeypatch.setattr(viwhisper_module, "HAS_TRANSFORMERS", False)
    monkeypatch.delenv("STT_FORCE_MOCK", raising=False)
    provider = ViWhisperProvider()

    try:
        provider.transcribe("fake_path.wav")
        assert False, "Expected ViWhisperUnavailableError"
    except ViWhisperUnavailableError as exc:
        assert "unavailable" in str(exc).lower()


def test_viwhisper_long_form_uses_timestamps_and_builds_segments():
    calls = []

    def fake_pipe(audio_path, return_timestamps):
        calls.append({"audio_path": audio_path, "return_timestamps": return_timestamps})
        return {
            "text": "xin chao ban toi dang test file dai",
            "chunks": [
                {"text": "xin chao ban", "timestamp": (0.0, 2.4)},
                {"text": "toi dang test file dai", "timestamp": (2.4, 6.8)},
            ],
        }

    provider = ViWhisperProvider(force_mock=False)
    provider.pipe = fake_pipe
    provider._loaded = True

    result = provider.transcribe("fake_long_audio.wav")

    assert calls == [{"audio_path": "fake_long_audio.wav", "return_timestamps": True}]
    assert result["text"] == "xin chao ban toi dang test file dai"
    assert len(result["segments"]) == 2
    assert result["segments"][0]["start"] == 0.0
    assert result["segments"][0]["end"] == 2.4
    assert result["segments"][0]["text"] == "xin chao ban"


def test_viwhisper_falls_back_to_single_segment_when_only_text_returned():
    provider = ViWhisperProvider(force_mock=False)
    provider.pipe = lambda audio_path, return_timestamps: {"text": "mot doan van ban"}
    provider._loaded = True

    result = provider.transcribe("fake_audio.wav")

    assert result["text"] == "mot doan van ban"
    assert len(result["segments"]) == 1
    assert result["segments"][0]["text"] == "mot doan van ban"
