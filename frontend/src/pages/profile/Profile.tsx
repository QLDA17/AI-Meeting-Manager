import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  Camera,
  Check,
  Edit,
  Eye,
  EyeOff,
  Globe,
  LogOut,
  Mail,
  Shield,
  Upload,
  User,
  Users,
  X,
  PlusCircle,
  Inbox,
  Layers,
  Video,
  KeyRound,
  CheckCircle2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useOrgStore } from '../../stores';
import api from '../../services/api';

type ProfileTab = 'profile' | 'organizations' | 'security';

interface PendingInvitation {
  id: string;
  email: string;
  organization_id: string;
  organization_name?: string;
  role: string;
  expires_at: string;
}

const roleLabelMap: Record<string, string> = {
  'system-admin': 'Quản trị hệ thống',
  'org-admin': 'Quản trị tổ chức',
  'group-admin': 'Quản trị nhóm',
  member: 'Thành viên',
};

const initialsFor = (value?: string) =>
  (value || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const extractInviteToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('token=')) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token') || '';
  } catch {
    const params = new URLSearchParams(trimmed.split('?')[1] || trimmed);
    return params.get('token') || '';
  }
};

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { orgs, currentOrgId, setCurrentOrg, createOrg, loadOrgDetails } = useOrgStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [avatarMsg, setAvatarMsg] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
  const [language, setLanguage] = useState(user?.language || 'vi');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Ho_Chi_Minh');

  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [organizationMsg, setOrganizationMsg] = useState('');
  const [organizationError, setOrganizationError] = useState('');
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [isJoiningByEmail, setIsJoiningByEmail] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const tabs: Array<{ key: ProfileTab; label: string; icon: React.ReactNode }> = [
    { key: 'profile', label: 'Hồ sơ', icon: <User size={15} /> },
    { key: 'organizations', label: 'Tổ chức', icon: <Building2 size={15} /> },
    { key: 'security', label: 'Bảo mật', icon: <Shield size={15} /> },
  ];

  const userOrgs = useMemo(() => {
    if (!user?.orgMemberships) return [];
    return user.orgMemberships.map((membership) => {
      const matchedOrg = orgs.find((org) => org.id === membership.orgId);
      return {
        id: membership.orgId,
        name: matchedOrg?.name || membership.orgName || 'Tổ chức của bạn',
        description: matchedOrg?.description || 'Chưa có mô tả.',
        memberCount: matchedOrg?.memberCount ?? 0,
        groupCount: matchedOrg?.groupCount ?? 0,
        meetingCount: matchedOrg?.meetingCount ?? 0,
        role: membership.role,
        approvalStatus: membership.approvalStatus ?? 'active',
      };
    });
  }, [orgs, user?.orgMemberships]);

  const displayName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
    [firstName, lastName],
  );

  const clearAvatarPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setAvatarPreview(null);
  }, []);

  const resetProfileDraft = useCallback(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setBio(user?.bio || '');
    setPhone(user?.phone || '');
    setGender(user?.gender || '');
    setDateOfBirth(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '');
    setLanguage(user?.language || 'vi');
    setTimezone(user?.timezone || 'Asia/Ho_Chi_Minh');
  }, [user?.bio, user?.dateOfBirth, user?.firstName, user?.gender, user?.language, user?.lastName, user?.phone, user?.timezone]);

  const loadPendingInvitations = useCallback(async () => {
    try {
      const response = await api.get('/api/invitations/pending');
      setPendingInvitations(Array.isArray(response.data) ? response.data : []);
    } catch {
      setPendingInvitations([]);
    }
  }, []);

  useEffect(() => {
    resetProfileDraft();
  }, [resetProfileDraft]);

  // Load pending invitations and load details for all organizations to fetch current statistics (TDD GREEN)
  useEffect(() => {
    if (activeTab === 'organizations') {
      loadPendingInvitations();
      if (user?.orgMemberships) {
        user.orgMemberships.forEach((membership) => {
          loadOrgDetails(membership.orgId);
        });
      }
    }
  }, [activeTab, loadPendingInvitations, user?.orgMemberships, loadOrgDetails]);

  useEffect(() => {
    if (!avatarUploading && user?.avatarUrl) {
      clearAvatarPreview();
    }
  }, [avatarUploading, clearAvatarPreview, user?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      await api.patch('/api/profile', {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        language,
        timezone,
      });
      await refreshUser();
      setSaveMsg('Đã lưu hồ sơ thành công.');
      setIsEditing(false);
      window.setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.detail || 'Không thể lưu hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearAvatarPreview();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setAvatarUploading(true);
    setAvatarMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/api/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      setAvatarMsg('Đã cập nhật ảnh đại diện.');
      clearAvatarPreview();
    } catch (err: any) {
      setAvatarMsg(err?.response?.data?.detail || 'Không tải được ảnh đại diện.');
      clearAvatarPreview();
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
      window.setTimeout(() => setAvatarMsg(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Mật khẩu mới không khớp.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg('Mật khẩu mới phải ít nhất 8 ký tự.');
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg('');
    try {
      await api.post('/api/profile/change-password', {
        current_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordMsg('Đổi mật khẩu thành công.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMsg('');
      }, 1500);
    } catch (err: any) {
      setPasswordMsg(err?.response?.data?.detail || 'Đổi mật khẩu thất bại.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleJoinOrganization = () => {
    const token = extractInviteToken(inviteCode);
    if (!token) {
      setJoinError('Vui lòng nhập mã mời hợp lệ.');
      return;
    }

    setJoinError('');
    navigate(`/invite?token=${encodeURIComponent(token)}`);
  };

  const handleJoinByEmailInvitation = async (invitation: PendingInvitation) => {
    setOrganizationError('');
    setOrganizationMsg('');
    setIsJoiningByEmail(invitation.id);

    try {
      await api.post(`/api/invitations/${invitation.id}/accept`);
      await refreshUser();
      setCurrentOrg(invitation.organization_id);
      setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setOrganizationMsg(`Đã tham gia tổ chức ${invitation.organization_name || ''} thành công.`);
    } catch (err: any) {
      setOrganizationError(
        err?.response?.data?.detail || 'Không thể tham gia tổ chức từ lời mời email.',
      );
    } finally {
      setIsJoiningByEmail(null);
    }
  };

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orgName.trim()) {
      setOrganizationError('Vui lòng nhập tên tổ chức.');
      return;
    }

    setOrganizationLoading(true);
    setOrganizationError('');
    setOrganizationMsg('');
    try {
      await createOrg(orgName.trim(), orgDescription.trim() || undefined);
      await refreshUser();
      setOrgName('');
      setOrgDescription('');
      setOrganizationMsg('Đã gửi yêu cầu tạo tổ chức. System admin sẽ duyệt trước khi kích hoạt.');
    } catch (err: any) {
      setOrganizationError(err?.response?.data?.detail || 'Không tạo được tổ chức.');
    } finally {
      setOrganizationLoading(false);
    }
  };

  const displayAvatar = avatarPreview || user?.avatarUrl;

  return (
    <div className="space-y-5">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="bg-gradient-to-r from-primary-50 via-white to-blue-50 px-6 py-6 dark:from-primary-950/20 dark:via-slate-900 dark:to-blue-950/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              
              {/* Perfect Circular Avatar Wrapper with zero distortion */}
              <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg dark:border-slate-800 sm:mx-0">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={user?.displayName || user?.email || 'Avatar'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-primary-400 to-teal-500 text-3xl font-black text-white">
                    {initialsFor(user?.displayName || user?.email)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAvatarPick}
                  className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/80 text-white shadow-md transition hover:bg-emerald-600"
                  title="Đổi ảnh đại diện"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarSelected}
                  className="hidden"
                />
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-slate-100">
                    {user?.displayName || user?.email}
                  </h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider sm:justify-start">
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    {roleLabelMap[user?.systemRole || 'member'] || 'Thành viên'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Tham gia từ {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                  </span>
                </div>
                <p className="max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {user?.bio || 'Cập nhật hồ sơ để đồng nghiệp và quản trị viên nhìn thấy đúng thông tin công việc của bạn.'}
                </p>
                {avatarMsg && (
                  <p className={`text-[10px] font-bold ${avatarMsg.includes('Đã') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {avatarUploading ? 'Đang tải ảnh đại diện...' : avatarMsg}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={handleAvatarPick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Upload size={14} className="shrink-0" />
                {avatarUploading ? 'Đang tải ảnh...' : 'Đổi ảnh'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing((current) => !current)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-primary-700"
              >
                <Edit size={14} className="shrink-0" />
                {isEditing ? 'Đang chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap border-b border-gray-100 px-2 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-300 dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 animate-fade-in-up">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-slate-100">Thông tin hồ sơ</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Cập nhật đầy đủ dữ liệu cá nhân đã dùng khi đăng ký và các tuỳ chọn hồ sơ cơ bản.</p>
                </div>
                <div className="flex items-center gap-2">
                  {saveMsg && (
                    <span className={`text-xs font-bold ${saveMsg.includes('thành công') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {saveMsg}
                    </span>
                  )}
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          resetProfileDraft();
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        <X size={12} className="shrink-0" />
                        Hủy
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        <Check size={12} className="shrink-0" />
                        {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Họ
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Nhập họ"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tên
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Nhập tên"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    value={displayName || user?.displayName || ''}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">Tên hiển thị được ghép tự động từ họ và tên.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Nhập số điện thoại"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Giới tính
                  </label>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as '' | 'male' | 'female' | 'other')}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Giới thiệu ngắn</label>
                  <textarea
                    rows={3}
                    maxLength={220}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    disabled={!isEditing}
                    placeholder="Ví dụ: Phụ trách vận hành, tối ưu quy trình họp và theo dõi action items xuyên nhóm."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">{bio.length}/220</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Ngôn ngữ
                  </label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Múi giờ
                  </label>
                  <select
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:disabled:bg-slate-900"
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-slate-100">Tổ chức của tôi ({userOrgs.length})</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Danh sách các tổ chức bạn đang làm việc và luồng tùy chỉnh nhanh chóng.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/organization-setup')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  <ArrowRight size={14} className="shrink-0" />
                  Mở luồng thiết lập đầy đủ
                </button>
              </div>

              {userOrgs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
                  <Building2 size={28} className="mx-auto mb-2.5 text-slate-400" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Bạn chưa tham gia tổ chức nào.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrgs.map((org) => {
                    const isActive = org.id === currentOrgId;
                    return (
                      <div 
                        key={org.id} 
                        className={`rounded-xl border p-5 transition-all duration-150 ${
                          isActive 
                            ? 'border-emerald-500/60 bg-emerald-50/5 dark:border-emerald-500/40 dark:bg-emerald-950/10 shadow-[0_4px_16px_rgba(22,163,74,0.04)]' 
                            : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* 1. Header Row: Beautiful alignment for Title and Button */}
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              isActive ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <Building2 size={16} className="shrink-0" />
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{org.name}</h4>
                                {isActive && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-sm">
                                    <CheckCircle2 size={8} strokeWidth={3} />
                                    Đang làm việc
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isActive ? (
                              <button
                                disabled
                                className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-3 py-1 text-[10px] font-extrabold cursor-default dark:text-emerald-400 dark:bg-emerald-950/30"
                              >
                                Đang hoạt động
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCurrentOrg(org.id);
                                  navigate('/dashboard');
                                }}
                                className="rounded-lg bg-primary-600 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-primary-700 shadow-sm"
                              >
                                Chuyển sang
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. Body Row: Org Description */}
                        <div className="py-3 text-left">
                          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                            {org.description || 'Chưa có mô tả ngắn về tổ chức này.'}
                          </p>
                        </div>

                        {/* 3. Footer Row: Statistical Badges nicely separated */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold pt-3 border-t border-slate-100/50 dark:border-slate-800/30">
                          <span className="rounded bg-slate-50 px-2 py-0.5 text-slate-600 border border-slate-100 dark:bg-slate-950 dark:border-slate-800/80 dark:text-slate-400 flex items-center gap-1 shrink-0">
                            <Shield size={10} className="shrink-0 text-amber-500" />
                            {roleLabelMap[org.role] || org.role}
                          </span>
                          <span className="rounded bg-blue-50/50 px-2 py-0.5 text-blue-700 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300 flex items-center gap-1 shrink-0">
                            <Users size={10} className="shrink-0" />
                            {org.memberCount} thành viên
                          </span>
                          <span className="rounded bg-purple-50/50 px-2 py-0.5 text-purple-700 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30 dark:text-purple-300 flex items-center gap-1 shrink-0">
                            <Layers size={10} className="shrink-0" />
                            {org.groupCount} nhóm
                          </span>
                          <span className="rounded bg-pink-50/50 px-2 py-0.5 text-pink-700 border border-pink-100 dark:bg-pink-950/20 dark:text-pink-300 flex items-center gap-1 shrink-0">
                            <Video size={10} className="shrink-0" />
                            {org.meetingCount} cuộc họp
                          </span>
                          {org.approvalStatus === 'pending' && (
                            <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/30 shrink-0">Đang chờ duyệt</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Interaction grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Block: Join by token */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/20 p-5 dark:border-slate-800 dark:bg-slate-950/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <KeyRound size={18} className="shrink-0" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Tham gia bằng mã mời</h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Dán token hoặc đường dẫn mời của tổ chức.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder="Nhập token hoặc link mời"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    {joinError && <p className="text-xs font-semibold text-red-600">{joinError}</p>}
                    <button
                      type="button"
                      onClick={handleJoinOrganization}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 text-xs font-bold text-white transition hover:from-blue-600 hover:to-indigo-700 shadow-md shadow-blue-500/10"
                    >
                      Xem lời mời
                      <ArrowRight size={14} className="shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Block: Create Org Request */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/20 p-5 dark:border-slate-800 dark:bg-slate-950/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <PlusCircle size={18} className="shrink-0" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Tạo tổ chức mới</h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Gửi yêu cầu tạo tổ chức như lúc onboarding ban đầu.</p>
                    </div>
                  </div>
                  <form className="space-y-3" onSubmit={handleCreateOrganization}>
                    <input
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                      placeholder="Tên tổ chức"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <textarea
                      value={orgDescription}
                      onChange={(event) => setOrgDescription(event.target.value)}
                      placeholder="Mô tả ngắn để system admin duyệt"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={organizationLoading}
                      className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 text-xs font-bold text-white transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 shadow-md shadow-emerald-500/10"
                    >
                      {organizationLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu tạo tổ chức'}
                    </button>
                  </form>
                </div>
              </div>

              {(organizationMsg || organizationError) && (
                <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${
                  organizationMsg
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/35 dark:bg-emerald-950/20 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50/50 text-red-700 dark:border-red-950/35 dark:bg-red-950/20 dark:text-red-300'
                }`}>
                  {organizationMsg || organizationError}
                </div>
              )}

              {/* Lời mời email */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/20 p-5 dark:border-slate-800 dark:bg-slate-950/20">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">Lời mời qua email</h4>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  Nếu có quản trị viên tổ chức mời bạn qua email, lời mời sẽ hiển thị trực tiếp tại đây.
                </p>

                {pendingInvitations.length === 0 ? (
                  <div className="mt-3.5 rounded-xl border border-dashed border-slate-200 py-8 px-4 text-center dark:border-slate-800">
                    <Inbox size={26} className="mx-auto mb-2 text-slate-350 dark:text-slate-700 shrink-0" />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600">
                      Hiện chưa có lời mời nào qua email của bạn.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950/60 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {invitation.organization_name || 'Tổ chức'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Vai trò: <span className="font-semibold">{roleLabelMap[invitation.role] || invitation.role}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            Hết hạn: {new Date(invitation.expires_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isJoiningByEmail === invitation.id}
                          onClick={() => handleJoinByEmailInvitation(invitation)}
                          className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isJoiningByEmail === invitation.id ? 'Đang tham gia...' : 'Tham gia tổ chức'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5 animate-fade-in-up">
              <h3 className="text-base font-black text-gray-900 dark:text-slate-100">Bảo mật tài khoản</h3>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Đổi mật khẩu</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cập nhật mật khẩu định kỳ để nâng cao bảo mật tài khoản.</p>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="mt-3.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-700"
                  >
                    Đổi mật khẩu
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300"
                  >
                    <LogOut size={13} className="shrink-0" />
                    Đăng xuất tài khoản
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider">Đổi mật khẩu tài khoản</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordMsg(''); }} className="rounded-lg p-1 text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input type={showOldPass ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 pr-10 text-xs font-medium outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450">
                    {showOldPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mật khẩu mới</label>
                <div className="relative">
                  <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 pr-10 text-xs font-medium outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-450">
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Xác nhận mật khẩu mới</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
              </div>
              {passwordMsg && <p className={`text-xs font-bold ${passwordMsg.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>{passwordMsg}</p>}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button onClick={() => { setShowPasswordModal(false); setPasswordMsg(''); }} className="rounded-lg border border-slate-200/80 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Hủy
                </button>
                <button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50">
                  {passwordLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
