/**
 * useCurrentRole Hook
 * Detect user's role based on current org/group context
 */
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrgStore } from '../stores';
import { getOrgRole, getGroupRole } from '../data';

export const useCurrentRole = () => {
  const { user, session } = useAuth();
  const { currentOrgId, currentGroupId } = useOrgStore();

  return useMemo(() => {
    if (!user) return null;

    // Get role in current org
    const orgRole = currentOrgId ? getOrgRole(user.id, currentOrgId) : null;

    // Get role in current group (if any)
    const groupRole = currentGroupId ? getGroupRole(user.id, currentGroupId) : null;

    // System admin has all powers
    if (user.systemRole === 'system-admin') {
      return {
        systemRole: 'system-admin' as const,
        orgRole: null,
        groupRole: null,
        isSystemAdmin: true,
        isOrgAdmin: false,
        isGroupAdmin: false,
        isViewer: false,
        displayName: 'System Administrator',
      };
    }

    const isOrgAdmin = orgRole === 'org-admin';
    const isGroupAdmin = groupRole === 'group-admin';
    const isViewer = orgRole === 'viewer' || groupRole === 'viewer';

    // Determine display name
    let displayName = 'Member';
    if (isOrgAdmin) displayName = 'Org Admin';
    else if (isGroupAdmin) displayName = 'Group Admin';
    else if (isViewer) displayName = 'Viewer';

    return {
      systemRole: user.systemRole,
      orgRole,
      groupRole,
      isSystemAdmin: false,
      isOrgAdmin,
      isGroupAdmin,
      isViewer,
      displayName,
    };
  }, [user, currentOrgId, currentGroupId]);
};

export default useCurrentRole;
