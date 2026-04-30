import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import type { SystemRole, Permission } from '../types';
import { roleDefinitions, roleHierarchy } from '../data';
import useCurrentRole from './useCurrentRole';

interface UsePermissionReturn {
  hasPermission: (permission: Permission | string) => boolean;
  hasAllPermissions: (permissions: (Permission | string)[]) => boolean;
  hasAnyPermission: (permissions: (Permission | string)[]) => boolean;
  isRoleAtLeast: (minRole: SystemRole) => boolean;
  currentRole: SystemRole | null;
  roleDisplayName: string;
  roleColor: string;
  isOrgAdmin: boolean;
  isGroupAdmin: boolean;
  isSystemAdmin: boolean;
  isViewer: boolean;
}

export const usePermission = (): UsePermissionReturn => {
  const { hasPermission } = useAuth();
  const roleContext = useCurrentRole();

  const currentRole = roleContext?.currentRole || null;

  const isRoleAtLeast = useCallback(
    (minRole: SystemRole): boolean => {
      if (!currentRole) return false;
      return (roleHierarchy[currentRole] || 0) >= (roleHierarchy[minRole] || 0);
    },
    [currentRole]
  );

  const hasAllPermissions = useCallback(
    (permissions: (Permission | string)[]): boolean => permissions.every((permission) => hasPermission(permission)),
    [hasPermission]
  );

  const hasAnyPermission = useCallback(
    (permissions: (Permission | string)[]): boolean => permissions.some((permission) => hasPermission(permission)),
    [hasPermission]
  );

  const roleInfo = currentRole ? roleDefinitions[currentRole] : null;

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isRoleAtLeast,
    currentRole,
    roleDisplayName: roleContext?.displayName || roleInfo?.displayName || 'Unknown',
    roleColor: roleInfo?.color || '#6B7280',
    isOrgAdmin: roleContext?.isOrgAdmin || false,
    isGroupAdmin: roleContext?.isGroupAdmin || false,
    isSystemAdmin: roleContext?.isSystemAdmin || false,
    isViewer: roleContext?.isViewer || false,
  };
};

export default usePermission;
