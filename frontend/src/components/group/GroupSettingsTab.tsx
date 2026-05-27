import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Building2, EyeOff, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { GroupJoinPolicy, GroupVisibility } from '../../types';
import { useGroupStore } from '../../stores';
import { Button, Badge, FloatingSaveBar, Input } from '../ui';
import { toast } from '../ui/Toast';
import api from '../../services/api';

interface GroupSettingsTabProps {
  groupId: string;
}

interface SettingsForm {
  name: string;
  description: string;
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
}

const accessOptions: Array<{
  visibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  label: string;
  description: string;
}> = [
  {
    visibility: 'hidden',
    joinPolicy: 'invite_only',
    label: 'Ẩn khỏi tổ chức · Chỉ theo lời mời',
    description: 'Chỉ người được thêm trực tiếp mới nhìn thấy và truy cập được nhóm này.',
  },
  {
    visibility: 'organization',
    joinPolicy: 'invite_only',
    label: 'Hiển thị trong tổ chức · Chỉ theo lời mời',
    description: 'Mọi người trong tổ chức nhìn thấy nhóm nhưng chỉ vào được khi được thêm.',
  },
  {
    visibility: 'organization',
    joinPolicy: 'request_approval',
    label: 'Hiển thị trong tổ chức · Yêu cầu phê duyệt',
    description: 'Người dùng trong tổ chức có thể gửi yêu cầu tham gia để quản trị nhóm xét duyệt.',
  },
  {
    visibility: 'organization',
    joinPolicy: 'open_join',
    label: 'Hiển thị trong tổ chức · Tự tham gia',
    description: 'Người dùng trong tổ chức có thể tự tham gia nhóm ngay lập tức.',
  },
];

const GroupSettingsTab: React.FC<GroupSettingsTabProps> = ({ groupId }) => {
  const navigate = useNavigate();
  const { group, updateGroup } = useGroupStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<SettingsForm>({
    name: group?.name || '',
    description: group?.description || '',
    visibility: group?.visibility || 'organization',
    joinPolicy: group?.joinPolicy || 'invite_only',
  });
  const [initialData, setInitialData] = useState(formData);

  useEffect(() => {
    if (!group) return;
    const nextState = {
      name: group.name || '',
      description: group.description || '',
      visibility: group.visibility || 'organization',
      joinPolicy: group.joinPolicy || 'invite_only',
    };
    setFormData(nextState);
    setInitialData(nextState);
  }, [group]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const currentAccessLabel = useMemo(() => {
    return accessOptions.find(
      (option) =>
        option.visibility === formData.visibility && option.joinPolicy === formData.joinPolicy,
    )?.label;
  }, [formData.joinPolicy, formData.visibility]);

  const handleChange = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGroup(groupId, {
        name: formData.name,
        description: formData.description,
        visibility: formData.visibility,
        joinPolicy: formData.joinPolicy,
      });
      setInitialData(formData);
      toast.success('Đã cập nhật thông tin nhóm.');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể cập nhật nhóm.');
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

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-950/20 dark:text-primary-300">
            <ShieldCheck size={12} />
            Cài đặt nhóm
          </div>
          <h3 className="mt-3 text-2xl font-black text-gray-900 dark:text-slate-100">Thông tin và quyền truy cập</h3>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-slate-400">
            Chỉ giữ các thiết lập đang có ý nghĩa thật trong hệ thống: tên nhóm, mô tả, phạm vi hiển thị và cách tham gia.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-xl px-3 py-1.5 text-[11px] font-mono text-gray-500">
          ID: {groupId}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Thông tin cơ bản</p>
            <div className="mt-4 space-y-4">
              <Input
                label="Tên nhóm"
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                className="h-11 rounded-2xl text-sm font-semibold"
              />
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  rows={5}
                  placeholder="Mô tả ngắn gọn phạm vi cộng tác, phòng ban hoặc mục tiêu của nhóm."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Phạm vi hiển thị và cách tham gia</p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              {accessOptions.map((option) => {
                const isActive =
                  option.visibility === formData.visibility &&
                  option.joinPolicy === formData.joinPolicy;
                return (
                  <label
                    key={`${option.visibility}-${option.joinPolicy}`}
                    className={`flex cursor-pointer items-start gap-4 rounded-3xl border p-4 transition ${
                      isActive
                        ? 'border-primary-500 bg-primary-50/60 dark:border-primary-500 dark:bg-primary-950/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-950/20'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {option.visibility === 'hidden' ? <EyeOff size={16} /> : <Building2 size={16} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-900 dark:text-slate-100">{option.label}</p>
                      <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-slate-400">{option.description}</p>
                    </div>
                    <input
                      type="radio"
                      name="group-access"
                      checked={isActive}
                      onChange={() => {
                        handleChange('visibility', option.visibility);
                        handleChange('joinPolicy', option.joinPolicy);
                      }}
                      className="mt-1 h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tóm tắt hiện tại</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Quyền truy cập</p>
                <p className="mt-1 text-sm font-black text-gray-900 dark:text-slate-100">
                  {currentAccessLabel || group?.accessSummary || 'Hiển thị trong tổ chức · Chỉ theo lời mời'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Users size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]">Thành viên</span>
                  </div>
                  <p className="mt-2 text-2xl font-black text-gray-900 dark:text-slate-100">{group?.memberCount || 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]">Vai trò của bạn</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-gray-900 dark:text-slate-100">
                    Có quyền quản trị nhóm
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-rose-100 bg-rose-50/40 p-6 shadow-sm dark:border-rose-900/20 dark:bg-rose-950/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Khu vực hành động nhạy cảm</p>
            <p className="mt-3 text-sm leading-6 text-rose-900/70 dark:text-rose-200/80">
              Lưu trữ sẽ giữ dữ liệu nhưng đánh dấu nhóm là không còn hoạt động. Xóa nhóm sẽ xóa vĩnh viễn các nội dung liên quan.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl px-4"
                onClick={handleArchiveGroup}
              >
                <Archive size={14} />
                Lưu trữ nhóm
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="rounded-xl px-4"
                onClick={handleDeleteGroup}
              >
                <Trash2 size={14} />
                Xóa nhóm
              </Button>
            </div>
          </section>
        </div>
      </div>

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
