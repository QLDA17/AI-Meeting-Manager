/**
 * usePermission Hook
 * Provides convenient access to permission checking utilities
 */
import { useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { SystemRole, Permission } from '@/shared/types';
import { roleDefinitions, roleHierarchy } from '@/shared/mockData';

interface UsePermissionReturn {
  // Check single permission
  hasPermission: (permission: Permission | string) => boolean;

  // Check multiple permissions (all must be true)
  hasAllPermissions: (permissions: (Permission | string)[]) => boolean;

  // Check if has any of the permissions
  hasAnyPermission: (permissions: (Permission | string)[]) => boolean;

  // Check role level
  isRoleAtLeast: (minRole: SystemRole) => boolean;

  // Role info
  currentRole: SystemRole | null;
  roleDisplayName: string;
  roleColor: string;

  // Context info
  isOrgAdmin: boolean;
  isGroupAdmin: boolean;
  isSystemAdmin: boolean;
  isViewer: boolean;
}

export const usePermission = (): UsePermissionReturn => {
  const { user, session, hasPermission, isOrgAdmin, isGroupAdmin } = useAuth();

  const currentRole = user?.systemRole || null;

  const isRoleAtLeast = useCallback(
    (minRole: SystemRole): boolean => {
      if (!currentRole) return false;
      return (roleHierarchy[currentRole] || 0) >= (roleHierarchy[minRole] || 0);
    },
    [currentRole]
  );

  const hasAllPermissions = useCallback(
    (permissions: (Permission | string)[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const hasAnyPermission = useCallback(
    (permissions: (Permission | string)[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission]
  );

  const roleInfo = currentRole ? roleDefinitions[currentRole] : null;

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isRoleAtLeast,
    currentRole,
    roleDisplayName: roleInfo?.displayName || 'Unknown',
    roleColor: roleInfo?.color || '#6B7280',
    isOrgAdmin: isOrgAdmin(),
    isGroupAdmin: isGroupAdmin(),
    isSystemAdmin: currentRole === 'system-admin',
    isViewer: currentRole === 'viewer',
  };
};

export default usePermission;
