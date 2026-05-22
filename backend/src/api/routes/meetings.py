from typing import List

from fastapi import APIRouter

from src.api import _legacy_runtime as legacy
from src.api import schemas

router = APIRouter(tags=["meetings"])

router.add_api_route("/api/meetings", legacy.list_meetings, methods=["GET"], response_model=List[schemas.Meeting])
router.add_api_route(
    "/api/meetings/by-code/{meeting_code}",
    legacy.get_meeting_by_code,
    methods=["GET"],
    response_model=schemas.MeetingDetailResponse,
)
router.add_api_route("/api/meetings/{meeting_id}", legacy.get_meeting, methods=["GET"], response_model=schemas.MeetingDetailResponse)
router.add_api_route("/api/meetings/{meeting_id}/my-status", legacy.get_my_meeting_status, methods=["GET"])
router.add_api_route(
    "/api/meetings/{meeting_id}/messages",
    legacy.list_meeting_messages,
    methods=["GET"],
    response_model=List[schemas.MeetingMessage],
)
router.add_api_route(
    "/api/meetings/{meeting_id}/messages",
    legacy.create_meeting_message_endpoint,
    methods=["POST"],
    response_model=schemas.MeetingMessage,
)
router.add_api_route(
    "/api/meetings/{meeting_id}/speaker-mappings",
    legacy.list_meeting_speaker_mappings,
    methods=["GET"],
    response_model=List[schemas.MeetingSpeakerMapping],
)
router.add_api_route(
    "/api/meetings/{meeting_id}/speaker-mappings/{speaker_label}",
    legacy.update_meeting_speaker_mapping,
    methods=["PATCH"],
    response_model=schemas.MeetingSpeakerMapping,
)
router.add_api_websocket_route("/api/meetings/{meeting_id}/stream", legacy.meeting_room_stream)
router.add_api_route("/api/meetings", legacy.create_meeting_endpoint, methods=["POST"], response_model=schemas.Meeting)
router.add_api_route("/api/meetings/{meeting_id}/start", legacy.start_meeting_endpoint, methods=["POST"], response_model=schemas.Meeting)
router.add_api_route("/api/meetings/{meeting_id}/end", legacy.end_meeting_endpoint, methods=["POST"], response_model=schemas.Meeting)
router.add_api_route("/api/meetings/{meeting_id}", legacy.update_meeting_endpoint, methods=["PUT"], response_model=schemas.Meeting)
router.add_api_route("/api/participants/{participant_id}/rsvp", legacy.rsvp_participant, methods=["PUT"])
router.add_api_route("/api/meetings/{meeting_id}", legacy.delete_meeting_endpoint, methods=["DELETE"])
router.add_api_route(
    "/api/meetings/{meeting_id}/transcript-draft",
    legacy.get_transcript_draft,
    methods=["GET"],
)
router.add_api_route(
    "/api/meetings/{meeting_id}/finalize",
    legacy.finalize_meeting,
    methods=["POST"],
    response_model=schemas.MeetingFinalizeResponse,
)
router.add_api_route("/api/meetings/{meeting_id}/dialect", legacy.get_meeting_dialect, methods=["GET"])
router.add_api_route("/api/jobs/{job_id}", legacy.get_job_status, methods=["GET"])
router.add_api_route("/api/analytics/meetings", legacy.get_meeting_analytics, methods=["GET"], response_model=legacy.AnalyticsResponse)
router.add_api_route("/api/analytics/performance", legacy.get_performance_analytics, methods=["GET"])
router.add_api_route("/api/dashboard/stats", legacy.get_stats, methods=["GET"])
router.add_api_route("/api/notifications", legacy.get_notifications, methods=["GET"])
router.add_api_route("/api/notifications/{notification_id}/read", legacy.mark_notification_read, methods=["PATCH"])
router.add_api_route("/api/notifications/read-all", legacy.mark_all_notifications_read, methods=["POST"])
router.add_api_route("/api/notifications/{notification_id}", legacy.dismiss_notification, methods=["DELETE"])
router.add_api_route("/api/search", legacy.search_entities, methods=["GET"], response_model=List[schemas.SearchResult])
