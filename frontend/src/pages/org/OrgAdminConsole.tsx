/**
 * OrgAdminConsole v3 - Dashboard cho Organization Admin
 * Removed: costs tab, budget references
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Clock,
  FileText,
  FolderOpen,
  FolderPlus,
  History,
  Plus,
  Settings,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrgStore } from '../../stores';
import { usePermission } from '../../hooks';
import { AnimatedCounter, PageState, StatCard } from '../../components/ui';
import OrgUsersTab from './OrgUsersTab';
import OrgSettingsTab from './OrgSettingsTab';
import OrgAuditLogsTab from './OrgAuditLogsTab';

type AdminTab = 'overview' | 'users' | 'settings' | 'audit-logs';

const formatHours = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0h';
  return `${value.toFixed(value >= 10 ? 0 : 1)}h`;
};

const OrgAdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const { user } = useAuth();
  const { currentOrg, groups, members, loadOrgDetails } = useOrgStore();
  const { isOrgAdmin } = usePermission();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [activeMetric, setActiveMetric] = useState<'members' | 'meetings' | 'hours'>('hours');

  // Sync URL tab parameter with local state
  React.useEffect(() => {
    if (tab && ['overview', 'users', 'settings', 'audit-logs'].includes(tab)) {
      setActiveTab(tab as AdminTab);
    }
  }, [tab]);

  React.useEffect(() => {
    if (currentOrg?.id) {
      loadOrgDetails(currentOrg.id);
    }
  }, [currentOrg?.id, loadOrgDetails]);

  // Update URL when tab changes
  const handleTabChange = (newTab: AdminTab) => {
    setActiveTab(newTab);
    if (newTab === 'overview') {
      navigate('/org/admin', { replace: true });
    } else {
      navigate(`/org/admin/${newTab}`, { replace: true });
    }
  };

  // Compute analytics dynamically for the Overview tab
  const analytics = React.useMemo(() => {
    if (groups.length === 0) return null;

    const totalHours = currentOrg?.totalHours || groups.reduce((sum, g) => sum + (g.totalHours || 0), 0) || 1;
    const totalMeetings = currentOrg?.meetingCount || groups.reduce((sum, g) => sum + (g.meetingCount || 0), 0) || 1;
    
    const mostMembersGroup = [...groups].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))[0];
    const mostMeetingsGroup = [...groups].sort((a, b) => (b.meetingCount || 0) - (a.meetingCount || 0))[0];
    const mostHoursGroup = [...groups].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0))[0];

    const avgMembers = ( (currentOrg?.memberCount || 0) / groups.length ).toFixed(1);
    const avgMeetings = ( (currentOrg?.meetingCount || 0) / groups.length ).toFixed(1);
    const avgHoursPerMeeting = totalMeetings > 0 ? (totalHours / totalMeetings).toFixed(1) : '0';

    return {
      totalHours,
      totalMeetings,
      mostMembersGroup,
      mostMeetingsGroup,
      mostHoursGroup,
      avgMembers,
      avgMeetings,
      avgHoursPerMeeting
    };
  }, [groups, currentOrg]);

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
    { key: 'settings', label: 'Cài đặt', icon: <Settings size={16} /> },
    { key: 'audit-logs', label: 'Nhật ký', icon: <History size={16} /> },
  ];

  const stats = [
    {
      label: 'Tổng người dùng',
      value: currentOrg?.memberCount || 0,
      icon: <Users size={18} />,
      accent: 'info' as const,
    },
    {
      label: 'Tổng nhóm',
      value: currentOrg?.groupCount || 0,
      icon: <FolderOpen size={18} />,
      accent: 'primary' as const,
    },
    {
      label: 'Tổng cuộc họp',
      value: currentOrg?.meetingCount || 0,
      icon: <FileText size={18} />,
      accent: 'success' as const,
    },
    {
      label: 'Giờ cộng tác',
      value: currentOrg?.totalHours || 0,
      icon: <Clock size={18} />,
      accent: 'warning' as const,
      subtitle: `${Number(currentOrg?.totalHours || 0).toFixed(
        Number(currentOrg?.totalHours || 0) >= 10 ? 0 : 1,
      )}h`,
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 px-1 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-gray-500 transition hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft size={14} />
            Quay lại
          </button>
          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-4xl font-black leading-none tracking-tight text-gray-900 dark:text-slate-100">
              <span>Quản trị tổ chức</span>
              {currentOrg?.name && (
                <span className="text-lg font-bold text-gray-400 dark:text-slate-500">
                  / {currentOrg.name}
                </span>
              )}
            </h1>
            <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
              {(currentOrg?.memberCount || 0).toString()} người dùng ·{' '}
              {(currentOrg?.groupCount || 0).toString()} nhóm ·{' '}
              {(currentOrg?.meetingCount || 0).toString()} cuộc họp
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/groups/create')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-5 py-2.5 text-xs font-black text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <FolderPlus size={14} className="stroke-[3]" />
            Tạo nhóm mới
          </button>
          <button
            onClick={() => handleTabChange('users')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-primary-600/30"
          >
            <UserPlus size={14} className="stroke-[3]" />
            Mời người dùng
          </button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-5 sm:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + index * 0.04 }}
          >
            <StatCard
              label={stat.label}
              value={<AnimatedCounter value={Number(stat.value) || 0} />}
              subtitle={stat.subtitle}
              icon={stat.icon}
              accent={stat.accent}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        {/* Tab Headers */}
        <div className="sticky top-0 z-20 rounded-t-2xl border-b border-gray-100 bg-white/85 px-3 py-2.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
          <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-sm dark:from-primary-950/30 dark:to-primary-900/10 dark:text-primary-200 border border-primary-100/50 dark:border-primary-900/20'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="px-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <BarChart3 className="text-primary-650 animate-pulse" size={18} />
                    Bản đồ Phân tích & Thống kê Hoạt động
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Theo dõi mức độ hoạt động và hiệu suất của các nhóm để điều phối tài nguyên và thành viên tối ưu nhất.
                  </p>
                </div>
                {/* Metric Selector Tabs */}
                <div className="flex bg-gray-100/80 dark:bg-slate-800/85 p-1 rounded-xl shrink-0 border border-gray-200/40 dark:border-slate-700/40 self-start md:self-center">
                  {(['hours', 'meetings', 'members'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMetric(m)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        activeMetric === m
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-slate-100 border border-gray-200/20 dark:border-slate-800/20'
                          : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {m === 'hours' ? 'Giờ cộng tác' : m === 'meetings' ? 'Số cuộc họp' : 'Số thành viên'}
                    </button>
                  ))}
                </div>
              </div>

              {groups.length === 0 ? (
                <PageState
                  title="Tổ chức này chưa có nhóm nào"
                  description="Tạo nhóm đầu tiên để bắt đầu phân tách không gian cộng tác theo phòng ban, dự án hoặc chuyên môn."
                  tone="empty"
                  action={
                    <button
                      onClick={() => navigate('/groups/create')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black text-white shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1"
                    >
                      <FolderPlus size={18} />
                      Tạo nhóm mới
                    </button>
                  }
                />
              ) : analytics && (
                <div className="space-y-6">
                  {/* Collaboration Performance Averages Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-150/70 bg-gradient-to-br from-white to-gray-50/20 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">
                          Thành viên trung bình
                        </h4>
                        <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                          {analytics.avgMembers} <span className="text-xs font-semibold text-gray-400">/ nhóm</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-150/70 bg-gradient-to-br from-white to-gray-50/20 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">
                          Cuộc họp trung bình
                        </h4>
                        <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                          {analytics.avgMeetings} <span className="text-xs font-semibold text-gray-400">/ nhóm</span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-150/70 bg-gradient-to-br from-white to-gray-50/20 p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-0.5">
                          Chỉ số hiệu suất cộng tác
                        </h4>
                        <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                          {analytics.avgHoursPerMeeting}h <span className="text-xs font-semibold text-gray-400">/ cuộc họp</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard/Statistics table list */}
                  <div className="rounded-xl border border-gray-150/70 bg-white/70 p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/30 space-y-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
                        Xếp hạng hoạt động của nhóm ({
                          activeMetric === 'hours' ? 'Theo giờ cộng tác' : activeMetric === 'meetings' ? 'Theo cuộc họp' : 'Theo thành viên'
                        })
                      </h4>
                      <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30 px-3 py-1 rounded-lg border border-primary-100/50 dark:border-primary-900/20">
                        Tổng cộng:{' '}
                        <strong className="text-gray-900 dark:text-slate-100">
                          {activeMetric === 'hours'
                            ? `${formatHours(analytics.totalHours)}`
                            : activeMetric === 'meetings'
                            ? `${analytics.totalMeetings} cuộc họp`
                            : `${currentOrg?.memberCount || 0} thành viên`}
                        </strong>
                      </span>
                    </div>

                    <div className="space-y-4">
                      {[...groups]
                        .sort((a, b) => {
                          if (activeMetric === 'hours') return (b.totalHours || 0) - (a.totalHours || 0);
                          if (activeMetric === 'meetings') return (b.meetingCount || 0) - (a.meetingCount || 0);
                          return (b.memberCount || 0) - (a.memberCount || 0);
                        })
                        .map((group) => {
                          // Compute percentage share
                          let percent = 0;
                          if (activeMetric === 'hours') {
                            percent = analytics.totalHours > 0 ? Math.round(((group.totalHours || 0) / analytics.totalHours) * 100) : 0;
                          } else if (activeMetric === 'meetings') {
                            percent = analytics.totalMeetings > 0 ? Math.round(((group.meetingCount || 0) / analytics.totalMeetings) * 100) : 0;
                          } else {
                            const totalMembers = currentOrg?.memberCount || groups.reduce((sum, g) => sum + (g.memberCount || 0), 0) || 1;
                            percent = totalMembers > 0 ? Math.round(((group.memberCount || 0) / totalMembers) * 100) : 0;
                          }

                          const getAccessLabel = (visibility: string, joinPolicy: string) => {
                            if (visibility === 'hidden') return 'Ẩn · Chỉ theo lời mời';
                            if (joinPolicy === 'invite_only') return 'Hiển thị · Chỉ theo lời mời';
                            if (joinPolicy === 'request_approval') return 'Hiển thị · Yêu cầu phê duyệt';
                            return 'Hiển thị · Tự tham gia';
                          };

                          const accessLabel = getAccessLabel(group.visibility || '', group.joinPolicy || '');

                          return (
                            <div
                              key={group.id}
                              className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-150/70 bg-white/40 dark:border-slate-800 dark:bg-slate-900/20 hover:bg-white/95 dark:hover:bg-slate-850/80 transition-all duration-200 shadow-sm"
                            >
                              {/* Left: Folder Icon & Info */}
                              <div className="flex items-center gap-3.5 min-w-0 md:w-64">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/20 shadow-sm">
                                  <FolderOpen size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-gray-905 dark:text-slate-100 text-sm truncate">
                                      {group.name}
                                    </h5>
                                    <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-755 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                      <span className="relative flex h-1 w-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
                                      </span>
                                      Đang hoạt động
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                                    {accessLabel}
                                  </p>
                                </div>
                              </div>

                              {/* Middle: Horizontal Metrics list */}
                              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-gray-500 dark:text-slate-400">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-850 px-2.5 py-1 border border-gray-150/40 dark:border-slate-800/40 shadow-xs">
                                  <Users size={13} className="text-gray-400" />
                                  {group.memberCount} thành viên
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-850 px-2.5 py-1 border border-gray-150/40 dark:border-slate-800/40 shadow-xs">
                                  <FileText size={13} className="text-gray-400" />
                                  {group.meetingCount} cuộc họp
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-850 px-2.5 py-1 border border-gray-150/40 dark:border-slate-800/40 shadow-xs">
                                  <Clock size={13} className="text-gray-400" />
                                  {formatHours(group.totalHours)}
                                </span>
                              </div>

                              {/* Right: Progress bar & Action */}
                              <div className="flex items-center gap-4 shrink-0 w-full md:w-56">
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1">
                                    <span>Tỷ trọng đóng góp</span>
                                    <span>{percent}%</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary-600 transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                                <button
                                  onClick={() => navigate(`/groups/${group.id}`)}
                                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-gray-650 hover:text-gray-900 text-xs font-bold dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 shadow-sm transition shrink-0"
                                >
                                  Xem nhóm
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && currentOrg && <OrgUsersTab orgId={currentOrg.id} />}
          {activeTab === 'settings' && currentOrg && <OrgSettingsTab orgId={currentOrg.id} />}
          {activeTab === 'audit-logs' && currentOrg && <OrgAuditLogsTab orgId={currentOrg.id} />}
        </div>
      </div>
    </div>
  );
};

export default OrgAdminConsole;
