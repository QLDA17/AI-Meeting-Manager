import React, { useMemo, useState } from 'react';
import { 
  Building2, 
  Check, 
  ShieldCheck, 
  Users, 
  X, 
  Search, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Crown,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../../services/api';
import type { Group, GroupJoinPolicy, GroupVisibility } from '../../types';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';
import { useOrgStore } from '../../stores';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  description: string;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  groupAdminUserIds: string[];
  initialMemberUserIds: string[];
}

const visibilityOptions: Array<{
  value: GroupVisibility;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  {
    value: 'hidden',
    label: 'Ẩn khỏi tổ chức',
    description: 'Chỉ những người được thêm vào nhóm mới nhìn thấy nhóm này.',
    icon: EyeOff,
  },
  {
    value: 'organization',
    label: 'Hiển thị trong tổ chức',
    description: 'Mọi thành viên trong tổ chức có thể nhìn thấy nhóm theo chính sách tham gia bên dưới.',
    icon: Eye,
  },
];

const joinPolicyOptions: Array<{
  value: GroupJoinPolicy;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  {
    value: 'invite_only',
    label: 'Chỉ theo lời mời',
    description: 'Người dùng chỉ vào được nhóm khi được thêm trực tiếp.',
    icon: X,
  },
  {
    value: 'request_approval',
    label: 'Yêu cầu phê duyệt',
    description: 'Người dùng trong tổ chức có thể gửi yêu cầu tham gia nhóm.',
    icon: ShieldCheck,
  },
  {
    value: 'open_join',
    label: 'Tự tham gia',
    description: 'Người dùng trong tổ chức có thể tham gia nhóm ngay lập tức.',
    icon: UserCheck,
  },
];

// Helper to get initials from display name or email
const getInitials = (name?: string, email?: string) => {
  const target = name || email || 'M';
  const parts = target.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return target.substring(0, Math.min(2, target.length)).toUpperCase();
};

