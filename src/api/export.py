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

def create_pdf_export(meeting: models.Meeting, request: ExportRequest) -> bytes:
    """Create PDF export of meeting"""
    pdf = FPDF()
    pdf.add_page()
    
    # Generic font settings
    pdf.set_font('Arial', 'B', 16)
    
    # Header
    pdf.cell(0, 10, meeting.title, 0, 1, 'C')
    pdf.set_font('Arial', '', 12)
    
    # Meeting Info
    pdf.cell(0, 8, f"Date: {meeting.date or 'N/A'}", 0, 1)
    pdf.cell(0, 8, f"Duration: {meeting.duration}", 0, 1)
    pdf.ln(10)
    
    # Summary
    if request.include_summary and meeting.summary:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Summary:', 0, 1)
        pdf.set_font('Arial', '', 12)
        
        pdf.multi_cell(0, 8, meeting.summary.summary_text or "No text summary.")
        
        if meeting.summary.key_points:
            pdf.cell(0, 8, 'Key Points:', 0, 1)
            for point in meeting.summary.key_points:
                pdf.cell(0, 8, f"• {point}", 0, 1)
        
        if meeting.summary.decisions:
            pdf.cell(0, 8, 'Decisions:', 0, 1)
            for decision in meeting.summary.decisions:
                pdf.cell(0, 8, f"• {decision}", 0, 1)
        pdf.ln(10)
    
    # Action Items
    if request.include_action_items and meeting.action_items:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Action Items:', 0, 1)
        pdf.set_font('Arial', '', 12)
        for item in meeting.action_items:
            pdf.cell(0, 8, f"• {item.task} (Owner: {item.owner}, Deadline: {item.deadline})", 0, 1)
        pdf.ln(10)
    
    # Transcript
    if request.include_transcript and meeting.transcript:
        pdf.set_font('Arial', 'B', 14)
        pdf.cell(0, 10, 'Full Transcript:', 0, 1)
        pdf.set_font('Arial', '', 10)
        
        lines = meeting.transcript.content.strip().split('\n')
        for line in lines:
            if line.strip():
                pdf.multi_cell(0, 6, line.strip())
    
    return pdf.output(dest='S').encode('latin-1', 'replace')

def create_docx_export(meeting: models.Meeting, request: ExportRequest) -> bytes:
    """Create DOCX export of meeting"""
    doc = Document()
    
    # Title
    title = doc.add_heading(meeting.title, 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Meeting Info
    info_para = doc.add_paragraph()
    info_para.add_run('Date: ').bold = True
    info_para.add_run(f"{meeting.date}\n")
    info_para.add_run('Duration: ').bold = True
    info_para.add_run(f"{meeting.duration}")
    
    # Summary
    if request.include_summary and meeting.summary:
        doc.add_heading('Summary', level=1)
        doc.add_paragraph(meeting.summary.summary_text)
        
        if meeting.summary.key_points:
            doc.add_heading('Key Points', level=2)
            for point in meeting.summary.key_points:
                doc.add_paragraph(f"• {point}", style='List Bullet')
        
        if meeting.summary.decisions:
            doc.add_heading('Decisions', level=2)
            for decision in meeting.summary.decisions:
                doc.add_paragraph(f"• {decision}", style='List Bullet')
    
    # Action Items
    if request.include_action_items and meeting.action_items:
        doc.add_heading('Action Items', level=1)
        for item in meeting.action_items:
            doc.add_paragraph(f"• {item.task} (Owner: {item.owner}, Hạn: {item.deadline})", style='List Bullet')
    
    # Transcript
    if request.include_transcript and meeting.transcript:
        doc.add_heading('Full Transcript', level=1)
        doc.add_paragraph(meeting.transcript.content)
    
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
    
    try:
        if request.format.lower() == 'pdf':
            file_content = create_pdf_export(meeting, request)
            extension = "pdf"
        elif request.format.lower() == 'docx':
            file_content = create_docx_export(meeting, request)
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
async def download_export(filename: str):
    """Download exported file"""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
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
