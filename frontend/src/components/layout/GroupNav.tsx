/**
 * GroupNav Component
 * Hiển thị danh sách groups trong organization hiện tại
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  EyeOff,
  Plus,
  Crown,
} from 'lucide-react';
import { useOrgStore } from '../../stores';
import { usePermission } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import type { Group } from '../../types';

interface GroupNavProps {
  onGroupSelect?: (groupId: string) => void;
  onCreateGroup?: () => void;
}

const GroupNav: React.FC<GroupNavProps> = ({ onGroupSelect, onCreateGroup }) => {
  const location = useLocation();
  const { groups } = useOrgStore();
  const { hasPermission, isOrgAdmin } = usePermission();
  const { user } = useAuth();
  const [unreadGroupIds, setUnreadGroupIds] = React.useState<Set<string>>(new Set());

  const canCreateGroup = hasPermission('create_group');
  const chatReadKey = React.useMemo(
    () => `group_chat_last_read_by_user_${user?.id || 'anonymous'}`,
    [user?.id],
  );

  const accessIcon = (group: Group) =>
    group.visibility === 'hidden'
      ? <EyeOff size={12} className="text-gray-400" />
      : <Building2 size={12} className="text-blue-400" />;

  const isActive = (groupId: string) => {
    return location.pathname.includes(`/groups/${groupId}`);
  };

  React.useEffect(() => {
    let cancelled = false;

    const refreshUnread = async () => {
      if (!groups.length || !user?.id) {
        if (!cancelled) setUnreadGroupIds(new Set());
        return;
      }

      const raw = localStorage.getItem(chatReadKey);
      const lastReadMap: Record<string, string> = raw ? JSON.parse(raw) : {};
      const results = await Promise.all(
        groups.map(async (group) => {
          try {
            const res = await api.get(`/api/groups/${group.id}/messages/latest`);
            return { groupId: group.id, latest: res.data };
          } catch {
            return { groupId: group.id, latest: null };
          }
        }),
      );

      const unreadIds = new Set<string>();
      for (const item of results) {
        const latestAt = item.latest?.created_at || item.latest?.createdAt;
        const latestUserId = item.latest?.user_id || item.latest?.userId;
        if (!latestAt || !latestUserId) continue;
        if (latestUserId === user.id) continue;
        const seenAt = lastReadMap[item.groupId];
        if (!seenAt || new Date(latestAt).getTime() > new Date(seenAt).getTime()) {
          unreadIds.add(item.groupId);
        }
      }
      if (!cancelled) setUnreadGroupIds(unreadIds);
    };

    refreshUnread();
    const timer = window.setInterval(refreshUnread, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [chatReadKey, groups, user?.id]);

  if (groups.length === 0) {
    return (
      <div className="px-3 py-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Chưa có nhóm nào
        </p>
        {canCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20"
          >
            <Plus size={12} />
            Tạo nhóm đầu tiên
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 px-2">
      {groups.map((group: Group) => {
        const active = isActive(group.id);
        const isAdmin =
          isOrgAdmin ||
          user?.groupMemberships?.some(
            (membership) => membership.groupId === group.id && membership.role === 'group-admin'
          ) ||
          false;

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
              {accessIcon(group)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate font-medium">{group.name}</span>
                {unreadGroupIds.has(group.id) && (
                  <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Unread messages" />
                )}
                {isAdmin && (
                  <Crown
                    size={10}
                    className="flex-shrink-0 text-amber-500"
                    aria-label="Quản trị nhóm"
                  />
                )}
              </div>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                {group.memberCount} thành viên • {group.meetingCount} cuộc họp
              </p>
            </div>
          </Link>
        );
      })}

      {canCreateGroup && (
        <button
          onClick={onCreateGroup}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:text-primary-300"
        >
          <Plus size={14} />
          <span>Tạo nhóm</span>
        </button>
      )}
    </div>
  );
};

export default GroupNav;
