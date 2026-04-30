import React from 'react';
import { Download, Search } from 'lucide-react';
import api from '../../../services/api';

type AuditLog = {
  id: string;
  time: string;
  user: string;
  role: string;
  action: string;
  target: string;
  org: string;
  ip: string;
};

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/admin/audit-logs');
        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Khong tai duoc audit logs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = logs.filter((log) => {
    const haystack = `${log.user} ${log.action} ${log.target} ${log.ip}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const exportCsv = () => {
    const headers = ['time', 'user', 'role', 'action', 'target', 'org', 'ip'];
    const rows = filtered.map((log) => headers.map((key) => `"${String((log as any)[key] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'admin-audit-logs.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tim theo user, action, target..."
            className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Download size={16} />
          Xuat CSV
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4">Thoi gian</th>
                <th className="px-6 py-4">Nguoi thuc hien</th>
                <th className="px-6 py-4">Hanh dong</th>
                <th className="px-6 py-4">Muc tieu</th>
                <th className="px-6 py-4 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-sm text-gray-500">
                    Dang tai du lieu...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-sm text-gray-500">
                    Khong co log nao.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">{new Date(log.time).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-slate-100">{log.user}</p>
                      <p className="text-[11px] text-gray-400">{log.role}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-black uppercase text-blue-600">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">{log.target}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">{log.ip}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
