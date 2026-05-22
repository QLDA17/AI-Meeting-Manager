import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OrgAdminConsole from './OrgAdminConsole';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ tab: 'overview' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../hooks', () => ({
  usePermission: () => ({
    isOrgAdmin: true,
    isSystemAdmin: false,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-admin', displayName: 'Admin User' },
  }),
}));

vi.mock('../../stores', () => ({
  useOrgStore: () => ({
    currentOrg: {
      id: 'org-1',
      name: 'Test Org',
      memberCount: 10,
      groupCount: 5,
      meetingCount: 20,
      totalHours: 50
    },
    groups: [],
    members: [],
    loadOrgDetails: vi.fn(),
  }),
  useGlossaryStore: () => ({
    glossaries: [],
    loadGlossaries: vi.fn(),
    removeGlossary: vi.fn(),
  }),
}));

vi.mock('../../data', () => ({
  getOrgById: () => ({
    id: 'org-1',
    name: 'Test Org',
    description: 'Org for testing',
  }),
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <OrgAdminConsole />
    </BrowserRouter>
  );
};

describe('OrgAdminConsole Component', () => {
  it('renders the console with organization name', () => {
    renderComponent();
    expect(screen.getByText(/Test Org - Bảng quản trị/i)).toBeInTheDocument();
  });

  it('renders quick stats correctly', () => {
    renderComponent();
    expect(screen.getByText('10')).toBeInTheDocument(); // memberCount
    expect(screen.getByText('5')).toBeInTheDocument();  // groupCount
  });

  it('switches to Settings tab and renders content', async () => {
    renderComponent();
    
    const settingsTab = screen.getByText('Cài đặt');
    fireEvent.click(settingsTab);
    
    expect(await screen.findByText('Thông tin Tổ chức')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Test Org');
  });

  it('switches to Glossaries tab', async () => {
    renderComponent();
    
    const glossaryTab = screen.getByText('Từ điển');
    fireEvent.click(glossaryTab);
    
    expect(await screen.findByText(/Từ điển chuyên ngành/i)).toBeInTheDocument();
  });
});
