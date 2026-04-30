import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrgStore } from '../stores';
import type { SystemRole } from '../types';

type OrgRole = 'org-admin' | 'member' | 'viewer' | null;
type GroupRole = 'group-admin' | 'member' | 'viewer' | null;

type ContextRole = SystemRole | null;

export const useCurrentRole = () => {
  const { user, session } = useAuth();
  const { currentOrgId, currentGroupId } = useOrgStore();

  return useMemo(() => {
    if (!user) return null;

    const activeOrgId = currentOrgId || session?.currentOrgId || null;
    const activeGroupId = currentGroupId || session?.currentGroupId || null;

    const orgRole: OrgRole = activeOrgId
      ? user.orgMemberships?.find((membership) => membership.orgId === activeOrgId)?.role || null
      : null;

    const groupRole: GroupRole = activeGroupId
      ? user.groupMemberships?.find((membership) => membership.groupId === activeGroupId)?.role || null
      : null;

    const isSystemAdmin = user.systemRole === 'system-admin';
    const isOrgAdmin = orgRole === 'org-admin';
    const isGroupAdmin = groupRole === 'group-admin';
    const isViewer = orgRole === 'viewer' || groupRole === 'viewer';

    let currentRole: ContextRole = 'member';
    if (isSystemAdmin) currentRole = 'system-admin';
    else if (isOrgAdmin) currentRole = 'org-admin';
    else if (isGroupAdmin) currentRole = 'group-admin';
    else if (isViewer) currentRole = 'viewer';
    else if (!orgRole && !groupRole) currentRole = user.systemRole || 'member';

    let displayName = 'Member';
    if (currentRole === 'system-admin') displayName = 'System Administrator';
    else if (currentRole === 'org-admin') displayName = 'Org Admin';
    else if (currentRole === 'group-admin') displayName = 'Group Admin';
    else if (currentRole === 'viewer') displayName = 'Viewer';

    return {
      systemRole: user.systemRole || 'member',
      currentRole,
      orgRole,
      groupRole,
      isSystemAdmin,
      isOrgAdmin,
      isGroupAdmin,
      isViewer,
      displayName,
    };
  }, [user, session?.currentOrgId, session?.currentGroupId, currentOrgId, currentGroupId]);
};

export default useCurrentRole;
