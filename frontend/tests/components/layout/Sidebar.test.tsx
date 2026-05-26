import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

type PermissionState = {
  isSystemAdmin: boolean;
  isOrgAdmin: boolean;
  isGroupAdmin: boolean;
  isViewer: boolean;
};

const permissionState: PermissionState = {
  isSystemAdmin: false,
  isOrgAdmin: false,
  isGroupAdmin: false,
  isViewer: false,
};

const logout = vi.fn();

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member User',
    },
    logout,
  }),
}));

vi.mock('../../../src/hooks', () => ({
  usePermission: () => ({
    ...permissionState,
  }),
}));

vi.mock('../../../src/stores', () => ({
  useOrgStore: () => ({
    currentOrg: { id: 'org-1', name: 'Test Org' },
  }),
}));

vi.mock('../../../src/components/ui', () => ({
  Logo: () => <div>Logo</div>,
}));

vi.mock('../../../src/components/layout/OrgSelector', () => ({
  default: () => <div>Org Selector</div>,
}));

vi.mock('../../../src/components/layout/GroupNav', () => ({
  default: () => <div>Group Nav</div>,
}));

vi.mock('../../../src/components/layout/QuickAccess', () => ({
  default: () => <div>Quick Access</div>,
}));

vi.mock('../../../src/components/group/CreateGroupModal', () => ({
  default: () => null,
}));

import Sidebar from '../../../src/components/layout/Sidebar';

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <Sidebar mobileOpen onClose={vi.fn()} />
    </MemoryRouter>,
  );

describe('Sidebar admin links', () => {
  beforeEach(() => {
    permissionState.isSystemAdmin = false;
    permissionState.isOrgAdmin = false;
    permissionState.isGroupAdmin = false;
    permissionState.isViewer = false;
  });

  it('hides org admin link for non-org-admin users', () => {
    renderSidebar();
    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument();
  });

  it('shows org admin link for org-admin users', () => {
    permissionState.isOrgAdmin = true;
    renderSidebar();
    expect(screen.getByText('Admin Console')).toBeInTheDocument();
  });
});
