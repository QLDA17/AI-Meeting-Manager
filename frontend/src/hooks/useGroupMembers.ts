import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface GroupMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  role: string;
}

export function useGroupMembers(groupId: string, currentUserId?: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      setSelectedIds([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get(`/api/groups/${groupId}/members`)
      .then((res) => {
        if (cancelled) return;
        const mapped = (res.data || [])
          .map((m: any) => ({
            id: m.id || m.user_id || m.userId,
            user_id: m.id || m.user_id || m.userId,
            name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || m.email,
            email: m.email,
            avatar_url: m.avatar_url,
            role: m.role,
          }))
          .filter((m: GroupMember) => m.user_id !== currentUserId);
        setMembers(mapped);
        setSelectedIds(mapped.map((m: GroupMember) => m.user_id));
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          setSelectedIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, currentUserId]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.user_id),
    );
  }, [members]);

  const toggleMember = useCallback((userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  return { members, loading, selectedIds, setSelectedIds, toggleSelectAll, toggleMember };
}
