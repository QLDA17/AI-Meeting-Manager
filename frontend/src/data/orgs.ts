/**
 * Mock Organizations Data - CLEARED for CRUD Testing
 */
import type { Organization } from '../types';

export const mockOrganizations: Organization[] = [];
export const orgMap = new Map<string, Organization>();
export const getOrgById = (id: string) => undefined;
export const getOrgsByIds = (ids: string[]) => [];
