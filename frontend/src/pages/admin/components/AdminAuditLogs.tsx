import React, { useState } from 'react';
import { Search, History, Filter, Download, ShieldAlert, User, Building2, Cpu, Settings } from 'lucide-react';
import { format } from 'date-fns';

const mockLogs = [
  { id: 'l1', time: new Date(), user: 'Nguyễn Văn A', role: 'System Admin', action: 'UPDATE_PROMPT', target: 'Summary Prompt v2', org: 'System', ip: '192.168.1.1' },
  { id: 'l2', time: new Date(Date.now() - 3600000), user: 'Trần Thị B', role: 'Org Admin', action: 'CREATE_GROUP', target: 'Phòng Kế Toán', org: 'ABC Company', ip: '14.232.11.2' },
  { id: 'l3', time: new Date(Date.now() - 7200000), user: 'Lê Văn C', role: 'Member', action: 'UPLOAD_AUDIO', target: 'Họp Q1.mp3', org: 'Tech Startup', ip: '113.190.22.1' },
  { id: 'l4', time: new Date(Date.now() - 86400000), user: 'Hệ thống', role: 'System', action: 'AUTO_DELETE', target: 'Bản ghi > 1 năm', org: 'System', ip: 'localhost' },
  { id: 'l5', time: new Date(Date.now() - 90000000), user: 'Nguyễn Văn A', role: 'System Admin', action: 'SUSPEND_USER', target: 'user-099', org: 'Global Education', ip: '192.168.1.1' },
];

const AdminAuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const getActionColor = (action: string) => {
    if (action.includes('UPDATE') || action.includes('CREATE')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('DELETE') || action.includes('SUSPEND')) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    if (action.includes('UPLOAD')) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    return 'text-gray-600 bg-gray-50 dark:bg-slate-800';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'System Admin') return <ShieldAlert size={12} className="text-red-500" />;
    if (role === 'Org Admin') return <Building2 size={12} className="text-blue-500" />;
    if (role === 'System') return <Cpu size={12} className="text-purple-500" />;
    return <User size={12} className="text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm theo user, action, target..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-sm outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Filter size={16} />
            Lọc
          </button>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black dark:bg-slate-100 dark:text-slate-900">
          <Download size={16} />
          Xuất CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4">Người thực hiện</th>
              <th className="px-6 py-4">Hành động</th>
              <th className="px-6 py-4">Mục tiêu</th>
              <th className="px-6 py-4">Tổ chức</th>
              <th className="px-6 py-4 text-right">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {mockLogs.map((log) => (
              <tr key={log.id} className="transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                <td className="px-6 py-4 text-xs font-bold text-gray-500">
                  {format(log.time, 'dd/MM/yyyy HH:mm:ss')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-slate-100">{log.user}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                      {getRoleIcon(log.role)} {log.role}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-700 dark:text-slate-300">{log.target}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{log.org}</td>
                <td className="px-6 py-4 text-right font-mono text-[10px] text-gray-400">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
