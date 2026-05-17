import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  Radio,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore, useOrgStore } from '../stores';
import { AnimatedCounter } from '../components/ui';
import EditMeetingModal from '../components/meeting/EditMeetingModal';
import MeetingCard from '../components/meeting/MeetingCard';
import MeetingFilters from '../components/meeting/MeetingFilters';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import type { Meeting } from '../types';

type SortOption = 'newest' | 'oldest' | 'longest' | 'most-attendees';

const COMPLETED_PREVIEW_COUNT = 6;

interface MeetingSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  badge: string;
  meetings: Meeting[];
  collapsible?: boolean;
}

const MeetingList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isViewer } = usePermission();
  const { meetings } = useAppStore();
  const { currentOrg, currentOrgId, groups } = useOrgStore();
  const { loadMeetings } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const targetOrgId = currentOrg?.id || currentOrgId;

  React.useEffect(() => {
    if (!targetOrgId) return;
    let active = true;
    setIsLoadingMeetings(true);
    setLoadError(null);
    loadMeetings(targetOrgId)
      .catch((err: any) => {
        if (!active) return;
        setLoadError(err?.response?.data?.detail || 'Không thể tải danh sách cuộc họp');
      })
      .finally(() => {
        if (active) setIsLoadingMeetings(false);
      });
    return () => { active = false; };
  }, [loadMeetings, targetOrgId]);

  const orgMeetings = useMemo(() => {
    if (!targetOrgId) return meetings;
    return meetings.filter(m => m.orgId === targetOrgId || m.organization_id === targetOrgId);
  }, [meetings, targetOrgId]);

  const uniqueGroups = useMemo(() => {
    const groupIds = [...new Set(orgMeetings.map((m) => m.groupId))];
    return groupIds.map((id) => groups.find((group) => group.id === id)).filter(Boolean);
  }, [groups, orgMeetings]);

  const filteredMeetings = useMemo(() => {
    let result = [...orgMeetings];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(term) || m.description?.toLowerCase().includes(term));
    }
    if (groupFilter !== 'all') result = result.filter(m => m.groupId === groupFilter);
    if (statusFilter !== 'all') result = result.filter(m => m.status === statusFilter);

    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()); break;
      case 'longest': result.sort((a, b) => b.duration - a.duration); break;
      case 'most-attendees': result.sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0)); break;
    }
    return result;
  }, [orgMeetings, searchTerm, groupFilter, statusFilter, sortBy]);

  const sections: MeetingSection[] = useMemo(() => {
    const live = filteredMeetings.filter(m => m.status === 'live');
    const upcoming = filteredMeetings.filter(m => m.status === 'upcoming');
    const processing = filteredMeetings.filter(m => m.status === 'processing' || m.status === 'queued');
    const completed = filteredMeetings.filter(m => m.status === 'completed');
    const failed = filteredMeetings.filter(m => m.status === 'failed');

    return [
      { key: 'live', label: 'Đang diễn ra', icon: <Radio size={16} />, accent: 'border-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300', meetings: live },
      { key: 'upcoming', label: 'Sắp tới', icon: <Clock size={16} />, accent: 'border-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300', meetings: upcoming },
      { key: 'processing', label: 'Cần xử lý', icon: <Loader2 size={16} className="animate-spin" />, accent: 'border-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300', meetings: processing },
      { key: 'completed', label: 'Đã hoàn tất', icon: <CheckCircle2 size={16} />, accent: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300', meetings: completed, collapsible: true },
      { key: 'failed', label: 'Lỗi', icon: <AlertCircle size={16} />, accent: 'border-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300', meetings: failed },
    ].filter(s => s.meetings.length > 0);
  }, [filteredMeetings]);

  const stats = useMemo(() => {
    const total = orgMeetings.length;
    const liveOrUpcoming = orgMeetings.filter(m => m.status === 'live' || m.status === 'upcoming').length;
    const completed = orgMeetings.filter(m => m.status === 'completed').length;
    const totalHours = orgMeetings.reduce((sum, m) => sum + m.duration, 0) / 60;
    return { total, liveOrUpcoming, completed, totalHours };
  }, [orgMeetings]);

  const handleEditMeeting = (meeting: any) => setEditingMeeting(meeting);
  const handleEditMeetingUpdated = async () => {
    if (targetOrgId) await loadMeetings(targetOrgId);
    setEditingMeeting(null);
  };

  const handleDeleteMeeting = async (meeting: any) => {
    const confirmed = window.confirm(`Xóa cuộc họp "${meeting.title}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/meetings/${meeting.id}`);
      if (targetOrgId) await loadMeetings(targetOrgId);
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa cuộc họp');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
              Cuộc họp
              {currentOrg && <span className="ml-2 text-base font-semibold text-gray-400 dark:text-slate-500">{currentOrg.name}</span>}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{orgMeetings.length} cuộc họp · {stats.totalHours.toFixed(1)}h đã xử lý</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/upload')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <Upload size={14} /> Tải âm thanh
            </button>
            <button onClick={() => navigate('/meetings/create')} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
              <Plus size={14} /> Tạo live
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tổng cuộc họp', value: stats.total, icon: <FileText size={16} />, accent: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/5 dark:to-blue-600/0', iconRing: 'ring-blue-500/20', iconColor: 'text-blue-600 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-300' },
            { label: 'Live / Sắp tới', value: stats.liveOrUpcoming, icon: <Radio size={16} />, accent: 'from-rose-500/10 to-rose-600/5 dark:from-rose-500/5 dark:to-rose-600/0', iconRing: 'ring-rose-500/20', iconColor: 'text-rose-600 dark:text-rose-400', valueColor: 'text-rose-700 dark:text-rose-300' },
            { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle2 size={16} />, accent: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/5 dark:to-emerald-600/0', iconRing: 'ring-emerald-500/20', iconColor: 'text-emerald-600 dark:text-emerald-400', valueColor: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'Tổng thời gian', value: stats.totalHours, suffix: 'h', icon: <Clock size={16} />, accent: 'from-violet-500/10 to-violet-600/5 dark:from-violet-500/5 dark:to-violet-600/0', iconRing: 'ring-violet-500/20', iconColor: 'text-violet-600 dark:text-violet-400', valueColor: 'text-violet-700 dark:text-violet-300' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.04 }}
              className={`group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-gradient-to-br ${stat.accent} p-4 transition-all hover:border-gray-300 hover:shadow-sm dark:border-slate-700/50 dark:hover:border-slate-600`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`text-[28px] font-extrabold leading-none tracking-tight ${stat.valueColor}`}>
                    {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                    {stat.suffix && <span className="ml-0.5 text-lg font-bold opacity-60">{stat.suffix}</span>}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">{stat.label}</p>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${stat.iconRing} ${stat.iconColor} bg-white/80 dark:bg-slate-800/80`}>{stat.icon}</div>
              </div>
              {/* Subtle decorative line */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-slate-700" />
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur-sm lg:mx-0 lg:px-0">
          <div className="rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <MeetingFilters
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              sortBy={sortBy} setSortBy={setSortBy}
              groupFilter={groupFilter} setGroupFilter={setGroupFilter}
              uniqueGroups={uniqueGroups}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            />
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoadingMeetings ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Đang tải...</p>
            </motion.div>
          ) : loadError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/30 py-16 text-center dark:border-red-900/30 dark:bg-red-900/5">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">{loadError}</p>
              <button onClick={() => targetOrgId && loadMeetings(targetOrgId)} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">Tải lại</button>
            </motion.div>
          ) : filteredMeetings.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900/50">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-slate-800 dark:text-slate-600"><FileText size={28} /></div>
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{orgMeetings.length === 0 ? 'Chưa có cuộc họp nào' : 'Không tìm thấy kết quả'}</p>
              <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-slate-500">{orgMeetings.length === 0 ? 'Tạo cuộc họp live hoặc tải âm thanh để bắt đầu.' : 'Thử thay đổi từ khóa hoặc bộ lọc.'}</p>
              <button onClick={() => navigate(orgMeetings.length === 0 ? '/meetings/create' : '/upload')} className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900">
                <Plus size={14} />{orgMeetings.length === 0 ? 'Tạo cuộc họp' : 'Tải âm thanh'}
              </button>
            </motion.div>
          ) : (
            <motion.div key="sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {sections.map((section) => {
                const displayMeetings = section.collapsible && !showAllCompleted
                  ? section.meetings.slice(0, COMPLETED_PREVIEW_COUNT)
                  : section.meetings;

                return (
                  <div key={section.key}>
                    {/* Section header */}
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className={`flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${section.accent.replace('border-', 'bg-')}`} />
                        {section.icon}
                        <span className="text-[13px] font-bold text-gray-800 dark:text-slate-200">{section.label}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${section.badge}`}>{section.meetings.length}</span>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {displayMeetings.map((meeting, idx) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={idx} canManage={!isViewer} onEdit={handleEditMeeting} onDelete={handleDeleteMeeting} />
                      ))}
                    </div>

                    {/* Show more for completed */}
                    {section.collapsible && section.meetings.length > COMPLETED_PREVIEW_COUNT && (
                      <button onClick={() => setShowAllCompleted(!showAllCompleted)} className="mt-3 text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                        {showAllCompleted ? 'Thu gọn' : `Xem thêm ${section.meetings.length - COMPLETED_PREVIEW_COUNT} cuộc họp`}
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <EditMeetingModal
        meeting={editingMeeting}
        isOpen={Boolean(editingMeeting)}
        onClose={() => setEditingMeeting(null)}
        onUpdated={handleEditMeetingUpdated}
      />
    </>
  );
};

export default MeetingList;
