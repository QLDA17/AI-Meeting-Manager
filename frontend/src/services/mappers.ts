import type {
  ActionItem,
  DashboardStats,
  FeatureFlags,
  GlossaryTerm,
  Group,
  GroupMessage,
  Meeting,
  MeetingDetail,
  NotificationItem,
  Organization,
  OrgUser,
  GroupUser,
  User,
} from '../types';

const asIsoString = (value: unknown, fallback?: string): string => {
  if (typeof value === 'string' && value) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback || new Date().toISOString();
};

// Backend stores naive UTC datetimes (no timezone suffix). Append 'Z' so JS parses them as UTC.
const ensureUtc = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) return undefined;
  if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) return value;
  return value + 'Z';
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

const normalizeOrgMemberships = (memberships: any[] | undefined): OrgUser[] =>
  Array.isArray(memberships)
    ? memberships.map((membership) => ({
        userId: membership.userId ?? membership.user_id ?? '',
        orgId: membership.orgId ?? membership.organization_id ?? '',
        role: membership.role ?? 'member',
        joinedAt: asIsoString(membership.joinedAt ?? membership.joined_at),
        orgName: membership.orgName ?? membership.organization_name ?? membership.org_name,
        approvalStatus: membership.approvalStatus ?? membership.approval_status ?? 'active',
      }))
    : [];

const normalizeGroupMemberships = (memberships: any[] | undefined): GroupUser[] =>
  Array.isArray(memberships)
    ? memberships.map((membership) => ({
        userId: membership.userId ?? membership.user_id ?? '',
        groupId: membership.groupId ?? membership.group_id ?? '',
        role: membership.role ?? 'member',
        joinedAt: asIsoString(membership.joinedAt ?? membership.joined_at),
        groupName: membership.groupName ?? membership.group_name,
      }))
    : [];

export const normalizeUser = (user: any): User => {
  const firstName = user.firstName ?? user.first_name ?? '';
  const lastName = user.lastName ?? user.last_name ?? '';
  const displayName =
    user.displayName ??
    [firstName, lastName].filter(Boolean).join(' ').trim() ??
    user.username ??
    user.email;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName,
    lastName,
    displayName: displayName || user.email,
    avatarUrl: user.avatarUrl ?? user.avatar_url,
    phone: user.phone ?? undefined,
    gender: user.gender ?? undefined,
    dateOfBirth: user.dateOfBirth ?? user.date_of_birth ?? undefined,
    createdAt: asIsoString(user.createdAt ?? user.created_at),
    updatedAt: asIsoString(user.updatedAt ?? user.updated_at),
    lastLoginAt: user.lastLoginAt ?? user.last_login ?? undefined,
    isActive: asBoolean(user.isActive ?? user.is_active, true),
    isVerified: asBoolean(user.isVerified ?? user.is_verified, false),
    orgMemberships: normalizeOrgMemberships(user.orgMemberships),
    groupMemberships: normalizeGroupMemberships(user.groupMemberships),
    systemRole: user.systemRole ?? user.system_role ?? user.role ?? 'member',
    language: user.language ?? 'vi',
    timezone: user.timezone ?? 'Asia/Ho_Chi_Minh',
    notificationPreferences: user.notificationPreferences ?? user.notification_preferences ?? {},
  };
};

export const normalizeOrganization = (organization: any): Organization => ({
  id: organization.id,
  name: organization.name,
  description: organization.description ?? undefined,
  domain: organization.domain ?? undefined,
  logo: organization.logo ?? organization.logo_url ?? undefined,
  logoUrl: organization.logoUrl ?? organization.logo_url ?? undefined,
  createdAt: asIsoString(organization.createdAt ?? organization.created_at),
  updatedAt: asIsoString(organization.updatedAt ?? organization.updated_at),
  memberCount: asNumber(organization.memberCount ?? organization.member_count),
  groupCount: asNumber(organization.groupCount ?? organization.group_count),
  meetingCount: asNumber(organization.meetingCount ?? organization.meeting_count),
  totalHours: asNumber(organization.totalHours ?? organization.total_hours),
  approvalStatus: organization.approvalStatus ?? organization.approval_status ?? 'active',
  requestedByUserId:
    organization.requestedByUserId ?? organization.requested_by_user_id ?? undefined,
  approvedByUserId:
    organization.approvedByUserId ?? organization.approved_by_user_id ?? undefined,
  approvedAt: organization.approvedAt ?? organization.approved_at ?? undefined,
});

export const normalizeGroup = (group: any): Group => ({
  id: group.id,
  orgId: group.orgId ?? group.organization_id ?? '',
  organization_id: group.organization_id ?? group.orgId ?? '',
  name: group.name,
  description: group.description ?? undefined,
  privacyLevel: group.privacyLevel ?? group.privacy_level ?? 'internal',
  privacy_level: group.privacy_level ?? group.privacyLevel ?? 'internal',
  createdAt: asIsoString(group.createdAt ?? group.created_at),
  updatedAt: asIsoString(group.updatedAt ?? group.updated_at),
  createdBy: group.createdBy ?? group.created_by ?? '',
  memberCount: asNumber(group.memberCount ?? group.member_count),
  meetingCount: asNumber(group.meetingCount ?? group.meeting_count),
  totalHours: asNumber(group.totalHours ?? group.total_hours),
  settings: group.settings ?? undefined,
});

