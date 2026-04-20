/* eslint-disable react-refresh/only-export-comments */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, Session, SystemRole, OrgUser, GroupUser } from '../types';
import { mockUsers } from '../data';
import api from '../services/api';

export type Role = SystemRole | 'admin' | 'manager' | 'staff'; // backward compat

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  switchGroup: (groupId: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Role/Permission helpers
  hasPermission: (permission: string) => boolean;
  isOrgAdmin: (orgId?: string) => boolean;
  isGroupAdmin: (groupId?: string) => boolean;
  getCurrentOrg: () => string | null;
  getCurrentGroup: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('session');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (session) localStorage.setItem('session', JSON.stringify(session));
    else localStorage.removeItem('session');
  }, [session]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try real API first
      const response = await api.post('/api/auth/login', {
        username,
        password,
        email: username.includes('@') ? username : `${username}@demo.com`,
      });

      const { access_token, user: userData } = response.data;

      const newSession: Session = {
        userId: userData.id,
        currentOrgId: userData.orgMemberships?.[0]?.orgId || '',
        token: access_token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      setUser(userData);
      setSession(newSession);
    } catch (err) {
      console.error('Login failed, falling back to mock:', err);

      // Mock users - Tìm user theo email hoặc username
      const userInput = username.toLowerCase().trim();
      const mockUser = mockUsers.find(u => 
        u.email.toLowerCase() === userInput || 
        u.id.toLowerCase() === userInput ||
        (userInput === 'superadmin' && u.id === 'user-000') ||
        (userInput === 'admin' && u.id === 'user-001') ||
        (userInput === 'user' && u.id === 'user-010')
      );

      if (!mockUser) {
        setIsLoading(false);
        setError('Tài khoản không tồn tại. Thử "superadmin" hoặc "admin".');
        return;
      }

      const newSession: Session = {
        userId: mockUser.id,
        currentOrgId: mockUser.orgMemberships?.[0]?.orgId || '',
        token: `mock-jwt-${mockUser.id}-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      setUser(mockUser);
      setSession(newSession);

      // Điều hướng tách biệt:
      if (mockUser.id === 'user-000') {
        // Tài khoản superadmin -> Vào thẳng Admin Console
        setTimeout(() => window.location.href = '/admin/console', 100);
      } else {
        // Các tài khoản khác (bao gồm user-001) -> Vào Dashboard người dùng
        setTimeout(() => window.location.href = '/dashboard', 100);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('user');
    localStorage.removeItem('session');
    localStorage.removeItem('auth-storage');
  }, []);

  const switchOrg = useCallback((orgId: string) => {
    if (!session || !user) return;

    const newSession = { ...session, currentOrgId: orgId };
    setSession(newSession);

    // Update user context
    const updatedUser = {
      ...user,
      orgMemberships: user.orgMemberships.map((ou: OrgUser) =>
        ou.orgId === orgId ? { ...ou, role: ou.role } : ou
      ),
    };
    setUser(updatedUser);
  }, [session, user]);

  const switchGroup = useCallback((groupId: string) => {
    if (!session) return;
    setSession({ ...session, currentGroupId: groupId });
  }, [session]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;

    // System admin has all permissions
    if (user.systemRole === 'system-admin') return true;

    // Get role in current org
    const currentOrgMembership = user.orgMemberships?.find(
      (ou: OrgUser) => ou.orgId === session?.currentOrgId
    );

    if (currentOrgMembership?.role === 'org-admin') {
      // Org admin has most permissions except system-level
      return !['manage_system_settings', 'view_audit_log'].includes(permission);
    }

    // Get role in current group
    const currentGroupMembership = user.groupMemberships?.find(
      (gu: GroupUser) => gu.groupId === session?.currentGroupId
    );

    if (currentGroupMembership?.role === 'group-admin') {
      // Group admin has group-level permissions
      const groupPermissions = [
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
      ];
      return groupPermissions.includes(permission);
    }

    if (currentGroupMembership?.role === 'member') {
      // Member permissions
      const memberPermissions = [
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
      ];
      return memberPermissions.includes(permission);
    }

    if (currentGroupMembership?.role === 'viewer' || currentOrgMembership?.role === 'viewer') {
      // Viewer permissions (read-only)
      const viewerPermissions = ['read_organization', 'read_group', 'read_meeting', 'download_recording', 'export_transcript', 'read_action_item', 'view_analytics'];
      return viewerPermissions.includes(permission);
    }

    return false;
  }, [user, session]);

  const isOrgAdmin = useCallback((orgId?: string): boolean => {
    if (!user) return false;
    const targetOrgId = orgId || session?.currentOrgId;
    return user.orgMemberships?.some(
      (ou: OrgUser) => ou.orgId === targetOrgId && ou.role === 'org-admin'
    ) || false;
  }, [user, session]);

  const isGroupAdmin = useCallback((groupId?: string): boolean => {
    if (!user) return false;
    // If no groupId provided, check if user is group-admin in ANY group
    if (!groupId && !session?.currentGroupId) {
      return user.groupMemberships?.some(
        (gu: GroupUser) => gu.role === 'group-admin'
      ) || false;
    }
    const targetGroupId = groupId || session?.currentGroupId;
    return user.groupMemberships?.some(
      (gu: GroupUser) => gu.groupId === targetGroupId && gu.role === 'group-admin'
    ) || false;
  }, [user, session]);

  const getCurrentOrg = useCallback(() => {
    return session?.currentOrgId || null;
  }, [session]);

  const getCurrentGroup = useCallback(() => {
    return session?.currentGroupId || null;
  }, [session]);

  const value: AuthContextType = {
    user,
    session,
    login,
    logout,
    switchOrg,
    switchGroup,
    isAuthenticated: !!user && !!session,
    isLoading,
    error,
    hasPermission,
    isOrgAdmin,
    isGroupAdmin,
    getCurrentOrg,
    getCurrentGroup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
