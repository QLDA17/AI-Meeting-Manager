"""
Export API for MultiMinutes AI
Supports PDF and DOCX generation
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
import os
import tempfile
from fpdf import FPDF
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import io

import re

from .database import get_db
from . import auth, models

router = APIRouter(prefix="/api/export", tags=["export"])

class ExportRequest(BaseModel):
    meeting_id: str
    format: str  # "pdf" or "docx"
    include_transcript: bool = True
    include_summary: bool = True
    include_action_items: bool = True

class ExportResponse(BaseModel):
    download_url: str
    filename: str
    size_bytes: int
    created_at: datetime

def create_pdf_export(meeting: models.Meeting, request: ExportRequest, db: Session) -> bytes:
    """Create PDF export of meeting"""
    pdf = FPDF()
    pdf.add_page()

    # Generic font settings
    pdf.set_font('Arial', 'B', 16)

    # Header
    pdf.cell(0, 10, meeting.title, 0, 1, 'C')
    pdf.set_font('Arial', '', 12)

    # Meeting Info
    meeting_date = meeting.scheduled_start.strftime('%d/%m/%Y %H:%M') if meeting.scheduled_start else 'N/A'
    pdf.cell(0, 8, f"Date: {meeting_date}", 0, 1)
    pdf.cell(0, 8, f"Duration: {meeting.duration or 0} min", 0, 1)
    pdf.ln(10)

    # Summary
    summary = db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting.id).first()
    if request.include_summary and summary:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Summary:', 0, 1)
        pdf.set_font('Arial', '', 12)

        pdf.multi_cell(0, 8, summary.meeting_summary or "No text summary.")

        if summary.key_points:
            pdf.cell(0, 8, 'Key Points:', 0, 1)
            points = summary.key_points if isinstance(summary.key_points, list) else []
            for point in points:
                pdf.cell(0, 8, f"• {point}", 0, 1)

        if summary.decisions:
            pdf.cell(0, 8, 'Decisions:', 0, 1)
            decisions = summary.decisions if isinstance(summary.decisions, list) else []
            for decision in decisions:
                pdf.cell(0, 8, f"• {decision}", 0, 1)
        pdf.ln(10)

    # Action Items
    action_items = db.query(models.ActionItem).filter(models.ActionItem.meeting_id == meeting.id).all()
    if request.include_action_items and action_items:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Action Items:', 0, 1)
        pdf.set_font('Arial', '', 12)
        for item in action_items:
            owner = item.assigned_email or item.assigned_to or 'N/A'
            deadline = item.due_date.strftime('%d/%m/%Y') if item.due_date else 'N/A'
            pdf.cell(0, 8, f"• {item.title} (Owner: {owner}, Deadline: {deadline})", 0, 1)
        pdf.ln(10)

    # Transcript
    transcript = db.query(models.Transcript).filter(models.Transcript.meeting_id == meeting.id).first()
    if request.include_transcript and transcript:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Full Transcript:', 0, 1)
        pdf.set_font('Arial', '', 10)

        segments = db.query(models.TranscriptSegment).filter(
            models.TranscriptSegment.transcript_id == transcript.id
        ).order_by(models.TranscriptSegment.start_time).all()
        for seg in segments:
            line = f"[{seg.speaker_label}] {seg.text}"
            if line.strip():
                pdf.multi_cell(0, 6, line.strip())

    return pdf.output(dest='S').encode('latin-1', 'replace')

def create_docx_export(meeting: models.Meeting, request: ExportRequest, db: Session) -> bytes:
    """Create DOCX export of meeting"""
    doc = Document()

    # Title
    title = doc.add_heading(meeting.title, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Meeting Info
    meeting_date = meeting.scheduled_start.strftime('%d/%m/%Y %H:%M') if meeting.scheduled_start else 'N/A'
    info_para = doc.add_paragraph()
    info_para.add_run('Date: ').bold = True
    info_para.add_run(f"{meeting_date}\n")
    info_para.add_run('Duration: ').bold = True
    info_para.add_run(f"{meeting.duration or 0} min")

    # Summary
    summary = db.query(models.MeetingSummary).filter(models.MeetingSummary.meeting_id == meeting.id).first()
    if request.include_summary and summary:
        doc.add_heading('Summary', level=1)
        doc.add_paragraph(summary.meeting_summary or "No summary available.")

        if summary.key_points:
            doc.add_heading('Key Points', level=2)
            points = summary.key_points if isinstance(summary.key_points, list) else []
            for point in points:
                doc.add_paragraph(f"• {point}", style='List Bullet')

        if summary.decisions:
            doc.add_heading('Decisions', level=2)
            decisions = summary.decisions if isinstance(summary.decisions, list) else []
            for decision in decisions:
                doc.add_paragraph(f"• {decision}", style='List Bullet')

    # Action Items
    action_items = db.query(models.ActionItem).filter(models.ActionItem.meeting_id == meeting.id).all()
    if request.include_action_items and action_items:
        doc.add_heading('Action Items', level=1)
        for item in action_items:
            owner = item.assigned_email or item.assigned_to or 'N/A'
            deadline = item.due_date.strftime('%d/%m/%Y') if item.due_date else 'N/A'
            doc.add_paragraph(f"• {item.title} (Owner: {owner}, Hạn: {deadline})", style='List Bullet')

    # Transcript
    transcript = db.query(models.Transcript).filter(models.Transcript.meeting_id == meeting.id).first()
    if request.include_transcript and transcript:
        doc.add_heading('Full Transcript', level=1)
        segments = db.query(models.TranscriptSegment).filter(
            models.TranscriptSegment.transcript_id == transcript.id
        ).order_by(models.TranscriptSegment.start_time).all()
        for seg in segments:
            doc.add_paragraph(f"[{seg.speaker_label}] {seg.text}")

    # Save to bytes
    doc_stream = io.BytesIO()
    doc.save(doc_stream)
    return doc_stream.getvalue()

@router.post("/generate", response_model=ExportResponse)
async def generate_export(
    request: ExportRequest, 
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user)
):
    """Generate export in PDF or DOCX format"""
    
    meeting = db.query(models.Meeting).filter(models.Meeting.id == request.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    auth.require_org_member(db, current_user, meeting.organization_id)
    
    try:
        if request.format.lower() == 'pdf':
            file_content = create_pdf_export(meeting, request, db)
            extension = "pdf"
        elif request.format.lower() == 'docx':
            file_content = create_docx_export(meeting, request, db)
            extension = "docx"
        else:
            raise HTTPException(status_code=400, detail="Unsupported format")
        
        filename = f"meeting-{meeting.id}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.{extension}"
        
        # Save to temporary file
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        download_url = f"/api/export/download/{filename}"
        
        return ExportResponse(
            download_url=download_url,
            filename=filename,
            size_bytes=len(file_content),
            created_at=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating export: {str(e)}")

@router.get("/download/{filename}")
async def download_export(
    filename: str,
    db: Session = Depends(get_db),
    current_user = Depends(auth.get_current_user),
):
    """Download exported file"""
    # Path traversal protection
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', filename) or '..' in filename or '/' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    match = re.match(r'^meeting-([0-9a-fA-F-]{36})-\d{8}_\d{6}\.(pdf|docx)$', filename)
    if match:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == match.group(1)).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        auth.require_org_member(db, current_user, meeting.organization_id)

    if filename.endswith('.pdf'):
        content_type = 'application/pdf'
    elif filename.endswith('.docx'):
        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else:
        content_type = 'application/octet-stream'

    with open(file_path, 'rb') as f:
        file_content = f.read()

    return Response(
        content=file_content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
