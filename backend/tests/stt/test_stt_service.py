from src.stt.service import STTService
from src.providers.viwhisper import ViWhisperProvider

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
