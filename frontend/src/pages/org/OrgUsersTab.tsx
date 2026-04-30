import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  UserPlus,
  Shield,
  User,
  Eye,
  MoreVertical,
  Ban,
  ShieldCheck,
  UserRound,
  EyeIcon,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import type { User as UserType } from '../../types';
import { useOrgStore } from '../../stores';
import api from '../../services/api';

interface OrgUsersTabProps {
  orgId: string;
}

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
} as const;

const OrgUsersTab: React.FC<OrgUsersTabProps> = ({ orgId }) => {
  const { members, currentOrg, loadMembers } = useOrgStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers(orgId);
  }, [loadMembers, orgId]);

  const orgUsers = useMemo(() => {
    return members.filter((user) => user.orgMemberships?.some((membership) => membership.orgId === orgId));
  }, [members, orgId]);

  const filteredUsers = useMemo(() => {
    return orgUsers.filter((user) => {
      const matchesSearch =
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const userRole = user.orgMemberships?.find((membership) => membership.orgId === orgId)?.role || 'member';
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;
      const isActive = user.isActive ?? true;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [orgUsers, searchTerm, roleFilter, statusFilter, orgId]);

  const groupedUsers = useMemo(() => {
    const admins: UserType[] = [];
    const membersGroup: UserType[] = [];
    const viewers: UserType[] = [];

    filteredUsers.forEach((user) => {
      const role = user.orgMemberships?.find((membership) => membership.orgId === orgId)?.role;
      if (role === 'org-admin') admins.push(user);
      else if (role === 'viewer') viewers.push(user);
      else membersGroup.push(user);
    });

    return { admins, members: membersGroup, viewers };
  }, [filteredUsers, orgId]);

  const UserCard: React.FC<{ user: UserType }> = ({ user }) => {
    const membership = user.orgMemberships?.find((item) => item.orgId === orgId);
    const role = (membership?.role || 'member') as keyof typeof roleConfig;
    const config = roleConfig[role];
    const isActive = user.isActive ?? true;

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
              Joined {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bgColor} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          <span className={`inline-flex items-center gap-1 text-xs ${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isActive ? <CheckCircle2 size={10} /> : <Ban size={10} />}
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={() => setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <MoreVertical size={14} />
          </button>
          {openMenuUserId === user.id && (
            <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.email);
                  setOpenMenuUserId(null);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Copy email
              </button>
              <button
                onClick={() => {
                  window.location.href = `mailto:${user.email}`;
                  setOpenMenuUserId(null);
                }}
                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Send email
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Người dùng trong {currentOrg?.name || 'tổ chức'} ({orgUsers.length})
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm người dùng..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
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

      <div className="space-y-4">
        {groupedUsers.admins.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Shield size={14} />
              ADMINS ({groupedUsers.admins.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.admins.map((user) => <UserCard key={user.id} user={user} />)}
            </div>
          </div>
        )}

        {groupedUsers.members.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <User size={14} />
              MEMBERS ({groupedUsers.members.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.members.map((user) => <UserCard key={user.id} user={user} />)}
            </div>
          </div>
        )}

        {groupedUsers.viewers.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <Eye size={14} />
              VIEWERS ({groupedUsers.viewers.length})
            </h4>
            <div className="space-y-2">
              {groupedUsers.viewers.map((user) => <UserCard key={user.id} user={user} />)}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
            <User size={32} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">No users found</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Try adjusting your filters or invite new users</p>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/50">
        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">Role Guide</h4>
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

      {showInviteModal && <InviteModal orgId={orgId} onClose={() => setShowInviteModal(false)} />}
    </div>
  );
};

const InviteModal: React.FC<{ orgId: string; onClose: () => void }> = ({ orgId, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'viewer' | 'org-admin'>('member');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/invitations', {
        email,
        organization_id: orgId,
        role,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lỗi khi gửi lời mời');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mời thành viên</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        {!success ? (
          <form onSubmit={handleInvite} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-600">{error}</div>}
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Email nhân viên</label>
              <input
                autoFocus
                type="email"
                placeholder="nhanvien@congty.com"
                className="h-12 w-full rounded-xl border-gray-100 bg-gray-50 px-4 text-sm focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Vai trò</label>
              <select
                className="h-12 w-full rounded-xl border-gray-100 bg-gray-50 px-4 text-sm dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'viewer' | 'org-admin')}
              >
                <option value="member">Member (Có quyền tạo họp)</option>
                <option value="viewer">Viewer (Chỉ xem)</option>
                <option value="org-admin">Admin (Quản trị Org)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi lời mời qua email'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Lời mời đã được gửi thành công!</p>
              <p className="mt-1 text-xs text-slate-500">Người nhận sẽ nhận được email với liên kết tham gia tổ chức.</p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-center gap-2 font-semibold">
                <Mail size={14} />
                {email}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-12 w-full rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OrgUsersTab;
