import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateGroupModal from './CreateGroupModal';
import { BrowserRouter } from 'react-router-dom';

// Mock các store và context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', displayName: 'Test User', orgMemberships: [{ orgId: 'org-1' }] },
  }),
}));

vi.mock('../../stores', () => ({
  useOrgStore: () => ({
    currentOrg: { id: 'org-1', name: 'ABC Company' },
    loadGroups: vi.fn(),
  }),
}));

const renderModal = (isOpen: boolean = true, onClose = vi.fn()) => {
  return render(
    <BrowserRouter>
      <CreateGroupModal isOpen={isOpen} onClose={onClose} />
    </BrowserRouter>
  );
};

describe('CreateGroupModal Component', () => {
  it('nên hiển thị đúng tiêu đề và các trường nhập liệu', () => {
    renderModal();
    
    expect(screen.getByText(/Create New Group/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Level/i)).toBeInTheDocument();
  });

  it('nên gọi hàm onClose khi nhấn nút Cancel', () => {
    const onClose = vi.fn();
    renderModal(true, onClose);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('nên cho phép nhập tên nhóm và mô tả', () => {
    renderModal();
    
    const nameInput = screen.getByLabelText(/Group Name/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/Description/i) as HTMLTextAreaElement;
    
    fireEvent.change(nameInput, { target: { value: 'Dự án AI Mới' } });
    fireEvent.change(descInput, { target: { value: 'Nhóm phát triển tính năng AI' } });
    
    expect(nameInput.value).toBe('Dự án AI Mới');
    expect(descInput.value).toBe('Nhóm phát triển tính năng AI');
  });
});
