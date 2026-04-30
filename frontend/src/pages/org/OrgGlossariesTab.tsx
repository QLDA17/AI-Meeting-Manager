import React from 'react';
import { BookOpen, Info } from 'lucide-react';
import GlossaryTable from '../../features/glossary/GlossaryTable';
import { useGlossaryStore } from '../../stores';
import { Button, Card, Input } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import type { GlossaryTerm } from '../../types';

interface OrgGlossariesTabProps {
  orgId: string;
}

const OrgGlossariesTab: React.FC<OrgGlossariesTabProps> = ({ orgId }) => {
  const { glossaries, loadGlossaries, removeGlossary, createGlossary, updateGlossary } = useGlossaryStore();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<GlossaryTerm | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    term: '',
    translationVi: '',
    translationEn: '',
    category: '',
    isActive: true,
  });

  React.useEffect(() => {
    loadGlossaries(orgId);
  }, [loadGlossaries, orgId]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Ban co chac chan muon xoa thuat ngu nay?')) {
      await removeGlossary(id);
      toast.success('Da xoa thuat ngu');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ term: '', translationVi: '', translationEn: '', category: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (item: GlossaryTerm) => {
    setEditing(item);
    setForm({
      term: item.term || '',
      translationVi: item.translationVi || '',
      translationEn: item.translationEn || '',
      category: item.category || '',
      isActive: item.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.term.trim()) return;
    setSaving(true);
    try {
      const payload = {
        term: form.term.trim(),
        name: form.term.trim(),
        translation_vi: form.translationVi || undefined,
        translation_en: form.translationEn || undefined,
        category: form.category || undefined,
        is_active: form.isActive,
        organization_id: orgId,
      };
      if (editing) {
        await updateGlossary(editing.id, payload as any);
        toast.success('Da cap nhat thuat ngu');
      } else {
        await createGlossary(payload as any);
        toast.success('Da tao thuat ngu');
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the luu thuat ngu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-slate-100">
            <BookOpen className="text-primary-600" size={24} />
            Tu dien chuyen nganh
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Quan ly thuat ngu de AI nhan dien chinh xac hon.
          </p>
        </div>
      </div>

      <Card className="flex gap-3 border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
        <Info className="shrink-0 text-blue-600 dark:text-blue-400" size={20} />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Pham vi:</p>
          <p>Thuat ngu noi bo chi ap dung trong to chuc hien tai.</p>
        </div>
      </Card>

      <GlossaryTable data={glossaries} onDelete={handleDelete} onAdd={openCreate} onEdit={openEdit} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-slate-900">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">
              {editing ? 'Sua thuat ngu' : 'Them thuat ngu'}
            </h3>
            <div className="space-y-3">
              <Input label="Thuat ngu" value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} required />
              <Input label="Dich tieng Viet" value={form.translationVi} onChange={(e) => setForm((p) => ({ ...p, translationVi: e.target.value }))} />
              <Input label="Dich tieng Anh" value={form.translationEn} onChange={(e) => setForm((p) => ({ ...p, translationEn: e.target.value }))} />
              <Input label="Danh muc" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
                Dang hoat dong
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Huy</Button>
              <Button variant="primary" type="submit" isLoading={saving}>Luu</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default OrgGlossariesTab;
