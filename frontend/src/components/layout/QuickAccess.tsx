/**
 * QuickAccess Component
 * Quick access links cho sidebar - Meetings, Actions, Notifications, Upload
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  Upload,
  Bell,
  CheckCircle2,
  Mic,
} from 'lucide-react';

interface QuickAccessItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const QuickAccess: React.FC = () => {
  const location = useLocation();

  const items: QuickAccessItem[] = [
    {
      label: 'Tất cả cuộc họp',
      path: '/meetings',
      icon: <FileText size={16} />,
    },
    {
      label: 'Họp trực tuyến',
      path: '/meetings/create',
      icon: <Mic size={16} />,
    },
    {
      label: 'Việc cần làm',
      path: '/actions',
      icon: <CheckCircle2 size={16} />,
    },
    {
      label: 'Thông báo',
      path: '/notifications',
      icon: <Bell size={16} />,
    },
    {
      label: 'Tải âm thanh lên',
      path: '/upload',
      icon: <Upload size={16} />,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/meetings' && location.pathname === '/meetings') return true;
    if (path === '/meetings/create' && location.pathname === '/meetings/create') return true;
    if (path === '/actions' && location.pathname.startsWith('/actions')) return true;
    if (path === '/notifications' && location.pathname.startsWith('/notifications')) return true;
    return location.pathname === path;
  };

  return (
    <div className="space-y-1 px-2">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
              active
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {item.icon}
              {item.label}
            </span>
            {item.badge && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default QuickAccess;