export const normalizeActionItem = (actionItem: any): ActionItem => ({
  id: actionItem.id,
  meeting_id: actionItem.meeting_id ?? undefined,
  meeting_title: actionItem.meeting_title ?? actionItem.meetingTitle ?? undefined,
  summary_id: actionItem.summary_id ?? undefined,
  title: actionItem.title,
  description: actionItem.description ?? undefined,
  assigned_to: actionItem.assigned_to ?? undefined,
  assigned_email: actionItem.assigned_email ?? undefined,
  status: actionItem.status ?? 'PENDING',
  priority: actionItem.priority ?? 'MEDIUM',
  due_date: actionItem.due_date ?? undefined,
  completed_at: actionItem.completed_at ?? undefined,
  created_by: actionItem.created_by ?? '',
  created_at: asIsoString(actionItem.created_at),
  updated_at: asIsoString(actionItem.updated_at),
});

export const normalizeMeeting = (meeting: any): Meeting => ({
  id: meeting.id,
  orgId: meeting.orgId ?? meeting.organization_id ?? '',
  organization_id: meeting.organization_id ?? meeting.orgId ?? '',
  groupId: meeting.groupId ?? meeting.group_id ?? undefined,
  group_id: meeting.group_id ?? meeting.groupId ?? undefined,
  title: meeting.title,
  description: meeting.description ?? undefined,
  scheduled_start: ensureUtc(meeting.scheduled_start),
  scheduled_end: ensureUtc(meeting.scheduled_end),
  startTime: ensureUtc(meeting.startTime) || ensureUtc(meeting.scheduled_start) || asIsoString(meeting.created_at),
  endTime: ensureUtc(meeting.endTime) || ensureUtc(meeting.scheduled_end) || asIsoString(meeting.created_at),
  duration: asNumber(meeting.duration),
  status: meeting.status ?? 'upcoming',
  code: meeting.code ?? undefined,
  recordingUrl: meeting.recordingUrl ?? meeting.recording_url ?? undefined,
  transcriptUrl: meeting.transcriptUrl ?? meeting.transcript_url ?? undefined,
  audioUrl: meeting.audioUrl ?? meeting.audio_url ?? undefined,
  attendees: Array.isArray(meeting.attendees)
    ? meeting.attendees.map(normalizeUser)
    : Array.isArray(meeting.participants)
      ? meeting.participants.map((participant: any) => {
          const u = participant.user;
          const name = participant.name
            ?? (u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email : null)
            ?? participant.email
            ?? 'Thành viên';
          return {
            id: participant.user_id ?? participant.id ?? participant.email ?? `participant-${Math.random().toString(36).slice(2)}`,
            username: name,
            email: participant.email ?? u?.email ?? '',
            firstName: u?.first_name ?? participant.name ?? '',
            lastName: u?.last_name ?? '',
            displayName: name,
            avatarUrl: u?.avatar_url,
            createdAt: asIsoString(participant.created_at ?? u?.created_at),
            updatedAt: asIsoString(participant.updated_at ?? u?.updated_at),
            isActive: true,
            isVerified: false,
            orgMemberships: [],
            groupMemberships: [],
            systemRole: 'member',
          };
        })
      : [],
  createdBy: meeting.createdBy ?? meeting.created_by ?? '',
  createdAt: asIsoString(meeting.createdAt ?? meeting.created_at),
  updatedAt: asIsoString(meeting.updatedAt ?? meeting.updated_at),
  summary: meeting.summary ?? meeting.meeting_summary_text ?? undefined,
  keyPoints: meeting.keyPoints ?? meeting.key_points_text ?? [],
  decisions: meeting.decisions ?? meeting.decisions_text ?? [],
  isPinned: asBoolean(meeting.isPinned ?? meeting.is_pinned),
  groupName: meeting.groupName ?? meeting.group?.name ?? undefined,
  organizationName: meeting.organizationName ?? meeting.organization?.name ?? undefined,
});

