from fastapi import APIRouter, Depends

from src.api import auth
from src.api.core.job_operations import get_batch_status_payload, get_job_status_payload, retry_job_payload

router = APIRouter(tags=["jobs"])

@router.get("/api/jobs/{job_id}")
def get_job_status(job_id: str, current_user=Depends(auth.get_current_user)):
    return get_job_status_payload(job_id)


@router.get("/api/upload/jobs/{job_id}")
def get_upload_job_status(job_id: str, current_user=Depends(auth.get_current_user)):
    return get_job_status_payload(job_id)


@router.post("/api/upload/jobs/{job_id}/retry")
def retry_upload_job(job_id: str, current_user=Depends(auth.get_current_user)):
    return retry_job_payload(job_id)


@router.get("/api/uploads/batch/{batch_id}")
def get_upload_batch_status(batch_id: str, current_user=Depends(auth.get_current_user)):
    return get_batch_status_payload(batch_id)
