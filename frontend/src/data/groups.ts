/**
 * Mock Groups Data - CLEARED for CRUD Testing
 */
import type { Group } from '../types';

export const mockGroups: Group[] = [];
export const groupMap = new Map<string, Group>();
export const getGroupById = (id: string) => undefined;
export const getGroupsByIds = (ids: string[]) => [];
export const getGroupsByOrgId = (orgId: string) => [];
