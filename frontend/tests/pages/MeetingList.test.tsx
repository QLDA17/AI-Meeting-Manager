import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MeetingList from '../../src/pages/MeetingList';

const toggleScheduleModal = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../../src/hooks/usePermission', () => ({
  usePermission: () => ({
    isViewer: false,
  }),
}));

vi.mock('../../src/stores', () => ({
  useAppStore: () => ({
    meetings: [],
    loadMeetings: vi.fn().mockResolvedValue(undefined),
  }),
  useOrgStore: () => ({
    currentOrg: { id: 'org-1', name: 'Test Org' },
    currentOrgId: 'org-1',
    groups: [],
  }),
  useCalendarStore: () => ({
    toggleScheduleModal,
  }),
}));

vi.mock('../../src/components/meeting/EditMeetingModal', () => ({
  default: () => null,
}));

vi.mock('../../src/components/meeting/ScheduleMeetingModal', () => ({
  default: () => <div>Schedule Meeting Modal</div>,
}));

describe('MeetingList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the existing schedule modal flow from the list CTA', async () => {
    render(
      <BrowserRouter>
        <MeetingList />
      </BrowserRouter>,
    );

    const scheduleButtons = screen.getAllByRole('button', { name: /Lịch họp/i });
    await userEvent.click(scheduleButtons[0]);

    expect(toggleScheduleModal).toHaveBeenCalledWith(true);
  });
});
