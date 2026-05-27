/**
 * Group Store - Group context management
 * Zustand store for group state with mock data.
 *
 * NOTE: Meeting data is NOT stored here to avoid duplication.
 * Use useAppStore().getMeetingsByGroupId(groupId) for group meetings.
 */
import { create } from 'zustand';
import type { Group, User, Meeting } from '../types';
import api from '../services/api';
import { normalizeGroup, normalizeMeeting, normalizeUser } from '../services/mappers';

interface GroupState {
  // Current context
  currentGroupId: string | null;
  currentGroup: Group | null;

  // Data
  group: Group | null;
  members: User[];
  meetings: Meeting[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentGroup: (groupId: string | null) => void;
  loadGroup: (groupId: string) => Promise<void>;
  loadMembers: (groupId: string) => Promise<void>;
  loadMeetings: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<void>;
  clearError: () => void;

  // Computed
  getGroupStats: () => {
    meetingCount: number;
    memberCount: number;
    totalHours: number;
  };
  getMembersByGroup: () => User[];
}

export const useGroupStore = create<GroupState>((set, get) => ({
  // Initial state
  currentGroupId: null,
  currentGroup: null,
  group: null,
  members: [],
  meetings: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentGroup: (groupId: string | null) => {
    set({ currentGroupId: groupId });
    if (groupId) {
      get().loadGroup(groupId);
      get().loadMembers(groupId);
    } else {
      set({ currentGroup: null, group: null, members: [], meetings: [] });
    }
  },

  loadGroup: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/groups/${groupId}`);
      const normalizedGroup = normalizeGroup(response.data);
      set({
        group: normalizedGroup,
        currentGroup: normalizedGroup,
        currentGroupId: groupId,
        isLoading: false,
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Group not found';
      set({ group: null, currentGroup: null, error: errorMsg, isLoading: false });
    }
  },

  loadMembers: async (groupId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/groups/${groupId}/members`);
      const normalizedMembers = Array.isArray(response.data) ? response.data.map(normalizeUser) : [];
      set((state) => ({
        members: normalizedMembers,
        group: state.group?.id === groupId ? { ...state.group, memberCount: normalizedMembers.length } : state.group,
        currentGroup: state.currentGroup?.id === groupId
          ? { ...state.currentGroup, memberCount: normalizedMembers.length }
          : state.currentGroup,
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to load members';
      set((state) => ({ error: state.error || errorMsg, isLoading: false }));
    }
  },

  loadMeetings: async (groupId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/meetings?group_id=${groupId}`);
      const normalizedMeetings = Array.isArray(response.data)
        ? response.data.map(normalizeMeeting)
        : [];
      set({ meetings: normalizedMeetings, isLoading: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to load meetings';
      set((state) => ({ error: state.error || errorMsg, isLoading: false }));
    }
  },

  updateGroup: async (groupId: string, data: Partial<Group>) => {
    set({ isLoading: true, error: null });
    try {
      // Map frontend naming back to backend naming if necessary
      const payload = {
        ...data,
        visibility: data.visibility || undefined,
        join_policy: data.joinPolicy || data.join_policy || undefined,
      };
      const response = await api.patch(`/api/groups/${groupId}`, payload);
      const normalizedGroup = normalizeGroup(response.data);
      set((state) => ({
        group: normalizedGroup,
        currentGroup: state.currentGroupId === groupId ? normalizedGroup : state.currentGroup,
        isLoading: false
      }));
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to update group';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  // Computed
  getGroupStats: () => {
    const { group } = get();
    if (!group) return { meetingCount: 0, memberCount: 0, totalHours: 0 };
    return {
      meetingCount: group.meetingCount,
      memberCount: group.memberCount,
      totalHours: group.totalHours,
    };
  },

  getMembersByGroup: () => {
    const { members } = get();
    return members;
  },
}));
