from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="staff") # admin, manager, staff
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    meetings = relationship("Meeting", back_populates="creator")

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    creator_id = Column(String(36), ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    date = Column(String(64)) # Keep as string for now to match existing mock data format or use DateTime
    duration = Column(String(64), default="pending")
    speaker_count = Column(Integer, default=0)
    status = Column(String(20), default="queued") # queued, processing, completed, failed
    llm_source = Column(String(20), default="none")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("User", back_populates="meetings")
    transcript = relationship("Transcript", back_populates="meeting", uselist=False)
    action_items = relationship("ActionItem", back_populates="meeting")
    summary = relationship("MeetingSummary", back_populates="meeting", uselist=False)

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"))
    content = Column(Text)
    speakers = Column(JSON) # List of speaker labels
    word_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    meeting = relationship("Meeting", back_populates="transcript")

class MeetingSummary(Base):
    __tablename__ = "meeting_summaries"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"))
    summary_text = Column(Text)
    key_points = Column(JSON)
    decisions = Column(JSON)
    
    meeting = relationship("Meeting", back_populates="summary")

class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"))
    task = Column(String(500), nullable=False)
    owner = Column(String(100))
    deadline = Column(String(64))
    status = Column(String(20), default="pending")
    
    meeting = relationship("Meeting", back_populates="action_items")

class AIQualityMetric(Base):
    __tablename__ = "ai_quality_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"), unique=True)
    bleu_score = Column(Float, default=0.0)
    rouge_l_score = Column(Float, default=0.0)
    wer_score = Column(Float, default=0.0)
    der_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    latency_sec = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AICostLog(Base):
    __tablename__ = "ai_cost_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"), nullable=True)
    model_name = Column(String(100))
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    is_estimated = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
