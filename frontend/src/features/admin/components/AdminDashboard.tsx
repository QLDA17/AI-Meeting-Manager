import React, { useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Clock,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Globe,
  ArrowRight,
  PieChart as PieIcon,
  Activity,
  UserPlus,
  Key,
  Settings,
  AlertCircle,
} from 'lucide-react';
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
import { useAdminStore } from '../stores/adminStore';
import { useAppStore } from '../../../stores';
import { mockOrganizations, mockUsers } from '../../../data';
import { clsx } from 'clsx';
import { format } from 'date-fns';

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AdminDashboard Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl border border-red-100 bg-red-50 text-red-700 dark:bg-red-900/10 dark:border-red-900/20 m-6">
          <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi khi tải Dashboard</h2>
          <p className="text-sm">Vui lòng thử tải lại trang hoặc liên hệ hỗ trợ kỹ thuật.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold"
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MOCK_CHART_DATA = [
  { name: 'T2', hours: 45, users: 120 }, { name: 'T3', hours: 52, users: 135 }, { name: 'T4', hours: 88, users: 210 },
  { name: 'T5', hours: 70, users: 180 }, { name: 'T6', hours: 95, users: 240 }, { name: 'T7', hours: 30, users: 110 }, { name: 'CN', hours: 25, users: 95 },
];

const RECENT_ACTIVITIES = [
  { id: 1, type: 'org', action: 'Tổ chức mới tham gia', name: 'Đại học FPT', time: '2 giờ trước', color: 'blue' },
  { id: 2, type: 'user', action: 'Người dùng mới', name: 'Lê Văn Tám', time: '5 giờ trước', color: 'green' },
  { id: 3, type: 'system', action: 'Bảo trì hệ thống', name: 'Cluster STT-01', time: '8 giờ trước', color: 'amber' },
  { id: 4, type: 'alert', action: 'Cảnh báo tài nguyên', name: 'Storage 90%', time: '12 giờ trước', color: 'red' },
];

// ─── Shared Sub-Components ──────────────────────────────────────────────────

const AdminStatCard: React.FC<{ label: string, value: string | number, icon: React.ReactNode, trend: string, accent: 'blue' | 'indigo' | 'emerald' | 'amber' }> = ({ label, value, icon, trend, accent }) => {
  const accentClasses = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  }[accent];

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className={clsx("p-4 rounded-2xl", accentClasses)}>
          {icon}
        </div>
        <div className="flex items-center gap-1 text-xs font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
          <ArrowUpRight size={14} />
          {trend}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
};

const ServiceItem: React.FC<{ name: string, status: string, color: 'green' | 'amber' | 'blue' | 'red' }> = ({ name, status, color }) => {
  const colorClasses = {
    green: "bg-green-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse",
    amber: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
    blue: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
    red: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
  }[color];

  const statusTextClasses = {
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    red: "text-red-600 bg-red-50 dark:bg-red-900/20",
  }[color];

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-slate-800/30 border border-gray-50 dark:border-slate-800/50 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className={clsx("w-2.5 h-2.5 rounded-full", colorClasses)} />
        <span className="text-sm font-bold text-gray-700 dark:text-slate-200">{name}</span>
      </div>
      <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter", statusTextClasses)}>{status}</span>
    </div>
  );
};

const QuickActionButton: React.FC<{ icon: React.ReactNode, label: string, color: 'blue' | 'indigo' | 'emerald' | 'rose' }> = ({ icon, label, color }) => {
  const hoverClasses = {
    blue: "hover:border-blue-200 hover:bg-blue-50/50 text-blue-600",
    indigo: "hover:border-indigo-200 hover:bg-indigo-50/50 text-indigo-600",
    emerald: "hover:border-emerald-200 hover:bg-emerald-50/50 text-emerald-600",
    rose: "hover:border-rose-200 hover:bg-rose-50/50 text-rose-600",
  }[color];

  const iconBgClasses = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  }[color];

  return (
    <button className={clsx(
      "flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-50 dark:border-slate-800 transition-all hover:shadow-lg active:scale-95",
      hoverClasses
    )}>
      <div className={clsx("p-2.5 rounded-xl", iconBgClasses)}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">{label}</span>
    </button>
  );
};

const QuickActions: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm h-full">
    <div className="flex items-center gap-2 mb-6">
      <Zap size={18} className="text-amber-500" />
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Thao tác nhanh</h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <QuickActionButton icon={<UserPlus size={20} />} label="Thêm Tổ chức" color="blue" />
      <QuickActionButton icon={<Key size={20} />} label="Quản lý API" color="indigo" />
      <QuickActionButton icon={<Settings size={20} />} label="Cấu hình STT" color="emerald" />
      <QuickActionButton icon={<AlertCircle size={20} />} label="Xem Log Lỗi" color="rose" />
    </div>
  </div>
);

