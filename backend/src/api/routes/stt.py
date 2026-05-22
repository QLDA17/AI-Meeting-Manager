from fastapi import APIRouter

from src.api import _legacy_runtime as legacy
from src.api import schemas

router = APIRouter(tags=["stt"])

router.add_api_route("/api/upload", legacy.upload_audio, methods=["POST"])
router.add_api_websocket_route("/api/test-stt/stream", legacy.test_stt_stream)
router.add_api_websocket_route("/api/meetings/{meeting_id}/stt-stream", legacy.meeting_stt_stream)
router.add_api_route("/api/test-stt/transcribe-chunk", legacy.test_stt_transcribe_chunk, methods=["POST"])
router.add_api_route(
    "/api/test-stt/analyze",
    legacy.test_stt_analyze,
    methods=["POST"],
    response_model=schemas.TestSTTAnalyzeResponse,
)
router.add_api_route("/api/meetings/{meeting_id}/transcribe-chunk", legacy.transcribe_chunk, methods=["POST"])
router.add_api_route("/api/audio-files/{audio_id}/stream", legacy.stream_audio_file, methods=["GET"])
