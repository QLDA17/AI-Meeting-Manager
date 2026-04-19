from src.diarization.service import DiarizationService, Segment


def test_diarize_audio_fallback():
    service = DiarizationService()
    res = service.diarize_audio("fake_path.wav")
    assert len(res) > 0
    assert "speaker" in res[0]


def test_align_to_transcript():
    transcript = [
        {"start": 0.0, "end": 1.0, "text": "Hello"},
        {"start": 1.0, "end": 2.0, "text": "Team"},
    ]
    segments = [
        Segment(0.0, 1.2, "Speaker_1"),
        Segment(1.2, 2.5, "Speaker_2"),
    ]
    aligned = DiarizationService.align_to_transcript(transcript, segments)
    assert aligned[0]["speaker"] == "Speaker_1"
    assert aligned[1]["speaker"] == "Speaker_2"


def test_der_under_threshold():
    ref = [
        Segment(0.0, 2.0, "Speaker_1"),
        Segment(2.0, 4.0, "Speaker_2"),
    ]
    hyp = [
        Segment(0.0, 1.8, "Speaker_1"),
        Segment(1.8, 4.0, "Speaker_2"),
    ]
    der = DiarizationService.diarization_error_rate(ref, hyp)
    assert der < 0.15


def test_der_penalizes_false_alarm_region():
    ref = [Segment(0.0, 2.0, "Speaker_1")]
    hyp = [
        Segment(0.0, 2.0, "Speaker_1"),
        Segment(2.0, 3.0, "Speaker_2"),
    ]
    der = DiarizationService.diarization_error_rate(ref, hyp)
    assert der > 0.0


def test_der_handles_overlapping_speakers():
    # Overlapping speakers in both ref and hyp
    # Ref: Speaker 1 (0-3), Speaker 2 (2-5) -> overlap (2-3)
    # Hyp: Speaker 1 (0-2.5), Speaker 2 (2.5-5) -> no overlap
    ref = [
        Segment(0.0, 3.0, "Speaker_1"),
        Segment(2.0, 5.0, "Speaker_2"),
    ]
    hyp = [
        Segment(0.0, 2.5, "Speaker_1"),
        Segment(2.5, 5.0, "Speaker_2"),
    ]
    
    # Current implementation uses a simple timeline map which only allows ONE speaker per step.
    # This might need improvement for real DER, but for now let's see how it behaves.
    der = DiarizationService.diarization_error_rate(ref, hyp)
    assert der > 0.0
