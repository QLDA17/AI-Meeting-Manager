import os
import yaml
import logging
from crewai import Agent, LLM
from typing import List, Dict, Any
from .tools import STTTool, DiarizationTool, QualityEvalTool

logger = logging.getLogger(__name__)

class MultiMinutesAgents:
    def __init__(self, model: str = None):
        self.provider = os.getenv("LLM_PROVIDER", "google")
        self.llm = self._setup_llm(model)
        self.config = self._load_config()
        self.tools = {
            "stt": STTTool(),
            "diarization": DiarizationTool(),
            "quality_eval": QualityEvalTool()
        }

    def _setup_llm(self, model_name: str) -> Any:
        # Determine the correct model name based on provider
        google_key = os.getenv("GOOGLE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if self.provider == "google":
            # Gemma 4 26B A4B IT - free, confirmed available via ListModels
            model = "gemini/gemma-4-26b-a4b-it"
            
            logger.info(f"Setting up CrewAI LLM for Google AI Studio: {model}")
            return LLM(
                model=model,
                api_key=google_key,
                temperature=0.2
            )
        else:
            model = model_name or "gpt-4o-mini"
            logger.info(f"Setting up CrewAI LLM for OpenAI: {model}")
            return LLM(
                model=model,
                api_key=openai_key,
                temperature=0.2
            )

    def _load_config(self) -> Dict:
        config_path = os.path.join(os.getcwd(), "config", "agents", "agent_config.yaml")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        return {}

    def _create_agent(self, agent_id: str, tools: List[Any] = None) -> Agent:
        # Search for agent in config
        for category in self.config.get("agents", {}).values():
            for agent_data in category:
                if agent_data["id"] == agent_id:
                    return Agent(
                        role=agent_data["role"],
                        goal=agent_data["goal"],
                        backstory=agent_data.get("backstory", f"You are the {agent_data['role']} specializing in MultiMinutes AI."),
                        verbose=True,
                        allow_delegation=agent_id in ["backend_core_agent", "architect_agent"],
                        llm=self.llm,
                        tools=tools or []
                    )
        
        # Fallback if not found in config
        return Agent(
            role="Specialist Agent",
            goal="Assist in MultiMinutes AI development.",
            backstory="An AI specialist agent.",
            llm=self.llm,
            tools=tools or []
        )

    # --- Group 1: Technical (6 Agents) ---

    def backend_core_agent(self) -> Agent:
        return self._create_agent("backend_core_agent", tools=[self.tools["stt"]])

    def backend_audio_agent(self) -> Agent:
        return self._create_agent("backend_audio_agent")

    def frontend_agent(self) -> Agent:
        return self._create_agent("frontend_agent")

    def db_designer_agent(self) -> Agent:
        return self._create_agent("db_designer_agent")

    def devops_agent(self) -> Agent:
        return self._create_agent("devops_agent")

    def architect_agent(self) -> Agent:
        return self._create_agent("architect_agent")

    # --- Group 2: Schedule & Cost (4 Agents) ---

    def cost_estimator_agent(self) -> Agent:
        return self._create_agent("cost_estimator_agent")

    def resource_optimizer_agent(self) -> Agent:
        return self._create_agent("resource_optimizer_agent")

    def prompt_engineer_agent(self) -> Agent:
        return self._create_agent("prompt_engineer_agent")

    def tech_writer_agent(self) -> Agent:
        return self._create_agent("tech_writer_agent")

    # --- Group 3: Quality (5 Agents) ---

    def qa_tester_agent(self) -> Agent:
        return self._create_agent("qa_tester_agent")

    def security_auditor_agent(self) -> Agent:
        return self._create_agent("security_auditor_agent")

    def nlp_evaluator_agent(self) -> Agent:
        return self._create_agent("nlp_evaluator_agent", tools=[self.tools["quality_eval"]])

    def diarization_specialist(self) -> Agent:
        return self._create_agent("diarization_specialist", tools=[self.tools["diarization"]])

    def spellcheck_agent(self) -> Agent:
        return self._create_agent("spellcheck_agent")

    def get_all_agents(self) -> List[Agent]:
        all_agents = []
        for category in self.config.get("agents", {}).values():
            for agent_data in category:
                all_agents.append(self._create_agent(agent_data["id"]))
        return all_agents