// Helper for dynamic gradient avatars
const getAvatarGradient = (id: string) => {
  const gradients = [
    'from-emerald-400 to-teal-600 dark:from-emerald-500 dark:to-teal-700',
    'from-blue-400 to-indigo-600 dark:from-blue-500 dark:to-indigo-700',
    'from-purple-400 to-pink-600 dark:from-purple-500 dark:to-pink-700',
    'from-amber-400 to-orange-600 dark:from-amber-500 dark:to-orange-700',
    'from-rose-400 to-red-600 dark:from-rose-500 dark:to-red-700',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg, loadGroups, members = [] } = useOrgStore();
  const { hasPermission, isOrgAdmin, isSystemAdmin } = usePermission();
  const [formData, setFormData] = useState<FormState>({
    name: '',
    description: '',
    visibility: 'organization',
    joinPolicy: 'invite_only',
    groupAdminUserIds: [],
    initialMemberUserIds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Group | null>(null);

  // Search state for members list
  const [searchQuery, setSearchQuery] = useState('');

  const canCreateGroup = hasPermission('create_group') || isOrgAdmin || isSystemAdmin;
  const creatorId = user?.id;

  // Available members are all organization members except the creator
  const availableMembers = useMemo(
    () => members.filter((member) => member.id !== creatorId),
    [creatorId, members],
  );

  // Filtered members based on search input
  const filteredMembers = useMemo(() => {
    return availableMembers.filter((m) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      const name = (m.displayName || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [availableMembers, searchQuery]);

  const handleRoleChange = (userId: string, type: 'member' | 'admin', checked: boolean) => {
    setFormData((prev) => {
      let nextAdmins = [...prev.groupAdminUserIds];
      let nextMembers = [...prev.initialMemberUserIds];

      if (type === 'member') {
        if (checked) {
          // Add to members
          if (!nextMembers.includes(userId)) {
            nextMembers.push(userId);
          }
        } else {
          // Remove from both members and admins
          nextMembers = nextMembers.filter((id) => id !== userId);
          nextAdmins = nextAdmins.filter((id) => id !== userId);
        }
      } else if (type === 'admin') {
        if (checked) {
          // Add to admins, and make sure they are in members too
          if (!nextAdmins.includes(userId)) {
            nextAdmins.push(userId);
          }
          if (!nextMembers.includes(userId)) {
            nextMembers.push(userId);
          }
        } else {
          // Remove from admins only
          nextAdmins = nextAdmins.filter((id) => id !== userId);
        }
      }

      return {
        ...prev,
        groupAdminUserIds: nextAdmins,
        initialMemberUserIds: nextMembers,
      };
    });
  };

  const handleVisibilityChange = (value: GroupVisibility) => {
    setFormData((prev) => ({
      ...prev,
      visibility: value,
      joinPolicy: value === 'hidden' ? 'invite_only' : prev.joinPolicy,
    }));
  };

  const resetState = () => {
    setFormData({
      name: '',
      description: '',
      visibility: 'organization',
      joinPolicy: 'invite_only',
      groupAdminUserIds: [],
      initialMemberUserIds: [],
    });
    setSearchQuery('');
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreateGroup) {
      setError('Bạn cần quyền quản trị tổ chức để tạo nhóm.');
      return;
    }
    if (!currentOrg?.id) {
      setError('Vui lòng chọn tổ chức trước khi tạo nhóm.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.post('/api/groups', {
        name: formData.name,
        description: formData.description,
        organization_id: currentOrg.id,
        visibility: formData.visibility,
        join_policy: formData.joinPolicy,
        group_admin_user_ids: formData.groupAdminUserIds,
        initial_member_user_ids: formData.initialMemberUserIds,
      });

      const createdGroup = response.data as Group;
      await Promise.resolve(loadGroups(currentOrg.id));
      setSuccess(createdGroup);
      window.setTimeout(() => {
        handleClose();
        navigate(`/groups/${createdGroup.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể tạo nhóm lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = error || (!canCreateGroup ? 'Bạn cần quyền quản trị tổ chức để tạo nhóm.' : null);

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md transition-all duration-300">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-emerald-500/30 dark:bg-slate-900/95">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 shadow-emerald-500/25 shadow-lg">
              <Check size={36} className="text-white animate-bounce" />
            </div>
            <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Tạo nhóm thành công!
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nhóm <span className="font-semibold text-emerald-600 dark:text-emerald-400">"{success.name}"</span> đã sẵn sàng làm việc.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <span>Đang chuyển hướng</span>
              <span className="flex gap-0.5">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce [animation-delay:0.2s]">.</span>
                <span className="animate-bounce [animation-delay:0.4s]">.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm transition-all duration-200">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white/95 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:h-[85vh]">
        {/* Decorative Gradients */}
        <div className="absolute -left-20 -top-20 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/5" />
        <div className="absolute -bottom-20 -right-20 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-500/5" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Tạo nhóm mới</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thiết lập quyền truy cập, vai trò và thành viên tham gia ngay từ đầu.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeError && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-3.5 text-sm text-red-700 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">!</span>
                <span className="font-semibold">{activeError}</span>
              </div>
            )}

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column: General Configuration */}
              <div className="space-y-5">
                {/* Section: Basic Info */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-5 dark:border-slate-800/80 dark:bg-slate-950/10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Thông tin nhóm
                  </h3>
                  <div className="mt-3.5 space-y-3.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tổ chức</span>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                        <Building2 size={15} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {currentOrg?.name || 'NHÓM LÝ'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Tên nhóm
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value.slice(0, 50) }))}
                          required
                          disabled={!canCreateGroup}
                          placeholder="Ví dụ: Product Leadership"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-emerald-500"
                        />
                        <span className="absolute right-3 top-3 text-[9px] font-bold text-slate-300 dark:text-slate-700">
                          {formData.name.length}/50
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Mô tả
                      </label>
                      <div className="relative mt-1">
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value.slice(0, 200) }))}
                          rows={3}
                          disabled={!canCreateGroup}
                          placeholder="Nêu rõ phạm vi cộng tác, phòng ban hoặc chương trình làm việc của nhóm."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-emerald-500"
                        />
                        <span className="absolute bottom-3 right-3 text-[9px] font-bold text-slate-300 dark:text-slate-700">
                          {formData.description.length}/200
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Access Settings */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/30 p-5 dark:border-slate-800/80 dark:bg-slate-950/10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Cài đặt truy cập
                  </h3>
                  
                  <div className="mt-3.5 space-y-3.5">
                    {/* Visibility */}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Phạm vi hiển thị</span>
                      <div className="mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {visibilityOptions.map((option) => {
                          const IconComp = option.icon;
                          const isSelected = formData.visibility === option.value;
                          return (
                            <label
                              key={option.value}
                              className={`relative flex cursor-pointer flex-col rounded-xl border p-3.5 transition-all duration-150 hover:shadow-sm ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50/30 dark:border-emerald-500 dark:bg-emerald-950/10'
                                  : 'border-slate-200/70 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="visibility"
                                value={option.value}
                                checked={isSelected}
                                onChange={() => handleVisibilityChange(option.value)}
                                className="sr-only"
                              />
                              <div className="flex items-center gap-2">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 dark:bg-slate-900'
                                }`}>
                                  <IconComp size={14} className="shrink-0" />
                                </div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{option.label}</span>
                              </div>
                              <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                                {option.description}
                              </p>
                              {isSelected && (
                                <div className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                                  <Check size={8} strokeWidth={3} />
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Join Policy */}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Cách tham gia</span>
                      <div className="mt-1.5 space-y-2">
                        {joinPolicyOptions.map((option) => {
                          const IconComp = option.icon;
                          const disabled = formData.visibility === 'hidden' && option.value !== 'invite_only';
                          const isSelected = formData.joinPolicy === option.value && !disabled;
                          return (
                            <label
                              key={option.value}
                              className={`relative flex items-center justify-between border p-3 transition-all duration-150 rounded-xl ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50/20 dark:border-emerald-500 dark:bg-emerald-950/10'
                                  : 'border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-950/50'
                              } ${
                                disabled 
                                  ? 'cursor-not-allowed opacity-40 bg-slate-50 dark:bg-slate-900' 
                                  : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name="joinPolicy"
                                value={option.value}
                                checked={formData.joinPolicy === option.value}
                                disabled={disabled}
                                onChange={() => setFormData((prev) => ({ ...prev, joinPolicy: option.value }))}
                                className="sr-only"
                              />
                              <div className="flex items-center gap-2.5">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 dark:bg-slate-900'
                                }`}>
                                  <IconComp size={14} className="shrink-0" />
                                </div>
                                <div className="text-left">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{option.label}</span>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{option.description}</p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check size={10} strokeWidth={3} />
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Roles & Members Configuration (Merged / Single List) */}
              <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/30 p-5 dark:border-slate-800/80 dark:bg-slate-950/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Thành viên & Vai trò
                  </h3>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                    {formData.initialMemberUserIds.length + 1} thành viên chọn tham gia
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-normal text-slate-400 dark:text-slate-500">
                  Phân quyền trực tiếp cho từng thành viên. Quản trị viên của nhóm sẽ tự động được thêm vào nhóm.
                </p>

                {/* Primary Admin (Creator) Card - Static & Premium */}
                <div className="mt-3.5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/35 p-3 dark:border-amber-900/20 dark:bg-amber-950/10">
                  <div className="flex items-center gap-2.5">
                    {/* Avatar for Nguyễn Huyền */}
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-amber-200 shadow-sm dark:border-amber-800">
                      {user?.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt="Nguyễn Huyền" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-amber-400 to-orange-500 font-extrabold text-white text-xs">
                          {getInitials(user?.displayName || 'Nguyễn Huyền', user?.email)}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {user?.displayName || 'Nguyễn Huyền'}
                        </span>
                        <span className="flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <Crown size={7} strokeWidth={2.5} />
                          Quản trị chính
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email || 'Huyen230305@gmail.com'}</p>
                    </div>
                  </div>
                  {/* Fixed Active State Label */}
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 shrink-0">
                    <Check size={12} strokeWidth={3} />
                    <span>Toàn quyền</span>
                  </div>
                </div>

                {/* Single Search Bar */}
                <div className="relative mt-3">
                  <input
                    type="text"
                    placeholder="Tìm thành viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-white py-2 pl-8 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 shrink-0" />
                  {searchQuery && (
                    <button 
                      type="button" 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Merged Interactive Members List */}
                <div className="mt-3.5 max-h-[35vh] overflow-y-auto space-y-2 pr-1 flex-1">
                  {filteredMembers.map((member) => {
                    const isAdded = formData.initialMemberUserIds.includes(member.id);
                    const isAdmin = formData.groupAdminUserIds.includes(member.id);
                    
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition duration-150 ${
                          isAdded
                            ? 'border-emerald-400/80 bg-emerald-50/5 dark:border-emerald-500/40 dark:bg-emerald-950/10'
                            : 'border-slate-200/60 bg-white hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                            {member.avatarUrl ? (
                              <img 
                                src={member.avatarUrl} 
                                alt={member.displayName || member.email} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-tr font-black text-white text-xs ${getAvatarGradient(member.id)}`}>
                                {getInitials(member.displayName, member.email)}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-left min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-none">
                                {member.displayName || member.email}
                              </p>
                              {isAdmin && (
                                <span className="rounded bg-amber-100 px-1 py-0.2 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  Quản trị viên
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{member.email}</p>
                          </div>
                        </div>

                        {/* Interactive Role Switcher Action Controls */}
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {/* Control 1: Tham Gia */}
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAdded}
                              onChange={(e) => handleRoleChange(member.id, 'member', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-800 shrink-0"
                            />
                            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">Tham gia</span>
                          </label>

                          {/* Control 2: Làm Quản Trị */}
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAdmin}
                              data-testid={`admin-checkbox-${member.id}`}
                              onChange={(e) => handleRoleChange(member.id, 'admin', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 dark:border-slate-800 shrink-0"
                            />
                            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">Quản trị</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}

                  {filteredMembers.length === 0 && (
                    <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      {availableMembers.length === 0 
                        ? 'Tổ chức chưa có thành viên nào khác.' 
                        : 'Không tìm thấy thành viên phù hợp.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            {/* Stat counts */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Users size={14} className="text-slate-400 shrink-0" />
              <span>
                {formData.groupAdminUserIds.length} quản trị nhóm bổ sung · {formData.initialMemberUserIds.length} thành viên ban đầu
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name || !canCreateGroup}
                className="relative overflow-hidden rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 transition-all duration-150 hover:from-emerald-600 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang tạo...
                  </span>
                ) : (
                  'Tạo nhóm'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