export const normalizeMeetingDetail = (meeting: any): MeetingDetail => ({
  ...normalizeMeeting(meeting),
  organization: meeting.organization ? normalizeOrganization(meeting.organization) : undefined,
  group: meeting.group ? normalizeGroup(meeting.group) : undefined,
  createdByUser: meeting.created_by_user ? normalizeUser(meeting.created_by_user) : undefined,
  transcripts: Array.isArray(meeting.transcripts)
    ? meeting.transcripts.map((transcript: any) => ({
        id: transcript.id,
        content: transcript.content,
        language: transcript.language ?? 'vi',
        processingStatus: transcript.processing_status ?? 'PENDING',
        createdAt: asIsoString(transcript.created_at),
      }))
    : [],
  transcriptSegments: Array.isArray(meeting.transcript_segments)
    ? meeting.transcript_segments.map((segment: any) => ({
        id: segment.id,
        transcriptId: segment.transcript_id,
        speakerLabel: segment.speaker_label ?? 'Speaker_01',
        startTime: asNumber(segment.start_time),
        endTime: asNumber(segment.end_time),
        text: segment.text ?? '',
        language: segment.language ?? 'auto',
        confidenceScore: segment.confidence_score != null ? asNumber(segment.confidence_score) : undefined,
      }))
    : [],
  summaries: Array.isArray(meeting.summaries)
    ? meeting.summaries.map((summary: any) => ({
        id: summary.id,
        meetingSummary: summary.meeting_summary ?? '',
        keyPoints: summary.key_points ?? [],
        decisions: summary.decisions ?? [],
        processingStatus: summary.processing_status ?? undefined,
        createdAt: asIsoString(summary.created_at),
      }))
    : [],
  actionItems: Array.isArray(meeting.action_items) ? meeting.action_items.map(normalizeActionItem) : [],
  transcriptContent: meeting.transcript_content ?? undefined,
  transcriptLanguage: meeting.transcript_language ?? undefined,
  meetingSummaryText: meeting.meeting_summary_text ?? undefined,
  keyPointsText: Array.isArray(meeting.key_points_text) ? meeting.key_points_text : [],
  decisionsText: Array.isArray(meeting.decisions_text) ? meeting.decisions_text : [],
  summaryStatus: meeting.summary_status ?? undefined,
  summaryErrorText: meeting.summary_error_text ?? undefined,
  summaryProvider: meeting.summary_provider ?? undefined,
  summaryModelName: meeting.summary_model_name ?? undefined,
});

export const normalizeGlossaryTerm = (term: any): GlossaryTerm => ({
  id: term.id,
  organizationId: term.organizationId ?? term.organization_id ?? undefined,
  name: term.name ?? term.term,
  term: term.term,
  translationVi: term.translationVi ?? term.translation_vi ?? '',
  translationEn: term.translationEn ?? term.translation_en ?? '',
  translationJa: term.translationJa ?? term.translation_ja ?? '',
  translationZh: term.translationZh ?? term.translation_zh ?? '',
  translationKo: term.translationKo ?? term.translation_ko ?? '',
  category: term.category ?? undefined,
  isActive: asBoolean(term.isActive ?? term.is_active, true),
  createdBy: term.createdBy ?? term.created_by ?? '',
  createdAt: asIsoString(term.createdAt ?? term.created_at),
  updatedAt: asIsoString(term.updatedAt ?? term.updated_at),
  scope: term.organization_id || term.organizationId ? 'ORGANIZATION' : 'GLOBAL',
});

export const normalizeGroupMessage = (message: any): GroupMessage => ({
  id: message.id,
  groupId: message.groupId ?? message.group_id ?? '',
  group_id: message.group_id ?? message.groupId ?? '',
  userId: message.userId ?? message.user_id ?? '',
  user_id: message.user_id ?? message.userId ?? '',
  text: message.text,
  reactions: Array.isArray(message.reactions) ? message.reactions : [],
  isPinned: asBoolean(message.isPinned ?? message.is_pinned),
  is_pinned: asBoolean(message.is_pinned ?? message.isPinned),
  replyToId: message.replyToId ?? message.reply_to_id ?? undefined,
  reply_to_id: message.reply_to_id ?? message.replyToId ?? undefined,
  replyTo: message.replyTo ? normalizeGroupMessage(message.replyTo) : message.reply_to ? normalizeGroupMessage(message.reply_to) : undefined,
  reply_to: message.reply_to ? normalizeGroupMessage(message.reply_to) : message.replyTo ? normalizeGroupMessage(message.replyTo) : undefined,
  createdAt: asIsoString(message.createdAt ?? message.created_at),
  created_at: asIsoString(message.created_at ?? message.createdAt),
  updatedAt: asIsoString(message.updatedAt ?? message.updated_at),
  updated_at: asIsoString(message.updated_at ?? message.updatedAt),
  user: message.user ? normalizeUser(message.user) : undefined,
});

export const normalizeDashboardStats = (stats: any): DashboardStats => ({
  totalMeetings: asNumber(stats.totalMeetings ?? stats.total_meetings),
  totalHours: asNumber(stats.totalHours ?? stats.total_hours),
  processingCount: asNumber(stats.processingCount ?? stats.processing_count),
  features: normalizeFeatureFlags(stats.features),
});

export const normalizeFeatureFlags = (flags: any): FeatureFlags => ({
  uploadEnabled: asBoolean(flags?.uploadEnabled, false),
  jobTrackingEnabled: asBoolean(flags?.jobTrackingEnabled, false),
  systemAdminEnabled: asBoolean(flags?.systemAdminEnabled, false),
});

export const normalizeNotification = (notification: any): NotificationItem => ({
  id: notification.id,
  type: notification.type ?? 'system',
  priority: notification.priority ?? 'recent',
  title: notification.title ?? '',
  message: notification.message ?? '',
  timestamp: asIsoString(notification.timestamp),
  isRead: asBoolean(notification.isRead ?? notification.is_read),
  metadata: notification.metadata ?? {},
});
