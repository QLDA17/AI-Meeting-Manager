/**
 * Group Store - Group context management
 * Zustand store for group state with mock data.
 *
 * NOTE: Meeting data is NOT stored here to avoid duplication.
 * Use useAppStore().getMeetingsByGroupId(groupId) for group meetings.
 */
import { create } from 'zustand';
import type { Group, User } from '../types';
import {
  mockGroups,
  mockUsers,
  getGroupById,
} from '../data';

interface GroupState {
  // Current context
  currentGroupId: string | null;
  currentGroup: Group | null;

  // Data
  group: Group | null;
  members: User[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentGroup: (groupId: string) => void;
  loadGroup: (groupId: string) => void;
  loadMembers: (groupId: string) => void;
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
  isLoading: false,
  error: null,

  // Actions
  setCurrentGroup: (groupId: string) => {
    const group = mockGroups.find((g) => g.id === groupId) || null;
    set({ currentGroupId: groupId, currentGroup: group });
    // Auto-load related data
    get().loadMembers(groupId);
  },

  loadGroup: (groupId: string) => {
    set({ isLoading: true, error: null });
    setTimeout(() => {
      const group = getGroupById(groupId);
      if (group) {
        set({ group, isLoading: false });
      } else {
        set({ error: 'Group not found', isLoading: false });
      }
    }, 300);
  },

  loadMembers: (groupId: string) => {
    set({ isLoading: true });
    setTimeout(() => {
      const members = mockUsers.filter((u) =>
        u.groupMemberships.some((gu) => gu.groupId === groupId)
      );
      set({ members, isLoading: false });
    }, 300);
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
    const { currentGroupId } = get();
    if (!currentGroupId) return [];
    return mockUsers.filter((u) =>
      u.groupMemberships.some((gu) => gu.groupId === currentGroupId)
    );
  },
}));
