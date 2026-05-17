/**
 * Organization Store - Organization context management
 * Zustand store for organization state with mock data
 */
import { create } from 'zustand';
import type { Organization, Group, User } from '../types';
import api from '../services/api';
import { normalizeGroup, normalizeOrganization, normalizeUser } from '../services/mappers';

const isActiveOrg = (org: Organization) => org.approvalStatus !== 'pending';

interface OrgState {
  // Current context
  currentOrgId: string | null;
  currentOrg: Organization | null;
  currentGroupId: string | null;
  orgs: Organization[];
  groups: Group[]; // Now acting as Folders/Departments
  members: User[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentOrg: (orgId: string) => void;
  setCurrentGroup: (groupId: string | null) => void;
  loadOrgs: () => void;
  loadOrgDetails: (orgId: string) => void;
  loadGroups: (orgId: string) => void; // Load Folders/Depts
  loadMembers: (orgId: string) => void;
  setOrgs: (orgs: Organization[]) => void;
  createOrg: (name: string, description?: string) => Promise<Organization>;
  acceptInvitation: (token: string) => Promise<string>;
  clearError: () => void;
  clearOrgContext: () => void;

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
    const { orgs } = get();
    const org = orgs.find((o) => o.id === orgId) || null;
    set({ currentOrgId: orgId, currentGroupId: null, currentOrg: org });

    if (!org) {
      get().loadOrgDetails(orgId);
    }

    // Auto-load related data
    get().loadGroups(orgId);
    get().loadMembers(orgId);
  },

  setCurrentGroup: (groupId: string | null) => {
    set({ currentGroupId: groupId });
  },

  loadOrgs: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, this might fetch all orgs the user belongs to
      // For now, we rely on AuthContext calling setOrgs from login response
      set({ isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load organizations', isLoading: false });
    }
  },

  loadOrgDetails: async (orgId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/api/organizations/${orgId}`);
      const org = normalizeOrganization(response.data);
      set((state) => {
        const hasOrg = state.orgs.some((item) => item.id === org.id);
        const nextOrgs = hasOrg
          ? state.orgs.map((item) => (item.id === org.id ? org : item))
          : [...state.orgs, org];

        return {
          orgs: nextOrgs,
          currentOrg: state.currentOrgId === orgId || !state.currentOrgId ? org : state.currentOrg,
          currentOrgId: state.currentOrgId || orgId,
          isLoading: false,
        };
      });
    } catch (err) {
      set({ error: 'Organization not found', isLoading: false });
    }
  },

  loadGroups: async (orgId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/groups?org_id=${orgId}`);
      set({ groups: Array.isArray(response.data) ? response.data.map(normalizeGroup) : [], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load groups', isLoading: false });
    }
  },

  loadMembers: async (orgId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/organizations/${orgId}/members`);
      const nextMembers = Array.isArray(response.data) ? response.data.map(normalizeUser) : [];
      set((state) => {
        const updatedOrgs = state.orgs.map((org) =>
          org.id === orgId ? { ...org, memberCount: nextMembers.length } : org,
        );
        const updatedCurrentOrg =
          state.currentOrg?.id === orgId
            ? { ...state.currentOrg, memberCount: nextMembers.length }
            : state.currentOrg;
        return {
          members: nextMembers,
          orgs: updatedOrgs,
          currentOrg: updatedCurrentOrg,
          isLoading: false,
        };
      });
    } catch (err) {
      set({ error: 'Failed to load members', isLoading: false });
    }
  },

  setOrgs: (orgs: Organization[]) => {
    set((state) => {
      const nextCurrentOrg =
        orgs.find((org) => org.id === state.currentOrgId && isActiveOrg(org)) ||
        orgs.find(isActiveOrg) ||
        null;

      if (!nextCurrentOrg) {
        return {
          orgs,
          currentOrgId: null,
          currentOrg: null,
          currentGroupId: null,
          groups: [],
          members: [],
        };
      }

      const orgChanged = state.currentOrgId !== nextCurrentOrg.id;

      return {
        orgs,
        currentOrgId: nextCurrentOrg.id,
        currentOrg: nextCurrentOrg,
        ...(orgChanged
          ? {
              currentGroupId: null,
              groups: [],
              members: [],
            }
          : {}),
      };
    });
  },

  createOrg: async (name: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/organizations', { name, description });
      const newOrg = normalizeOrganization(response.data);
      set((state) => ({ 
        orgs: [...state.orgs, newOrg],
        currentOrg: newOrg,
        currentOrgId: newOrg.id,
        isLoading: false 
      }));
      return newOrg;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to create organization', isLoading: false });
      throw err;
    }
  },

  acceptInvitation: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/invitations/accept', { token });
      const organizationId = response.data.organization_id as string;
      set({ isLoading: false });
      return organizationId;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Invalid invitation token', isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  clearOrgContext: () =>
    set({
      currentOrgId: null,
      currentOrg: null,
      currentGroupId: null,
      orgs: [],
      groups: [],
      members: [],
      error: null,
    }),

  // Computed
  getGroupsByOrg: () => {
    const { groups } = get();
    return groups;
  },

  getMembersByOrg: () => {
    const { members } = get();
    return members;
  },
}));
