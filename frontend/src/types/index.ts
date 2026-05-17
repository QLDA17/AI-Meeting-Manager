import type { ActionItem } from './actionItem';

export type SystemRole = 'system-admin' | 'org-admin' | 'group-admin' | 'member' | 'viewer';

export type Permission =
  | 'create_organization'
  | 'read_organization'
  | 'update_organization'
  | 'delete_organization'
  | 'manage_organization_users'
  | 'create_group'
  | 'read_group'
  | 'update_group'
  | 'delete_group'
  | 'manage_group_users'
  | 'create_meeting'
  | 'read_meeting'
  | 'update_meeting'
  | 'delete_meeting'
  | 'record_meeting'
  | 'download_recording'
  | 'edit_transcript'
  | 'export_transcript'
  | 'manage_meeting_attendees'
  | 'view_analytics'
  | 'export_data'
  | 'upload:audio';

export interface RoleDefinition {
  role: SystemRole;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  permissions: Permission[];
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  logo?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  groupCount: number;
  meetingCount: number;
  totalHours: number;
  approvalStatus?: 'pending' | 'active';
  requestedByUserId?: string;
  approvedByUserId?: string;
  approvedAt?: string;
}

export interface OrgUser {
  userId: string;
  orgId: string;
  role: 'org-admin' | 'member' | 'viewer';
  joinedAt: string;
  orgName?: string;
  approvalStatus?: 'pending' | 'active';
}

export type PrivacyLevel = 'private' | 'internal' | 'public';

export interface Group {
  id: string;
  orgId: string;
  organization_id: string;
  name: string;
  description?: string;
  privacyLevel: PrivacyLevel;
  privacy_level?: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  memberCount: number;
  meetingCount: number;
  totalHours: number;
  settings?: Record<string, unknown>;
}

export interface GroupUser {
  userId: string;
  groupId: string;
  role: 'group-admin' | 'member' | 'viewer';
  joinedAt: string;
  groupName?: string;
}

export interface NotificationPreferences {
  emailOnMeetingComplete?: boolean;
  slackIntegration?: boolean;
  meetingSummaries?: boolean;
  groupAnnouncements?: boolean;
  [key: string]: unknown;
}

export interface User {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  isVerified?: boolean;
  orgMemberships: OrgUser[];
  groupMemberships: GroupUser[];
  systemRole?: SystemRole;
  language?: 'en' | 'vi' | string;
  timezone?: string;
  notificationPreferences?: NotificationPreferences;
}

export interface Session {
  userId: string;
  currentOrgId: string;
  currentGroupId?: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  orgId: string;
  organization_id: string;
  groupId?: string;
  group_id?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'live' | 'upcoming' | 'canceled';
  code?: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  audioUrl?: string;
  attendees: User[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  isPinned?: boolean;
  groupName?: string;
  organizationName?: string;
  actionItemsCount?: number;
  accessMode?: 'org_member' | 'meeting_guest' | 'none';
}

export interface MeetingTranscript {
  id: string;
  content: string;
  language: string;
  processingStatus: string;
  createdAt: string;
}

export interface MeetingTranscriptSegment {
  id: string;
  transcriptId: string;
  speakerLabel: string;
  speakerRawLabel?: string;
  speakerDisplayName?: string;
  startTime: number;
  endTime: number;
  text: string;
  language: string;
  confidenceScore?: number;
}

export interface MeetingSummaryRecord {
  id: string;
  meetingSummary: string;
  keyPoints: unknown[];
  decisions: unknown[];
  actionItems?: unknown[];
  risks?: unknown[];
  openQuestions?: unknown[];
  timelineHighlights?: unknown[];
  speakerSummaries?: unknown[];
  processingStatus?: string;
  createdAt: string;
}

export interface MeetingDetail extends Meeting {
  organization?: Organization;
  group?: Group;
  createdByUser?: User;
  transcripts: MeetingTranscript[];
  transcriptSegments: MeetingTranscriptSegment[];
  speakerMappings: MeetingSpeakerMapping[];
  summaries: MeetingSummaryRecord[];
  actionItems: ActionItem[];
  transcriptContent?: string;
  transcriptLanguage?: string;
  meetingSummaryText?: string;
  keyPointsText: string[];
  decisionsText: string[];
  risksText: string[];
  openQuestionsText: string[];
  timelineHighlightsText: string[];
  speakerSummariesText: string[];
  summaryStatus?: string;
  summaryErrorText?: string;
  summaryProvider?: string;
  summaryModelName?: string;
}

export interface MeetingSpeakerMapping {
  id: string;
  meetingId: string;
  speakerLabel: string;
  displayName: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeetingMessage {
  id: string;
  meetingId: string;
  userId: string;
  text: string;
  messageType: 'chat' | 'system';
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  user?: User;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  group_id?: string;
  userId: string;
  user_id?: string;
  text: string;
  reactions?: Array<{ emoji: string; count: number }>;
  isPinned: boolean;
  is_pinned?: boolean;
  replyToId?: string;
  reply_to_id?: string;
  replyTo?: GroupMessage;
  reply_to?: GroupMessage;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  user?: User;
}

export interface DashboardStats {
  totalMeetings: number;
  totalHours: number;
  processingCount: number;
  features: FeatureFlags;
}

export interface FeatureFlags {
  uploadEnabled: boolean;
  jobTrackingEnabled: boolean;
  systemAdminEnabled: boolean;
}

export interface GlossaryTerm {
  id: string;
  organizationId?: string;
  name: string;
  term: string;
  translationVi?: string;
  translationEn?: string;
  translationJa?: string;
  translationZh?: string;
  translationKo?: string;
  category?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  scope: 'GLOBAL' | 'ORGANIZATION';
}

export interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error?: string;
}

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

export * from './actionItem';
