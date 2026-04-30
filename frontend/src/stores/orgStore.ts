/**
 * Organization Store - Organization context management
 * Zustand store for organization state with mock data
 */
import { create } from 'zustand';
import type { Organization, Group, User } from '../types';
import api from '../services/api';
import { normalizeGroup, normalizeMeeting, normalizeOrganization, normalizeUser } from '../services/mappers';

interface OrgState {
  // Current context
  currentOrgId: string | null;
  currentOrg: Organization | null;
  currentGroupId: string | null;
  orgs: Organization[];
  groups: Group[]; // Now acting as Folders/Departments
  meetings: any[];
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
  loadMeetings: (orgId: string) => void;
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
  meetings: [],
  members: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentOrg: (orgId: string) => {
    const { orgs } = get();
    const org = orgs.find((o) => o.id === orgId) || null;
    set({ currentOrgId: orgId, currentGroupId: null, currentOrg: org });
    // Auto-load related data
    get().loadGroups(orgId);
    get().loadMeetings(orgId);
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
      set({ currentOrg: normalizeOrganization(response.data), isLoading: false });
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

  loadMeetings: async (orgId: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/api/meetings?organization_id=${orgId}`);
      set({ meetings: Array.isArray(response.data) ? response.data.map(normalizeMeeting) : [], isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load meetings', isLoading: false });
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
        orgs.find((org) => org.id === state.currentOrgId) || null;

      if (!nextCurrentOrg) {
        return {
          orgs,
          currentOrgId: null,
          currentOrg: null,
          currentGroupId: null,
          groups: [],
          meetings: [],
          members: [],
        };
      }

      return {
        orgs,
        currentOrg: nextCurrentOrg,
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
      meetings: [],
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
