import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Send,
  Search,
  Users,
  Building2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Info,
  TrendingUp,
  Mail,
  Smartphone,
  Eye,
} from 'lucide-react';
import { mockOrganizations } from '../../../data';
import { format } from 'date-fns';
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
  Legend,
} from 'recharts';

interface SystemNotification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'broadcast';
  target: 'all' | string; 
  sentAt: Date;
  status: 'sent' | 'scheduled';
  reach: number;
}

const volumeData = [
  { day: 'T2', count: 2 },
  { day: 'T3', count: 5 },
  { day: 'T4', count: 3 },
  { day: 'T5', count: 8 },
  { day: 'T6', count: 4 },
  { day: 'T7', count: 1 },
  { day: 'CN', count: 3 },
];

const targetDistribution = [
  { name: 'Toàn hệ thống', value: 70 },
  { name: 'Theo Tổ chức', value: 30 },
];

const COLORS = ['#ef4444', '#3b82f6'];

const AdminNotifications: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'broadcast'>('info');
  const [target, setTarget] = useState('all');
  const [isSending, setIsLoading] = useState(false);

  const [history] = useState<SystemNotification[]>([
    { id: '1', title: 'Bảo trì hệ thống định kỳ', content: 'Hệ thống sẽ bảo trì từ 2h sáng đến 4h sáng chủ nhật.', type: 'warning', target: 'all', sentAt: new Date(), status: 'sent', reach: 1250 },
    { id: '2', title: 'Cập nhật tính năng v2.4', content: 'Chúng tôi vừa ra mắt hệ thống quản trị mới cho doanh nghiệp.', type: 'info', target: 'all', sentAt: new Date(Date.now() - 86400000), status: 'sent', reach: 1100 },
    { id: '3', title: 'Cảnh báo bảo mật Org-001', content: 'Vui lòng kiểm tra lại các truy cập bất thường từ IP lạ.', type: 'broadcast', target: 'org-001', sentAt: new Date(Date.now() - 172800000), status: 'sent', reach: 45 },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setTitle('');
      setContent('');
      alert('Thông báo hệ thống đã được phát đi!');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* volume Chart */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Lưu lượng Thông báo</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">7 ngày gần nhất</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-red-600 dark:bg-red-900/20">
              <TrendingUp size={12} />
              +15% Volume
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Target Distribution */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <h3 className="mb-6 text-lg font-black text-gray-900 dark:text-slate-100 text-center">Phân bổ Đối tượng</h3>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetDistribution}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {targetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
             <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400 uppercase">Hệ thống (Global)</span>
                <span className="text-red-500">70%</span>
             </div>
             <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-400 uppercase">Doanh nghiệp (Org)</span>
                <span className="text-blue-500">30%</span>
             </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Compose & History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Compose Notification */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-red-600 p-2 text-white shadow-lg shadow-red-500/20">
                <Plus size={20} />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Broadcast mới</h3>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Tiêu đề</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Thông báo bảo trì..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-400">Nội dung</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nội dung gửi đến hàng ngàn người dùng..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={type} 
                  onChange={(e: any) => setType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="info">Thông tin</option>
                  <option value="warning">Cảnh báo</option>
                  <option value="broadcast">Quan trọng</option>
                </select>
                <select 
                  value={target} 
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">Tất cả User</option>
                  {mockOrganizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Send size={18} />
                  {isSending ? 'Đang gửi...' : 'Gửi Broadcast'}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-slate-800">
               <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Kênh phát hành</p>
               <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                     <div className="rounded-full bg-green-50 p-2 text-green-600"><Mail size={16} /></div>
                     <span className="text-[9px] font-bold">Email</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                     <div className="rounded-full bg-blue-50 p-2 text-blue-600"><Smartphone size={16} /></div>
                     <span className="text-[9px] font-bold">App Push</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                     <div className="rounded-full bg-purple-50 p-2 text-purple-600"><Info size={16} /></div>
                     <span className="text-[9px] font-bold">In-app</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Notification History */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-slate-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Lịch sử gửi</h3>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                   <p className="text-[10px] font-black uppercase text-gray-400">Khả năng tiếp cận</p>
                   <p className="text-sm font-black text-green-600">~2,400 Users</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {history.map((item) => (
                <div key={item.id} className="group flex flex-col p-6 transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center sm:gap-6">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    item.type === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' :
                    item.type === 'broadcast' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                  }`}>
                    {item.type === 'warning' ? <AlertCircle size={24} /> : <Info size={24} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-gray-900 dark:text-slate-100">{item.title}</h4>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-slate-800">
                        {item.target === 'all' ? 'Hệ thống' : 'Tổ chức'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-500 dark:text-slate-400">{item.content}</p>
                    <div className="mt-2 flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      <span className="flex items-center gap-1 text-blue-500">
                         <Eye size={10} />
                         {item.reach.toLocaleString()} Reach
                      </span>
                      <span className="flex items-center gap-1">
                         <CheckCircle2 size={10} className="text-green-500" />
                         Đã gửi {format(item.sentAt, 'dd/MM HH:mm')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100 sm:mt-0">
                    <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
