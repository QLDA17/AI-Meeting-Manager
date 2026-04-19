import os
from typing import Union
from .llm import OpenAIAdapter
from .google_llm import GoogleLLMAdapter
from src.cost.cost_logger import CostLogger

def get_llm_adapter(cost_logger: CostLogger = None) -> Union[OpenAIAdapter, GoogleLLMAdapter]:
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if provider == "google":
        return GoogleLLMAdapter(cost_logger=cost_logger)
    return OpenAIAdapter(cost_logger=cost_logger)
