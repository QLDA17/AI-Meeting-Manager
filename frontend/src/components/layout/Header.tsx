/**
 * Header Component (v2)
 * Top bar với search, notifications, user info
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUIStore } from '../../stores';
import Breadcrumbs from './Breadcrumbs';
import api from '../../services/api';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, setDarkMode, setMobileSidebarOpen, mobileSidebarOpen, setCommandPaletteOpen } = useUIStore();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    let cancelled = false;
    const fetchNotifications = async () => {
      if (!user) {
        if (!cancelled) setHasUnreadNotifications(false);
        return;
      }
      try {
        const res = await api.get('/api/notifications');
        const unread = Array.isArray(res.data) && res.data.some((n: any) => !n?.isRead);
        if (!cancelled) setHasUnreadNotifications(unread);
      } catch {
        if (!cancelled) setHasUnreadNotifications(false);
      }
    };

    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile menu + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right: Search, Theme, Notifications, User */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="relative hidden h-10 w-80 items-center rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-left text-sm text-gray-400 transition hover:border-primary-300 hover:text-gray-500 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:focus:ring-primary-900/30 md:flex"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <span className="truncate">Tìm cuộc họp, nhóm, việc cần làm...</span>
            <span className="ml-auto rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              ⌘K
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!isDarkMode)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-200"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary-200"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {hasUnreadNotifications && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>

          {/* User Avatar & Dropdown */}
          <div className="relative hidden sm:block" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 transition hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName || user.email || 'Avatar'} className="h-full w-full object-cover" />
                ) : (
                  (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-4 text-gray-800 dark:text-slate-100">
                  {user?.displayName || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {user?.systemRole || 'member'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-gray-500 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {/* User Info */}
                <div className="border-b border-gray-100 px-4 pb-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {user?.displayName || user?.email || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <User size={16} />
                    Hồ sơ cá nhân
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Settings size={16} />
                    Cài đặt
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 pt-1 dark:border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
