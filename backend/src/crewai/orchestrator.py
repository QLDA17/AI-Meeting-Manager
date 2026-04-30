from crewai import Crew, Task, Process
from .agents import MultiMinutesAgents
from .router import CrewRouter
from typing import List, Dict, Any


class MultiMinutesOrchestrator:
    def __init__(self, model: str = None):
        self.agent_factory = MultiMinutesAgents(model=model)
        self.router = CrewRouter()
        self.agents = {
            # Map agent_id to the actual agent object
            "backend_core_agent": self.agent_factory.backend_core_agent(),
            "backend_audio_agent": self.agent_factory.backend_audio_agent(),
            "frontend_agent": self.agent_factory.frontend_agent(),
            "db_designer_agent": self.agent_factory.db_designer_agent(),
            "devops_agent": self.agent_factory.devops_agent(),
            "architect_agent": self.agent_factory.architect_agent(),
            "cost_estimator_agent": self.agent_factory.cost_estimator_agent(),
            "resource_optimizer_agent": self.agent_factory.resource_optimizer_agent(),
            "prompt_engineer_agent": self.agent_factory.prompt_engineer_agent(),
            "tech_writer_agent": self.agent_factory.tech_writer_agent(),
            "qa_tester_agent": self.agent_factory.qa_tester_agent(),
            "security_auditor_agent": self.agent_factory.security_auditor_agent(),
            "nlp_evaluator_agent": self.agent_factory.nlp_evaluator_agent(),
            "diarization_specialist": self.agent_factory.diarization_specialist(),
            "spellcheck_agent": self.agent_factory.spellcheck_agent(),
        }

    def create_meeting_pipeline(self, meeting_data: Dict[str, Any]) -> Crew:
        """Creates a specialized crew for processing a meeting."""
        audio_path = meeting_data.get("audio_path", "data/sample_meeting_vi.wav")
        
        # 1. STT Task
        task_stt = Task(
            description=f"Transcribe the audio file located at '{audio_path}'. Identify the text and segments with timestamps.",
            expected_output="A full transcript text and a list of segments with start/end times.",
            agent=self.agents["backend_core_agent"]
        )

        # 2. Diarization Task
        task_diarization = Task(
            description=f"Perform speaker diarization on the audio file '{audio_path}' to identify different speakers.",
            expected_output="A list of speaker segments with start/end times and speaker labels.",
            agent=self.agents["diarization_specialist"]
        )

        # 3. Summary & Action Items Task
        task_summary = Task(
            description="Using the transcript and speaker information, generate a structured summary. "
                        "Include 'key_points', 'decisions', and 'action_items' (with owner and deadline). "
                        "Format the output as a clean JSON object.",
            expected_output="A JSON object containing meeting_summary, key_points, decisions, and action_items.",
            agent=self.agents["backend_core_agent"],
            context=[task_stt, task_diarization]
        )

        # 4. Quality Evaluation Task
        task_eval = Task(
            description="Evaluate the quality of the transcription and summary. "
                        "Calculate BLEU and ROUGE scores comparing the results against the original context.",
            expected_output="A dictionary of quality metrics including bleu, rouge_l, and wer.",
            agent=self.agents["nlp_evaluator_agent"],
            context=[task_summary]
        )

        return Crew(
            agents=list(self.agents.values()),
            tasks=[task_stt, task_diarization, task_summary, task_eval],
            process=Process.sequential,
            verbose=True
        )

    def run_task(self, task_description: str) -> str:
        """Routes a single task to the appropriate agent and executes it."""
        route = self.router.route(task_description)
        agent = self.agents.get(route.agent_id, self.agents["architect_agent"])
        
        task = Task(
            description=task_description,
            expected_output="The result of the requested task.",
            agent=agent
        )
        
        crew = Crew(
            agents=[agent],
            tasks=[task],
            verbose=True
        )
        
        return crew.kickoff()
