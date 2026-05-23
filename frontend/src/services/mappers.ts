import type {
  ActionItem,
  DashboardStats,
  FeatureFlags,
  GlossaryInsights,
  GlossarySuggestion,
  GlossaryTerm,
  Group,
  GroupMessage,
  Meeting,
  MeetingDetail,
  MeetingMessage,
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
    bio: user.bio ?? undefined,
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
  assignee_options: Array.isArray(actionItem.assignee_options)
    ? actionItem.assignee_options
        .filter((option: any) => option?.email)
        .map((option: any) => ({
          email: option.email,
          label: option.label ?? option.email,
          user_id: option.user_id ?? option.userId ?? undefined,
        }))
    : undefined,
  assignees: Array.isArray(actionItem.assignees)
    ? actionItem.assignees
        .filter((assignee: any) => assignee?.email)
        .map((assignee: any) => ({
          id: assignee.id,
          user_id: assignee.user_id ?? assignee.userId ?? undefined,
          email: assignee.email,
          display_name: assignee.display_name ?? assignee.displayName ?? undefined,
          status: assignee.status ?? 'PENDING',
          completed_at: assignee.completed_at ?? assignee.completedAt ?? undefined,
          created_at: asIsoString(assignee.created_at ?? assignee.createdAt),
          updated_at: asIsoString(assignee.updated_at ?? assignee.updatedAt),
        }))
    : [],
  summary_id: actionItem.summary_id ?? undefined,
  title: actionItem.title,
  description: actionItem.description ?? undefined,
  assigned_to: actionItem.assigned_to ?? undefined,
  assigned_email: actionItem.assigned_email ?? undefined,
  anchor: actionItem.anchor
    ? {
        start_time: asNumber(actionItem.anchor.start_time),
        end_time: actionItem.anchor.end_time != null ? asNumber(actionItem.anchor.end_time) : undefined,
        speaker_label: actionItem.anchor.speaker_label ?? undefined,
        source_segment_ids: Array.isArray(actionItem.anchor.source_segment_ids) ? actionItem.anchor.source_segment_ids : [],
      }
    : undefined,
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
  actual_start: ensureUtc(meeting.actual_start ?? meeting.actualStart),
  actual_end: ensureUtc(meeting.actual_end ?? meeting.actualEnd),
  startTime: ensureUtc(meeting.startTime) || ensureUtc(meeting.scheduled_start) || asIsoString(meeting.created_at),
  endTime: ensureUtc(meeting.endTime) || ensureUtc(meeting.scheduled_end) || asIsoString(meeting.created_at),
  duration: asNumber(meeting.duration),
  status: meeting.status ?? 'upcoming',
  code: meeting.code ?? undefined,
  recordingUrl: meeting.recordingUrl ?? meeting.recording_url ?? undefined,
  transcriptUrl: meeting.transcriptUrl ?? meeting.transcript_url ?? undefined,
  audioUrl: meeting.audioUrl ?? meeting.audio_url ?? undefined,
  audioStatus: meeting.audioStatus ?? meeting.audio_status ?? undefined,
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
  summary: meeting.summary ?? meeting.summary_text ?? meeting.meeting_summary_text ?? undefined,
  keyPoints: meeting.keyPoints ?? meeting.key_points_list ?? meeting.key_points_text ?? [],
  decisions: meeting.decisions ?? meeting.decisions_list ?? meeting.decisions_text ?? [],
  isPinned: asBoolean(meeting.isPinned ?? meeting.is_pinned),
  groupName: meeting.groupName ?? meeting.group_name ?? meeting.group?.name ?? undefined,
  organizationName: meeting.organizationName ?? meeting.organization_name ?? meeting.organization?.name ?? undefined,
  actionItemsCount: meeting.actionItemsCount ?? meeting.action_items_count ?? 0,
  accessMode: meeting.accessMode ?? meeting.access_mode ?? undefined,
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
        speakerLabel: segment.speaker_display_name ?? segment.speaker_label ?? 'Speaker_01',
        speakerRawLabel: segment.speaker_raw_label ?? segment.speaker_label ?? 'Speaker_01',
        speakerDisplayName: segment.speaker_display_name ?? segment.speaker_label ?? 'Speaker_01',
        startTime: asNumber(segment.start_time),
        endTime: asNumber(segment.end_time),
        text: segment.text ?? '',
        language: segment.language ?? 'auto',
        confidenceScore: segment.confidence_score != null ? asNumber(segment.confidence_score) : undefined,
      }))
    : [],
  speakerMappings: Array.isArray(meeting.speaker_mappings)
    ? meeting.speaker_mappings.map((mapping: any) => ({
        id: mapping.id,
        meetingId: mapping.meeting_id ?? mapping.meetingId ?? '',
        speakerLabel: mapping.speaker_label ?? mapping.speakerLabel ?? 'Speaker_01',
        displayName: mapping.display_name ?? mapping.displayName ?? mapping.speaker_label ?? 'Speaker_01',
        userId: mapping.user_id ?? mapping.userId ?? undefined,
        createdAt: mapping.created_at ? asIsoString(mapping.created_at) : undefined,
        updatedAt: mapping.updated_at ? asIsoString(mapping.updated_at) : undefined,
      }))
    : [],
  summaries: Array.isArray(meeting.summaries)
    ? meeting.summaries.map((summary: any) => ({
        id: summary.id,
        meetingSummary: summary.meeting_summary ?? '',
        keyPoints: summary.key_points ?? [],
        decisions: summary.decisions ?? [],
        actionItems: summary.action_items ?? [],
        risks: summary.risks ?? [],
        openQuestions: summary.open_questions ?? summary.openQuestions ?? [],
        timelineHighlights: summary.timeline_highlights ?? summary.timelineHighlights ?? [],
        speakerSummaries: summary.speaker_summaries ?? summary.speakerSummaries ?? [],
        processingStatus: summary.processing_status ?? undefined,
        createdAt: asIsoString(summary.created_at),
      }))
    : [],
  actionItems: Array.isArray(meeting.action_items) ? meeting.action_items.map(normalizeActionItem) : [],
  transcriptContent: meeting.transcript_content ?? undefined,
  transcriptLanguage: meeting.transcript_language ?? undefined,
  transcriptStatus: meeting.transcript_status ?? undefined,
  hasTranscriptDraft: Boolean(meeting.has_transcript_draft),
  activity: Array.isArray(meeting.activity)
    ? meeting.activity.map((item: any) => ({
        id: item.id,
        type: item.type ?? undefined,
        title: item.title ?? '',
        description: item.description ?? '',
        timestamp: item.timestamp ? asIsoString(item.timestamp) : undefined,
        tone: item.tone ?? 'neutral',
        actor: item.actor ?? undefined,
        metadata: item.metadata ?? undefined,
      }))
    : [],
  meetingSummaryText: meeting.meeting_summary_text ?? undefined,
  keyPointsText: Array.isArray(meeting.key_points_text) ? meeting.key_points_text : [],
  keyPointsItems: Array.isArray(meeting.key_points_items)
    ? meeting.key_points_items.map((item: any) => ({
        text: item.text ?? '',
        anchor: item.anchor
          ? {
              start_time: asNumber(item.anchor.start_time),
              end_time: item.anchor.end_time != null ? asNumber(item.anchor.end_time) : undefined,
              speaker_label: item.anchor.speaker_label ?? undefined,
              source_segment_ids: Array.isArray(item.anchor.source_segment_ids) ? item.anchor.source_segment_ids : [],
            }
          : undefined,
      }))
    : [],
  decisionsText: Array.isArray(meeting.decisions_text) ? meeting.decisions_text : [],
  decisionsItems: Array.isArray(meeting.decisions_items)
    ? meeting.decisions_items.map((item: any) => ({
        text: item.text ?? '',
        anchor: item.anchor
          ? {
              start_time: asNumber(item.anchor.start_time),
              end_time: item.anchor.end_time != null ? asNumber(item.anchor.end_time) : undefined,
              speaker_label: item.anchor.speaker_label ?? undefined,
              source_segment_ids: Array.isArray(item.anchor.source_segment_ids) ? item.anchor.source_segment_ids : [],
            }
          : undefined,
      }))
    : [],
  risksText: Array.isArray(meeting.risks_text) ? meeting.risks_text : [],
  openQuestionsText: Array.isArray(meeting.open_questions_text) ? meeting.open_questions_text : [],
  timelineHighlightsText: Array.isArray(meeting.timeline_highlights_text) ? meeting.timeline_highlights_text : [],
  timelineHighlightsItems: Array.isArray(meeting.timeline_highlights_items)
    ? meeting.timeline_highlights_items.map((item: any) => ({
        text: item.text ?? '',
        anchor: item.anchor
          ? {
              start_time: asNumber(item.anchor.start_time),
              end_time: item.anchor.end_time != null ? asNumber(item.anchor.end_time) : undefined,
              speaker_label: item.anchor.speaker_label ?? undefined,
              source_segment_ids: Array.isArray(item.anchor.source_segment_ids) ? item.anchor.source_segment_ids : [],
            }
          : undefined,
      }))
    : [],
  speakerSummariesText: Array.isArray(meeting.speaker_summaries_text) ? meeting.speaker_summaries_text : [],
  summaryStatus: meeting.summary_status ?? undefined,
  summaryErrorText: meeting.summary_error_text ?? undefined,
  summaryProvider: meeting.summary_provider ?? undefined,
  summaryModelName: meeting.summary_model_name ?? undefined,
});

