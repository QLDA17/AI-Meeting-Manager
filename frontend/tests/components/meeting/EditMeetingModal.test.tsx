import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditMeetingModal from '../../../src/components/meeting/EditMeetingModal';
import api from '../../../src/services/api';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    error: toastMocks.error,
    success: toastMocks.success,
  },
}));

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../../../src/components/ui', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    Modal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
    Button: ({
      children,
      isLoading: _isLoading,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) => <button {...props}>{children}</button>,
    Input: ({
      label,
      value,
      onChange,
      type = 'text',
      placeholder,
    }: {
      label: string;
      value: string;
      onChange: React.ChangeEventHandler<HTMLInputElement>;
      type?: string;
      placeholder?: string;
    }) => (
      <label>
        <span>{label}</span>
        <input aria-label={label} value={value} onChange={onChange} type={type} placeholder={placeholder} />
      </label>
    ),
  };
});

describe('EditMeetingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-25T10:00:00Z').getTime());
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks moving a meeting into the past before calling the API', async () => {
    const user = userEvent.setup();

    render(
      <EditMeetingModal
        isOpen
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        meeting={{
          id: 'meeting-1',
          groupId: 'group-1',
          title: 'Planning',
          scheduled_start: '2026-05-26T09:00:00Z',
          scheduled_end: '2026-05-26T10:00:00Z',
          startTime: '2026-05-26T09:00:00Z',
          endTime: '2026-05-26T10:00:00Z',
          attendees: [],
        } as any}
      />,
    );

    await user.clear(screen.getByLabelText('Ngày họp'));
    await user.type(screen.getByLabelText('Ngày họp'), '2026-05-24');
    await user.clear(screen.getByLabelText('Giờ bắt đầu'));
    await user.type(screen.getByLabelText('Giờ bắt đầu'), '09:00');
    await user.click(screen.getByRole('button', { name: /lưu|cập nhật|xác nhận/i }));

    expect(toastMocks.error).toHaveBeenCalled();
    expect(vi.mocked(api.put)).not.toHaveBeenCalled();
  });
});
