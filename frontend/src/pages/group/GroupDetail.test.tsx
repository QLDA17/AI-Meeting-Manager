import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import GroupDetail from './GroupDetail';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'group-1' }),
    useNavigate: () => vi.fn(),
  };
});

// Create a variable to control the mock return value
let mockIsGroupAdmin = true;

vi.mock('../../hooks', () => ({
  usePermission: () => ({
    isGroupAdmin: mockIsGroupAdmin,
    isOrgAdmin: false,
    isSystemAdmin: false,
    isViewer: false,
    hasPermission: (p: string) => true
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', displayName: 'Test User' },
  }),
}));

vi.mock('../../stores', () => ({
  useGroupStore: () => ({
    setCurrentGroup: vi.fn(),
  }),
  useOrgStore: () => ({
    currentOrg: { id: 'org-1', name: 'Org Test' },
  }),
}));

vi.mock('../../data', () => ({
  getGroupById: (id: string) => {
    if (id === 'group-1') {
      return { 
        id: 'group-1', 
        name: 'Test Group', 
        description: 'A test group', 
        privacyLevel: 'internal', 
        memberCount: 5, 
        meetingCount: 10, 
        totalHours: 12 
      };
    }
    return null;
  },
  getMeetingsByGroupId: () => [],
  getMembersByGroupId: () => [],
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <GroupDetail />
    </BrowserRouter>
  );
};

describe('GroupDetail Component', () => {
  beforeEach(() => {
    mockIsGroupAdmin = true;
  });

  it('hiển thị thông tin nhóm cơ bản', () => {
    renderComponent();
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('A test group')).toBeInTheDocument();
  });

  it('hiển thị tab Cài đặt khi là Admin', () => {
    renderComponent();
    expect(screen.getByText(/Cài đặt/i)).toBeInTheDocument();
  });

  it('KHÔNG hiển thị tab Cài đặt khi không phải là Admin', () => {
    mockIsGroupAdmin = false;
    renderComponent();
    expect(screen.queryByText(/Cài đặt/i)).not.toBeInTheDocument();
  });
});
