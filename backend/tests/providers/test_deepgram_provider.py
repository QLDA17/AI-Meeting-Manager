from types import SimpleNamespace

from src.providers.deepgram import _extract_segments, _extract_transcript


def test_extract_transcript_uses_utterances_when_top_level_empty():
    results = SimpleNamespace(
        utterances=[
            SimpleNamespace(transcript="xin chao"),
            SimpleNamespace(transcript="ban toi"),
        ]
    )

    transcript = _extract_transcript(results, SimpleNamespace(transcript=""))

    assert transcript == "xin chao ban toi"


def test_extract_segments_builds_from_utterances():
    results = SimpleNamespace(
        utterances=[
            SimpleNamespace(start=0.0, end=1.2, transcript="xin chao", speaker=0),
            SimpleNamespace(start=1.2, end=3.0, transcript="ban toi", speaker=1),
        ]
    )

    segments = _extract_segments(results, SimpleNamespace(words=[]))

    assert len(segments) == 2
    assert segments[0]["speaker"] == "Speaker 0"
    assert segments[1]["text"] == "ban toi"


def test_extract_segments_falls_back_to_words():
    results = SimpleNamespace(utterances=[])
    alternative = SimpleNamespace(words=[
        SimpleNamespace(word="xin", start=0.0, end=0.5, speaker=0),
        SimpleNamespace(word="chao", start=0.5, end=0.9, speaker=0),
        SimpleNamespace(word="ban", start=1.0, end=1.4, speaker=1),
    ])

    segments = _extract_segments(results, alternative)

    assert len(segments) == 2
    assert segments[0]["text"] == "xin chao"
    assert segments[1]["speaker"] == "Speaker 1"
