import React from 'react';
import { Cpu, Shield, Save } from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../components/ui/Toast';

type AIServices = {
  llm_provider: string;
  llm_enabled: boolean;
  stt_provider: string;
  stt_enabled: boolean;
  vector_db_enabled: boolean;
  api_health?: Array<{ name: string; latency_ms: number; status: string }>;
};

const AdminAIServices: React.FC = () => {
  const [services, setServices] = React.useState<AIServices | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/ai-services');
      setServices(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Khong tai duoc cau hinh AI services');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const updateField = (key: keyof AIServices, value: string | boolean) => {
    setServices((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleSave = async () => {
    if (!services) return;
    setSaving(true);
    try {
      const payload = {
        llm_provider: services.llm_provider,
        llm_enabled: services.llm_enabled,
        stt_provider: services.stt_provider,
        stt_enabled: services.stt_enabled,
        vector_db_enabled: services.vector_db_enabled,
      };
      const response = await api.patch('/api/admin/ai-services', payload);
      setServices(response.data);
      toast.success('Da cap nhat AI services');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Khong cap nhat duoc AI services');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Dang tai cau hinh AI services...</p>;
  }

  if (!services) {
    return <p className="text-sm text-red-500">{error || 'Khong co du lieu AI services'}</p>;
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <Cpu className="text-primary-600" />
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">LLM Service</h3>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500">Provider</label>
            <select
              value={services.llm_provider}
              onChange={(e) => updateField('llm_provider', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="google">Google</option>
              <option value="openai">OpenAI</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={services.llm_enabled}
                onChange={(e) => updateField('llm_enabled', e.target.checked)}
              />
              Bat LLM service
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="text-purple-600" />
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">STT Service</h3>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-500">Provider</label>
            <input
              value={services.stt_provider}
              onChange={(e) => updateField('stt_provider', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
            />
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={services.stt_enabled}
                onChange={(e) => updateField('stt_enabled', e.target.checked)}
              />
              Bat STT service
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={services.vector_db_enabled}
                onChange={(e) => updateField('vector_db_enabled', e.target.checked)}
              />
              Bat Vector DB
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-black text-gray-900 dark:text-slate-100">API Health</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(services.api_health || []).map((item) => (
            <div key={item.name} className="rounded-xl border border-gray-100 p-4 dark:border-slate-800">
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.name}</p>
              <p className="text-xs text-gray-500">Latency: {item.latency_ms}ms</p>
              <p className="text-xs font-semibold text-green-600">{item.status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Dang luu...' : 'Luu thay doi'}
        </button>
      </div>
    </div>
  );
};

export default AdminAIServices;
