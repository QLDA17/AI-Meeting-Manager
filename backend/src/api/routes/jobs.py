from fastapi import APIRouter

from src.api.core.job_operations import get_job_status_payload

router = APIRouter(tags=["jobs"])

@router.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    return get_job_status_payload(job_id)
