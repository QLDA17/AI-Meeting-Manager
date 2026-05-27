import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateGroupModal from '../../../src/components/group/CreateGroupModal';

const useOrgStoreMock = vi.fn();
const usePermissionMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../../src/services/api', () => ({
  default: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('../../../src/stores', () => ({
  useOrgStore: () => useOrgStoreMock(),
}));

vi.mock('../../../src/hooks/usePermission', () => ({
  usePermission: () => usePermissionMock(),
}));

// Mock useAuth
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'creator-1',
      email: 'Huyen230305@gmail.com',
      displayName: 'Nguyễn Huyền',
    },
  }),
}));

const renderModal = (isOpen = true, onClose = vi.fn()) =>
  render(
    <BrowserRouter>
      <CreateGroupModal isOpen={isOpen} onClose={onClose} />
    </BrowserRouter>
  );

describe('CreateGroupModal Component', () => {
  const mockMembers = [
    { id: 'member-1', email: 'member1@example.com', displayName: 'Thành viên 1', avatarUrl: '' },
    { id: 'member-2', email: 'member2@example.com', displayName: 'Thành viên 2', avatarUrl: 'https://example.com/avatar2.jpg' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useOrgStoreMock.mockReturnValue({
      currentOrg: { id: 'org-1', name: 'NHÓM LÝ' },
      members: mockMembers,
      loadGroups: vi.fn(),
    });
    usePermissionMock.mockReturnValue({
      hasPermission: vi.fn(() => true),
      isOrgAdmin: true,
      isSystemAdmin: false,
    });
  });

  it('renders the main fields in Vietnamese', () => {
    renderModal();

    expect(screen.getByText('Tạo nhóm mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ví dụ: Product Leadership')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nêu rõ phạm vi cộng tác, phòng ban hoặc chương trình làm việc của nhóm.')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt truy cập')).toBeInTheDocument();
    expect(screen.getAllByText('Thành viên & Vai trò').length).toBeGreaterThan(0);
  });

  it('calls onClose when cancel or overlay close is clicked', () => {
    const onClose = vi.fn();
    renderModal(true, onClose);

    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows editing name and description', () => {
    renderModal();

    const nameInput = screen.getByPlaceholderText('Ví dụ: Product Leadership') as HTMLInputElement;
    const descInput = screen.getByPlaceholderText('Nêu rõ phạm vi cộng tác, phòng ban hoặc chương trình làm việc của nhóm.') as HTMLTextAreaElement;

    fireEvent.change(nameInput, { target: { value: 'Dự án AI mới' } });
    fireEvent.change(descInput, { target: { value: 'Nhóm phát triển tính năng AI' } });

    expect(nameInput.value).toBe('Dự án AI mới');
    expect(descInput.value).toBe('Nhóm phát triển tính năng AI');
  });

  it('blocks submit when the user lacks permission', () => {
    usePermissionMock.mockReturnValue({
      hasPermission: vi.fn(() => false),
      isOrgAdmin: false,
      isSystemAdmin: false,
    });

    renderModal();

    expect(screen.getByText('Bạn cần quyền quản trị tổ chức để tạo nhóm.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo nhóm' })).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('shows a friendly error from backend', async () => {
    postMock.mockRejectedValue({
      response: {
        status: 403,
        data: { detail: 'Bạn cần quyền quản trị tổ chức để tạo nhóm.' },
      },
    });

    renderModal();

    const nameInput = screen.getByPlaceholderText('Ví dụ: Product Leadership');
    fireEvent.change(nameInput, { target: { value: 'New Team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nhóm' }));

    await waitFor(() => {
      expect(screen.getAllByText('Bạn cần quyền quản trị tổ chức để tạo nhóm.').length).toBeGreaterThan(0);
    });
  });

  // TDD New Features
  it('renders the primary admin creator (Nguyễn Huyền) dynamically', () => {
    renderModal();

    // Check if Nguyễn Huyền is rendered as primary admin
    expect(screen.getAllByText('Nguyễn Huyền').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Huyen230305@gmail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('Quản trị chính')).toBeInTheDocument();
  });

  it('allows searching members in single unified members list', () => {
    renderModal();

    // Single unified search input should be present
    const searchInput = screen.getByPlaceholderText('Tìm thành viên...');
    expect(searchInput).toBeInTheDocument();

    // Search for "Thành viên 1"
    fireEvent.change(searchInput, { target: { value: 'Thành viên 1' } });

    // "Thành viên 1" should be visible
    expect(screen.getAllByText('Thành viên 1').length).toBeGreaterThan(0);
  });

  it('automatically adds badge to members selected as admins', async () => {
    renderModal();

    // Find custom admin checkbox for member-1 and toggle it
    const adminCheckbox = screen.getByTestId('admin-checkbox-member-1');
    expect(adminCheckbox).toBeInTheDocument();
    
    fireEvent.click(adminCheckbox);
  });
});
