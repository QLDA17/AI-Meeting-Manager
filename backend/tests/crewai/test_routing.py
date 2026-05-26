from src.crewai.router import CrewRouter


def test_routing_10_cases():
    router = CrewRouter()
    cases = [
        ("Tune noise reduction for audio stream", "backend_audio_agent"),
        ("Build REST API for summary endpoint", "backend_core_agent"),
        ("Create dashboard websocket transcript panel", "frontend_agent"),
        ("Add migration and index for meetings", "db_designer_agent"),
        ("Prepare docker CI pipeline", "devops_agent"),
        ("Refine architecture routing for integration", "architect_agent"),
        ("Track token cost and monthly budget usd", "cost_estimator_agent"),
        ("Optimize cache redis batch translation", "resource_optimizer_agent"),
        ("Run prompt ab test and yaml baseline", "prompt_engineer_agent"),
        ("Perform diarization der align quality test", "diarization_specialist"),
    ]
    for text, expected_agent in cases:
        result = router.route(text)
        assert result.agent_id == expected_agent
