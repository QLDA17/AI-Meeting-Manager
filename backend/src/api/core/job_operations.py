from typing import Any, Dict

from fastapi import HTTPException


def get_job_status_payload(job_id: str) -> Dict[str, Any]:
    # Temporarily disabled
    raise HTTPException(status_code=503, detail="Job tracking temporarily disabled")
    # if job_id not in JOBS:
    #     raise HTTPException(status_code=404, detail="Job not found")
    
    # job = JOBS[job_id]
    # return {
    #     "job_id": job.job_id,
    #     "status": job.status,
    #     "progress": job.progress,
    #     "meeting_id": job.meeting_id,
    #     "results": job.results if job.status == "completed" else None
    # }
