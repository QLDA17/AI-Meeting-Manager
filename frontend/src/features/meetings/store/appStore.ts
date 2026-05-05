/**
 * App Store - Centralized state management for meetings and groups
 * Single source of truth for all meeting data across the app
 */
import { create } from 'zustand';
import type { Meeting, Group } from '@/shared/types';
import { mockMeetings, mockGroups } from '@/shared/mockData';

interface AppState {
  meetings: Meeting[];
  groups: Group[];
  unreadCount: number;
  isModalOpen: boolean;

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
  meetings: [...mockMeetings],
  groups: [...mockGroups],
  unreadCount: 5,
  isModalOpen: false,

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
