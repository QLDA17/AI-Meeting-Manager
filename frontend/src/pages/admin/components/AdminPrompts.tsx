import React from 'react';
import { Save } from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../components/ui/Toast';

type PromptItem = {
  key: string;
  name: string;
  description?: string;
  content: string;
  version?: string;
  last_updated?: string;
};

const AdminPrompts: React.FC = () => {
  const [prompts, setPrompts] = React.useState<PromptItem[]>([]);
  const [selectedKey, setSelectedKey] = React.useState('');
  const [content, setContent] = React.useState('');
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const selectedPrompt = prompts.find((item) => item.key === selectedKey);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/prompts');
      const rows = Array.isArray(response.data) ? response.data : [];
      setPrompts(rows);
      if (rows.length > 0) {
        setSelectedKey(rows[0].key);
        setName(rows[0].name || '');
        setDescription(rows[0].description || '');
        setContent(rows[0].content || '');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong tai duoc danh sach prompt');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSelectPrompt = (item: PromptItem) => {
    setSelectedKey(item.key);
    setName(item.name || '');
    setDescription(item.description || '');
    setContent(item.content || '');
  };

  const handleSave = async () => {
    if (!selectedKey) return;
    setSaving(true);
    try {
      const payload = {
        key: selectedKey,
        name,
        description,
        content,
        version: selectedPrompt?.version,
      };
      const response = await api.put(`/api/admin/prompts/${selectedKey}`, payload);
      const updated = response.data as PromptItem;
      setPrompts((current) => current.map((item) => (item.key === selectedKey ? updated : item)));
      toast.success('Da cap nhat prompt');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Khong cap nhat duoc prompt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Dang tai system prompts...</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        <h3 className="px-1 text-xs font-black uppercase tracking-widest text-gray-400">System Prompts</h3>
        {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
        {prompts.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleSelectPrompt(item)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
              selectedKey === item.key
                ? 'border-red-400 bg-red-50/40 dark:bg-red-900/10'
                : 'border-gray-100 bg-white hover:border-gray-300 dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <p className="text-sm font-black text-gray-900 dark:text-slate-100">{item.name}</p>
            <p className="mt-1 text-xs text-gray-500">{item.description || 'No description'}</p>
            <p className="mt-2 text-[10px] font-bold text-gray-400">{item.key}</p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Ten prompt</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-500">Version</label>
              <input
                value={selectedPrompt?.version || ''}
                disabled
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold text-gray-500">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold text-gray-500">Prompt content</label>
            <textarea
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectedKey}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Dang luu...' : 'Luu prompt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPrompts;
