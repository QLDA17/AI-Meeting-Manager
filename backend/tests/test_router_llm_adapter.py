import os
from unittest.mock import MagicMock, patch

import requests

from src.providers.router_llm import RouterLLMAdapter


def test_agentrouter_base_url_builds_chat_completions_endpoint():
    with patch.dict(
        os.environ,
        {
            "ROUTER_API_BASE_URL": "https://agentrouter.org/v1/",
            "ROUTER_API_KEY": "sk-test",
            "ROUTER_MODEL": "deepseek-v4-flash",
        },
        clear=True,
    ):
        adapter = RouterLLMAdapter()

    assert adapter.enabled is True
    assert adapter.api_url == "https://agentrouter.org/v1/chat/completions"
    assert adapter.model == "deepseek-v4-flash"


def test_agentrouter_token_fallback_enables_adapter():
    with patch.dict(
        os.environ,
        {
            "ROUTER_API_BASE_URL": "https://agentrouter.org/v1",
            "AGENT_ROUTER_TOKEN": "sk-agentrouter",
        },
        clear=True,
    ):
        adapter = RouterLLMAdapter()

    assert adapter.enabled is True
    assert adapter.api_key == "sk-agentrouter"
    assert adapter.model == "deepseek-v4-flash"


def test_legacy_router_api_url_is_preserved():
    with patch.dict(
        os.environ,
        {
            "ROUTER_API_URL": "http://router.test/custom/chat",
            "ROUTER_API_BASE_URL": "https://agentrouter.org/v1",
            "ROUTER_API_KEY": "sk-test",
            "ROUTER_MODEL": "legacy-model",
        },
        clear=True,
    ):
        adapter = RouterLLMAdapter()

    assert adapter.api_url == "http://router.test/custom/chat"
    assert adapter.model == "legacy-model"


def test_chat_completion_posts_openai_compatible_payload():
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '{"meeting_summary":"ok"}'}}]
    }
    mock_response.raise_for_status.return_value = None

    with patch.dict(
        os.environ,
        {
            "ROUTER_API_BASE_URL": "https://agentrouter.org/v1",
            "ROUTER_API_KEY": "sk-test",
            "ROUTER_MODEL": "deepseek-v4-flash",
            "ROUTER_TIMEOUT_SECONDS": "12",
        },
        clear=True,
    ), patch("src.providers.router_llm.requests.post", return_value=mock_response) as post:
        adapter = RouterLLMAdapter()
        result = adapter.chat_completion("system", "user", temperature=0.2, max_tokens=321)

    assert result == '{"meeting_summary":"ok"}'
    post.assert_called_once()
    url = post.call_args.args[0]
    kwargs = post.call_args.kwargs
    assert url == "https://agentrouter.org/v1/chat/completions"
    assert kwargs["headers"]["Authorization"] == "Bearer sk-test"
    assert kwargs["json"]["model"] == "deepseek-v4-flash"
    assert kwargs["json"]["messages"] == [
        {"role": "system", "content": "system"},
        {"role": "user", "content": "user"},
    ]
    assert kwargs["json"]["temperature"] == 0.2
    assert kwargs["json"]["max_tokens"] == 321
    assert kwargs["timeout"] == 12


def test_http_error_returns_none_without_raising():
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "unauthorized"
    mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
        response=mock_response
    )

    with patch.dict(
        os.environ,
        {
            "ROUTER_API_BASE_URL": "https://agentrouter.org/v1",
            "ROUTER_API_KEY": "sk-test",
        },
        clear=True,
    ), patch("src.providers.router_llm.requests.post", return_value=mock_response):
        adapter = RouterLLMAdapter()
        result = adapter.chat_completion("system", "user")

    assert result is None
