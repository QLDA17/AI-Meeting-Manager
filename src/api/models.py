"""
MultiMinutes AI — ORM Models (v2)
Multi-tenant schema: Users → Organizations → Groups → Meetings
Aligned with database/schema_v2.sql and Blueprint DDL
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, Float, JSON, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


# ============================================================================
# IAM: Users + Roles + Permissions
# ============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    display_name = Column(String(200))
    avatar_url = Column(Text)
    system_role = Column(String(32), default="member")  # 'system-admin' | 'member'
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Backward compat aliases
    @property
    def username(self):
        return self.email

    @property
    def role(self):
        return self.system_role

    @property
    def full_name(self):
        parts = [self.first_name or "", self.last_name or ""]
        return " ".join(p for p in parts if p).strip() or self.display_name or self.email

    # Relationships
    org_memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan", foreign_keys="OrganizationMember.user_id")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan", foreign_keys="GroupMember.user_id")
    created_meetings = relationship("Meeting", back_populates="creator", foreign_keys="Meeting.created_by")


# ============================================================================
# TENANT: Organizations + Groups
# ============================================================================

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    logo_url = Column(Text)
    visibility = Column(String(16), default="public")  # 'public' | 'private'
    join_policy = Column(String(16), default="request")  # 'open' | 'request' | 'invite_only'
    max_members = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="organization", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="organization")
    join_requests = relationship("OrganizationJoinRequest", back_populates="organization", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(32), nullable=False, default="member")  # 'org-admin' | 'member' | 'viewer'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    invited_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))

    # Relationships
    user = relationship("User", back_populates="org_memberships", foreign_keys=[user_id])
    organization = relationship("Organization", back_populates="members")


class OrganizationJoinRequest(Base):
    __tablename__ = "organization_join_requests"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text)
    status = Column(String(16), default="pending")  # 'pending' | 'approved' | 'rejected'
    reviewed_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    organization = relationship("Organization", back_populates="join_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class Group(Base):
    __tablename__ = "groups"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    privacy_level = Column(String(32), default="internal")  # 'private' | 'internal' | 'public'
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="groups")
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="group")
    creator = relationship("User", foreign_keys=[created_by])


class GroupMember(Base):
    __tablename__ = "group_members"

    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(String(64), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(32), nullable=False, default="member")  # 'group-admin' | 'member' | 'viewer'
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="group_memberships", foreign_keys=[user_id])
    group = relationship("Group", back_populates="members")


# ============================================================================
# MEETING + AI PIPELINE
# ============================================================================

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    group_id = Column(String(64), ForeignKey("groups.id", ondelete="SET NULL"))
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    scheduled_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    status = Column(String(32), default="scheduled")  # scheduled|queued|processing|completed|failed|live|canceled
    meeting_code = Column(String(20), unique=True)
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_pinned = Column(Boolean, default=False)

    # Backward compat
    @property
    def date(self):
        return self.scheduled_at.strftime("%Y-%m-%d %H:%M") if self.scheduled_at else None

    @property
    def duration(self):
        return f"{self.duration_minutes}m" if self.duration_minutes else "pending"

    # Relationships
    group = relationship("Group", back_populates="meetings")
    organization = relationship("Organization", back_populates="meetings")
    creator = relationship("User", back_populates="created_meetings", foreign_keys=[created_by])
    transcript = relationship("Transcript", back_populates="meeting", uselist=False)
    summary = relationship("Summary", back_populates="meeting", uselist=False)
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="meeting", cascade="all, delete-orphan")
    quality_metrics = relationship("AIQualityMetric", back_populates="meeting")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    job_type = Column(String(32), nullable=False)  # 'stt' | 'summary' | 'full_pipeline'
    status = Column(String(32), default="queued")  # 'queued' | 'processing' | 'completed' | 'failed'
    progress = Column(Integer, default=0)
    stt_provider = Column(String(32))
    llm_provider = Column(String(32))
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="processing_jobs")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text)
    language = Column(String(10), default="vi")
    word_count = Column(Integer, default=0)
    speaker_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="transcript")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    summary_text = Column(Text)
    key_points = Column(JSON)
    decisions = Column(JSON)
    version = Column(Integer, default=1)
    generated_by = Column(String(32))  # 'deepseek' | 'gemini' | 'manual'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="summary")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    task = Column(Text, nullable=False)
    assignee_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    owner = Column(String(100))  # Backward compat: text-based owner
    due_date = Column(Date)
    deadline = Column(String(64))  # Backward compat: text-based deadline
    status = Column(String(32), default="pending")
    priority = Column(String(16), default="medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    meeting = relationship("Meeting", back_populates="action_items")
    assignee = relationship("User", foreign_keys=[assignee_id])


# ============================================================================
# GLOSSARY
# ============================================================================

class Glossary(Base):
    __tablename__ = "glossaries"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    scope = Column(String(16), nullable=False)  # 'system' | 'organization' | 'meeting'
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"))
    source_locale = Column(String(10), default="vi")
    target_locale = Column(String(10), default="en")
    version = Column(Integer, default=1)
    created_by = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization")
    terms = relationship("GlossaryTerm", back_populates="glossary", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class GlossaryTerm(Base):
    __tablename__ = "glossary_terms"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    glossary_id = Column(String(64), ForeignKey("glossaries.id", ondelete="CASCADE"), nullable=False)
    source_term = Column(String(500), nullable=False)
    target_term = Column(String(500), nullable=False)
    context = Column(Text)

    glossary = relationship("Glossary", back_populates="terms")


class MeetingGlossary(Base):
    __tablename__ = "meeting_glossaries"

    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    glossary_id = Column(String(64), ForeignKey("glossaries.id", ondelete="CASCADE"), primary_key=True)


# ============================================================================
# AI METRICS + AUDIT
# ============================================================================

class AIQualityMetric(Base):
    __tablename__ = "ai_quality_metrics"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    wer_score = Column(Float, default=0.0)
    der_score = Column(Float, default=0.0)
    bleu_score = Column(Float, default=0.0)
    rouge_l_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)
    latency_sec = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="quality_metrics")


class AICostLog(Base):
    __tablename__ = "ai_cost_logs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    meeting_id = Column(String(64), ForeignKey("meetings.id", ondelete="SET NULL"))
    model_name = Column(String(100))
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    is_estimated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


