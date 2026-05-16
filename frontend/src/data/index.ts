/**
 * Mock Data Index - Centralized barrel export
 */

// Users
export { mockUsers, userMap, getUserById, getUsersByIds, getMembersByGroupId } from './users';

// Organizations
export { mockOrganizations, orgMap, getOrgById, getOrgsByIds } from './orgs';

// Groups
export {
    mockGroups,
    groupMap,
    getGroupById,
    getGroupsByIds,
    getGroupsByOrgId,
} from './groups';

// Roles
export {
    roleDefinitions,
    getRoleDefinition,
    hasPermissionInRole,
    getRolePermissions,
    roleHierarchy,
    roleIsHigherThan,
    getAllRoles,
    getRoleDisplayInfo,
} from './roles';

// Role Mappings
export {
    orgUserRoles,
    groupUserRoles,
    getOrgRole,
    getGroupRole,
    getUserOrgs,
    getUserGroups,
    getOrgMembers,
    getGroupMembers,
} from './roleMappings';

// Re-export type definitions
export type { User, Organization, Group, Meeting, Permission, SystemRole, RoleDefinition } from '../types';
