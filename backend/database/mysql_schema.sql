-- MultiMinutes AI MySQL Database Schema
-- Optimized for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS multiminutes;
USE multiminutes;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for users
-- ----------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('system-admin', 'member')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    language VARCHAR(10) DEFAULT 'vi',
    timezone VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh',
    notification_preferences JSON,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    phone VARCHAR(20),
    gender VARCHAR(10) CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    date_of_birth DATETIME,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for organizations
-- ----------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    settings JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for user_organizations
-- ----------------------------
CREATE TABLE IF NOT EXISTS user_organizations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('org-admin', 'member', 'viewer')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, organization_id),
    CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_uo_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for groups
-- ----------------------------
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy_level VARCHAR(20) DEFAULT 'private' CHECK (privacy_level IN ('private', 'internal', 'public')),
    settings JSON,
    created_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_groups_org (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for group_messages
-- ----------------------------
CREATE TABLE IF NOT EXISTS group_messages (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    reply_to_id VARCHAR(36) DEFAULT NULL,
    reactions JSON,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gm_msg_group FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_msg_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_msg_reply FOREIGN KEY (reply_to_id) REFERENCES group_messages (id) ON DELETE SET NULL,
    INDEX idx_group_messages_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for group_memberships
-- ----------------------------
CREATE TABLE IF NOT EXISTS group_memberships (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('group-admin', 'member', 'viewer')),
    invited_by VARCHAR(36),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (group_id, user_id),
    CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_inviter FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for invitations
-- ----------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('org-admin', 'group-admin', 'member', 'viewer')),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_sha256 VARCHAR(64) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    invited_by VARCHAR(36) NOT NULL,
    accepted_by VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invitation_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_group FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_inviter FOREIGN KEY (invited_by) REFERENCES users (id),
    CONSTRAINT fk_invitation_acceptor FOREIGN KEY (accepted_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_invitations_email (email),
    INDEX ix_invitations_token_sha256 (token_sha256)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    priority VARCHAR(20) NOT NULL DEFAULT 'recent' CHECK (priority IN ('urgent', 'today', 'recent')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    is_read BOOLEAN DEFAULT FALSE,
    source_type VARCHAR(50),
    source_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notifications_recipient_created (recipient_user_id, created_at),
    INDEX idx_notifications_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for password_reset_otps
-- ----------------------------
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_password_reset_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for meetings
-- ----------------------------
CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    scheduled_start DATETIME,
    scheduled_end DATETIME,
    actual_start DATETIME,
    actual_end DATETIME,
    duration INTEGER DEFAULT 0,
    location VARCHAR(255),
    meeting_type VARCHAR(50) DEFAULT 'MEETING' CHECK (meeting_type IN ('MEETING', 'INTERVIEW', 'TRAINING', 'REVIEW')),
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'live', 'upcoming', 'canceled')),
    code VARCHAR(20),
    recording_url VARCHAR(500),
    transcript_url VARCHAR(500),
    audio_url VARCHAR(500),
    is_pinned BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_meeting_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_meeting_group FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE SET NULL,
    CONSTRAINT fk_meeting_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_meetings_org (organization_id),
    INDEX idx_meetings_group (group_id),
    INDEX idx_meetings_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for meeting_participants
-- ----------------------------
CREATE TABLE IF NOT EXISTS meeting_participants (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    speaker_label VARCHAR(50),
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'PARTICIPANT',
    invite_status VARCHAR(20) DEFAULT 'accepted',
    is_required BOOLEAN DEFAULT false,
    attended BOOLEAN DEFAULT false,
    joined_at DATETIME,
    left_at DATETIME,
    UNIQUE KEY (meeting_id, user_id),
    UNIQUE KEY (meeting_id, email),
    CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for audio_files
-- ----------------------------
CREATE TABLE IF NOT EXISTS audio_files (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    duration_seconds INTEGER,
    format VARCHAR(20) NOT NULL,
    sample_rate INTEGER,
    channels INTEGER,
    upload_status VARCHAR(20) DEFAULT 'UPLOADING' CHECK (upload_status IN ('UPLOADING', 'UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_audio_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for transcripts
-- ----------------------------
CREATE TABLE IF NOT EXISTS transcripts (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    audio_file_id VARCHAR(36),
    content LONGTEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'vi',
    word_count INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    stt_provider VARCHAR(50) DEFAULT 'whisper',
    confidence_score DECIMAL(3,2),
    post_processed BOOLEAN DEFAULT FALSE,
    nlp_metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transcript_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT fk_transcript_audio FOREIGN KEY (audio_file_id) REFERENCES audio_files (id) ON DELETE SET NULL,
    FULLTEXT KEY idx_transcripts_content_fts (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for transcript_segments
-- ----------------------------
CREATE TABLE IF NOT EXISTS transcript_segments (
    id VARCHAR(36) PRIMARY KEY,
    transcript_id VARCHAR(36) NOT NULL,
    speaker_label VARCHAR(50) NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    text TEXT NOT NULL,
    original_text TEXT,
    language VARCHAR(10) DEFAULT 'auto',
    confidence_score DECIMAL(3,2),
    nlp_metadata JSON,
    word_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_segment_transcript FOREIGN KEY (transcript_id) REFERENCES transcripts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for meeting_transcript_drafts
-- ----------------------------
CREATE TABLE IF NOT EXISTS meeting_transcript_drafts (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    segments JSON,
    language VARCHAR(10) DEFAULT 'auto',
    provider VARCHAR(50),
    model VARCHAR(100),
    start_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_meeting_draft_chunk (meeting_id, user_id, chunk_index),
    KEY idx_meeting_draft_meeting_user (meeting_id, user_id),
    CONSTRAINT fk_draft_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT fk_draft_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for meeting_summaries
-- ----------------------------
CREATE TABLE IF NOT EXISTS meeting_summaries (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    language VARCHAR(10) DEFAULT 'vi',
    key_points JSON,
    decisions JSON,
    action_items JSON,
    risks JSON,
    open_questions JSON,
    timeline_highlights JSON,
    speaker_summaries JSON,
    meeting_summary TEXT,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    model_name VARCHAR(100),
    processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_summary_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for action_items
-- ----------------------------
CREATE TABLE IF NOT EXISTS action_items (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36),
    summary_id VARCHAR(36),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(36),
    assigned_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date DATE,
    completed_at DATETIME,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_summary FOREIGN KEY (summary_id) REFERENCES meeting_summaries (id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_assigned FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for export_files
-- ----------------------------
CREATE TABLE IF NOT EXISTS export_files (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'DOCX', 'TXT')),
    file_size BIGINT,
    template_type VARCHAR(50) DEFAULT 'STANDARD',
    include_transcript BOOLEAN DEFAULT true,
    include_summary BOOLEAN DEFAULT true,
    include_action_items BOOLEAN DEFAULT true,
    generated_by VARCHAR(36) NOT NULL,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    CONSTRAINT fk_export_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
    CONSTRAINT fk_export_user FOREIGN KEY (generated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for cost_tracking
-- ----------------------------
CREATE TABLE IF NOT EXISTS cost_tracking (
    id VARCHAR(36) PRIMARY KEY,
    meeting_id VARCHAR(36),
    service VARCHAR(50) NOT NULL,
    api_endpoint VARCHAR(255),
    model_name VARCHAR(100),
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cost_meeting FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table structure for glossary_terms
-- ----------------------------
CREATE TABLE IF NOT EXISTS glossary_terms (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36),
    term VARCHAR(255) NOT NULL,
    translation_vi VARCHAR(255),
    translation_en VARCHAR(255),
    translation_ja VARCHAR(255),
    translation_zh VARCHAR(255),
    translation_ko VARCHAR(255),
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (organization_id, term),
    CONSTRAINT fk_glossary_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_glossary_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Indexes for performance
-- ----------------------------
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX idx_action_items_assigned_to ON action_items(assigned_to);

SET FOREIGN_KEY_CHECKS = 1;
