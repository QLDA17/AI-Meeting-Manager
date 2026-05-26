import React from 'react';
import { Activity, Clock3, Search, ShieldAlert } from 'lucide-react';

import api from '../../services/api';

interface OrgAuditLogsTabProps {
  orgId: string;
}

type AuditLogEntry = {
  id: string;
  time: string;
  user: string;
  role: string;
  action: string;
  target: string;
  org: string;
  ip: string;
};

const OrgAuditLogsTab: React.FC<OrgAuditLogsTabProps> = ({ orgId }) => {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/api/organizations/${orgId}/audit-logs`);
        if (!cancelled) {
          setLogs(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Không tải được nhật ký tổ chức');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const filteredLogs = logs.filter((log) => {
    const haystack = `${log.user} ${log.role} ${log.action} ${log.target}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-gray-200 bg-gradient-to-br from-white via-white to-gray-50 p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-gray-700 dark:bg-slate-800 dark:text-slate-200">
              <Activity size={14} />
              Audit
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-slate-100">
              Nhật ký tổ chức
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Theo dõi các thay đổi quản trị, nhóm, cuộc họp và lời mời trong phạm vi tổ chức này.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo user, action, target..."
              className="w-full rounded-3xl border border-gray-200 bg-white px-12 py-3 text-sm font-medium outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-primary-900/30"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
          <ShieldAlert size={20} />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-800">
          <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">
            {filteredLogs.length} hoạt động phù hợp
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {loading && (
            <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm text-gray-500 dark:text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              Đang tải nhật ký...
            </div>
          )}

          {!loading && filteredLogs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Chưa có bản ghi phù hợp
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                Audit log sẽ xuất hiện ở đây khi có thay đổi trong tổ chức.
              </p>
            </div>
          )}

          {!loading &&
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-700 dark:bg-primary-950/30 dark:text-primary-200">
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      {log.role}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {log.user} <span className="font-normal text-gray-500 dark:text-slate-400">· {log.target}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">IP: {log.ip}</p>
                </div>

                <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-slate-400">
                  <Clock3 size={14} />
                  {new Date(log.time).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default OrgAuditLogsTab;
