/**
 * AdminLayout - Layout riêng biệt cho trang Quản trị Hệ thống
 * Tách biệt hoàn toàn khỏi Sidebar và Header của người dùng
 */
import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  Users, 
  Cpu, 
  Settings, 
  LogOut,
  Bell,
  Search,
  TerminalSquare,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Tổng quan', path: '/admin/console', icon: <LayoutDashboard size={20} /> },
    { label: 'Tổ chức', path: '/admin/organizations', icon: <Building2 size={20} /> },
    { label: 'Người dùng', path: '/admin/users', icon: <Users size={20} /> },
    { label: 'Dịch vụ AI', path: '/admin/ai-services', icon: <Cpu size={20} /> },
    { label: 'Hệ thống Prompts', path: '/admin/prompts', icon: <TerminalSquare size={20} /> },
    { label: 'Thông báo', path: '/admin/notifications', icon: <Bell size={20} /> },
    { label: 'Nhật ký hệ thống', path: '/admin/audit-logs', icon: <History size={20} /> },
    { label: 'Cấu hình hệ thống', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Admin Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-slate-900 text-slate-300 dark:border-slate-800">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
            <div className="rounded-lg bg-red-600 p-1.5 text-white">
              <Shield size={20} />
            </div>
            <span className="font-black tracking-tight text-white uppercase text-sm">System Admin</span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${
                    active 
                      ? 'bg-slate-800 text-white' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-400 transition hover:bg-red-900/20 hover:text-red-400"
            >
              <LogOut size={20} />
              Thoát Quản trị
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh hệ thống..." 
              className="w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-red-400 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 dark:text-white">{user?.displayName}</p>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Root Administrator</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                {(user?.displayName?.[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
