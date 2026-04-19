from crewai.tools import BaseTool
from typing import Dict, Any, List
from src.stt.service import STTService
from src.diarization.service import DiarizationService
from src.providers.nlp_eval import NLPEvaluationService


class STTTool(BaseTool):
    name: str = "stt_tool"
    description: str = "Transcribes an audio file into text using OpenAI Whisper."

    def _run(self, audio_path: str) -> Dict[str, Any]:
        stt_service = STTService()
        return stt_service.transcribe_audio(audio_path)


class DiarizationTool(BaseTool):
    name: str = "diarization_tool"
    description: str = "Separates different speakers in an audio file."

    def _run(self, audio_path: str) -> List[Dict[str, Any]]:
        diarization_service = DiarizationService()
        return diarization_service.diarize_audio(audio_path)


class QualityEvalTool(BaseTool):
    name: str = "quality_eval_tool"
    description: str = "Evaluates the quality of text using NLP metrics like BLEU and ROUGE."

    def _run(self, reference: str, hypothesis: str) -> Dict[str, float]:
        eval_service = NLPEvaluationService()
        return eval_service.evaluate_quality(reference, hypothesis)
