/**
 * GroupSettingsTab - Tab cài đặt nâng cao và Bảo mật Nhóm
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  RotateCcw,
  AlertTriangle,
  Lock,
  Building2,
  Globe,
  Users,
  FileText,
  Bell,
  Trash2,
  ShieldAlert,
  ArrowLeftRight,
  Archive,
  ShieldCheck,
  Key,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useGroupStore } from '../../stores';
import type { PrivacyLevel } from '../../types';
import { Button, Badge, Card, Input, FloatingSaveBar } from '../ui';
import { toast } from '../ui/Toast';
import api from '../../services/api';

interface GroupSettingsTabProps {
  groupId: string;
}

const GroupSettingsTab: React.FC<GroupSettingsTabProps> = ({ groupId }) => {
  const navigate = useNavigate();
  const { group, updateGroup } = useGroupStore();
  const groupSettings = (group?.settings ?? {}) as Record<string, boolean | undefined>;
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    privacyLevel: group?.privacyLevel || 'internal' as PrivacyLevel,
    allowCreateMeetings: groupSettings.allowCreateMeetings ?? true,
    autoSummarize: groupSettings.autoSummarize ?? true,
    requireApproval: groupSettings.requireApproval ?? false,
    notifications: groupSettings.notifications ?? true,
    encryptData: groupSettings.encryptData ?? true,
  });
  const [initialData, setInitialData] = useState(formData);

  useEffect(() => {
    if (group) {
      const data = {
        name: group.name || '',
        description: group.description || '',
        privacyLevel: group.privacyLevel || 'internal' as PrivacyLevel,
        allowCreateMeetings: (group.settings as Record<string, boolean | undefined> | undefined)?.allowCreateMeetings ?? true,
        autoSummarize: (group.settings as Record<string, boolean | undefined> | undefined)?.autoSummarize ?? true,
        requireApproval: (group.settings as Record<string, boolean | undefined> | undefined)?.requireApproval ?? false,
        notifications: (group.settings as Record<string, boolean | undefined> | undefined)?.notifications ?? true,
        encryptData: (group.settings as Record<string, boolean | undefined> | undefined)?.encryptData ?? true,
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [group]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        privacyLevel: formData.privacyLevel,
        settings: {
          allowCreateMeetings: formData.allowCreateMeetings,
          autoSummarize: formData.autoSummarize,
          requireApproval: formData.requireApproval,
          notifications: formData.notifications,
          encryptData: formData.encryptData,
        }
      });
      setInitialData(formData);
      toast.success('Đã cập nhật cấu hình bảo mật thành công!');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveGroup = async () => {
    try {
      await updateGroup(groupId, {
        settings: {
          ...(group?.settings || {}),
          archived: true,
          archivedAt: new Date().toISOString(),
        } as any,
      });
      toast.success('Đã lưu trữ nhóm.');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể lưu trữ nhóm.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Bạn chắc chắn muốn xóa nhóm này? Hành động này không thể hoàn tác.')) return;
    try {
      await api.delete(`/api/groups/${groupId}`);
      toast.success('Đã xóa nhóm.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể xóa nhóm.');
    }
  };

  const colorStyles: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  };

  const privacyOptions: Array<{ value: PrivacyLevel; icon: React.ReactNode; label: string; desc: string }> = [
    {
      value: 'private',
      icon: <EyeOff size={18} />,
      label: 'Riêng tư tối đa',
      desc: 'Chỉ những thành viên được đích danh mời mới có thể thấy nội dung.',
    },
    {
      value: 'internal',
      icon: <Building2 size={18} />,
      label: 'Nội bộ tổ chức',
      desc: 'Mọi thành viên trong công ty đều có thể tìm thấy và tham gia.',
    },
    {
      value: 'public',
      icon: <Globe size={18} />,
      label: 'Công khai',
      desc: 'Bất kỳ ai có mã nhóm đều có thể xem thông tin cơ bản.',
    },
  ];

  const SettingToggle: React.FC<{ icon: React.ReactNode, title: string, desc: string, checked: boolean, onChange: (v: boolean) => void, color?: string }> = ({ icon, title, desc, checked, onChange, color = "primary" }) => (
    <div className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-4 flex-1">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${colorStyles[color] || colorStyles.primary}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-black text-gray-900 dark:text-slate-100">{title}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-tight">{desc}</p>
        </div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700"></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-6 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-primary-600 mb-1">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Trung tâm Bảo mật</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-slate-100">Cài đặt Nhóm</h3>
          <p className="text-sm text-gray-500 mt-1">Quản lý quyền riêng tư, mã hóa và các thiết lập hệ thống cho <b>{group?.name}</b>.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-4 py-2 rounded-xl">ID: {groupId}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column: Core Identity & Privacy */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Định danh Nhóm</h4>
            <Card className="rounded-[2rem] border-gray-100 p-6 shadow-sm dark:border-slate-800">
              <div className="space-y-6">
                <Input
                  label="Tên hiển thị"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-200">Mô tả mục tiêu</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-500/5 dark:border-slate-800 dark:bg-slate-800"
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* Privacy Level */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Chế độ hiển thị & Bảo mật</h4>
            <div className="grid grid-cols-1 gap-4">
              {privacyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex cursor-pointer items-center gap-4 rounded-3xl border p-4 transition-all ${
                    formData.privacyLevel === option.value
                      ? 'border-primary-500 bg-white ring-8 ring-primary-500/5 dark:bg-slate-900 shadow-xl'
                      : 'border-gray-100 bg-gray-50/30 hover:border-gray-200 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                    formData.privacyLevel === option.value ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-400'
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900 dark:text-slate-100">{option.label}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-slate-400">{option.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="privacy"
                    value={option.value}
                    checked={formData.privacyLevel === option.value}
                    onChange={(e) => handleChange('privacyLevel', e.target.value)}
                    className="h-5 w-5 text-primary-600 border-gray-300"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Stats & Policies */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Thống kê nhanh</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-blue-50/50 p-5 dark:bg-blue-900/10">
                <p className="text-[10px] font-bold text-blue-600 uppercase">Thành viên</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{group?.memberCount}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/50 p-5 dark:bg-emerald-900/10">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Cuộc họp</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{group?.meetingCount}</p>
              </div>
            </div>
          </section>

          {/* System Policies */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Quy trình & Chính sách nhóm</h4>
            <div className="divide-y divide-gray-50 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <SettingToggle 
                icon={<UserCheck size={20} />}
                title="Phê duyệt tham gia"
                desc="Chỉ cho phép người mới vào nhóm sau khi quản trị viên phê duyệt."
                checked={formData.requireApproval}
                onChange={(v) => handleChange('requireApproval', v)}
                color="amber"
              />
              <SettingToggle 
                icon={<Key size={20} />}
                title="Mã hóa dữ liệu"
                desc="Tự động mã hóa tệp âm thanh và biên bản họp."
                checked={formData.encryptData}
                onChange={(v) => handleChange('encryptData', v)}
                color="indigo"
              />
              <SettingToggle 
                icon={<FileText size={20} />}
                title="Quyền khởi tạo họp"
                desc="Cho phép thành viên ghi âm và tải lên cuộc họp mới."
                checked={formData.allowCreateMeetings}
                onChange={(v) => handleChange('allowCreateMeetings', v)}
              />
              <SettingToggle 
                icon={<Bell size={20} />}
                title="Tóm tắt tự động"
                desc="AI tóm tắt ngay lập tức và thông báo khi sẵn sàng."
                checked={formData.autoSummarize}
                onChange={(v) => handleChange('autoSummarize', v)}
              />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Khu vực rủi ro</h4>
              <div className="h-px flex-1 bg-rose-100 dark:bg-rose-900/20" />
            </div>
            
            <div className="rounded-[2rem] border border-rose-100 bg-rose-50/30 p-6 dark:border-rose-900/20 dark:bg-rose-900/5">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-900/40 dark:text-rose-400">
                  <ShieldAlert size={28} />
                </div>
                <div className="flex-1">
                  <h5 className="text-base font-black text-rose-900 dark:text-rose-400">Hành động không thể hoàn tác</h5>
                  <p className="mt-1 text-[11px] text-rose-800/60 dark:text-rose-400/60 leading-relaxed">
                    Xóa nhóm sẽ xóa vĩnh viễn toàn bộ biên bản họp, tệp âm thanh và lịch sử thảo luận.
                  </p>
                  
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="rounded-xl px-4 text-[10px] font-black"
                      onClick={() => toast.success('Vào tab Thành viên để phân quyền group-admin cho người thay thế.')}
                    >
                      <ArrowLeftRight size={14} /> Chuyển quyền
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="rounded-xl px-4 text-[10px] font-black hover:text-amber-700 hover:bg-amber-50"
                      onClick={handleArchiveGroup}
                    >
                      <Archive size={14} /> Lưu trữ
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      className="rounded-xl px-4 text-[10px] font-black shadow-lg shadow-rose-600/20"
                      onClick={handleDeleteGroup}
                    >
                      <Trash2 size={14} /> Xóa Nhóm
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Modern Action Bar */}
      <FloatingSaveBar
        isVisible={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={() => setFormData(initialData)}
      />
    </div>
  );
};

export default GroupSettingsTab;
