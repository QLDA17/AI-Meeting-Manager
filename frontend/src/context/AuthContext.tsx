/* eslint-disable react-refresh/only-export-comments */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { GroupUser, OrgUser, Session, SystemRole, User } from '../types';
import api from '../services/api';
import { useOrgStore } from '../stores';
import { normalizeOrganization, normalizeUser } from '../services/mappers';

export type Role = SystemRole | 'admin' | 'manager' | 'staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (username: string, password: string) => Promise<User>;
  registerAndSetSession: (token: string, rawUser: unknown) => User;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  switchGroup: (groupId: string) => void;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  isGroupAdmin: (groupId?: string) => boolean;
  getCurrentOrg: () => string | null;
  getCurrentGroup: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toOrganizationFromMembership = (membership: OrgUser) =>
  normalizeOrganization({
    id: membership.orgId,
    name: membership.orgName || 'To chuc cua toi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    member_count: 0,
    group_count: 0,
    meeting_count: 0,
    total_hours: 0,
    approval_status: membership.approvalStatus ?? 'active',
  });

const getFirstApprovedOrgId = (memberships: OrgUser[] = []) =>
  memberships.find((membership) => membership.approvalStatus !== 'pending')?.orgId || '';

const canUseOrgId = (memberships: OrgUser[] = [], orgId?: string | null) =>
  Boolean(
    orgId &&
      memberships.some(
        (membership) => membership.orgId === orgId && membership.approvalStatus !== 'pending',
      ),
  );

const pickApprovedOrgId = (memberships: OrgUser[] = [], preferredOrgId?: string | null) =>
  canUseOrgId(memberships, preferredOrgId)
    ? preferredOrgId || ''
    : getFirstApprovedOrgId(memberships);

