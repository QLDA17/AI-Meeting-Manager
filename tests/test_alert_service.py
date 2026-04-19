import pytest
import asyncio
import os
import json
from src.cost.alert_service import AlertService, AlertPayload

@pytest.fixture
def anyio_backend():
    return 'asyncio'

@pytest.mark.anyio
async def test_alert_service_retry_and_success():
    service = AlertService(max_retries=3, retry_delay=0.1)
    payload = AlertPayload(message="Budget alert!", severity="high")
    
    # Test success after retry
    res = await service.send_webhook("https://example.com/fail", payload)
    assert res is True

@pytest.mark.anyio
async def test_alert_service_dead_letter_log():
    dead_letter_path = "tests/dead_letter_test.jsonl"
    if os.path.exists(dead_letter_path):
        os.remove(dead_letter_path)
    
    # Use a mock service with high delay to simulate a real failure across all retries
    # and a path for the dead letter log.
    service = AlertService(max_retries=1, retry_delay=0.1, dead_letter_path=dead_letter_path)
    payload = AlertPayload(message="Failed alert!", severity="critical")
    
    # We'll use a specific target that will fail
    res = await service.send_email("fail@example.com", payload)
    assert res is False
    
    # Verify the dead letter log
    assert os.path.exists(dead_letter_path)
    with open(dead_letter_path, "r", encoding="utf-8") as f:
        log_entry = json.loads(f.readline())
        assert log_entry["channel"] == "email"
        assert log_entry["target"] == "fail@example.com"
        assert log_entry["payload"]["message"] == "Failed alert!"
    
    # Clean up
    if os.path.exists(dead_letter_path):
        os.remove(dead_letter_path)
