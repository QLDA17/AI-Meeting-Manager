/**
 * SystemAdminConsole - Bảng điều khiển Quản trị toàn hệ thống
 * Đã được nâng cấp với Biểu đồ chuyên nghiệp, Quản lý thông báo, Prompts và Audit Logs
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  Activity,
} from 'lucide-react';
import { mockMeetings, mockOrganizations, mockUsers } from '../../data';

// Modular Components
import AdminDashboard from './components/AdminDashboard';
import AdminOrganizations from './components/AdminOrganizations';
import AdminUsers from './components/AdminUsers';
import AdminAIServices from './components/AdminAIServices';
import AdminNotifications from './components/AdminNotifications';
import AdminPrompts from './components/AdminPrompts';
import AdminAuditLogs from './components/AdminAuditLogs';
import AdminSettings from './components/AdminSettings';

type AdminTab = 'dashboard' | 'organizations' | 'users' | 'ai-services' | 'notifications' | 'prompts' | 'audit-logs' | 'settings';

const SystemAdminConsole: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Xác định tab hiện tại dựa trên URL path
  const activeTab = React.useMemo<AdminTab>(() => {
    const path = location.pathname;
    if (path.includes('/organizations')) return 'organizations';
    if (path.includes('/users')) return 'users';
    if (path.includes('/ai-services')) return 'ai-services';
    if (path.includes('/notifications')) return 'notifications';
    if (path.includes('/prompts')) return 'prompts';
    if (path.includes('/audit-logs')) return 'audit-logs';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  const stats = {
    totalOrgs: mockOrganizations.length,
    totalUsers: mockUsers.length,
    totalMeetings: mockMeetings.length,
    totalHours: mockMeetings.reduce((sum, m) => sum + m.duration, 0) / 60,
    processingNow: mockMeetings.filter(m => m.status === 'processing').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-600 p-1.5 text-white shadow-lg shadow-red-500/20">
              <Shield size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
              Quản trị Hệ thống
            </h1>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
            Toàn quyền điều hành nền tảng MultiMinutes AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400 sm:flex">
            <Activity size={12} />
            Hệ thống ổn định
          </div>
        </div>
      </motion.div>

      {/* Content View Area */}
      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminDashboard stats={stats} />
            </motion.div>
          )}
          {activeTab === 'organizations' && (
            <motion.div key="orgs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminOrganizations />
            </motion.div>
          )}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminUsers />
            </motion.div>
          )}
          {activeTab === 'ai-services' && (
            <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminAIServices />
            </motion.div>
          )}
          {activeTab === 'prompts' && (
            <motion.div key="prompts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminPrompts />
            </motion.div>
          )}
          {activeTab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminNotifications />
            </motion.div>
          )}
          {activeTab === 'audit-logs' && (
            <motion.div key="logs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminAuditLogs />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AdminSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SystemAdminConsole;
