from src.nlp.phobert_processor import PhoBERTPostProcessor


def test_process_chunk_applies_rule_without_model_load(monkeypatch):
    monkeypatch.setenv("PHOBERT_LOAD_MODEL", "false")
    processor = PhoBERTPostProcessor()
    segments = [{"speaker": "A", "start": 0, "end": 1, "text": "ka pi ai tháng này tốt"}]

    result = processor.process_chunk("ka pi ai tháng này tốt", segments, {})

    assert result["text"] == "KPI tháng này tốt"
    assert result["segments"][0]["text"] == "KPI tháng này tốt"
    assert result["segments"][0]["original_text"] == "ka pi ai tháng này tốt"
    assert result["nlp_metadata"]["mode"] == "chunk"


def test_process_finalize_preserves_segment_timing_and_adds_metadata(monkeypatch):
    monkeypatch.setenv("PHOBERT_LLM_CORRECTION_ENABLED", "false")
    processor = PhoBERTPostProcessor()
    segments = [{"speaker": "A", "start": 3.5, "end": 8.0, "text": "Dạ ka pi ai ổn nha"}]

    result = processor.process_finalize("Dạ ka pi ai ổn nha", segments, {"KPI": "KPI"})

    assert result["post_processed"] is True
    assert result["segments"][0]["start"] == 3.5
    assert result["segments"][0]["end"] == 8.0
    assert result["segments"][0]["text"] == "Dạ KPI ổn nha"
    assert result["segments"][0]["nlp_metadata"]["dialect_hint"] == "south"
    assert result["nlp_metadata"]["dialect_hint"] == "south"
