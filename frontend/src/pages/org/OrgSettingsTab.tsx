/**
 * OrgSettingsTab - Cài đặt Organization (Tổ chức)
 * Đã tối ưu hóa: Sửa lỗi import, fix lệch giao diện, loại bỏ header thừa.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  RotateCcw,
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
  Cpu,
  Database,
  UserCheck,
  Key,
  FolderOpen,
} from 'lucide-react';
import { getOrgById } from '../../data';
import { Button, Card, Input, FloatingSaveBar } from '../../components/ui';
import { toast } from '../../components/ui/Toast';

interface OrgSettingsTabProps {
  orgId: string;
}

const OrgSettingsTab: React.FC<OrgSettingsTabProps> = ({ orgId }) => {
  const org = getOrgById(orgId);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: org?.name || '',
    description: org?.description || '',
    defaultRole: 'member',
    sttProvider: 'google',
    translationLang: 'en',
    allowCreateGroups: true,
    autoSummarize: true,
    requireApproval: false,
    notifications: true,
    retention: '90',
    maxAudioSize: '50',
    encryptData: true,
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Đã cập nhật cấu hình tổ chức thành công!');
    }, 1200);
  };

  const colorStyles: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  };

  const SettingToggle: React.FC<{ icon: React.ReactNode, title: string, desc: string, checked: boolean, onChange: (v: boolean) => void, color?: string }> = ({ icon, title, desc, checked, onChange, color = "primary" }) => (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 flex-1">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorStyles[color] || colorStyles.primary}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{title}</p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">{desc}</p>
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Identity Section */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Thông tin Tổ chức</h4>
            <div className="space-y-5 rounded-[2rem] border border-gray-100 bg-gray-50/30 p-6 dark:border-slate-800 dark:bg-slate-900/50">
              <Input
                label="Tên hiển thị"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">Mô tả mục tiêu</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-500/5 dark:border-slate-800 dark:bg-slate-800"
                />
              </div>
            </div>
          </section>

          {/* AI Settings */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Cấu hình AI & Xử lý</h4>
            <Card className="rounded-[2rem] border-gray-100 p-6 shadow-sm dark:border-slate-800">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
                      <Cpu size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Mô hình STT</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Mặc định cho toàn bộ tổ chức</p>
                    </div>
                  </div>
                  <select
                    value={formData.sttProvider}
                    onChange={(e) => handleChange('sttProvider', e.target.value)}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="openai">OpenAI Whisper</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                      <Globe size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Dịch thuật</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">Ngôn ngữ đích mặc định</p>
                    </div>
                  </div>
                  <select
                    value={formData.translationLang}
                    onChange={(e) => handleChange('translationLang', e.target.value)}
                    className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                  </select>
                </div>
              </div>
            </Card>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Policies Section */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Chính sách & Bảo mật</h4>
            <div className="divide-y divide-gray-50 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              <SettingToggle 
                icon={<FolderOpen size={18} />}
                title="Cho phép tạo Nhóm"
                desc="Thành viên có thể tự tạo nhóm mới."
                checked={formData.allowCreateGroups}
                onChange={(v) => handleChange('allowCreateGroups', v)}
                color="blue"
              />
              <SettingToggle 
                icon={<Key size={18} />}
                title="Mã hóa dữ liệu"
                desc="Bật mã hóa đầu cuối cho file ghi âm."
                checked={formData.encryptData}
                onChange={(v) => handleChange('encryptData', v)}
                color="indigo"
              />
              <SettingToggle 
                icon={<UserCheck size={18} />}
                title="Duyệt người mới"
                desc="Admin cần phê duyệt thành viên mới."
                checked={formData.requireApproval}
                onChange={(v) => handleChange('requireApproval', v)}
                color="amber"
              />
              <SettingToggle 
                icon={<Bell size={18} />}
                title="Thông báo hệ thống"
                desc="Gửi thông báo khi có biên bản mới."
                checked={formData.notifications}
                onChange={(v) => handleChange('notifications', v)}
                color="rose"
              />
            </div>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Khu vực rủi ro</h4>
            <div className="rounded-[2rem] border border-rose-100 bg-rose-50/30 p-6 dark:border-rose-900/20 dark:bg-rose-900/5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
                  <ShieldAlert size={20} />
                </div>
                <div className="flex-1">
                  <h5 className="text-sm font-black text-rose-900 dark:text-rose-400">Các hành động vĩnh viễn</h5>
                  <p className="mt-1 text-[11px] text-rose-800/60 dark:text-rose-400/60 leading-tight">
                    Xóa tổ chức sẽ xóa toàn bộ dữ liệu của tất cả người dùng, bao gồm lịch sử họp và từ điển.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="rounded-xl px-4 text-[10px] font-black"
                    >
                       Tạm dừng
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      className="rounded-xl px-4 text-[10px] font-black shadow-lg shadow-rose-600/20"
                    >
                       Xóa Tổ chức
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modern Floating Action Bar */}
      <FloatingSaveBar
        isVisible={true}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={() => window.location.reload()}
      />
    </div>
  );
};

export default OrgSettingsTab;
