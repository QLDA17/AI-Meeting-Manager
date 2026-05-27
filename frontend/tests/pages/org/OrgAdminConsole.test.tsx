import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OrgAdminConsole from '../../../src/pages/org/OrgAdminConsole';

// Mock router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tab: 'overview' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock permission hook
vi.mock('../../../src/hooks', () => ({
  usePermission: () => ({
    isOrgAdmin: true,
    isSystemAdmin: false,
  }),
}));

// Mock auth context
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-admin', displayName: 'Admin User' },
  }),
}));

// Setup default mock values for org store
const mockLoadOrgDetails = vi.fn();
const mockGroups = [
  {
    id: 'group-me',
    name: 'ME',
    memberCount: 1,
    meetingCount: 2,
    totalHours: 0.1,
    visibility: 'organization',
    joinPolicy: 'invite_only',
    description: 'My group ME',
  },
  {
    id: 'group-onthi',
    name: 'Ôn thi ck 1',
    memberCount: 2,
    meetingCount: 20,
    totalHours: 7.4,
    visibility: 'organization',
    joinPolicy: 'invite_only',
    description: '',
  }
];

vi.mock('../../../src/stores', () => ({
  useOrgStore: () => ({
    currentOrg: {
      id: 'org-1',
      name: 'Test Org',
      memberCount: 3,
      groupCount: 2,
      meetingCount: 22,
      totalHours: 7.5
    },
    groups: mockGroups,
    members: [
      { id: 'm1', email: 'user1@test.com', displayName: 'User One', role: 'member' }
    ],
    loadOrgDetails: mockLoadOrgDetails,
  }),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <OrgAdminConsole />
    </BrowserRouter>
  );
};

describe('OrgAdminConsole Overview Tab Statistics Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Org Admin Console header correctly', () => {
    renderComponent();
    expect(screen.getByText(/Quản trị tổ chức/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Org/i)).toBeInTheDocument();
  });

  it('renders quick stats at the top of the console', () => {
    renderComponent();
    expect(screen.getByText(/Tổng người dùng/i)).toBeInTheDocument();
    expect(screen.getByText(/Tổng nhóm/i)).toBeInTheDocument();
    expect(screen.getByText(/Tổng cuộc họp/i)).toBeInTheDocument();
  });

  it('renders the statistics analytics inside the overview tab', () => {
    renderComponent();
    // Averages and title
    expect(screen.getByText(/Bản đồ Phân tích & Thống kê Hoạt động/i)).toBeInTheDocument();
    expect(screen.getByText(/Chỉ số hiệu suất cộng tác/i)).toBeInTheDocument();
    expect(screen.getByText(/Thành viên trung bình/i)).toBeInTheDocument();
    
    // Group active leaderboard elements
    expect(screen.getByText(/Xếp hạng hoạt động của nhóm/i)).toBeInTheDocument();
    expect(screen.getByText('ME')).toBeInTheDocument();
    expect(screen.getByText('Ôn thi ck 1')).toBeInTheDocument();
  });
});
