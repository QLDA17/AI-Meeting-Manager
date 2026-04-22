import pytest
from unittest.mock import patch, MagicMock
from src.crewai.agents import MultiMinutesAgents
from crewai import Agent

def test_backend_core_agent_initialization():
    """
    Test xem backend_core_agent có được khởi tạo đúng role và goal từ config không.
    Giai đoạn GREEN: Fix lỗi validation bằng cách mock return value hợp lý.
    """
    # Mock LLM to return a string (which is valid for Agent)
    # Mock Tools to return valid tool instances or correctly structured mocks
    with patch('src.crewai.agents.LLM') as mock_llm_class, \
         patch('src.crewai.agents.STTTool') as mock_stt_class, \
         patch('src.crewai.agents.DiarizationTool') as mock_diar_class, \
         patch('src.crewai.agents.QualityEvalTool') as mock_qual_class:
        
        # CrewAI Agent validation requires llm to be string or BaseLLM instance
        # We can make the mock_llm instance behave like a string for validation
        mock_llm_instance = MagicMock()
        mock_llm_class.return_value = mock_llm_instance
        
        # Tools need to be BaseTool instances or valid dicts. 
        # For testing initialization logic, we can mock the _create_agent internal call 
        # or mock the tools more strictly.
        
        agents_factory = MultiMinutesAgents()
        
        # To avoid Pydantic validation issues with MagicMock in complex objects,
        # we can mock the Agent class itself to verify MultiMinutesAgents logic
        with patch('src.crewai.agents.Agent') as mock_agent_class:
            agents_factory.backend_core_agent()
            
            # Verify _create_agent was called with correct parameters
            mock_agent_class.assert_called_once()
            args, kwargs = mock_agent_class.call_args
            assert kwargs['role'] == "Backend Core Agent"
            assert kwargs['goal'] == "Build STT, translation, summarization APIs"

def test_get_all_agents_count():
    """
    Test xem hệ thống có load đủ 15 agents như trong config không.
    """
    with patch('src.crewai.agents.LLM'), \
         patch('src.crewai.agents.STTTool'), \
         patch('src.crewai.agents.DiarizationTool'), \
         patch('src.crewai.agents.QualityEvalTool'), \
         patch('src.crewai.agents.Agent'):
        
        agents_factory = MultiMinutesAgents()
        all_agents = agents_factory.get_all_agents()
        
        # get_all_agents returns a list of whatever _create_agent returns.
        # Since we mocked Agent, it returns mock objects.
        assert len(all_agents) == 15

def test_dynamic_model_selection():
    """
    Test xem class có nhận model name tùy chỉnh không.
    """
    with patch('src.crewai.agents.LLM') as mock_llm_class, \
         patch('src.crewai.agents.STTTool'), \
         patch('src.crewai.agents.DiarizationTool'), \
         patch('src.crewai.agents.QualityEvalTool'):
        
        custom_model = "gemini/gemini-1.5-pro"
        agents_factory = MultiMinutesAgents(model=custom_model)
        
        # Verify LLM was initialized with the custom model
        # Note: In the current code, this might FAIL because of hardcoding
        # That's the RED stage of our refactor.
        mock_llm_class.assert_called()
        args, kwargs = mock_llm_class.call_args
        assert kwargs['model'] == custom_model
