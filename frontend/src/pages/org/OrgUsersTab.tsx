/**
 * OrgUsersTab - Quản lý users trong organization
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  UserPlus,
  Shield,
  User,
  Eye,
  Mail,
  MoreVertical,
  Edit,
  Ban,
  ShieldCheck,
  UserRound,
  EyeIcon,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { mockUsers, getOrgById } from '../../data';
import type { User as UserType } from '../../types';

interface OrgUsersTabProps {
  orgId: string;
}

const OrgUsersTab: React.FC<OrgUsersTabProps> = ({ orgId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const org = getOrgById(orgId);

  // Get users in this org
  const orgUsers = useMemo(() => {
    return mockUsers.filter((u) =>
      u.orgMemberships?.some((m) => m.orgId === orgId)
    );
  }, [orgId]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return orgUsers.filter((user) => {
      const matchesSearch =
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const userRole = user.orgMemberships?.find((m) => m.orgId === orgId)?.role || 'member';
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [orgUsers, searchTerm, roleFilter, statusFilter]);

  // Group by role
  const groupedUsers = useMemo(() => {
    const admins: UserType[] = [];
    const members: UserType[] = [];
    const viewers: UserType[] = [];

    filteredUsers.forEach((user) => {
      const role = user.orgMemberships?.find((m) => m.orgId === orgId)?.role;
      if (role === 'org-admin') admins.push(user);
      else if (role === 'viewer') viewers.push(user);
      else members.push(user);
    });

    return { admins, members, viewers };
  }, [filteredUsers, orgId]);

  const roleConfig = {
    'org-admin': {
      label: 'Org Admin',
      icon: <Shield size={12} />,
      color: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    member: {
      label: 'Member',
      icon: <User size={12} />,
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    viewer: {
      label: 'Viewer',
      icon: <Eye size={12} />,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    },
  };

  const UserCard: React.FC<{ user: UserType }> = ({ user }) => {
    const membership = user.orgMemberships?.find((m) => m.orgId === orgId);
    const role = membership?.role || 'member';
    const config = roleConfig[role as keyof typeof roleConfig];

    return (
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
            {(user.displayName?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {user.displayName || user.email}
              </p>
              {config.icon}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
              Joined {new Date(membership?.joinedAt || user.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bgColor} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs ${user.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {user.isActive ? <CheckCircle2 size={10} /> : <Ban size={10} />}
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
          <button className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Người dùng trong {org?.name} ({orgUsers.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Quản lý thành viên tổ chức và quyền hạn
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <UserPlus size={14} />
          Mời người dùng
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm người dùng..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">All Roles</option>
          <option value="org-admin">Quản trị tổ chức</option>
          <option value="member">Members</option>
          <option value="viewer">Người xem</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {/* Admins */}
        {groupedUsers.admins.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Shield size={14} />
              ADMINS ({groupedUsers.admins.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.admins.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Members */}
        {groupedUsers.members.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <User size={14} />
              MEMBERS ({groupedUsers.members.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.members.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Người xem */}
        {groupedUsers.viewers.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <Eye size={14} />
              VIEWERS ({groupedUsers.viewers.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.viewers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
            <User size={32} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              No users found
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Try adjusting your filters or invite new users
            </p>
          </div>
        )}
      </div>

      {/* Role Guide */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/50">
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          Role Guide
        </h4>
        <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
          <p className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-amber-600" />
            <strong>Org Admin:</strong> Toàn quyền quản lý - có thể quản lý users, groups, cài đặt tổ chức
          </p>
          <p className="flex items-center gap-2">
            <UserRound size={12} className="text-blue-600" />
            <strong>Member:</strong> Can create groups, upload meetings, participate
          </p>
          <p className="flex items-center gap-2">
            <EyeIcon size={12} className="text-gray-500" />
            <strong>Viewer:</strong> Read-only - can view meetings and summaries
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrgUsersTab;
