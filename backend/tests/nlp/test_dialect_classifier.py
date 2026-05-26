from src.nlp.dialect_classifier import DialectClassifier


def test_dialect_classifier_detects_south_markers():
    classifier = DialectClassifier()

    result = classifier.classify("Dạ cái này tụi em làm nha, để em gửi lại nè.")

    assert result["dialect_hint"] == "south"
    assert result["confidence"] > 0
    assert "dạ" in result["markers"]


def test_dialect_classifier_unknown_without_markers():
    classifier = DialectClassifier()

    result = classifier.classify("Cuộc họp bắt đầu lúc chín giờ và kết thúc đúng hạn.")

    assert result["dialect_hint"] == "unknown"
    assert result["confidence"] == 0.0