export const normalizeMeetingMessage = (message: any): MeetingMessage => ({
  id: message.id,
  meetingId: message.meetingId ?? message.meeting_id ?? '',
  userId: message.userId ?? message.user_id ?? '',
  text: message.text ?? '',
  messageType: message.messageType ?? message.message_type ?? 'chat',
  replyToId: message.replyToId ?? message.reply_to_id ?? undefined,
  createdAt: asIsoString(message.createdAt ?? message.created_at),
  updatedAt: message.updatedAt || message.updated_at ? asIsoString(message.updatedAt ?? message.updated_at) : undefined,
  user: message.user ? normalizeUser(message.user) : undefined,
});

export const normalizeGlossaryTerm = (term: any): GlossaryTerm => ({
  id: term.id,
  organizationId: term.organizationId ?? term.organization_id ?? undefined,
  name: term.name ?? term.term,
  term: term.term,
  aliases: Array.isArray(term.aliases) ? term.aliases.filter((alias: unknown) => typeof alias === 'string') : [],
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

export const normalizeGlossarySuggestion = (suggestion: any): GlossarySuggestion => ({
  id: suggestion.id,
  organization_id: suggestion.organization_id,
  status: suggestion.status ?? 'PENDING',
  canonical_term_candidate: suggestion.canonical_term_candidate ?? '',
  alias_candidates: Array.isArray(suggestion.alias_candidates) ? suggestion.alias_candidates.filter((alias: unknown) => typeof alias === 'string') : [],
  category_hint: suggestion.category_hint ?? undefined,
  source_meeting_ids: Array.isArray(suggestion.source_meeting_ids) ? suggestion.source_meeting_ids : [],
  evidence_examples: Array.isArray(suggestion.evidence_examples) ? suggestion.evidence_examples : [],
  occurrence_count: asNumber(suggestion.occurrence_count),
  confidence_score: asNumber(suggestion.confidence_score),
  suggestion_type: suggestion.suggestion_type ?? 'UNKNOWN_TERM',
  reviewed_by: suggestion.reviewed_by ?? undefined,
  reviewed_at: suggestion.reviewed_at ? asIsoString(suggestion.reviewed_at) : undefined,
  created_at: suggestion.created_at ? asIsoString(suggestion.created_at) : undefined,
  updated_at: suggestion.updated_at ? asIsoString(suggestion.updated_at) : undefined,
});

export const normalizeGlossaryInsights = (insights: any): GlossaryInsights => ({
  top_corrected_aliases: Array.isArray(insights?.top_corrected_aliases)
    ? insights.top_corrected_aliases.map((item: any) => ({ value: item.value ?? '', count: asNumber(item.count) }))
    : [],
  top_missing_terms: Array.isArray(insights?.top_missing_terms)
    ? insights.top_missing_terms.map((item: any) => ({ value: item.value ?? '', count: asNumber(item.count) }))
    : [],
  pending_suggestions_count: asNumber(insights?.pending_suggestions_count),
  approved_count: asNumber(insights?.approved_count),
  rejected_count: asNumber(insights?.rejected_count),
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
  metadata: notification.metadata
    ? {
        ...notification.metadata,
        entity_type: notification.metadata.entity_type ?? undefined,
        meeting_id: notification.metadata.meeting_id ?? notification.metadata.meetingId ?? undefined,
        group_id: notification.metadata.group_id ?? notification.metadata.groupId ?? undefined,
        task_id: notification.metadata.task_id ?? notification.metadata.taskId ?? undefined,
        organization_id: notification.metadata.organization_id ?? notification.metadata.organizationId ?? undefined,
        action_label: notification.metadata.action_label ?? undefined,
      }
    : {},
});
