import React from 'react';
import { Search, Shield, Users, UserCheck, UserPlus, UserMinus, TrendingUp } from 'lucide-react';
import { mockUsers } from '@/shared/mockData';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { clsx } from 'clsx';

const growthData = [
  { name: '01/04', users: 120 },
  { name: '05/04', users: 150 },
  { name: '10/04', users: 180 },
  { name: '15/04', users: 240 },
  { name: '20/04', users: 310 },
  { name: '25/04', users: 380 },
  { name: '30/04', users: 450 },
];

const roleData = [
  { name: 'Member', value: 380 },
  { name: 'Org Admin', value: 60 },
  { name: 'System Admin', value: 10 },
];

const COLORS = ['#3b82f6', '#10b981', '#ef4444'];

const AdminUsers: React.FC = () => {
  const stats = [
    { label: 'Tổng người dùng', value: '450', icon: <Users />, color: 'blue' },
    { label: 'Đang hoạt động', value: '412', icon: <UserCheck />, color: 'green' },
    { label: 'Người dùng mới', value: '+45', icon: <UserPlus />, color: 'purple' },
    { label: 'Đã vô hiệu hóa', value: '8', icon: <UserMinus />, color: 'red' },
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

      {/* Analytics Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
             <h3 className="text-lg font-black text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary-500" />
                Tăng trưởng người dùng
             </h3>
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">30 ngày qua</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="step" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
           <h3 className="mb-6 text-lg font-black text-gray-900 dark:text-slate-100">Cơ cấu Vai trò</h3>
           <div className="h-[200px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={roleData}
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {roleData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="mt-4 space-y-2">
              {roleData.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-xs font-bold">
                   <div className="flex items-center gap-2 text-gray-500">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      {r.name}
                   </div>
                   <span className="text-gray-900 dark:text-slate-100">{r.value}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm người dùng toàn hệ thống bằng email, tên..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-sm font-bold outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5">Người dùng</th>
                <th className="px-6 py-5">Email</th>
                <th className="px-6 py-5">System Role</th>
                <th className="px-6 py-5">Tổ chức</th>
                <th className="px-6 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {(mockUsers || []).slice(0, 10).map((user) => (
                <tr key={user.id} className="transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-[11px] font-black text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {(user.displayName?.[0] || 'U').toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-slate-100">{user.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-gray-600 dark:text-slate-400">{user.email}</td>
                  <td className="px-6 py-5">
                    {user.systemRole === 'system-admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        <Shield size={10} /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic">User</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-xs font-bold text-gray-500">
                    {(user.orgMemberships || []).length > 0 ? `${user.orgMemberships.length} Org(s)` : '---'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-700 transition-colors">
                      Khóa
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

export default AdminUsers;
