/**
 * Group Store - Group context management
 * Zustand store for group state with mock data
 */
import { create } from 'zustand';
import type { Group, Meeting, User } from '../types';
import {
  mockGroups,
  mockUsers,
  getGroupById,
  getMeetingsByGroupId,
} from '../data';

interface GroupState {
  // Current context
  currentGroupId: string | null;
  currentGroup: Group | null;

  // Data
  group: Group | null;
  meetings: Meeting[];
  members: User[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentGroup: (groupId: string) => void;
  loadGroup: (groupId: string) => void;
  loadMeetings: (groupId: string) => void;
  loadMembers: (groupId: string) => void;
  clearError: () => void;

  // Computed
  getGroupStats: () => {
    meetingCount: number;
    memberCount: number;
    totalHours: number;
  };
  getMeetingsByGroup: () => Meeting[];
  getMembersByGroup: () => User[];
}

export const useGroupStore = create<GroupState>((set, get) => ({
  // Initial state
  currentGroupId: null,
  currentGroup: null,
  group: null,
  meetings: [],
  members: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentGroup: (groupId: string) => {
    const group = mockGroups.find((g) => g.id === groupId) || null;
    set({ currentGroupId: groupId, currentGroup: group });
    // Auto-load related data
    get().loadMeetings(groupId);
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

  loadMeetings: (groupId: string) => {
    set({ isLoading: true });
    setTimeout(() => {
      const meetings = getMeetingsByGroupId(groupId);
      set({ meetings, isLoading: false });
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

  getMeetingsByGroup: () => {
    const { currentGroupId } = get();
    if (!currentGroupId) return [];
    return getMeetingsByGroupId(currentGroupId);
  },

  getMembersByGroup: () => {
    const { currentGroupId } = get();
    if (!currentGroupId) return [];
    return mockUsers.filter((u) =>
      u.groupMemberships.some((gu) => gu.groupId === currentGroupId)
    );
  },
}));
