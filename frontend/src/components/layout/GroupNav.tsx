/**
 * GroupNav Component
 * Hiển thị danh sách groups trong organization hiện tại
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Lock,
  Globe,
  Building2,
  Plus,
  Crown,
} from 'lucide-react';
import { useOrgStore } from '../../stores';
import { usePermission } from '../../hooks';
import type { Group, PrivacyLevel } from '../../types';

interface GroupNavProps {
  onGroupSelect?: (groupId: string) => void;
}

const GroupNav: React.FC<GroupNavProps> = ({ onGroupSelect }) => {
  const location = useLocation();
  const { groups } = useOrgStore();
  const { hasPermission } = usePermission();

  const canCreateGroup = hasPermission('create_group');

  const privacyIcon = (level: PrivacyLevel) => {
    switch (level) {
      case 'private':
        return <Lock size={12} className="text-gray-400" />;
      case 'internal':
        return <Building2 size={12} className="text-blue-400" />;
      case 'public':
        return <Globe size={12} className="text-green-400" />;
    }
  };

  const isActive = (groupId: string) => {
    return location.pathname.includes(`/groups/${groupId}`);
  };

  if (groups.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Chưa có groups nào
        </p>
        {canCreateGroup && (
          <Link
            to="/groups/create"
            className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20"
          >
            <Plus size={12} />
            Tạo group đầu tiên
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {groups.map((group: Group) => {
        const active = isActive(group.id);
        const isAdmin = group.admins?.some((admin) => admin.id === 'user-001'); // Mock current user

        return (
          <Link
            key={group.id}
            to={`/groups/${group.id}`}
            onClick={() => onGroupSelect?.(group.id)}
            className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800">
              {privacyIcon(group.privacyLevel)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate font-medium">{group.name}</span>
                {isAdmin && (
                  <Crown
                    size={10}
                    className="flex-shrink-0 text-amber-500"
                    aria-label="Group Admin"
                  />
                )}
              </div>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                {group.memberCount} members • {group.meetingCount} meetings
              </p>
            </div>
          </Link>
        );
      })}

      {canCreateGroup && (
        <Link
          to="/groups/create"
          className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:text-primary-300"
        >
          <Plus size={14} />
          <span>New Group</span>
        </Link>
      )}
    </div>
  );
};

export default GroupNav;
