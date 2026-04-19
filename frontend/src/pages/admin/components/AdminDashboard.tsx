import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Clock,
  Cpu,
  Activity,
  CheckCircle2,
  Globe,
  TrendingUp,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AdminDashboardProps {
  stats: any;
}

const data = [
  { name: 'Mon', hours: 45, meetings: 12 },
  { name: 'Tue', hours: 52, meetings: 18 },
  { name: 'Wed', hours: 88, meetings: 25 },
  { name: 'Thu', hours: 70, meetings: 20 },
  { name: 'Fri', hours: 95, meetings: 32 },
  { name: 'Sat', hours: 30, meetings: 8 },
  { name: 'Sun', hours: 25, meetings: 5 },
];

const orgData = [
  { name: 'ABC Company', value: 400 },
  { name: 'XYZ Corp', value: 300 },
  { name: 'Tech Startup', value: 300 },
  { name: 'Global Education', value: 200 },
];

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Tổ chức', value: stats.totalOrgs, icon: <Building2 />, color: 'blue', trend: '+12%' },
          { label: 'Tổng User', value: stats.totalUsers, icon: <Users />, color: 'purple', trend: '+5%' },
          { label: 'Tổng cuộc họp', value: stats.totalMeetings, icon: <Clock />, color: 'green', trend: '+18%' },
          { label: 'Giờ AI xử lý', value: `${stats.totalHours.toFixed(0)}h`, icon: <Cpu />, color: 'amber', trend: '+22%' },
        ].map((s) => (
          <div key={s.label} className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className={`inline-flex rounded-2xl bg-slate-50 p-3 text-slate-600 dark:bg-slate-800 dark:text-slate-400`}>
                {s.icon}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-green-500">
                <ArrowUpRight size={14} />
                {s.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-black tracking-tight text-gray-900 dark:text-slate-100">{s.value}</p>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
            </div>
            <div className="absolute -bottom-2 -right-2 h-16 w-16 opacity-[0.03] grayscale transition-transform group-hover:scale-110 group-hover:opacity-[0.06]">
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Growth Chart */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Hiệu suất hệ thống</h3>
              <p className="text-xs font-medium text-gray-500">Số giờ xử lý AI 7 ngày qua</p>
            </div>
            <div className="flex gap-2">
               <span className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold dark:border-slate-800 dark:bg-slate-800">
                 <Calendar size={12} />
                 Tuần này
               </span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Org Distribution */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-lg font-black text-gray-900 dark:text-slate-100">Phân bổ Tổ chức</h3>
          <p className="mb-6 text-xs font-medium text-gray-500">Tỷ lệ người dùng theo doanh nghiệp</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orgData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orgData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
             <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500">Doanh nghiệp dẫn đầu</span>
                <span className="font-black text-red-500">ABC Company</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                <div className="h-full w-[40%] rounded-full bg-red-500" />
             </div>
          </div>
        </div>
      </div>

      {/* System Health Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Sức khỏe Hàng đợi</h3>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">Real-time</span>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Xử lý STT', val: stats.processingNow, total: 20, status: 'Ổn định', color: 'amber', icon: <Activity size={14} /> },
              { name: 'Google Cloud API', val: 98, total: 100, status: 'Online', color: 'green', icon: <CheckCircle2 size={14} /> },
              { name: 'Whisper Workers', val: 3, total: 4, status: 'Tốt', color: 'blue', icon: <Globe size={14} /> },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-${s.color}-500 p-2 text-white`}>
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.val} / {s.total} đang sử dụng</p>
                  </div>
                </div>
                <span className={`text-xs font-black text-${s.color}-600`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-6 text-lg font-black text-gray-900 dark:text-slate-100">Nhật ký Hệ thống</h3>
          <div className="space-y-4">
            {[
              { time: '10:45:22', type: 'INFO', msg: 'Organization "Tech Startup" created.', color: 'blue' },
              { time: '10:42:01', type: 'WARN', msg: 'Gemini API latency detected.', color: 'amber' },
              { time: '10:30:15', type: 'INFO', msg: 'Backup completed successfully.', color: 'blue' },
              { time: '10:15:00', type: 'AUTH', msg: 'User promoted to system-admin.', color: 'red' },
            ].map((log, i) => (
              <div key={i} className="flex gap-4 border-l-4 border-gray-100 pl-4 transition-colors hover:border-red-500 dark:border-slate-800">
                <div className="shrink-0 text-[10px] font-bold text-gray-400">{log.time}</div>
                <div>
                   <p className="text-xs font-bold text-gray-900 dark:text-slate-200">
                     <span className={`text-${log.color}-500 mr-2`}>[{log.type}]</span>
                     {log.msg}
                   </p>
                </div>
              </div>
            ))}
            <button className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:border-slate-800 dark:bg-slate-800/50">
              Xem toàn bộ logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
