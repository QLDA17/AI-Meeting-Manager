/**
 * Organization Store - Organization context management
 * Zustand store for organization state with mock data
 */
import { create } from 'zustand';
import type { Organization, Group, User } from '@/shared/types';
import { mockOrganizations, mockGroups, mockUsers, getGroupsByOrgId } from '@/shared/mockData';

interface OrgState {
  // Current context
  currentOrgId: string | null;
  currentOrg: Organization | null;
  currentGroupId: string | null;
  orgs: Organization[];
  groups: Group[];
  members: User[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentOrg: (orgId: string) => void;
  setCurrentGroup: (groupId: string | null) => void;
  loadOrgs: () => void;
  loadOrgDetails: (orgId: string) => void;
  loadGroups: (orgId: string) => void;
  loadMembers: (orgId: string) => void;
  clearError: () => void;

  // Computed
  getGroupsByOrg: () => Group[];
  getMembersByOrg: () => User[];
}

export const useOrgStore = create<OrgState>((set, get) => ({
  // Initial state
  currentOrgId: null,
  currentOrg: null,
  currentGroupId: null,
  orgs: [],
  groups: [],
  members: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentOrg: (orgId: string) => {
    const org = mockOrganizations.find((o) => o.id === orgId) || null;
    set({ currentOrgId: orgId, currentGroupId: null, currentOrg: org });
    // Auto-load related data
    get().loadGroups(orgId);
    get().loadMembers(orgId);
  },

  setCurrentGroup: (groupId: string | null) => {
    set({ currentGroupId: groupId });
  },

  loadOrgs: () => {
    set({ isLoading: true, error: null });
    setTimeout(() => {
      set({ orgs: mockOrganizations, isLoading: false });
    }, 300);
  },

  loadOrgDetails: (orgId: string) => {
    set({ isLoading: true, error: null });
    setTimeout(() => {
      const org = mockOrganizations.find((o) => o.id === orgId);
      if (org) {
        set({ currentOrg: org, isLoading: false });
      } else {
        set({ error: 'Organization not found', isLoading: false });
      }
    }, 300);
  },

  loadGroups: (orgId: string) => {
    set({ isLoading: true });
    setTimeout(() => {
      const groups = getGroupsByOrgId(orgId);
      set({ groups, isLoading: false });
    }, 300);
  },

  loadMembers: (orgId: string) => {
    set({ isLoading: true });
    setTimeout(() => {
      const members = mockUsers.filter((u) =>
        u.orgMemberships.some((ou) => ou.orgId === orgId)
      );
      set({ members, isLoading: false });
    }, 300);
  },

  clearError: () => set({ error: null }),

  // Computed
  getGroupsByOrg: () => {
    const { currentOrgId } = get();
    if (!currentOrgId) return [];
    return getGroupsByOrgId(currentOrgId);
  },

  getMembersByOrg: () => {
    const { currentOrgId } = get();
    if (!currentOrgId) return [];
    return mockUsers.filter((u) =>
      u.orgMemberships.some((ou) => ou.orgId === currentOrgId)
    );
  },
}));
