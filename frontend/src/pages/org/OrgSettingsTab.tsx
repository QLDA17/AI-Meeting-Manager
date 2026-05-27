import React from 'react';
import {
  Archive,
  Bell,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button, FloatingSaveBar, Input } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import api from '../../services/api';
import { useOrgStore } from '../../stores';

interface OrgSettingsTabProps {
  orgId: string;
}

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, title, description, checked, onChange }) => (
  <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-white/70 p-4 transition-all duration-200 hover:border-gray-200 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 cursor-pointer">
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-indigo-50/50 text-primary-600 dark:from-primary-950/20 dark:to-indigo-950/10 border border-primary-100/30 dark:border-primary-900/20 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-450 dark:text-slate-400">{description}</p>
      </div>
    </div>

    <span className="relative mt-1 inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-primary-500 dark:bg-slate-700" />
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" />
    </span>
  </label>
);

const OrgSettingsTab: React.FC<OrgSettingsTabProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const { currentOrg, loadOrgDetails } = useOrgStore();
  const org = currentOrg?.id === orgId ? currentOrg : undefined;
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: org?.name || '',
    description: org?.description || '',
    requireApproval: false,
    notifications: true,
    encryptData: true,
  });
  const [initial, setInitial] = React.useState(form);

  React.useEffect(() => {
    if (!org) return;
    const next = {
      name: org.name || '',
      description: org.description || '',
      requireApproval: Boolean((org as any)?.settings?.requireApproval),
      notifications: Boolean((org as any)?.settings?.notifications ?? true),
      encryptData: Boolean((org as any)?.settings?.encryptData ?? true),
    };
    setForm(next);
    setInitial(next);
  }, [org?.id, org?.name, org?.description]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/organizations/${orgId}`, {
        name: form.name,
        description: form.description || null,
        settings: {
          ...(org as any)?.settings,
          requireApproval: form.requireApproval,
          notifications: form.notifications,
          encryptData: form.encryptData,
        },
      });
      await loadOrgDetails(orgId);
      setInitial(form);
      toast.success('Đã lưu cài đặt tổ chức');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const archiveOrg = async () => {
    try {
      await api.patch(`/api/organizations/${orgId}`, {
        settings: {
          ...(org as any)?.settings,
          status: 'archived',
          archivedAt: new Date().toISOString(),
        },
      });
      toast.success('Đã lưu trữ tổ chức');
      await loadOrgDetails(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể lưu trữ tổ chức');
    }
  };

  const pauseOrg = async () => {
    try {
      await api.patch(`/api/organizations/${orgId}`, {
        settings: {
          ...(org as any)?.settings,
          status: 'paused',
        },
      });
      toast.success('Đã tạm dừng tổ chức');
      await loadOrgDetails(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể tạm dừng tổ chức');
    }
  };

  const deleteOrg = async () => {
    if (!window.confirm('Bạn chắc chắn muốn xóa tổ chức này?')) return;
    try {
      await api.delete(`/api/organizations/${orgId}`);
      toast.success('Đã xóa tổ chức');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể xóa tổ chức');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="px-1">
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="text-primary-650" size={18} />
          Cấu hình tổ chức
        </h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Kiểm soát danh tính, quy trình phê duyệt, thông báo hệ thống và các chính sách bảo vệ dữ liệu.
        </p>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-gray-100 bg-white/70 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              Thông tin nhận diện
            </h4>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Cập nhật tên hiển thị và phần mô tả giúp các thành viên hiểu rõ phạm vi hoạt động của tổ chức.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Tên tổ chức"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mô tả ngắn
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Ví dụ: Trung tâm điều phối họp nội bộ, ghi âm, tổng hợp quyết định và theo dõi action items theo nhóm."
                className="w-full rounded-xl border border-gray-250 bg-white px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 dark:border-slate-750 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-primary-900/30"
              />
              <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                Mô tả này sẽ xuất hiện ở các màn chuyển tổ chức và dashboard tổng quan.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white/70 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              Chính sách truy cập và vận hành
            </h4>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Quy định cách thành viên mới tham gia và cách hệ thống gửi cảnh báo quan trọng.
            </p>
          </div>

          <div className="space-y-3.5">
            <ToggleRow
              icon={<UserCheck size={18} />}
              title="Yêu cầu phê duyệt thành viên mới"
              description="Quản trị viên phải xét duyệt trước khi thành viên mới chính thức tham gia vào tổ chức."
              checked={form.requireApproval}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, requireApproval: checked }))
              }
            />
            <ToggleRow
              icon={<Bell size={18} />}
              title="Gửi thông báo hệ thống"
              description="Cho phép hệ thống gửi thông báo về cuộc họp, tóm tắt và các thay đổi quan trọng trong tổ chức."
              checked={form.notifications}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, notifications: checked }))
              }
            />
            <ToggleRow
              icon={<KeyRound size={18} />}
              title="Mã hóa dữ liệu nâng cao"
              description="Bật lớp bảo vệ dữ liệu mặc định cho transcript, tệp âm thanh và tài nguyên chia sẻ trong tổ chức."
              checked={form.encryptData}
              onChange={(checked) =>
                setForm((prev) => ({ ...prev, encryptData: checked }))
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-rose-150 bg-rose-50/20 p-5 shadow-sm dark:border-rose-950/25 dark:bg-rose-950/5">
          <div className="mb-4 flex items-center gap-3 text-rose-700 dark:text-rose-450">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/30">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold">Vùng nguy hiểm</h4>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                Những thao tác này có thể ảnh hưởng vĩnh viễn tới toàn bộ tổ chức và thành viên.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-rose-100/50 bg-white/50 p-4 dark:border-rose-900/20 dark:bg-slate-900/20 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Tạm dừng tổ chức</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-450 dark:text-slate-400">
                Khóa tạm thời hoạt động tạo mới để bảo trì hoặc rà soát quyền truy cập.
              </p>
              <div className="mt-3.5">
                <Button variant="secondary" size="md" onClick={pauseOrg}>
                  Tạm dừng
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100/50 bg-white/50 p-4 dark:border-amber-900/20 dark:bg-slate-900/20 hover:border-amber-200 dark:hover:border-amber-900/40 transition-colors">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Lưu trữ tổ chức</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-450 dark:text-slate-400">
                Chuyển tổ chức sang trạng thái lưu trữ để giữ dữ liệu nhưng dừng luồng vận hành thường ngày.
              </p>
              <div className="mt-3.5">
                <Button variant="secondary" size="md" onClick={archiveOrg} icon={<Archive size={13} />}>
                  Lưu trữ
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-red-100/50 bg-white/50 p-4 dark:border-red-900/20 dark:bg-slate-900/20 hover:border-red-200 dark:hover:border-red-900/40 transition-colors">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Xóa tổ chức</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-450 dark:text-slate-400">
                Hành động này không thể hoàn tác. Hệ thống sẽ xóa tổ chức và chuyển bạn về dashboard.
              </p>
              <div className="mt-3.5">
                <Button variant="danger" size="md" onClick={deleteOrg}>
                  Xóa tổ chức
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <FloatingSaveBar
        isVisible={isDirty}
        isSaving={saving}
        onSave={save}
        onCancel={() => setForm(initial)}
        message="Cài đặt tổ chức đã thay đổi"
        subMessage="Lưu lại để áp dụng cho thành viên, nhóm và các chính sách đang hoạt động."
      />
    </div>
  );
};

export default OrgSettingsTab;
