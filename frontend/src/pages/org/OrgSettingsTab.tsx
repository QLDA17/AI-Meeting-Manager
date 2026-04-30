import React from 'react';
import { Archive, Bell, Key, ShieldAlert, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FloatingSaveBar, Input } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useOrgStore } from '../../stores';
import api from '../../services/api';

interface OrgSettingsTabProps {
  orgId: string;
}

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
      toast.success('Da luu cai dat to chuc');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the luu cai dat');
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
      toast.success('Da luu tru to chuc');
      await loadOrgDetails(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the luu tru to chuc');
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
      toast.success('Da tam dung to chuc');
      await loadOrgDetails(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the tam dung');
    }
  };

  const deleteOrg = async () => {
    if (!window.confirm('Ban chac chan muon xoa to chuc nay?')) return;
    try {
      await api.delete(`/api/organizations/${orgId}`);
      toast.success('Da xoa to chuc');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the xoa to chuc');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <Input label="Ten to chuc" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Mo ta</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </Card>

      <Card className="space-y-3 p-6">
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><UserCheck size={16} /> Duyet thanh vien moi</span>
          <input type="checkbox" checked={form.requireApproval} onChange={(e) => setForm((p) => ({ ...p, requireApproval: e.target.checked }))} />
        </label>
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><Bell size={16} /> Thong bao he thong</span>
          <input type="checkbox" checked={form.notifications} onChange={(e) => setForm((p) => ({ ...p, notifications: e.target.checked }))} />
        </label>
        <label className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><Key size={16} /> Ma hoa du lieu</span>
          <input type="checkbox" checked={form.encryptData} onChange={(e) => setForm((p) => ({ ...p, encryptData: e.target.checked }))} />
        </label>
      </Card>

      <Card className="space-y-3 border-rose-200 p-6 dark:border-rose-900/40">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldAlert size={16} />
          <span className="text-sm font-semibold">Khu vuc rui ro</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={pauseOrg}>Tam dung</Button>
          <Button variant="secondary" size="sm" onClick={archiveOrg}><Archive size={14} /> Luu tru</Button>
          <Button variant="danger" size="sm" onClick={deleteOrg}>Xoa to chuc</Button>
        </div>
      </Card>

      <FloatingSaveBar isVisible={isDirty} isSaving={saving} onSave={save} onCancel={() => setForm(initial)} />
    </div>
  );
};

export default OrgSettingsTab;
