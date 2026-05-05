/**
 * Mock Role Definitions with Permissions
 */
import type { RoleDefinition, Permission, SystemRole } from '@/shared/types';

export const roleDefinitions: Record<SystemRole, RoleDefinition> = {
    'system-admin': {
        role: 'system-admin',
        displayName: 'System Administrator',
        description: 'Full system access, manage all organizations',
        color: '#DC2626', // Red
        icon: 'Shield',
        permissions: [
            // Organization Management
            'create_organization',
            'read_organization',
            'update_organization',
            'delete_organization',
            'manage_organization_users',
            'manage_organization_billing',

            // Group Management
            'create_group',
            'read_group',
            'update_group',
            'delete_group',
            'manage_group_users',

            // Meeting Management
            'create_meeting',
            'read_meeting',
            'update_meeting',
            'delete_meeting',
            'record_meeting',
            'download_recording',
            'edit_transcript',
            'export_transcript',
            'manage_meeting_attendees',

            // Action Items
            'create_action_item',
            'read_action_item',
            'update_action_item',
            'delete_action_item',
            'assign_action_items',

            // Admin Features
            'view_analytics',
            'view_billing_history',
            'manage_system_settings',
            'view_audit_log',
            'export_data',
        ] as Permission[],
    },

    'org-admin': {
        role: 'org-admin',
        displayName: 'Organization Administrator',
        description: 'Manage organization, groups, and members',
        color: '#EA580C', // Orange
        icon: 'Users',
        permissions: [
            // Organization Management
            'read_organization',
            'update_organization',
            'manage_organization_users',
            'manage_organization_billing',

            // Group Management
            'create_group',
            'read_group',
            'update_group',
            'delete_group',
            'manage_group_users',

            // Meeting Management
            'create_meeting',
            'read_meeting',
            'update_meeting',
            'delete_meeting',
            'record_meeting',
            'download_recording',
            'edit_transcript',
            'export_transcript',
            'manage_meeting_attendees',

            // Action Items
            'create_action_item',
            'read_action_item',
            'update_action_item',
            'delete_action_item',
            'assign_action_items',

            // Admin Features
            'view_analytics',
            'view_billing_history',
            'export_data',
        ] as Permission[],
    },

    'group-admin': {
        role: 'group-admin',
        displayName: 'Group Administrator',
        description: 'Manage specific group, meetings, and members',
        color: '#0891B2', // Cyan
        icon: 'Users2',
        permissions: [
            // Organization (Read-only)
            'read_organization',

            // Group Management
            'read_group',
            'update_group',
            'manage_group_users',

            // Meeting Management
            'create_meeting',
            'read_meeting',
            'update_meeting',
            'delete_meeting',
            'record_meeting',
            'download_recording',
            'edit_transcript',
            'export_transcript',
            'manage_meeting_attendees',

            // Action Items
            'create_action_item',
            'read_action_item',
            'update_action_item',
            'delete_action_item',
            'assign_action_items',

            // Analytics
            'view_analytics',
            'export_data',
        ] as Permission[],
    },

    'member': {
        role: 'member',
        displayName: 'Member',
        description: 'Create meetings, access resources in assigned groups',
        color: '#3B82F6', // Blue
        icon: 'User',
        permissions: [
            // Organization (Read-only)
            'read_organization',

            // Group
            'read_group',

            // Meeting Management
            'create_meeting',
            'read_meeting',
            'update_meeting',
            'record_meeting',
            'download_recording',
            'edit_transcript',
            'export_transcript',

            // Action Items
            'create_action_item',
            'read_action_item',
            'update_action_item',
            'assign_action_items',

            // Analytics
            'view_analytics',
        ] as Permission[],
    },

    'viewer': {
        role: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access to meetings and resources',
        color: '#6B7280', // Gray
        icon: 'Eye',
        permissions: [
            // Organization (Read-only)
            'read_organization',

            // Group (Read-only)
            'read_group',

            // Meeting (Read-only)
            'read_meeting',
            'download_recording',
            'export_transcript',

            // Action Items (Read-only)
            'read_action_item',

            // Analytics
            'view_analytics',
        ] as Permission[],
    },
};

/**
 * Get role definition by role name
 */
export const getRoleDefinition = (role: SystemRole): RoleDefinition => {
    return roleDefinitions[role];
};

/**
 * Check if a role has a specific permission
 */
export const hasPermissionInRole = (role: SystemRole, permission: Permission): boolean => {
    const roleDefinition = roleDefinitions[role];
    return roleDefinition ? roleDefinition.permissions.includes(permission) : false;
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: SystemRole): Permission[] => {
    const roleDefinition = roleDefinitions[role];
    return roleDefinition ? [...roleDefinition.permissions] : [];
};

/**
 * Role hierarchy for comparison
 * Higher number = more permission
 */
export const roleHierarchy: Record<SystemRole, number> = {
    'system-admin': 5,
    'org-admin': 4,
    'group-admin': 3,
    'member': 2,
    'viewer': 1,
};

/**
 * Check if user role A has more permissions than role B
 */
export const roleIsHigherThan = (roleA: SystemRole, roleB: SystemRole): boolean => {
    return roleHierarchy[roleA] > roleHierarchy[roleB];
};

/**
 * Get all roles sorted from highest to lowest permission
 */
export const getAllRoles = (): SystemRole[] => {
    return Object.keys(roleDefinitions) as SystemRole[];
};

/**
 * Get display metadata for role (for UI rendering)
 */
export const getRoleDisplayInfo = (role: SystemRole) => {
    const definition = roleDefinitions[role];
    return {
        displayName: definition.displayName,
        description: definition.description,
        color: definition.color,
        icon: definition.icon,
    };
};
