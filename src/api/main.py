import os
import sys
import uuid
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.api.database import engine, get_db, Base
from src.api import models, auth, crud
from src.cost.cost_logger import CostLogger
from src.providers.google_llm import GoogleLLMAdapter
from src.api.chat import router as chat_router
from src.api.export import router as export_router
from src.api.notifications import router as notifications_router
from src.api.swagger import custom_openapi
from src.cost.api import get_admin_costs, get_admin_performance
from src.api.jobs import MeetingProcessingJob, JOBS

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MultiMinutes AI API")

# Custom OpenAPI schema
app.openapi = lambda: custom_openapi(app)

# Include routers
app.include_router(chat_router)
app.include_router(export_router)
app.include_router(notifications_router)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cost_logger = CostLogger(monthly_hard_limit_usd=10.0)
adapter = GoogleLLMAdapter(cost_logger=cost_logger)

# Pydantic Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: str
    full_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    source: str
    confidence: float

class AnalyticsResponse(BaseModel):
    total_meetings_over_time: Dict[str, int]
    provider_distribution: Dict[str, int]
    top_action_owners: Dict[str, int]
    topic_trends: Dict[str, int]

# Auth Endpoints
@app.post("/api/auth/register", response_model=Dict)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, req.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_data = req.dict()
    crud.create_user(db, user_data)
    return {"message": "User created successfully"}

@app.post("/api/auth/login", response_model=Token)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, req.username)
    if not user or not auth.verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "role": user.role}
    }

# Meeting Endpoints
@app.get("/api/meetings")
def list_meetings(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    meetings = crud.get_meetings(db)
    return meetings

@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Format for frontend
    result = {
        "id": meeting.id,
        "title": meeting.title,
        "date": meeting.date,
        "duration": meeting.duration,
        "speaker_count": meeting.speaker_count,
        "status": meeting.status,
        "llm_source": meeting.llm_source,
        "transcript": meeting.transcript.content if meeting.transcript else None,
        "summary": {
            "meeting_summary": meeting.summary.summary_text if meeting.summary else "",
            "key_points": meeting.summary.key_points if meeting.summary else [],
            "decisions": meeting.summary.decisions if meeting.summary else [],
            "action_items": [
                {"task": ai.task, "owner": ai.owner, "deadline": ai.deadline}
                for ai in meeting.action_items
            ]
        } if meeting.summary or meeting.action_items else None
    }
    return result

@app.post("/api/upload")
async def upload_audio(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    if not file.filename.lower().endswith((".wav", ".mp3")):
        raise HTTPException(
            status_code= status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only .wav and .mp3 are supported.",
        )

    # Ensure upload directory exists
    upload_dir = os.path.join("data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file to disk
    file_id = str(uuid.uuid4())
    extension = os.path.splitext(file.filename)[1]
    file_path = os.path.join(upload_dir, f"{file_id}{extension}")
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # Create meeting record
    meeting_data = {
        "title": file.filename,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "status": "queued",
    }
    db_meeting = crud.create_meeting(db, meeting_data, creator_id=current_user.id)
    
    # Initialize Job
    job = MeetingProcessingJob(db_meeting.id, db_meeting.title, cost_logger)
    job.audio_path = file_path # Pass the actual file path to the job
    JOBS[job.job_id] = job

    # Run background pipeline
    background_tasks.add_task(job.run)

    return {"job_id": job.job_id, "meeting_id": db_meeting.id}

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = JOBS[job_id]
    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress": job.progress,
        "meeting_id": job.meeting_id,
        "results": job.results if job.status == "completed" else None
    }

# Analytics Endpoints
@app.get("/api/analytics/meetings", response_model=AnalyticsResponse)
async def get_meeting_analytics():
    return {
        "total_meetings_over_time": {
            "2024-03-25": 12,
            "2024-03-26": 15,
            "2024-03-27": 10,
            "2024-03-28": 18,
            "2024-03-29": 22,
            "2024-03-30": 14,
            "2024-03-31": 19,
        },
        "provider_distribution": {
            "live": 85,
            "fallback": 15
        },
        "top_action_owners": {
            "Huyền": 12,
            "Nhật": 8,
            "Oanh": 5,
            "Tuấn": 10
        },
        "topic_trends": {
            "Kế hoạch quý 2": 45,
            "Review code": 30,
            "Thiết kế UI/UX": 25,
            "Bảo mật hệ thống": 15
        }
    }

@app.get("/api/analytics/performance")
async def get_performance_analytics():
    return get_admin_performance()

@app.get("/api/admin/costs")
async def get_costs():
    return get_admin_costs()

@app.get("/api/dashboard/stats")
def get_stats(db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    cost_summary = get_admin_costs()
    total_meetings = db.query(models.Meeting).count()
    return {
        "total_meetings": total_meetings,
        "total_hours": f"{total_meetings * 0.5:.1f}h", # Estimate
        "actual_cost_usd": cost_summary.get("actual_cost_usd", 0),
        "estimated_cost_usd": cost_summary.get("estimated_cost_usd", 0),
        "live_success_rate": "100%",
        "model_health": {m: adapter._get_health_score(m) for m in adapter.model_health},
    }

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": str(datetime.now())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
