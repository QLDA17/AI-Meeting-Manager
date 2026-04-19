/**
 * GroupMembersTab Component
 * Quản lý thành viên trong group với roles
 */
import React, { useState } from 'react';
import { Search, Plus, Crown, User, Eye, MoreVertical, Mail, Users } from 'lucide-react';
import type { User as UserType, SystemRole } from '../../types';
import { getRoleDisplayInfo } from '../../data';

interface GroupMembersTabProps {
  groupId: string;
  members: UserType[];
  currentUserId?: string;
  onInviteMember?: (email: string) => void;
}

type RoleFilter = 'all' | 'group-admin' | 'member' | 'viewer';

const GroupMembersTab: React.FC<GroupMembersTabProps> = ({
  groupId,
  members,
  currentUserId = 'user-001',
  onInviteMember,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Group members by role
  const groupedMembers = React.useMemo(() => {
    const filtered = members.filter((member) => {
      const matchesSearch =
        member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || member.groupMemberships?.some(
        (gm) => gm.groupId === groupId && gm.role === roleFilter
      );

      return matchesSearch && matchesRole;
    });

    // Group by role
    const admins = filtered.filter((m) =>
      m.groupMemberships?.some((gm) => gm.groupId === groupId && gm.role === 'group-admin')
    );
    const regularMembers = filtered.filter((m) =>
      m.groupMemberships?.some((gm) => gm.groupId === groupId && gm.role === 'member')
    );
    const viewers = filtered.filter((m) =>
      m.groupMemberships?.some((gm) => gm.groupId === groupId && gm.role === 'viewer')
    );

    return { admins, regularMembers, viewers };
  }, [members, groupId, searchTerm, roleFilter]);

  const getMemberRole = (member: UserType): string => {
    const membership = member.groupMemberships?.find((gm) => gm.groupId === groupId);
    return membership?.role || 'member';
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail && onInviteMember) {
      onInviteMember(inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
    }
  };

  const roleIcon = (role: string) => {
    switch (role) {
      case 'group-admin':
        return <Crown size={14} className="text-amber-500" />;
      case 'member':
        return <User size={14} className="text-blue-500" />;
      case 'viewer':
        return <Eye size={14} className="text-gray-500" />;
      default:
        return null;
    }
  };

  const MemberCard: React.FC<{ member: UserType }> = ({ member }) => {
    const role = getMemberRole(member);
    const isCurrentUser = member.id === currentUserId;
    const roleInfo = getRoleDisplayInfo(role as SystemRole);

    return (
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
            {(member.displayName?.[0] || member.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {member.displayName || member.email}
                {isCurrentUser && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    You
                  </span>
                )}
              </p>
              {roleIcon(role)}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">{member.email}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
              Joined {new Date(member.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: roleInfo.color + '20',
              color: roleInfo.color,
            }}
          >
            {roleInfo.displayName}
          </span>

          {!isCurrentUser && (
            <button className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
              <MoreVertical size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          Thành viên ({members.length})
        </h3>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Plus size={14} />
          Invite Thành viên
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm thành viên..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="group-admin">Admins Only</option>
          <option value="member">Thành viên Only</option>
          <option value="viewer">Viewers Only</option>
        </select>
      </div>

      {/* Thành viên List */}
      <div className="space-y-4">
        {/* Admins */}
        {groupedMembers.admins.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Crown size={14} />
              ADMINS ({groupedMembers.admins.length})
            </h4>
            <div className="space-y-2">
              {groupedMembers.admins.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}

        {/* Thành viên */}
        {groupedMembers.regularMembers.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <User size={14} />
              MEMBERS ({groupedMembers.regularMembers.length})
            </h4>
            <div className="space-y-2">
              {groupedMembers.regularMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}

        {/* Viewers */}
        {groupedMembers.viewers.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <Eye size={14} />
              VIEWERS ({groupedMembers.viewers.length})
            </h4>
            <div className="space-y-2">
              {groupedMembers.viewers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {members.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
            <Users size={32} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              No members yet
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Invite members to start collaborating
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Mail size={14} />
              Invite Thành viên
            </button>
          </div>
        )}
      </div>

      {/* Hướng dẫn vai trò */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/50">
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Hướng dẫn vai trò
        </h4>
        <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
          <p>
            <strong className="flex items-center gap-1"><Crown size={10} /> Owner/Admin:</strong> Toàn quyền quản lý - can invite, remove, assign
            roles
          </p>
          <p>
            <strong className="flex items-center gap-1"><User size={10} /> Member:</strong> Có thể tải cuộc họp, participate, discuss
          </p>
          <p>
            <strong className="flex items-center gap-1"><Eye size={10} /> Viewer:</strong> Chỉ xem - can see summaries but not edit or upload
          </p>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">
              Invite Thành viên
            </h3>
            <form onSubmit={handleInvite}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                required
                className="mb-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMembersTab;
