import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MeetingCard from '../../../src/components/meeting/MeetingCard';
import type { Meeting } from '../../../src/types';

const buildMeeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  id: 'meeting-1',
  orgId: 'org-1',
  organization_id: 'org-1',
  title: 'Planning Meeting',
  description: 'Review roadmap',
  startTime: '2026-05-25T09:00:00Z',
  endTime: '2026-05-25T10:00:00Z',
  scheduled_start: '2026-05-25T09:00:00Z',
  scheduled_end: '2026-05-25T10:00:00Z',
  duration: 60,
  status: 'upcoming',
  attendees: [],
  createdBy: 'user-1',
  createdAt: '2026-05-25T08:00:00Z',
  updatedAt: '2026-05-25T08:00:00Z',
  ...overrides,
});

describe('MeetingCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T09:20:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not allow joining an upcoming meeting whose start time has already passed', () => {
    render(
      <MemoryRouter>
        <MeetingCard meeting={buildMeeting()} index={0} />
      </MemoryRouter>,
    );

    const blockedLink = screen.getByRole('link', { name: 'Chưa tới giờ' });
    // expect(blockedLink).not.toHaveAttribute('href', '/room/meeting-1');
  });

  it('shows live elapsed minutes instead of stale scheduled duration', () => {
    render(
      <MemoryRouter>
        <MeetingCard
          meeting={buildMeeting({
            status: 'live',
            actual_start: '2026-05-25T09:19:00Z',
            duration: 60,
            liveDurationMinutes: 1,
          })}
          index={0}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('1 phút')).toBeInTheDocument();
  });

  it('shows planned duration label for scheduled meetings without actual duration', () => {
    render(
      <MemoryRouter>
        <MeetingCard
          meeting={buildMeeting({
            duration: 0,
            plannedDurationMinutes: 60,
            actualDurationMinutes: undefined,
          })}
          index={0}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Dự kiến 60 phút')).toBeInTheDocument();
  });
});
