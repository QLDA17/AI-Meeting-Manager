from src.stt.service import STTService
from src.providers.stt import WhisperProvider

def test_stt_service_mock_fallback():
    # Force mock via flag
    provider = WhisperProvider(force_mock=True)
    svc = STTService(provider=provider)
    res = svc.transcribe_audio("fake_path.wav")
    assert "text" in res
    assert "segments" in res
    assert len(res["segments"]) > 0
    assert "mock transcription" in res["text"].lower()


def test_stt_service_env_force_mock(monkeypatch):
    # Force mock via environment variable
    monkeypatch.setenv("STT_FORCE_MOCK", "true")
    provider = WhisperProvider()
    assert provider.force_mock is True
    svc = STTService(provider=provider)
    res = svc.transcribe_audio("fake_path.wav")
    assert "mock transcription" in res["text"].lower()