const TopActiveTable: React.FC = () => {
  const topOrgs = useMemo(() => {
    return (mockOrganizations || []).slice(0, 5).map(org => ({
      ...org,
      activity: Math.floor(Math.random() * 80) + 20
    })).sort((a, b) => b.activity - a.activity);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Top Tổ chức hoạt động</h3>
          <p className="text-sm text-gray-500">Dựa trên tổng giờ họp và bản ghi AI</p>
        </div>
        <button className="text-xs font-bold text-indigo-600 hover:underline transition-all">Xem báo cáo</button>
      </div>
      <div className="space-y-6">
        {topOrgs.map((org, idx) => (
          <div key={org.id} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-bold text-gray-500">
              {idx + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{org.name}</span>
                <span className="text-xs font-black text-indigo-600">{org.activity}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${org.activity}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full" 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentUsersList: React.FC = () => {
  const users = useMemo(() => (mockUsers || []).slice(0, 6), []);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm h-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Người dùng gần đây</h3>
        <button className="text-xs font-bold text-indigo-600 hover:underline transition-all">Quản lý User</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
              {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Active</p>
              </div>
            </div>
            <div className="text-[10px] font-black text-gray-400">
               {format(new Date(), 'HH:mm')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Content ───────────────────────────────────────────────────────────

const AdminDashboardContent: React.FC = () => {
  const { stats } = useAdminStore();
  const { meetings } = useAppStore();

  // Real Meeting Status Data
  const statusData = useMemo(() => {
    const counts = { completed: 0, processing: 0, queued: 0, failed: 0 };
    if (meetings && Array.isArray(meetings)) {
      meetings.forEach(m => {
        const status = (m as any).status || 'completed';
        if (status === 'completed') counts.completed++;
        else if (status === 'processing') counts.processing++;
        else if (status === 'queued') counts.queued++;
        else if (status === 'failed') counts.failed++;
      });
    }
    return [
      { name: 'Hoàn thành', value: counts.completed, color: '#10b981' },
      { name: 'Đang xử lý', value: counts.processing, color: '#6366f1' },
      { name: 'Đang chờ', value: counts.queued, color: '#f59e0b' },
      { name: 'Lỗi', value: counts.failed, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [meetings]);

  if (!stats) return <div className="p-12 text-center font-bold text-gray-400">Đang tải dữ liệu hệ thống...</div>;

  return (
    <div className="space-y-8 pb-10">
      {/* Row 1: Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard label="Tổ chức" value={stats.totalOrgs || 0} icon={<Building2 size={20} />} trend="+12%" accent="blue" />
        <AdminStatCard label="Người dùng" value={stats.totalUsers || 0} icon={<Users size={20} />} trend="+5%" accent="indigo" />
        <AdminStatCard label="Cuộc họp" value={stats.totalMeetings || 0} icon={<Clock size={20} />} trend="+18%" accent="emerald" />
        <AdminStatCard label="Giờ xử lý AI" value={`${(stats.totalHours || 0).toFixed(0)}h`} icon={<Zap size={20} />} trend="+22%" accent="amber" />
      </div>

      {/* Row 2: Performance & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tăng trưởng hệ thống</h3>
                <p className="text-sm text-gray-500">Giờ xử lý và Người dùng hoạt động</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all hover:shadow-md">
                Xuất báo cáo
              </button>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CHART_DATA}>
                  <defs>
                    <linearGradient id="adminChart" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fill="url(#adminChart)" />
                  <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <QuickActions />
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-emerald-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Dịch vụ cốt lõi</h3>
            </div>
            <div className="space-y-4">
              <ServiceItem name="Speech-to-Text" status="99.9% Uptime" color="green" />
              <ServiceItem name="Diarization AI" status="Active" color="green" />
              <ServiceItem name="API Gateway" status="Stable" color="blue" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Active & Meeting Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <TopActiveTable />
        </div>
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <PieIcon size={18} className="text-indigo-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trạng thái Cuộc họp</h3>
            </div>
            <div className="h-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Users & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RecentUsersList />
        </div>
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-8 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hoạt động gần đây</h3>
              <button className="text-xs font-bold text-indigo-600 hover:underline transition-all">Xem hết</button>
            </div>
            <div className="space-y-6 flex-1">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="flex gap-4 group">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                    act.color === 'blue' && "bg-blue-50 text-blue-600",
                    act.color === 'green' && "bg-green-50 text-green-600",
                    act.color === 'amber' && "bg-amber-50 text-amber-600",
                    act.color === 'red' && "bg-red-50 text-red-600",
                  )}>
                    {act.type === 'org' && <Building2 size={18} />}
                    {act.type === 'user' && <Users size={18} />}
                    {act.type === 'system' && <Zap size={18} />}
                    {act.type === 'alert' && <ShieldCheck size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{act.name}</p>
                    <p className="text-[11px] text-gray-500 font-medium">{act.action} • {act.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all">
              Tải thêm <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => (
  <AdminErrorBoundary>
    <AdminDashboardContent />
  </AdminErrorBoundary>
);

export default AdminDashboard;
