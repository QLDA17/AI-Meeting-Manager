import React from 'react';
import { Activity, Clock3, Search, ShieldAlert } from 'lucide-react';

import api from '../../services/api';
import { useOrgStore } from '../../stores';

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
  const { members, loadMembers } = useOrgStore();
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    loadMembers(orgId);
  }, [orgId, loadMembers]);

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

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('INVITE') || act.includes('JOIN') || act.includes('ADD') || act.includes('ACCEPT')) {
      return 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20';
    }
    if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('ARCHIVE') || act.includes('BAN') || act.includes('CANCEL') || act.includes('PAUSE') || act.includes('REVOKE')) {
      return 'bg-rose-50/70 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20';
    }
    return 'bg-amber-50/70 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20';
  };

  return (
    <div className="space-y-6">
      {/* Tab Sub-Header & Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="text-primary-650 animate-pulse" size={18} />
            Nhật ký tổ chức
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Theo dõi các thay đổi cấu hình, nhóm, thành viên và bảo mật trong phạm vi tổ chức.
          </p>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo user, action, target..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-primary-900/30"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-655 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
          <ShieldAlert size={18} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-150 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/30">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-800/80 bg-gray-50/30 dark:bg-slate-900/10">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            {filteredLogs.length} hoạt động phù hợp
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-12 text-sm text-gray-500 dark:text-slate-400 bg-white/30 dark:bg-slate-900/10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              Đang tải nhật ký...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-6 py-12 text-center bg-white/30 dark:bg-slate-900/10">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                Chưa có bản ghi phù hợp
              </p>
              <p className="mt-1 text-xs text-gray-455 dark:text-slate-400">
                Audit log sẽ xuất hiện ở đây khi có thay đổi trong tổ chức.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-sm text-gray-500 dark:text-slate-400">
                <thead className="bg-gray-50/40 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:bg-slate-900/50 dark:text-slate-500 border-b border-gray-100 dark:border-slate-800/80">
                  <tr>
                    <th className="px-6 py-3 font-bold">Hành động</th>
                    <th className="px-6 py-3 font-bold">Người thực hiện</th>
                    <th className="px-6 py-3 font-bold">Đối tượng</th>
                    <th className="px-6 py-3 font-bold">Địa chỉ IP</th>
                    <th className="px-6 py-3 font-bold text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white/30 dark:bg-slate-900/10">
                  {filteredLogs.map((log) => {
                    const cleanUser = log.user.trim().toLowerCase();
                    const foundMember = members.find(m => 
                      m.email.toLowerCase() === cleanUser || 
                      m.displayName?.toLowerCase() === cleanUser ||
                      m.username?.toLowerCase() === cleanUser
                    );
                    const avatarUrl = foundMember?.avatarUrl;
                    const orgMembership = foundMember?.orgMemberships?.find(item => item.orgId === orgId);
                    const userRole = orgMembership?.role || log.role;

                    const getRoleLabel = (r: string) => {
                      const lower = r.toLowerCase();
                      if (lower === 'org-admin' || lower === 'admin') return 'Quản trị viên';
                      if (lower === 'member') return 'Thành viên';
                      return r;
                    };

                    return (
                      <tr key={log.id} className="transition-colors hover:bg-gray-50/30 dark:hover:bg-slate-800/10">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center self-start rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${getActionBadgeClass(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 ml-1">
                              {getRoleLabel(userRole)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-[10px] font-bold text-primary-750 dark:bg-primary-950/40 dark:text-primary-300 border border-primary-200/20 shadow-sm">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={log.user} className="h-full w-full object-cover" />
                              ) : (
                                log.user[0].toUpperCase()
                              )}
                            </div>
                            <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate max-w-[180px]" title={log.user}>
                              {log.user}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex text-xs font-semibold text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-lg border border-gray-100/50 dark:border-slate-800/50">
                            {log.target}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <code className="text-[10px] font-bold font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-850 px-1.5 py-0.5 rounded border border-gray-100/30 dark:border-slate-800/20">
                            {log.ip}
                          </code>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-bold text-gray-450 dark:text-slate-400">
                          <div className="inline-flex items-center gap-1.5">
                            <Clock3 size={12} className="text-gray-400" />
                            {new Date(log.time).toLocaleString('vi-VN')}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgAuditLogsTab;
