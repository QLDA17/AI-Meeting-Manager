from src.nlp.phobert_processor import PhoBERTPostProcessor


def test_process_chunk_applies_rule_without_model_load(monkeypatch):
    monkeypatch.setenv("PHOBERT_LOAD_MODEL", "false")
    processor = PhoBERTPostProcessor()
    segments = [{"speaker": "A", "start": 0, "end": 1, "text": "ka pi ai tháng này tốt"}]

    result = processor.process_chunk("ka pi ai tháng này tốt", segments)

    assert result["text"] == "KPI tháng này tốt"
    assert result["segments"][0]["text"] == "KPI tháng này tốt"
    assert result["segments"][0]["original_text"] == "ka pi ai tháng này tốt"
    assert result["nlp_metadata"]["mode"] == "chunk"


def test_process_finalize_preserves_segment_timing_and_adds_metadata(monkeypatch):
    monkeypatch.setenv("PHOBERT_LLM_CORRECTION_ENABLED", "false")
    monkeypatch.setenv("BARTPHO_LOAD_MODEL", "false")
    processor = PhoBERTPostProcessor()
    segments = [{"speaker": "A", "start": 3.5, "end": 8.0, "text": "Dạ ka pi ai ổn nha"}]

    result = processor.process_finalize("Dạ ka pi ai ổn nha", segments)

    assert result["post_processed"] is True
    assert result["segments"][0]["start"] == 3.5
    assert result["segments"][0]["end"] == 8.0
    assert result["segments"][0]["text"] == "Dạ KPI ổn nha."
    assert result["segments"][0]["nlp_metadata"]["dialect_hint"] == "south"
    assert result["nlp_metadata"]["dialect_hint"] == "south"
    assert result["nlp_metadata"]["phobert"]["model"] == "vinai/phobert-base-v2"
    assert result["nlp_metadata"]["bartpho"]["model"] == "vinai/bartpho-word-base"


def test_process_finalize_returns_raw_and_cleaned_artifacts(monkeypatch):
    monkeypatch.setenv("PHOBERT_LLM_CORRECTION_ENABLED", "false")
    monkeypatch.setenv("BARTPHO_LOAD_MODEL", "false")
    processor = PhoBERTPostProcessor()
    segments = [{"speaker": "A", "start": 0.0, "end": 2.0, "text": "ka pi ai va ci cd ổn nha"}]

    result = processor.process_finalize("ka pi ai va ci cd ổn nha", segments)

    assert result["raw_text"] == "ka pi ai va ci cd ổn nha"
    assert result["text"] == "KPI va CI/CD ổn nha."
    assert result["segments"][0]["original_text"] == "ka pi ai va ci cd ổn nha"
    assert result["segments"][0]["text"] == "KPI va CI/CD ổn nha."
    assert result["nlp_metadata"]["correction_count"] >= 2
    assert result["nlp_metadata"]["cleanup"]["applied"] is True


def test_extract_terms_detects_technical_tokens():
    processor = PhoBERTPostProcessor()

    terms = processor.corrector.extract_terms("KPI, API, CI/CD, Docker, Kubernetes, v2.1 roadmap")

    assert "KPI" in terms
    assert "API" in terms
    assert "CI/CD" in terms
    assert "Docker" in terms
    assert "Kubernetes" in terms
    assert "v2.1" in terms


def test_process_finalize_keeps_canonical_output_when_bartpho_model_is_unavailable(monkeypatch):
    monkeypatch.setenv("PHOBERT_LLM_CORRECTION_ENABLED", "false")
    monkeypatch.setenv("BARTPHO_LOAD_MODEL", "false")
    processor = PhoBERTPostProcessor()

    result = processor.process_finalize("ka pi ai ổn", [{"speaker": "A", "start": 0, "end": 1, "text": "ka pi ai ổn"}])

    assert result["text"] == "KPI ổn."
    assert result["segments"][0]["text"] == "KPI ổn."
    assert result["nlp_metadata"]["bartpho"]["model"] == "vinai/bartpho-word-base"
    assert result["nlp_metadata"]["bartpho"]["correction_count"] >= 1
