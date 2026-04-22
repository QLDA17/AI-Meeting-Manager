/**
 * OrgAdminConsole v3 - Dashboard cho Organization Admin
 * Removed: costs tab, budget references
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  FolderOpen,
  FileText,
  TrendingUp,
  UserPlus,
  BarChart3,
  Settings,
  Building2,
  ArrowLeft,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrgStore } from '../../stores';
import { usePermission } from '../../hooks';
import OrgUsersTab from './OrgUsersTab';
import OrgGroupsTab from './OrgGroupsTab';
import OrgGlossariesTab from './OrgGlossariesTab';
import OrgSettingsTab from './OrgSettingsTab';

type AdminTab = 'overview' | 'users' | 'groups' | 'glossaries' | 'settings';

const OrgAdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const { user } = useAuth();
  const { currentOrg, groups, members } = useOrgStore();
  const { isOrgAdmin } = usePermission();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Sync URL tab parameter with local state
  React.useEffect(() => {
    if (tab && ['overview', 'users', 'groups', 'glossaries', 'settings'].includes(tab)) {
      setActiveTab(tab as AdminTab);
    }
  }, [tab]);

  // Update URL when tab changes
  const handleTabChange = (newTab: AdminTab) => {
    setActiveTab(newTab);
    if (newTab === 'overview') {
      navigate('/org/admin', { replace: true });
    } else {
      navigate(`/org/admin/${newTab}`, { replace: true });
    }
  };

  // Redirect if not org admin
  if (!isOrgAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-900/20">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-300">Access Denied</h2>
        <p className="mt-2 text-gray-600 dark:text-slate-300">
          Bạn cần quyền Quản trị tổ chức để xem trang này.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Về Dashboard
        </button>
      </div>
    );
  }

  const tabs: Array<{ key: AdminTab; label: string; icon: React.ReactNode }> = [
    { key: 'overview', label: 'Tổng quan', icon: <BarChart3 size={16} /> },
    { key: 'users', label: 'Người dùng', icon: <Users size={16} /> },
    { key: 'groups', label: 'Nhóm', icon: <FolderOpen size={16} /> },
    { key: 'glossaries', label: 'Từ điển', icon: <BookOpen size={16} /> },
    { key: 'settings', label: 'Cài đặt', icon: <Settings size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-3 flex items-center gap-1 text-sm text-gray-600 transition hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ArrowLeft size={14} />
              Quay lại
            </button>
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {currentOrg?.name} - Bảng quản trị
              </h1>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Org Admin
              </span>
            </div>
            <p className="mt-2 text-gray-600 dark:text-slate-300">
              Quản lý người dùng, nhóm và cài đặt tổ chức
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            <UserPlus size={14} />
            Mời người dùng
          </button>
        </div>
      </motion.section>

      {/* Quick Stats */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-4"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Users size={16} />
            <span>Tổng người dùng</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {currentOrg?.memberCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <FolderOpen size={16} />
            <span>Tổng nhóm</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {currentOrg?.groupCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <FileText size={16} />
            <span>Tổng cuộc họp</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {currentOrg?.meetingCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <Clock size={16} />
            <span>Tổng giờ ghi âm</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
            {currentOrg?.totalHours || 0}h
          </p>
        </div>
      </motion.section>

      {/* Tabs */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 px-2 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-300 dark:text-primary-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Tổng quan tổ chức
              </h3>

              {/* Nhóm hoạt động nhiều nhất */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-slate-200">
                  Nhóm hoạt động nhiều nhất
                </h4>
                <div className="space-y-2">
                  {groups.slice(0, 5).map((group, idx) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-800/70"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {group.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-300">
                        {group.meetingCount} cuộc họp • {group.memberCount} thành viên • {group.totalHours}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && currentOrg && <OrgUsersTab orgId={currentOrg.id} />}
          {activeTab === 'groups' && currentOrg && <OrgGroupsTab orgId={currentOrg.id} />}
          {activeTab === 'glossaries' && currentOrg && <OrgGlossariesTab orgId={currentOrg.id} />}
          {activeTab === 'settings' && currentOrg && <OrgSettingsTab orgId={currentOrg.id} />}
        </div>
      </div>
    </div>
  );
};

export default OrgAdminConsole;
