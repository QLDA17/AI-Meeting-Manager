import React from 'react';
import { Cpu, Mic, Brain, CheckCircle2, XCircle, Radio, DollarSign } from 'lucide-react';
import api from '../../../services/api';

type LLMService = {
  name: string;
  model: string;
  role: 'primary' | 'fallback';
  enabled: boolean;
  api_key_set: boolean;
};

type STTProvider = {
  name: string;
  id: string;
  model: string;
  active: boolean;
};

type NLPService = {
  name: string;
  model: string;
  enabled: boolean;
  features: {
    dialect_detection: boolean;
    context_correction: boolean;
    llm_correction: boolean;
  };
};

type AIServiceConfig = {
  llm: {
    provider: string;
    services: LLMService[];
  };
  stt: {
    provider: string;
    available_providers: STTProvider[];
    realtime_mode: string;
  };
  nlp: {
    services: NLPService[];
  };
};

type UsageEntry = {
  service: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  request_count: number;
};

type UsageData = {
  services: UsageEntry[];
  monthly_cost_usd: number;
  daily_cost_usd: number;
};

const StatusBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
      active
        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
    }`}
  >
    {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
    {label}
  </span>
);

const formatCost = (usd: number) => {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(2)}`;
};

const formatTokens = (tokens: number) => {
  if (tokens === 0) return '0';
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
};

const formatDuration = (seconds: number) => {
  if (seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const serviceLabel = (service: string, model: string) => {
  if (service === 'stt') return `STT: ${model || 'Deepgram'}`;
  if (service === 'llm') return `LLM: ${model || 'Groq'}`;
  return `${service}: ${model}`;
};

const AdminAIServices: React.FC = () => {
  const [config, setConfig] = React.useState<AIServiceConfig | null>(null);
  const [usage, setUsage] = React.useState<UsageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [configRes, usageRes] = await Promise.all([
          api.get('/api/admin/ai-services'),
          api.get('/api/admin/ai-services/usage').catch(() => ({ data: { services: [], monthly_cost_usd: 0, daily_cost_usd: 0 } })),
        ]);
        if (!cancelled) {
          setConfig(configRes.data);
          setUsage(usageRes.data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail || 'Khong tai duoc cau hinh AI services');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-500">Dang tai cau hinh AI services...</p>;
  }

  if (error || !config) {
    return <p className="text-sm text-red-500">{error || 'Khong co du lieu'}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Usage & Costs */}
      {usage && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Usage & Costs</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Chi phi su dung AI services</p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/20 dark:bg-emerald-900/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Thang nay</p>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-slate-100">{formatCost(usage.monthly_cost_usd)}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Hom nay</p>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-slate-100">{formatCost(usage.daily_cost_usd)}</p>
            </div>
          </div>

          {usage.services.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">Chua co usage data. Upload meeting de bat dau tracking.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-500">Service</th>
                    <th className="px-4 py-3 font-bold text-gray-500">Requests</th>
                    <th className="px-4 py-3 font-bold text-gray-500">Input</th>
                    <th className="px-4 py-3 font-bold text-gray-500">Output</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-500">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {usage.services.map((entry, idx) => (
                    <tr key={idx} className="transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">
                        {serviceLabel(entry.service, entry.model)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{entry.request_count}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                        {entry.service === 'stt'
                          ? formatDuration(entry.total_input_tokens)
                          : formatTokens(entry.total_input_tokens)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                        {entry.service === 'stt' ? '-' : formatTokens(entry.total_output_tokens)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-slate-100">
                        {formatCost(entry.total_cost_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LLM Services */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">LLM Services</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Provider chinh: <span className="font-bold text-gray-700 dark:text-slate-200">{config.llm.provider}</span>
            </p>
          </div>
        </div>

        {config.llm.services.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Chua cau hinh LLM provider nao.</p>
        ) : (
          <div className="space-y-3">
            {config.llm.services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-2xl border border-gray-100 p-4 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{service.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Model: {service.model}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge active={service.api_key_set} label={service.api_key_set ? 'API Key set' : 'No key'} />
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                      service.role === 'primary'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}
                  >
                    {service.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STT Services */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            <Mic size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">STT Services</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Provider chinh: <span className="font-bold text-gray-700 dark:text-slate-200">{config.stt.provider}</span>
              {' '}&middot;{' '}
              Realtime: <span className="font-bold text-gray-700 dark:text-slate-200">{config.stt.realtime_mode}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {config.stt.available_providers.map((provider) => (
            <div
              key={provider.id}
              className={`flex items-center justify-between rounded-2xl border p-4 ${
                provider.active
                  ? 'border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10'
                  : 'border-gray-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {provider.active && <Radio size={16} className="text-purple-600 dark:text-purple-400" />}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{provider.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Model: {provider.model}</p>
                </div>
              </div>
              <StatusBadge active={provider.active} label={provider.active ? 'Active' : 'Inactive'} />
            </div>
          ))}
        </div>
      </div>

      {/* NLP Post-Processing */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">NLP Post-Processing</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Xu ly ngon ngu tu nhien sau khi chuyen doi STT</p>
          </div>
        </div>

        {config.nlp.services.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">Chua bat dich vu NLP nao.</p>
        ) : (
          <div className="space-y-3">
            {config.nlp.services.map((service) => (
              <div
                key={service.name}
                className="rounded-2xl border border-gray-100 p-4 dark:border-slate-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{service.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Model: {service.model}</p>
                  </div>
                  <StatusBadge active={service.enabled} label={service.enabled ? 'Enabled' : 'Disabled'} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      service.features.dialect_detection
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Dialect Detection
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      service.features.context_correction
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Context Correction
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      service.features.llm_correction
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    LLM Correction
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIServices;
