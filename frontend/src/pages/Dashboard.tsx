import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Clock3,
  Sparkles,
  ArrowRight,
  Mic,
  FileText,
  Video,
  Users,
  Building2,
  FolderOpen,
  TrendingUp,
  Plus,
  Zap,
  Crown,
} from "lucide-react";
import { StatCard, Button, Badge, AnimatedCounter, LiveIndicator } from "../components/ui";
import { useOrgStore } from "../stores";
import { useAppStore, useNotificationStore } from "../stores";
import { usePermission } from "../hooks";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg, loadGroups } = useOrgStore();
  const { isOrgAdmin } = usePermission();
  const { meetings, getStats } = useAppStore();
  const [loading, setLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Load org data when org changes
  useEffect(() => {
    if (currentOrg?.id) {
      loadGroups(currentOrg.id);
    }
  }, [currentOrg?.id, loadGroups]);

  const appStats = useMemo(() => getStats(), [meetings]);

  const processingCount = useMemo(
    () => meetings.filter((m) => (m as any).status === "processing" || (m as any).status === "queued").length,
    [meetings]
  );

  const recentMeetings = useMemo(() => meetings.slice(0, 5), [meetings]);

  const hoursSaved = useMemo(() => {
    const estimatedHours = meetings.length * 2;
    return `${estimatedHours.toFixed(0)}h`;
  }, [meetings.length]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-body text-gray-500 dark:text-slate-400">
              Xin chào, <span className="font-semibold text-gray-800 dark:text-slate-100">{user?.displayName || user?.email}</span>
            </p>
            <h1 className="mt-1 text-h1 text-gray-900 dark:text-slate-100">Bảng điều khiển cuộc họp thông minh</h1>
            {processingCount > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <LiveIndicator isLive size="sm" color="warning" showLabel label="Đang xử lý" />
                <span className="text-xs text-gray-600 dark:text-slate-400">
                  {processingCount} cuộc họp đang được phân tích
                </span>
              </div>
            )}
            {currentOrg && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                <Building2 size={14} />
                <span className="font-medium">{currentOrg.name}</span>
                {isOrgAdmin && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 flex items-center gap-1">
                    <Crown size={10} /> Org Admin
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate('/upload')} icon={<Mic size={16} />}>
              Upload audio
            </Button>
            <Button variant="ghost" onClick={() => navigate("/meetings")} icon={<FileText size={16} />}>
              Xem tất cả
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Stats Cards */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard 
          label="Tổng cuộc họp" 
          value={<AnimatedCounter value={appStats.totalMeetings} />}
          subtitle="Đã xử lý trong hệ thống" 
        />
        <StatCard
          label="Đang xử lý"
          value={<AnimatedCounter value={processingCount} />}
          subtitle="Hàng đợi AI hiện tại"
          accent="warning"
          icon={<Clock3 size={16} />}
        />
        <StatCard
          label="Tổng giờ ghi âm"
          value={`${appStats.totalHours.toFixed(1)}h`}
          subtitle="Thời lượng tích luỹ"
          accent="primary"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Giờ tiết kiệm"
          value={hoursSaved}
          subtitle="Ước tính tự động hóa"
          icon={<Sparkles size={16} />}
        />
      </motion.section>

      {/* Main Grid */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 gap-6 xl:grid-cols-12"
      >
        {/* Left Column: Org Stats + Recent Meetings */}
        <div className="xl:col-span-8 space-y-6">
          {/* Organization Stats */}
          {currentOrg && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-h3 text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 size={18} className="text-primary-600" />
                  Thống kê tổ chức
                </h2>
                {isOrgAdmin && (
                  <button
                    onClick={() => navigate("/org/admin")}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300"
                  >
                    Xem bảng quản trị →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <Users size={14} />
                    <span>Thành viên</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    <AnimatedCounter value={currentOrg?.memberCount || 0} />
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <FolderOpen size={14} />
                    <span>Groups</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    <AnimatedCounter value={currentOrg?.groupCount || 0} />
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <FileText size={14} />
                    <span>Cuộc họp</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    <AnimatedCounter value={currentOrg?.meetingCount || 0} />
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <TrendingUp size={14} />
                    <span>Tổng giờ</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
                    <AnimatedCounter value={currentOrg?.totalHours || 0} suffix="h" />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Meetings */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-h3 text-gray-900 dark:text-slate-100">Cuộc họp gần đây</h2>
              <button
                onClick={() => navigate("/meetings")}
                className="inline-flex items-center gap-1 text-body font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300"
              >
                Xem tất cả
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="custom-scrollbar overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/60">
                    <th className="px-6 py-3 text-left text-caption font-semibold uppercase tracking-wide text-gray-500">Cuộc họp</th>
                    <th className="px-6 py-3 text-left text-caption font-semibold uppercase tracking-wide text-gray-500">Ngày</th>
                    <th className="px-6 py-3 text-left text-caption font-semibold uppercase tracking-wide text-gray-500">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-body text-gray-500">
                        Chưa có cuộc họp nào. Hãy tạo cuộc họp đầu tiên.
                      </td>
                    </tr>
                  ) : (
                    recentMeetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="cursor-pointer border-t border-gray-100 transition hover:bg-primary-50/40 dark:border-slate-800 dark:hover:bg-slate-800/40"
                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                      >
                        <td className="px-6 py-4">
                          <p className="text-body font-semibold text-gray-900 dark:text-slate-100">{meeting.title}</p>
                          <p className="mt-1 text-caption text-gray-500">{meeting.duration} phút</p>
                        </td>
                        <td className="px-6 py-4 text-body text-gray-600 dark:text-slate-300">{new Date(meeting.startTime).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Badge status={"completed" as any} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Thao tác nhanh */}
        <div className="xl:col-span-4 space-y-6">
          {/* Thao tác nhanh */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-h3 text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2"><Zap size={18} className="text-primary-600" /> Thao tác nhanh</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/upload')}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
              >
                <Mic size={20} />
                <span>Upload Audio</span>
              </button>
              <button
                onClick={() => navigate("/groups/create")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
              >
                <Plus size={20} />
                <span>Tạo nhóm</span>
              </button>
              <button
                onClick={() => navigate("/meetings")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
              >
                <FileText size={20} />
                <span>Tìm cuộc họp</span>
              </button>
              <button
                onClick={() => navigate("/notifications")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-sm font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
              >
                <Sparkles size={20} />
                <span>Thông báo</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Dashboard;
