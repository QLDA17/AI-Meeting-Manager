/**
 * Mock Users Data - CLEARED for CRUD Testing
 */
import type { User } from '../types';

export const mockUsers: User[] = [];
export const userMap = new Map<string, User>();
export const getUserById = (id: string) => undefined;
export const getUsersByIds = (ids: string[]) => [];
export const getMembersByGroupId = (groupId: string) => [];
