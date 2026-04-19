/**
 * Core type definitions for MultiMinutes AI v2
 * Organization → Group → Meeting hierarchy with role system
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export type SystemRole = 'system-admin' | 'org-admin' | 'group-admin' | 'member' | 'viewer';

export interface RoleDefinition {
    role: SystemRole;
    displayName: string;
    description: string;
    color: string;
    icon: string;
    permissions: Permission[];
}

export type Permission =
    // Organization Management
    | 'create_organization'
    | 'read_organization'
    | 'update_organization'
    | 'delete_organization'
    | 'manage_organization_users'
    // Group Management
    | 'create_group'
    | 'read_group'
    | 'update_group'
    | 'delete_group'
    | 'manage_group_users'
    // Meeting Management
    | 'create_meeting'
    | 'read_meeting'
    | 'update_meeting'
    | 'delete_meeting'
    | 'record_meeting'
    | 'download_recording'
    | 'edit_transcript'
    | 'export_transcript'
    | 'manage_meeting_attendees'
    // Admin Features
    | 'view_analytics'
    | 'export_data'
    | 'upload:audio';

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface Organization {
    id: string;
    name: string;
    description?: string;
    logo?: string;
    createdAt: Date;
    updatedAt: Date;
    // Computed fields (from Backend API)
    memberCount: number;
    groupCount: number;
    meetingCount: number;
    totalHours: number;
}

export interface OrgUser {
    userId: string;
    orgId: string;
    role: 'org-admin' | 'member' | 'viewer';
    joinedAt: Date;
}

// ============================================================================
// GROUP TYPES
// ============================================================================

export type PrivacyLevel = 'private' | 'internal' | 'public';

export interface Group {
    id: string;
    orgId: string;
    name: string;
    description?: string;
    privacyLevel: PrivacyLevel;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string; // userId
    // Computed fields (from Backend API)
    memberCount: number;
    meetingCount: number;
    totalHours: number;
}

export interface GroupUser {
    userId: string;
    groupId: string;
    role: 'group-admin' | 'member' | 'viewer';
    joinedAt: Date;
}

// ============================================================================
// MEETING & ACTION ITEM TYPES
// ============================================================================

export type MeetingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Meeting {
    id: string;
    groupId: string;
    orgId: string;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number; // minutes
    status: MeetingStatus;
    recordingUrl?: string;
    transcriptUrl?: string;
    audioUrl?: string;
    attendees: User[];
    createdBy: string; // userId
    createdAt: Date;
    updatedAt: Date;
    summary?: string;
    keyPoints?: string[];
    decisions?: string[];
    isPinned?: boolean;
}

export interface ActionItem {
    id: string;
    meetingId: string;
    meetingTitle: string; // Denormalized for UI
    task: string;
    assignee: string; // User ID or Name (DB will be user_id)
    dueDate: string;
    status: 'pending' | 'completed' | 'overdue';
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    updatedAt: Date;
}

export interface TranscriptSegment {
    id: string;
    meetingId: string;
    startTime: number; // seconds
    endTime: number;
    speaker: User;
    text: string;
    confidence?: number;
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    isActive: boolean;

    // Org/Group memberships (Aggregated in FE for convenience)
    orgMemberships: OrgUser[];
    groupMemberships: GroupUser[];
    systemRole?: SystemRole;

    // Preferences
    language?: 'en' | 'vi';
    timezone?: string;
    notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
    emailOnMeetingComplete: boolean;
    slackIntegration: boolean;
    meetingSummaries: boolean;
    groupAnnouncements: boolean;
}

// ============================================================================
// SESSION & AUTH TYPES
// ============================================================================

export interface Session {
    userId: string;
    currentOrgId: string;
    currentGroupId?: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface AuthContext {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error?: string;
}

// ============================================================================
// QUERY RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode: number;
}
