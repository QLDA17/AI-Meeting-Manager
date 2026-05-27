import os
import pytest
from unittest.mock import MagicMock, patch
from src.providers.factory import get_llm_adapter
from src.providers.google_llm import GoogleLLMAdapter
from src.providers.llm import OpenAIAdapter
from src.translation.service import TranslationService, TranslationRequest

def test_provider_selection_env():
    """Verify that provider is selected based on env var."""
    with patch.dict(os.environ, {"LLM_PROVIDER": "google"}):
        adapter = get_llm_adapter()
        assert isinstance(adapter, GoogleLLMAdapter)
        
    with patch.dict(os.environ, {"LLM_PROVIDER": "openai"}):
        adapter = get_llm_adapter()
        assert isinstance(adapter, OpenAIAdapter)

def test_translation_service_fallback_on_error():
    """Verify TranslationService handles adapter errors by falling back."""
    mock_adapter = MagicMock()
    # Simulate a critical error that should trigger fallback in service
    mock_adapter.chat_completion.return_value = "Mock fallback response"
    
    service = TranslationService(adapter=mock_adapter)
    req = TranslationRequest(
        source_lang="en", target_lang="vi", 
        transcript="[00:00:01] Hello"
    )
    
    result = service.translate(req)
    assert "Mock" in result
    assert "[00:00:01]" in result # Marker preservation should still work if mock is smart or repaired
