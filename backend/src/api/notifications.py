"""
Email Notification System for MultiMinutes AI
Handles sending notifications for meetings, action items, and exports
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from jinja2 import Template

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Import auth for dependency injection
from . import auth

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@multiminutes.ai")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class NotificationRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: str
    notification_type: str
    data: dict


class MeetingReminderRequest(BaseModel):
    meeting_id: str
    meeting_title: str
    scheduled_time: datetime
    participants: List[dict]
    reminder_minutes: int = 15


class MeetingCompletedRequest(BaseModel):
    meeting_id: str
    meeting_title: str
    duration: int
    participants: List[dict]
    transcript_url: Optional[str] = None


class ActionItemAssignedRequest(BaseModel):
    action_item_id: str
    title: str
    description: str
    assigned_to_email: EmailStr
    assigned_to_name: str
    due_date: Optional[datetime] = None
    meeting_id: str
    meeting_title: str


class ExportReadyRequest(BaseModel):
    export_id: str
    meeting_id: str
    meeting_title: str
    format: str
    download_url: str
    requested_by_email: EmailStr
    requested_by_name: str


# Email templates
MEETING_REMINDER_TEMPLATE = """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🎤 Nhắc Nhở Cuộc Họp</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; font-size: 16px;">Chào <strong>{{ recipient_name }}</strong>,</p>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Bạn có một cuộc họp sắp diễn ra:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0;">{{ meeting_title }}</h2>
            <p style="color: #666; margin: 5px 0;">📅 <strong>Thời gian:</strong> {{ scheduled_time }}</p>
            <p style="color: #666; margin: 5px 0;">⏰ <strong>Còn lại:</strong> {{ time_remaining }}</p>
        </div>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Các thành viên tham gia:
        </p>
        <ul style="color: #666; font-size: 14px; margin: 20px 0; padding-left: 20px;">
            {% for participant in participants %}
            <li>{{ participant.name }} ({{ participant.email }})</li>
            {% endfor %}
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ meeting_url }}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Xem Chi Tiết Cuộc Họp
            </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 CONVIA - Hệ thống Ghi Biên Bản AI
        </p>
    </div>
