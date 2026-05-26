import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthState = {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    orgMemberships: Array<{ orgId: string; approvalStatus: string }>;
  } | null;
};

type PermissionState = {
  isSystemAdmin: boolean;
  isOrgAdmin: boolean;
  isGroupAdmin: boolean;
  isViewer: boolean;
  isMember: boolean;
};

const authState: AuthState = {
  isAuthenticated: true,
  isAuthReady: true,
  user: {
    id: 'user-1',
    username: 'member',
    email: 'member@example.com',
    displayName: 'Member User',
    orgMemberships: [{ orgId: 'org-1', approvalStatus: 'active' }],
  },
};

const permissionState: PermissionState = {
  isSystemAdmin: false,
  isOrgAdmin: false,
  isGroupAdmin: false,
  isViewer: false,
  isMember: true,
};

vi.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState,
}));

vi.mock('../src/hooks/usePermission', () => ({
  usePermission: () => permissionState,
}));

vi.mock('../src/stores', () => ({
  useUIStore: () => ({ isDarkMode: false }),
}));

vi.mock('../src/layouts/Layout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { default: () => <div><Outlet /></div> };
});

vi.mock('../src/layouts/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom');
  return { default: () => <div><Outlet /></div> };
});

vi.mock('../src/pages/Landing', () => ({ default: () => <div>Landing</div> }));
vi.mock('../src/pages/Login', () => ({ default: () => <div>Login</div> }));
vi.mock('../src/pages/Register', () => ({ default: () => <div>Register</div> }));
vi.mock('../src/pages/ForgotPassword', () => ({ default: () => <div>Forgot Password</div> }));
vi.mock('../src/pages/Invite', () => ({ default: () => <div>Invite</div> }));
vi.mock('../src/pages/Dashboard', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('../src/pages/MeetingList', () => ({ default: () => <div>Meeting List</div> }));
vi.mock('../src/pages/MeetingDetail', () => ({ default: () => <div>Meeting Detail</div> }));
vi.mock('../src/pages/meeting/Calendar', () => ({ default: () => <div>Calendar</div> }));
vi.mock('../src/pages/CreateMeeting', () => ({ default: () => <div>Create Meeting</div> }));
vi.mock('../src/pages/MeetingRoom', () => ({ default: () => <div>Meeting Room</div> }));
vi.mock('../src/pages/JoinMeeting', () => ({ default: () => <div>Join Meeting</div> }));
vi.mock('../src/pages/meeting/UploadAudio', () => ({ default: () => <div>Upload Audio</div> }));
vi.mock('../src/pages/Notifications', () => ({ default: () => <div>Notifications</div> }));
vi.mock('../src/pages/ActionItems', () => ({ default: () => <div>Action Items</div> }));
vi.mock('../src/pages/NotFound', () => ({ default: () => <div>Not Found Page</div> }));
vi.mock('../src/pages/Forbidden', () => ({ default: () => <div>Forbidden</div> }));
vi.mock('../src/pages/group/GroupDetail', () => ({ default: () => <div>Group Detail</div> }));
vi.mock('../src/pages/group/CreateGroup', () => ({ default: () => <div>Create Group</div> }));
vi.mock('../src/pages/org/OrgAdminConsole', () => ({ default: () => <div>Org Admin Console</div> }));
vi.mock('../src/pages/admin/SystemAdminConsole', () => ({ default: () => <div>System Admin Console</div> }));
vi.mock('../src/pages/admin/components/AdminOrganizations', () => ({ default: () => <div>Admin Organizations</div> }));
vi.mock('../src/pages/admin/components/AdminUsers', () => ({ default: () => <div>Admin Users</div> }));
vi.mock('../src/pages/admin/components/AdminAIServices', () => ({ default: () => <div>Admin AI Services</div> }));
vi.mock('../src/pages/admin/components/AdminPrompts', () => ({ default: () => <div>Admin Prompts</div> }));
vi.mock('../src/pages/admin/components/AdminNotifications', () => ({ default: () => <div>Admin Notifications</div> }));
vi.mock('../src/pages/admin/components/AdminAuditLogs', () => ({ default: () => <div>Admin Audit Logs</div> }));
vi.mock('../src/pages/admin/components/AdminSettings', () => ({ default: () => <div>Admin Settings</div> }));
vi.mock('../src/pages/OrganizationSetup', () => ({ default: () => <div>Organization Setup</div> }));
vi.mock('../src/pages/profile/Profile', () => ({ default: () => <div>Profile</div> }));

import App from '../src/App';

const renderAppAt = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

describe('App admin routing', () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    authState.isAuthReady = true;
    authState.user = {
      id: 'user-1',
      username: 'member',
      email: 'member@example.com',
      displayName: 'Member User',
      orgMemberships: [{ orgId: 'org-1', approvalStatus: 'active' }],
    };
    permissionState.isSystemAdmin = false;
    permissionState.isOrgAdmin = false;
    permissionState.isGroupAdmin = false;
    permissionState.isViewer = false;
    permissionState.isMember = true;
  });

  it('blocks member access to /groups/create', async () => {
    renderAppAt('/groups/create');
    expect(await screen.findByText('Khong co quyen truy cap')).toBeInTheDocument();
  });

  it('does not keep the legacy /create route', async () => {
    renderAppAt('/create');
    expect(await screen.findByText('Not Found Page')).toBeInTheDocument();
  });
});
