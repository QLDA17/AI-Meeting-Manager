/**
 * Mock Meetings Data - CLEARED for CRUD Testing
 */
import type { Meeting } from '../types';

export const mockMeetings: Meeting[] = [];
export const meetingMap = new Map<string, Meeting>();
export const getMeetingById = (id: string) => undefined;
export const getMeetingsByGroupId = (groupId: string) => [];
export const getMeetingsByOrgId = (orgId: string) => [];
export const getMeetingsByUserId = (userId: string) => [];
