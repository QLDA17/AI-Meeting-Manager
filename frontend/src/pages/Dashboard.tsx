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
  Users,
  Building2,
  FolderOpen,
  Plus,
  Zap,
  Crown,
} from "lucide-react";
import { StatCard, Button, AnimatedCounter } from "../components/ui";
import { useOrgStore } from "../stores";
import { useAppStore } from "../stores";
import { usePermission } from "../hooks";
import { MeetingCard } from "../features/meeting/components/MeetingCard";
import { clsx } from "clsx";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentOrg, loadGroups } = useOrgStore();
  const { isOrgAdmin } = usePermission();
  const { meetings, getStats } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentOrg?.id) {
      loadGroups(currentOrg.id);
    }
  }, [currentOrg?.id, loadGroups]);

  const appStats = useMemo(() => getStats(), [meetings, getStats]);

  const processingCount = useMemo(
    () => meetings.filter((m) => (m as any).status === "processing" || (m as any).status === "queued").length,
    [meetings]
  );

  const recentMeetings = useMemo(() => {
    return [...meetings]
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 4);
  }, [meetings]);

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
    <div className="mx-auto max-w-7xl space-y-10 pb-12">
      {/* Premium Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-primary-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-12"
      >
        {/* Background Decor */}
        <div className="absolute right-0 top-0 -mr-24 -mt-24 h-96 w-96 rounded-full bg-primary-50/50 blur-3xl dark:bg-primary-900/10" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 h-72 w-72 rounded-full bg-blue-50/50 blur-3xl dark:bg-blue-900/10" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <Sparkles size={14} />
              <span>Workspace của bạn đã sẵn sàng</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Chào buổi sáng, <span className="text-gradient">{user?.displayName?.split(' ')[0] || user?.email?.split('@')[0]}</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-slate-400">
              Hôm nay là một ngày tuyệt vời để tối ưu hóa các cuộc họp của bạn. Bạn có <span className="font-semibold text-gray-900 dark:text-white">{processingCount}</span> bản ghi đang xử lý.
            </p>
            
            <div className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" onClick={() => navigate('/meetings/create')} className="h-12 px-8 rounded-xl shadow-lg shadow-primary-500/20">
                <Plus size={20} className="mr-2" />
                Cuộc họp mới
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate('/upload')} className="h-12 px-8 rounded-xl bg-white dark:bg-slate-900">
                <Mic size={20} className="mr-2" />
                Tải lên ghi âm
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative h-48 w-48 rounded-3xl bg-gradient-to-br from-primary-500 to-green-400 p-1 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.4rem] bg-white dark:bg-slate-900">
                <AnimatedCounter value={appStats.totalMeetings} className="text-5xl font-black text-primary-600" />
                <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Cuộc họp</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Main Column */}
        <div className="space-y-10 xl:col-span-8">
          {/* Stats Summary - Fixed props */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard 
              label="Tổng cuộc họp" 
              value={appStats.totalMeetings} 
              icon={<FileText size={20} />} 
              accent="primary"
            />
            <StatCard 
              label="Đang xử lý" 
              value={processingCount} 
              icon={<Zap size={20} />} 
              accent={processingCount > 0 ? "warning" : "default"}
            />
            <StatCard 
              label="Thành viên" 
              value={currentOrg?.memberCount || 0} 
              icon={<Users size={20} />} 
            />
            <StatCard 
              label="Tiết kiệm" 
              value={hoursSaved} 
              icon={<Clock3 size={20} />} 
            />
          </div>

          {/* Recent Meetings */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cuộc họp gần đây</h2>
                <p className="text-sm text-gray-500">Truy cập nhanh vào các nội dung vừa thảo luận</p>
              </div>
              <button
                onClick={() => navigate("/meetings")}
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 transition-colors hover:text-primary-700"
              >
                Xem tất cả
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            
            {recentMeetings.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center dark:border-slate-800">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-slate-800">
                  <FolderOpen size={32} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Chưa có cuộc họp nào</h3>
                <p className="mx-auto max-w-xs text-gray-500 dark:text-slate-400">Bắt đầu bằng cách tạo cuộc họp mới hoặc tải lên tệp âm thanh có sẵn.</p>
                <Button variant="secondary" onClick={() => navigate('/upload')} className="mt-6 rounded-xl px-8">Tải lên ngay</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {recentMeetings.map((meeting, idx) => (
                  <MeetingCard key={meeting.id} meeting={meeting} index={idx} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8 xl:col-span-4">
          {/* Quick Actions */}
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Zap size={20} className="text-amber-500" /> Thao tác nhanh
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton icon={<Mic size={24} />} label="Ghi âm" onClick={() => navigate('/upload')} />
              <QuickActionButton icon={<Plus size={24} />} label="Nhóm mới" onClick={() => navigate("/groups/create")} />
              <QuickActionButton icon={<FileText size={24} />} label="Dự án" onClick={() => navigate("/meetings")} />
              <QuickActionButton icon={<Sparkles size={24} />} label="AI Chat" onClick={() => navigate("/notifications")} />
            </div>
            
            {/* Promotion/Info Card */}
            <div className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white dark:from-primary-950 dark:to-slate-900">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">
                <Crown size={20} className="text-amber-400" />
              </div>
              <h4 className="mb-2 font-bold">Nâng cấp Pro</h4>
              <p className="mb-4 text-xs text-slate-300 leading-relaxed">
                Mở khóa tính năng phân tích cảm xúc và tóm tắt đa ngôn ngữ với gói Pro.
              </p>
              <button className="w-full rounded-xl bg-primary-500 py-2.5 text-sm font-bold transition-all hover:bg-primary-600 active:scale-[0.98]">
                Nâng cấp ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-4 text-xs font-medium text-gray-600 dark:text-slate-400 transition-all hover:bg-primary-50 hover:border-primary-100 hover:text-primary-700 dark:hover:bg-primary-900/10 dark:hover:border-primary-900/20 dark:hover:text-primary-300"
  >
    <div className="text-gray-400 dark:text-slate-500 transition-colors">
      {icon}
    </div>
    <span>{label}</span>
  </button>
);

export default Dashboard;