const parseSavedJson = <T,>(key: string): T | null => {
  const saved = localStorage.getItem(key);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`Invalid ${key} in localStorage, clearing it.`, err);
    localStorage.removeItem(key);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setCurrentOrg, setOrgs, clearOrgContext } = useOrgStore();
  const [user, setUser] = useState<User | null>(() => parseSavedJson<User>('user'));
  const [session, setSession] = useState<Session | null>(() => parseSavedJson<Session>('session'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSessionState = useCallback(() => {
    setUser(null);
    setSession(null);
    clearOrgContext();
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    localStorage.removeItem('auth-storage');
  }, [clearOrgContext]);

  const applyAuthenticatedUser = useCallback((
    rawUser: unknown,
    token: string,
    preferredOrgId?: string | null,
    previousSession?: Session | null,
  ) => {
    const nextUser = normalizeUser(rawUser);
    const nextOrgId = pickApprovedOrgId(nextUser.orgMemberships, preferredOrgId);
    const nextOrgs = nextUser.orgMemberships.map(toOrganizationFromMembership);
    const nextSession: Session = {
      userId: nextUser.id,
      currentOrgId: nextOrgId,
      token,
      expiresAt: previousSession?.expiresAt
        ? new Date(previousSession.expiresAt)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: previousSession?.createdAt ? new Date(previousSession.createdAt) : new Date(),
    };

    setUser(nextUser);
    setSession(nextSession);

    if (nextOrgs.length) {
      setOrgs(nextOrgs);
      if (nextOrgId) {
        setCurrentOrg(nextOrgId);
      }
    } else {
      clearOrgContext();
    }

    return nextUser;
  }, [clearOrgContext, setCurrentOrg, setOrgs]);

  useEffect(() => {
    let isCancelled = false;

    const bootstrapAuth = async () => {
      const savedSession = parseSavedJson<Session>('session');
      if (!savedSession?.token) {
        clearSessionState();
        if (!isCancelled) {
          setIsAuthReady(true);
        }
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get('/api/auth/me');
        if (isCancelled) return;
        applyAuthenticatedUser(
          response.data,
          savedSession.token,
          savedSession.currentOrgId,
          savedSession,
        );
      } catch (err: any) {
        if (isCancelled) return;
        if (err?.response?.status === 401) {
          clearSessionState();
        } else {
          console.error('Failed to bootstrap auth:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsAuthReady(true);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isCancelled = true;
    };
  }, [applyAuthenticatedUser, clearSessionState]);

  useEffect(() => {
    if (user?.orgMemberships?.length) {
      const preferredOrgId = useOrgStore.getState().currentOrgId || session?.currentOrgId;
      const firstApprovedOrgId = pickApprovedOrgId(user.orgMemberships, preferredOrgId);
      const nextOrgs = user.orgMemberships.map(toOrganizationFromMembership);

      setOrgs(nextOrgs);
      const { currentOrgId } = useOrgStore.getState();
      if (!currentOrgId && firstApprovedOrgId) {
        setCurrentOrg(firstApprovedOrgId);
      }
    } else {
      clearOrgContext();
    }
  }, [clearOrgContext, session?.currentOrgId, user, setCurrentOrg, setOrgs]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('session', JSON.stringify(session));
    } else {
      localStorage.removeItem('session');
    }
  }, [session]);

  const registerAndSetSession = useCallback((token: string, rawUser: unknown) => {
    return applyAuthenticatedUser(rawUser, token, undefined, null);
  }, [applyAuthenticatedUser]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { access_token, user: rawUser } = response.data;
      const nextUser = registerAndSetSession(access_token, rawUser);
      return nextUser;
    } catch (err) {
      console.error('Login failed:', err);
      setError('Dang nhap that bai. Vui long kiem tra lai tai khoan va mat khau.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [registerAndSetSession]);

  const logout = useCallback(() => {
    clearSessionState();
    setIsAuthReady(true);
  }, [clearSessionState]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      applyAuthenticatedUser(
        response.data,
        session?.token || parseSavedJson<Session>('session')?.token || '',
        session?.currentOrgId || useOrgStore.getState().currentOrgId,
        session,
      );
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearSessionState();
        return;
      }
      console.error('Failed to refresh user:', err);
    }
  }, [applyAuthenticatedUser, clearSessionState, session]);

  const switchOrg = useCallback((orgId: string) => {
    if (!session || !user) return;
    setSession({ ...session, currentOrgId: orgId, currentGroupId: undefined });
    setUser({
      ...user,
      orgMemberships: user.orgMemberships.map((membership: OrgUser) =>
        membership.orgId === orgId ? { ...membership } : membership,
      ),
    });
  }, [session, user]);

  const switchGroup = useCallback((groupId: string) => {
    if (!session) return;
    setSession({ ...session, currentGroupId: groupId });
  }, [session]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.systemRole === 'system-admin') return true;

    const currentOrgMembership = user.orgMemberships?.find(
      (membership: OrgUser) => membership.orgId === session?.currentOrgId,
    );
    if (currentOrgMembership?.role === 'org-admin') {
      return !['manage_system_settings', 'view_audit_log'].includes(permission);
    }

    const currentGroupMembership = user.groupMemberships?.find(
      (membership: GroupUser) => membership.groupId === session?.currentGroupId,
    );
    if (currentGroupMembership?.role === 'group-admin') {
      return [
        'read_organization',
        'read_group',
        'update_group',
        'manage_group_users',
        'create_meeting',
        'read_meeting',
        'update_meeting',
        'delete_meeting',
        'record_meeting',
        'download_recording',
        'edit_transcript',
        'export_transcript',
        'manage_meeting_attendees',
        'create_action_item',
        'read_action_item',
        'update_action_item',
        'delete_action_item',
        'assign_action_items',
        'view_analytics',
        'export_data',
      ].includes(permission);
    }

    if (currentGroupMembership?.role === 'member') {
      return [
        'read_organization',
        'read_group',
        'create_meeting',
        'read_meeting',
        'update_meeting',
        'record_meeting',
        'download_recording',
        'edit_transcript',
        'export_transcript',
        'create_action_item',
        'read_action_item',
        'update_action_item',
        'assign_action_items',
        'view_analytics',
      ].includes(permission);
    }

    if (
      currentGroupMembership?.role === 'viewer' ||
      currentOrgMembership?.role === 'viewer'
    ) {
      return [
        'read_organization',
        'read_group',
        'read_meeting',
        'download_recording',
        'export_transcript',
        'read_action_item',
        'view_analytics',
      ].includes(permission);
    }

    return false;
  }, [session, user]);

  const isOrgAdmin = useCallback((orgId?: string): boolean => {
    if (!user) return false;
    const targetOrgId = orgId || session?.currentOrgId;
    return (
      user.orgMemberships?.some(
        (membership: OrgUser) =>
          membership.orgId === targetOrgId && membership.role === 'org-admin',
      ) || false
    );
  }, [session, user]);

  const isGroupAdmin = useCallback((groupId?: string): boolean => {
    if (!user) return false;
    if (!groupId && !session?.currentGroupId) {
      return (
        user.groupMemberships?.some(
          (membership: GroupUser) => membership.role === 'group-admin',
        ) || false
      );
    }

    const targetGroupId = groupId || session?.currentGroupId;
    return (
      user.groupMemberships?.some(
        (membership: GroupUser) =>
          membership.groupId === targetGroupId && membership.role === 'group-admin',
      ) || false
    );
  }, [session, user]);

  const value: AuthContextType = {
    user,
    session,
    login,
    registerAndSetSession,
    logout,
    switchOrg,
    switchGroup,
    isAuthenticated: !!user && !!session,
    isAuthReady,
    isLoading,
    error,
    hasPermission,
    isOrgAdmin,
    isGroupAdmin,
    getCurrentOrg: () => session?.currentOrgId || null,
    getCurrentGroup: () => session?.currentGroupId || null,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