</div>
"""

MEETING_COMPLETED_TEMPLATE = """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #48BB78 0%, #38A169 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">✅ Cuộc Họp Đã Hoàn Thành</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; font-size: 16px;">Chào <strong>{{ recipient_name }}</strong>,</p>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Cuộc họp của bạn đã được xử lý thành công:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #48BB78; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0;">{{ meeting_title }}</h2>
            <p style="color: #666; margin: 5px 0;">⏱️ <strong>Thời lượng:</strong> {{ duration }}</p>
            <p style="color: #666; margin: 5px 0;">👥 <strong>Thành viên:</strong> {{ participant_count }}</p>
        </div>
        {% if transcript_url %}
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ transcript_url }}" style="background: linear-gradient(135deg, #48BB78 0%, #38A169 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Xem Biên Bản Chi Tiết
            </a>
        </div>
        {% endif %}
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 CONVIA - Hệ thống Ghi Biên Bản AI
        </p>
    </div>
</div>
"""

ACTION_ITEM_ASSIGNED_TEMPLATE = """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📋 Nhiệm Vụ Mới Đã Được Giao</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; font-size: 16px;">Chào <strong>{{ recipient_name }}</strong>,</p>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">
            Bạn có một nhiệm vụ mới từ cuộc họp:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ED8936; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0;">{{ title }}</h2>
            <p style="color: #666; margin: 10px 0;">{{ description }}</p>
            {% if due_date %}
            <p style="color: #666; margin: 10px 0;">📅 <strong>Deadline:</strong> {{ due_date }}</p>
            {% endif %}
            <p style="color: #666; margin: 10px 0;">📝 <strong>Từ cuộc họp:</strong> {{ meeting_title }}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ action_item_url }}" style="background: linear-gradient(135deg, #ED8936 0%, #DD6B20 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Xem Chi Tiết Nhiệm Vụ
            </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            © 2026 CONVIA - Hệ thống Ghi Biên Bản AI
        </p>
    </div>
</div>
"""

EXPORT_READY_TEMPLATE = """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📄 File Export Đã Sẵn Sàng</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; font-size: 16px;">Chào <strong>{{ recipient_name }}</strong>,</p>
        <p style="color: #666; font-size: 14px; margin: 20px 0;">
            File export bạn yêu cầu đã sẵn sàng để tải xuống:
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4299E1; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 10px 0;">{{ meeting_title }}</h2>
            <p style="color: #666; margin: 5px 0;">📁 <strong>Định dạng:</strong> {{ format }}</p>
            <p style="color: #666; margin: 5px 0;">🆔 <strong>Export ID:</strong> {{ export_id }}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ download_url }}" style="background: linear-gradient(135deg, #4299E1 0%, #3182CE 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Tải Xuống File
            </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            File sẽ được giữ trong 7 ngày. © 2026 CONVIA
        </p>
    </div>
</div>
"""


def send_email(recipient_email: str, subject: str, html_content: str):
    """Send email using SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = FROM_EMAIL
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_meeting_reminder(request: MeetingReminderRequest):
    """Send meeting reminder email"""
    template = Template(MEETING_REMINDER_TEMPLATE)
    
    # Calculate time remaining
    time_delta = request.scheduled_time - datetime.now()
    hours = int(time_delta.total_seconds() / 3600)
    minutes = int((time_delta.total_seconds() % 3600) / 60)
    time_remaining = f"{hours} giờ {minutes} phút"
    
    html_content = template.render(
        recipient_name=request.participants[0].get('name', 'User'),
        meeting_title=request.meeting_title,
        scheduled_time=request.scheduled_time.strftime('%d/%m/%Y %H:%M'),
        time_remaining=time_remaining,
        participants=request.participants,
        meeting_url=f"{FRONTEND_URL}/meeting-detail-official.html?id={request.meeting_id}"
    )
    
    subject = f"🎤 Nhắc Nhở: {request.meeting_title}"
    
    # Send to all participants
    success_count = 0
    for participant in request.participants:
        if send_email(participant['email'], subject, html_content):
            success_count += 1
    
    return {"success": success_count, "total": len(request.participants)}


def send_meeting_completed(request: MeetingCompletedRequest):
    """Send meeting completed notification"""
    template = Template(MEETING_COMPLETED_TEMPLATE)
    
    html_content = template.render(
        recipient_name=request.participants[0].get('name', 'User'),
        meeting_title=request.meeting_title,
        duration=f"{request.duration} phút",
        participant_count=len(request.participants),
        transcript_url=f"{FRONTEND_URL}/meeting-detail-official.html?id={request.meeting_id}" if request.transcript_url else None
    )
    
    subject = f"✅ Cuộc họp hoàn thành: {request.meeting_title}"
    
    # Send to all participants
    success_count = 0
    for participant in request.participants:
        if send_email(participant['email'], subject, html_content):
            success_count += 1
    
    return {"success": success_count, "total": len(request.participants)}


def send_action_item_assigned(request: ActionItemAssignedRequest):
    """Send action item assigned notification"""
    template = Template(ACTION_ITEM_ASSIGNED_TEMPLATE)
    
    html_content = template.render(
        recipient_name=request.assigned_to_name,
        title=request.title,
        description=request.description,
        due_date=request.due_date.strftime('%d/%m/%Y') if request.due_date else None,
        meeting_title=request.meeting_title,
        action_item_url=f"{FRONTEND_URL}/meeting-detail-official.html?id={request.meeting_id}"
    )
    
    subject = f"📋 Nhiệm vụ mới: {request.title}"
    
    success = send_email(request.assigned_to_email, subject, html_content)
    
    return {"success": success}


def send_export_ready(request: ExportReadyRequest):
    """Send export ready notification"""
    template = Template(EXPORT_READY_TEMPLATE)
    
    html_content = template.render(
        recipient_name=request.requested_by_name,
        meeting_title=request.meeting_title,
        format=request.format,
        export_id=request.export_id,
        download_url=request.download_url
    )
    
    subject = f"📄 File export sẵn sàng: {request.meeting_title}"
    
    success = send_email(request.requested_by_email, subject, html_content)
    
    return {"success": success}


@router.post("/meeting-reminder")
async def meeting_reminder(request: MeetingReminderRequest, background_tasks: BackgroundTasks, current_user = Depends(auth.get_current_user)):
    """Send meeting reminder notification"""
    background_tasks.add_task(send_meeting_reminder, request)
    return {"message": "Meeting reminder emails queued for sending"}


@router.post("/meeting-completed")
async def meeting_completed(request: MeetingCompletedRequest, background_tasks: BackgroundTasks, current_user = Depends(auth.get_current_user)):
    """Send meeting completed notification"""
    background_tasks.add_task(send_meeting_completed, request)
    return {"message": "Meeting completed emails queued for sending"}


@router.post("/action-item-assigned")
async def action_item_assigned(request: ActionItemAssignedRequest, background_tasks: BackgroundTasks, current_user = Depends(auth.get_current_user)):
    """Send action item assigned notification"""
    background_tasks.add_task(send_action_item_assigned, request)
    return {"message": "Action item notification queued for sending"}


@router.post("/export-ready")
async def export_ready(request: ExportReadyRequest, background_tasks: BackgroundTasks, current_user = Depends(auth.get_current_user)):
    """Send export ready notification"""
    background_tasks.add_task(send_export_ready, request)
    return {"message": "Export ready notification queued for sending"}


@router.post("/custom")
async def custom_notification(request: NotificationRequest, background_tasks: BackgroundTasks, current_user = Depends(auth.get_current_user)):
    """Send custom notification"""
    def send_custom():
        # Generic custom notification template
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">📢 Thông Báo</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #333; font-size: 16px;">Chào <strong>{request.recipient_name}</strong>,</p>
                <p style="color: #666; font-size: 14px; margin: 20px 0;">
                    {request.data.get('message', 'Bạn có một thông báo mới.')}
                </p>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                    © 2026 CONVIA
                </p>
            </div>
        </div>
        """
        
        subject = request.data.get('subject', 'Thông báo từ CONVIA')
        send_email(request.recipient_email, subject, html_content)
    
    background_tasks.add_task(send_custom)
    return {"message": "Custom notification queued for sending"}


@router.get("/test")
async def test_notification(current_user = Depends(auth.get_current_user)):
    """Test email configuration"""
    try:
        test_request = NotificationRequest(
            recipient_email="test@example.com",
            recipient_name="Test User",
            notification_type="test",
            data={"message": "This is a test notification"}
        )
        return {
            "status": "Email configuration loaded",
            "smtp_host": SMTP_HOST,
            "smtp_port": SMTP_PORT,
            "from_email": FROM_EMAIL,
            "configured": bool(SMTP_USER and SMTP_PASSWORD)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
