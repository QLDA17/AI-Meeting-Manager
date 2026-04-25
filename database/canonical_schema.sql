-- MultiMinutes AI Canonical Database Schema (MySQL 8.0+)
-- Source: Authoritative schema provided by product owner.
-- This is the single source of truth that the FE Action Layer is mapped to.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS api_usage_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS export_files;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS ai_cost_logs;
DROP TABLE IF EXISTS ai_quality_metrics;
DROP TABLE IF EXISTS action_items;
DROP TABLE IF EXISTS meeting_summaries;
DROP TABLE IF EXISTS transcript_segments;
DROP TABLE IF EXISTS transcripts;
DROP TABLE IF EXISTS audio_files;
DROP TABLE IF EXISTS meeting_participants;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS user_organizations;
DROP TABLE IF EXISTS glossary_terms;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'staff') NOT NULL DEFAULT 'staff',
    full_name VARCHAR(100) NULL,
    avatar_url VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    last_login DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organizations (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    domain VARCHAR(255) NULL,
    logo_url VARCHAR(500) NULL,
    settings JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_organizations (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    organization_id CHAR(36) NOT NULL,
    role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_org (user_id, organization_id),
    CONSTRAINT fk_uo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uo_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    color VARCHAR(7) NULL DEFAULT '#6B46C1',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meetings (
    id CHAR(36) PRIMARY KEY,
    organization_id CHAR(36) NULL,
    project_id CHAR(36) NULL,
    creator_id CHAR(36) NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    date VARCHAR(64) NULL,
    duration VARCHAR(64) NULL DEFAULT 'pending',
    speaker_count INT NOT NULL DEFAULT 0,
    status ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
    llm_source ENUM('live', 'fallback', 'none') NOT NULL DEFAULT 'none',
    meeting_type ENUM('meeting', 'interview', 'training', 'review') NOT NULL DEFAULT 'meeting',
    scheduled_start DATETIME NULL,
    scheduled_end DATETIME NULL,
    actual_start DATETIME NULL,
    actual_end DATETIME NULL,
    location VARCHAR(255) NULL,
    source_file_name VARCHAR(255) NULL,
    source_file_path VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_meetings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    CONSTRAINT fk_meetings_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_meetings_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE meeting_participants (
    id CHAR(36) PRIMARY KEY,
    meeting_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    speaker_label VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    role VARCHAR(50) NULL DEFAULT 'participant',
    is_required TINYINT(1) NOT NULL DEFAULT 0,
    attended TINYINT(1) NOT NULL DEFAULT 0,
    joined_at DATETIME NULL,
    left_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mp_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
