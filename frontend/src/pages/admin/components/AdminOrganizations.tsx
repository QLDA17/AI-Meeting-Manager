import React, { useMemo } from 'react';
import { Search, Plus, MoreVertical, Building2, CheckCircle2, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { mockOrganizations } from '../../../data';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { clsx } from 'clsx';

const chartData = [
  { name: 'ABC Company', hours: 286 },
  { name: 'XYZ Corp', hours: 142 },
  { name: 'Tech Startup', hours: 98 },
  { name: 'Global Edu', hours: 215 },
  { name: 'Muti AI', hours: 45 },
];

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const AdminOrganizations: React.FC = () => {
  const stats = [
    { label: 'Tổng Doanh nghiệp', value: mockOrganizations.length, icon: <Building2 />, color: 'blue' },
    { label: 'Đang hoạt động', value: mockOrganizations.length, icon: <CheckCircle2 />, color: 'green' },
    { label: 'Dung lượng (TB)', value: '1.2', icon: <TrendingUp />, color: 'purple' },
    { label: 'Bị khóa', value: 0, icon: <AlertCircle />, color: 'red' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const colorStyles = {
            blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
            green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
            purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
            red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
          }[s.color as 'blue' | 'green' | 'purple' | 'red'];

          return (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className={clsx("rounded-xl p-2", colorStyles)}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900 dark:text-slate-100">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
             <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 size={20} className="text-red-500" />
                Top 5 Tổ chức sử dụng AI nhiều nhất
             </h3>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tính theo số giờ</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" radius={[0, 10, 10, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
           <h3 className="mb-4 text-lg font-black text-gray-900 dark:text-slate-100">Cấp mới Org</h3>
           <p className="text-sm text-gray-500 mb-6">Tạo một không gian làm việc độc lập cho đối tượng khách hàng doanh nghiệp mới.</p>
           <button className="w-full rounded-2xl bg-red-600 py-4 font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 flex items-center justify-center gap-2">
              <Plus size={20} />
              Cấp phép ngay
           </button>
           <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between text-xs">
                 <span className="font-bold text-gray-400 uppercase tracking-widest">Hạn mức hệ thống</span>
                 <span className="font-bold text-gray-900 dark:text-slate-100">4 / 10 Org</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                 <div className="h-full w-[40%] rounded-full bg-red-500" />
              </div>
           </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Tìm kiếm tổ chức theo tên hoặc mô tả..."
            className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5">Tổ chức</th>
                <th className="px-6 py-5">Thành viên</th>
                <th className="px-6 py-5">Tổng giờ</th>
                <th className="px-6 py-5">Ngày tạo</th>
                <th className="px-6 py-5">Trạng thái</th>
                <th className="px-6 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {(mockOrganizations || []).map((org) => (
                <tr key={org.id} className="transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={org.logo} alt="" className="h-10 w-10 rounded-xl shadow-sm" />
                      <span className="font-bold text-gray-900 dark:text-slate-100">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-bold text-gray-600 dark:text-slate-400">{org.memberCount}</td>
                  <td className="px-6 py-5 font-bold text-gray-600 dark:text-slate-400">{org.totalHours}h</td>
                  <td className="px-6 py-5 text-xs font-bold text-gray-500">{format(new Date(org.createdAt), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-5">
                    <span className="inline-flex rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      Hoàn thành
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrganizations;
