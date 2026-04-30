/**
 * App Store - Centralized state management for meetings and groups
 * Single source of truth for all meeting data across the app
 */
import { create } from 'zustand';
import type { Meeting, Group, DashboardStats, FeatureFlags } from '../types';
import api from '../services/api';
import { normalizeDashboardStats, normalizeMeeting } from '../services/mappers';

interface AppState {
  meetings: Meeting[];
  groups: Group[];
  unreadCount: number;
  isModalOpen: boolean;
  stats: DashboardStats;
  features: FeatureFlags;

  // Actions
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, data: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, data: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  setModalOpen: (open: boolean) => void;
  fetchStats: () => Promise<DashboardStats>;
  loadMeetings: (orgId: string) => Promise<void>;

  // Computed selectors
  getStats: () => {
    totalMeetings: number;
    totalHours: number;
    processingCount: number;
  };
  getMeetingById: (id: string) => Meeting | undefined;
  getMeetingsByGroupId: (groupId: string) => Meeting[];
  getMeetingsByOrgId: (orgId: string) => Meeting[];
}

export const useAppStore = create<AppState>((set, get) => ({
  meetings: [],
  groups: [],
  unreadCount: 0,
  isModalOpen: false,
  stats: { totalMeetings: 0, totalHours: 0, processingCount: 0, features: { uploadEnabled: false, jobTrackingEnabled: false, systemAdminEnabled: false } },
  features: { uploadEnabled: false, jobTrackingEnabled: false, systemAdminEnabled: false },

  fetchStats: async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      const normalized = normalizeDashboardStats(response.data);
      set({ stats: normalized, features: normalized.features });
      return normalized;
    } catch (err) {
      console.error('Failed to fetch stats', err);
      return get().stats;
    }
  },

  loadMeetings: async (orgId: string) => {
    try {
      const response = await api.get(`/api/meetings?organization_id=${orgId}`);
      set({ meetings: Array.isArray(response.data) ? response.data.map(normalizeMeeting) : [] });
    } catch (err) {
      console.error('Failed to load meetings', err);
    }
  },

  addMeeting: (meeting) => set((state) => ({ meetings: [meeting, ...state.meetings] })),
  updateMeeting: (id, data) => set((state) => ({
    meetings: state.meetings.map((m) => m.id === id ? { ...m, ...data } : m),
  })),
  deleteMeeting: (id) => set((state) => ({
    meetings: state.meetings.filter((m) => m.id !== id),
  })),
  addGroup: (group) => set((state) => ({ groups: [group, ...state.groups] })),
  updateGroup: (id, data) => set((state) => ({
    groups: state.groups.map((g) => g.id === id ? { ...g, ...data } : g),
  })),
  deleteGroup: (id) => set((state) => ({
    groups: state.groups.filter((g) => g.id !== id),
  })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  setModalOpen: (open) => set({ isModalOpen: open }),

  getStats: () => {
    const { meetings } = get();
    return {
      totalMeetings: meetings.length,
      totalHours: meetings.reduce((sum, m) => sum + m.duration, 0) / 60,
      processingCount: meetings.filter((m) => (m as any).status === 'processing' || (m as any).status === 'queued').length,
    };
  },

  getMeetingById: (id: string) => {
    return get().meetings.find((m) => m.id === id);
  },

  getMeetingsByGroupId: (groupId: string) => {
    return get().meetings.filter((m) => m.groupId === groupId);
  },

  getMeetingsByOrgId: (orgId: string) => {
    return get().meetings.filter((m) => m.orgId === orgId);
  },
}));
