import { describe, expect, it } from 'vitest';
import { normalizeDashboardStats, normalizeMeetingDetail, normalizeUser } from './mappers';

describe('mappers', () => {
  it('normalizes user payload from backend auth shape', () => {
    const user = normalizeUser({
      id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Nguyen',
      role: 'org-admin',
      orgMemberships: [{ orgId: 'org-1', role: 'org-admin', orgName: 'Acme' }],
      groupMemberships: [{ groupId: 'group-1', role: 'member', groupName: 'Team A' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      isActive: true,
    });

    expect(user.systemRole).toBe('org-admin');
    expect(user.orgMemberships[0].orgName).toBe('Acme');
    expect(user.groupMemberships[0].groupName).toBe('Team A');
  });

  it('normalizes dashboard stats and feature flags', () => {
    const stats = normalizeDashboardStats({
      totalMeetings: 4,
      totalHours: 3.5,
      processingCount: 1,
      features: { uploadEnabled: false, jobTrackingEnabled: false, systemAdminEnabled: false },
    });

    expect(stats.totalMeetings).toBe(4);
    expect(stats.totalHours).toBe(3.5);
    expect(stats.features.uploadEnabled).toBe(false);
  });

  it('normalizes meeting detail flattened fields', () => {
    const detail = normalizeMeetingDetail({
      id: 'meeting-1',
      organization_id: 'org-1',
      title: 'Sprint Review',
      scheduled_start: '2026-04-30T08:00:00Z',
      scheduled_end: '2026-04-30T09:00:00Z',
      duration: 60,
      status: 'completed',
      created_by: 'user-1',
      created_at: '2026-04-30T08:00:00Z',
      updated_at: '2026-04-30T09:00:00Z',
      transcript_content: 'Transcript body',
      meeting_summary_text: 'Summary body',
      key_points_text: ['Point A'],
      decisions_text: ['Decision A'],
      action_items: [{ id: 'ai-1', title: 'Follow up', status: 'PENDING', priority: 'MEDIUM', created_by: 'user-1', created_at: '2026-04-30T09:00:00Z', updated_at: '2026-04-30T09:00:00Z' }],
    });

    expect(detail.transcriptContent).toBe('Transcript body');
    expect(detail.meetingSummaryText).toBe('Summary body');
    expect(detail.actionItems).toHaveLength(1);
    expect(detail.keyPointsText[0]).toBe('Point A');
  });
});
