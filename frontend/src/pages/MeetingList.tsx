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
import { AnimatedCounter, StatCard } from '../components/ui';
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
      { key: 'live', label: 'Đang diễn ra', icon: <Radio size={16} className="text-red-500 animate-pulse stroke-[2.5]" />, accent: 'border-red-500', badge: 'bg-red-100 text-red-700', meetings: live },
      { key: 'upcoming', label: 'Sắp tới', icon: <Clock size={16} />, accent: 'border-teal-500', badge: 'bg-teal-50 text-teal-700 border border-teal-100/30', meetings: upcoming },
      { key: 'processing', label: 'Cần xử lý', icon: <Loader2 size={16} className="animate-spin" />, accent: 'border-amber-500', badge: 'bg-amber-100 text-amber-700', meetings: processing },
      { key: 'completed', label: 'Đã hoàn tất', icon: <CheckCircle2 size={16} />, accent: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700', meetings: completed, collapsible: true },
      { key: 'failed', label: 'Lỗi', icon: <AlertCircle size={16} />, accent: 'border-rose-500', badge: 'bg-rose-100 text-rose-700', meetings: failed },
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
      <div className="space-y-10 pb-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between px-1">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
              Cuộc họp
              {currentOrg && <span className="ml-3 text-lg font-bold text-gray-400">/ {currentOrg.name}</span>}
            </h1>
            <p className="mt-3 text-sm font-bold text-gray-400 uppercase tracking-widest">{orgMeetings.length} cuộc họp · {stats.totalHours.toFixed(1)}h đã xử lý</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/upload')} className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-5 py-2.5 text-xs font-black text-gray-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <Upload size={14} /> Tải âm thanh
            </button>
            <button onClick={() => navigate('/meetings/create')} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:shadow-primary-600/30">
              <Plus size={14} className="stroke-[3]" /> Tạo live
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            { label: 'Tổng cuộc họp', value: stats.total, icon: <FileText size={18} />, accent: 'primary' },
            { label: 'Live / Sắp tới', value: stats.liveOrUpcoming, icon: <Radio size={18} className="text-red-500 animate-pulse" />, accent: 'danger' },
            { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle2 size={18} />, accent: 'primary' },
            { label: 'Tổng thời gian', value: stats.totalHours, suffix: 'h', icon: <Clock size={18} />, accent: 'warning' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.04 }}
            >
              <StatCard
                label={stat.label}
                value={typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                icon={stat.icon}
                accent={stat.accent as any}
                subtitle={stat.suffix ? `${stat.value.toFixed(1)}${stat.suffix}` : undefined}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="sticky top-0 z-20 -mx-4 px-4 py-3 backdrop-blur-md lg:mx-0 lg:px-0">
          <div className="rounded-[1.5rem] border border-gray-100 bg-white/80 p-3 shadow-xl shadow-gray-200/20">
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
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-[2.5rem] border border-gray-100 bg-white py-24 shadow-sm">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Đang tải...</p>
            </motion.div>
          ) : loadError ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-[2.5rem] border border-red-100 bg-red-50/30 py-20 text-center">
              <div className="mb-4 p-4 bg-red-100 text-red-600 rounded-full"><AlertCircle size={32} /></div>
              <p className="text-lg font-black text-red-900">{loadError}</p>
              <button onClick={() => targetOrgId && loadMeetings(targetOrgId)} className="mt-6 rounded-xl bg-red-600 px-8 py-3 text-sm font-black text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">Tải lại</button>
            </motion.div>
          ) : filteredMeetings.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-white py-24 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-50 text-gray-200"><FileText size={40} /></div>
              <p className="text-xl font-black text-gray-900">{orgMeetings.length === 0 ? 'Chưa có cuộc họp nào' : 'Không tìm thấy kết quả'}</p>
              <p className="mt-2 max-w-xs text-sm font-bold text-gray-400 leading-relaxed uppercase tracking-tight">{orgMeetings.length === 0 ? 'Tạo cuộc họp live hoặc tải âm thanh để bắt đầu.' : 'Thử thay đổi từ khóa hoặc bộ lọc.'}</p>
              <button onClick={() => navigate(orgMeetings.length === 0 ? '/meetings/create' : '/upload')} className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black text-white shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1">
                <Plus size={18} className="stroke-[3]" />{orgMeetings.length === 0 ? 'Tạo cuộc họp' : 'Tải âm thanh'}
              </button>
            </motion.div>
          ) : (
            <motion.div key="sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              {sections.map((section) => {
                const displayMeetings = section.collapsible && !showAllCompleted
                  ? section.meetings.slice(0, COMPLETED_PREVIEW_COUNT)
                  : section.meetings;

                return (
                  <div key={section.key}>
                    {/* Section header */}
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-2.5 shadow-xl shadow-gray-200/10">
                        <div className={`h-2 w-2 rounded-full ${section.accent.replace('border-', 'bg-')} shadow-sm`} />
                        <span className="text-gray-400">{section.icon}</span>
                        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">{section.label}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black shadow-inner ${section.badge}`}>{section.meetings.length}</span>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {displayMeetings.map((meeting, idx) => (
                        <MeetingCard key={meeting.id} meeting={meeting} index={idx} canManage={!isViewer} onEdit={handleEditMeeting} onDelete={handleDeleteMeeting} />
                      ))}
                    </div>

                    {/* Show more for completed */}
                    {section.collapsible && section.meetings.length > COMPLETED_PREVIEW_COUNT && (
                      <div className="mt-6 flex justify-center">
                        <button onClick={() => setShowAllCompleted(!showAllCompleted)} className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-6 py-2.5 text-xs font-black text-gray-600 transition-all hover:bg-primary-50 hover:text-primary-700">
                          {showAllCompleted ? 'Thu gọn' : `Xem thêm ${section.meetings.length - COMPLETED_PREVIEW_COUNT} cuộc họp`}
                        </button>
                      </div>
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
