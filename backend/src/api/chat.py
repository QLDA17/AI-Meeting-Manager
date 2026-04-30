"""
Chat with Meeting API
Integrates with Google Gemini for contextual Q&A
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import os

from .database import get_db
from . import auth, models

try:
    from google import genai
except Exception:
    genai = None

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize Gemini
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        api_key = "MOCK_KEY" # Fail gracefully if key is missing during initialization
    model_name = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")
    if genai:
        client = genai.Client(api_key=api_key)
        gemini_available = True
    else:
        gemini_available = False
except Exception:
    gemini_available = False

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    meeting_id: str
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime
    sources: List[str] = []

def create_context_prompt(meeting: models.Meeting, user_question: str) -> str:
    """Create a context-rich prompt for Gemini using DB model"""
    
    summary_text = meeting.summary.summary_text if meeting.summary else "No summary available."
    key_points = meeting.summary.key_points if meeting.summary else []
    decisions = meeting.summary.decisions if meeting.summary else []
    transcript_text = meeting.transcript.content if meeting.transcript else "No transcript available."
    action_items = meeting.action_items
    
    prompt = f"""
Bạn là một trợ lý AI chuyên nghiệp cho cuộc họp. Hãy trả lời câu hỏi của người dùng dựa trên nội dung cuộc họp sau:

THÔNG TIN CUỘC HỌP:
- Tiêu đề: {meeting.title}
- Ngày: {meeting.date}

NỘI DUNG CHI TIẾT:
{transcript_text}

TÓM TẮT:
{summary_text}

ĐIỂM CHÍNH:
{chr(10).join(f"• {point}" for point in key_points) if key_points else "Không có"}

QUYẾT ĐỊNH:
{chr(10).join(f"• {decision}" for decision in decisions) if decisions else "Không có"}

HÀNH ĐỘNG CẦN LÀM:
{chr(10).join(f"• {item.task} (Phụ trách: {item.owner}, Deadline: {item.deadline})" for item in action_items) if action_items else "Không có"}

CÂU HỎI CỦA NGƯỜI DÙNG:
{user_question}

Hãy trả lời một cách:
1. CHÍNH XÁC: Dựa trên thông tin trong cuộc họp
2. NGẮN GỌN: Đi thẳng vào vấn đề
3. HỮU ÍCH: Cung cấp thông tin giá trị
4. CHUYÊN NGHIỆP: Sử dụng ngôn ngữ lịch sự

Nếu không tìm thấy thông tin, hãy nói "Dựa trên nội dung cuộc họp, tôi không tìm thấy thông tin về vấn đề này."
"""
    return prompt

@router.post("/ask", response_model=ChatResponse)
async def chat_with_meeting(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Chat with meeting content using Gemini AI"""
    
    # Get meeting data from DB
    meeting = db.query(models.Meeting).filter(models.Meeting.id == request.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if not gemini_available or os.getenv("GOOGLE_API_KEY") == "MOCK_KEY":
        # Fallback response
        return ChatResponse(
            response="Xin lỗi, dịch vụ AI hiện không khả dụng (Thiếu API Key). Vui lòng cấu hình GOOGLE_API_KEY.",
            timestamp=datetime.now(),
            sources=["System Fallback"]
        )
    
    try:
        # Create context prompt
        prompt = create_context_prompt(meeting, request.message)
        
        # Generate response
        response = client.models.generate_content(model=model_name, contents=prompt)
        
        return ChatResponse(
            response=getattr(response, "text", str(response)),
            timestamp=datetime.now(),
            sources=[] # In production, we'd extract specific citations
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@router.get("/meeting/{meeting_id}/summary")
async def get_meeting_summary(
    meeting_id: str, 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Get meeting summary for chat context"""
    
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {
        "meeting_id": meeting_id,
        "title": meeting.title,
        "date": meeting.date,
        "summary": meeting.summary.summary_text if meeting.summary else None,
        "key_points": meeting.summary.key_points if meeting.summary else [],
        "decisions": meeting.summary.decisions if meeting.summary else [],
        "action_items": [
            {"task": item.task, "owner": item.owner, "deadline": item.deadline, "status": item.status}
            for item in meeting.action_items
        ]
    }

@router.get("/health")
async def chat_health():
    """Check chat service health"""
    return {
        "status": "healthy" if gemini_available else "degraded",
        "gemini_available": gemini_available,
        "timestamp": datetime.now()
    }
