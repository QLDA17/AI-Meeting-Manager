import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useAdminStore } from '@/features/admin/stores/adminStore';
import { useAppStore, useOrgStore } from '@/shared/lib/stores';
import { mockOrganizations, mockUsers } from '@/shared/mockData';

// New Modular Components - Ensure DEFAULT imports match their files
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import AdminOrganizations from '../components/AdminOrganizations';
import AdminUsers from '../components/AdminUsers';
import AdminAIServices from '../components/AdminAIServices';
import AdminNotifications from '../components/AdminNotifications';
import AdminPrompts from '../components/AdminPrompts';
import AdminAuditLogs from '../components/AdminAuditLogs';
import AdminSettings from '../components/AdminSettings';
import GlossariesAdmin from './GlossariesAdmin';

type AdminTab = 'dashboard' | 'organizations' | 'users' | 'ai-services' | 'notifications' | 'prompts' | 'glossaries' | 'audit-logs' | 'settings';

const SystemAdminConsole: React.FC = () => {
  const location = useLocation();
  const { setStats } = useAdminStore();
  const { meetings } = useAppStore();
  const { orgs } = useOrgStore();
  const [hasCrash, setHasCrash] = useState(false);
  
  // Safe Stats Calculation
  useEffect(() => {
    try {
      const safeMeetings = Array.isArray(meetings) ? meetings : [];
      const safeOrgs = Array.isArray(orgs) ? orgs : [];
      
      const totalHours = safeMeetings.reduce((sum, m) => {
        const duration = (m as any)?.duration || 0;
        return sum + (typeof duration === 'number' ? duration : 0);
      }, 0) / 60;

      const processingNow = safeMeetings.filter(m => {
        const status = (m as any)?.status;
        return status === 'processing' || status === 'queued';
      }).length;

      setStats({
        totalOrgs: safeOrgs.length || (mockOrganizations?.length || 0),
        totalUsers: mockUsers?.length || 0,
        totalMeetings: safeMeetings.length,
        totalHours: totalHours,
        processingNow: processingNow,
      });
    } catch (err) {
      console.error("SystemAdminConsole: Stats Calculation Crash", err);
      // setHasCrash(true); // Don't crash the whole UI for stats
    }
  }, [setStats, meetings, orgs]);

  const activeTab = useMemo<AdminTab>(() => {
    const path = location.pathname;
    if (path.includes('/organizations')) return 'organizations';
    if (path.includes('/users')) return 'users';
    if (path.includes('/ai-services')) return 'ai-services';
    if (path.includes('/notifications')) return 'notifications';
    if (path.includes('/prompts')) return 'prompts';
    if (path.includes('/glossaries')) return 'glossaries';
    if (path.includes('/audit-logs')) return 'audit-logs';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  if (hasCrash) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-red-200">
         <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
         <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Hệ thống Console gặp sự cố</h1>
         <p className="text-gray-500 mb-6">Một lỗi nghiêm trọng đã xảy ra khi xử lý dữ liệu quản trị.</p>
         <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20">
           Thử tải lại trang
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* System Status Banner (Minimal) */}
      <div className="flex items-center gap-2 mb-2">
        <Activity size={14} className="text-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
          Hệ thống đang ổn định • Real-time Monitoring
        </span>
      </div>

      <div className="min-h-[60vh]">
          {activeTab === 'dashboard' && <AdminDashboard />}
          {activeTab === 'organizations' && <AdminOrganizations />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'ai-services' && <AdminAIServices />}
          {activeTab === 'notifications' && <AdminNotifications />}
          {activeTab === 'prompts' && <AdminPrompts />}
          {activeTab === 'glossaries' && <GlossariesAdmin />}
          {activeTab === 'audit-logs' && <AdminAuditLogs />}
          {activeTab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
};

export default SystemAdminConsole;
