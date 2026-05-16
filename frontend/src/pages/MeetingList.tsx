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
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { useAppStore, useOrgStore } from '../stores';
import { AnimatedCounter, EditTitleModal } from '../components/ui';
import MeetingCard from '../components/meeting/MeetingCard';
import MeetingFilters from '../components/meeting/MeetingFilters';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

type SortOption = 'newest' | 'oldest' | 'longest' | 'most-attendees';

const PAGE_SIZE = 15;

const MeetingList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSystemAdmin, isOrgAdmin, isGroupAdmin, isViewer } = usePermission();
  const { meetings } = useAppStore();
  const { currentOrg, currentOrgId, groups } = useOrgStore();
  const { loadMeetings } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    return () => {
      active = false;
    };
  }, [loadMeetings, targetOrgId]);

  const orgMeetings = useMemo(() => {
    if (!targetOrgId) return meetings;
    return meetings.filter(m => m.orgId === targetOrgId || m.organization_id === targetOrgId);
  }, [meetings, targetOrgId]);

  const uniqueGroups = useMemo(() => {
    const groupIds = [...new Set(orgMeetings.map((m) => m.groupId))];
    return groupIds
      .map((id) => groups.find((group) => group.id === id))
      .filter(Boolean);
  }, [groups, orgMeetings]);

  const filteredMeetings = useMemo(() => {
    let result = [...orgMeetings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term)
      );
    }

    if (groupFilter !== 'all') {
      result = result.filter((m) => m.groupId === groupFilter);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
      case 'longest':
        result.sort((a, b) => b.duration - a.duration);
        break;
      case 'most-attendees':
        result.sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0));
        break;
    }

    return result;
  }, [orgMeetings, searchTerm, groupFilter, sortBy]);

  React.useEffect(() => { setPage(1); }, [searchTerm, groupFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / PAGE_SIZE));
  const paginatedMeetings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMeetings.slice(start, start + PAGE_SIZE);
  }, [filteredMeetings, page]);

  const stats = useMemo(() => {
    const total = orgMeetings.length;
    const liveOrUpcoming = orgMeetings.filter((m) => m.status === 'live' || m.status === 'upcoming').length;
    const completed = orgMeetings.filter((m) => m.status === 'completed').length;
    const totalHours = orgMeetings.reduce((sum, m) => sum + m.duration, 0) / 60;
    return { total, liveOrUpcoming, completed, totalHours };
  }, [orgMeetings]);

  const handleEditMeeting = (meeting: any) => setEditingMeeting(meeting);

  const handleSaveTitle = async (newTitle: string) => {
    if (!editingMeeting) return;
    try {
      await api.put(`/api/meetings/${editingMeeting.id}`, { title: newTitle });
      if (currentOrg?.id) await loadMeetings(currentOrg.id);
      setEditingMeeting(null);
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Không thể cập nhật cuộc họp');
    }
  };

  const canDeleteMeeting = (meeting: any) =>
    Boolean(
      user &&
        (isSystemAdmin || isOrgAdmin || isGroupAdmin || meeting.createdBy === user.id),
    );

  const handleDeleteMeeting = async (meeting: any) => {
    if (!canDeleteMeeting(meeting)) {
      window.alert('Bạn không có quyền xóa cuộc họp này.');
      return;
    }
    const confirmed = window.confirm(`Xóa cuộc họp "${meeting.title}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/meetings/${meeting.id}`);
      if (currentOrg?.id) await loadMeetings(currentOrg.id);
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa cuộc họp');
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-slate-100">
            Cuộc họp
            {currentOrg && (
              <span className="ml-2 text-base font-semibold text-gray-400 dark:text-slate-500">
                {currentOrg.name}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {orgMeetings.length} cuộc họp · {stats.totalHours.toFixed(1)}h đã xử lý
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Upload size={14} />
            Tải âm thanh
          </button>
          <button
            onClick={() => navigate('/meetings/create')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus size={14} />
            Tạo live
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { label: 'Tổng cuộc họp', value: stats.total, icon: <FileText size={18} />, bg: 'bg-blue-50 dark:bg-blue-900/10', iconBg: 'bg-blue-100 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
          { label: 'Live / Sắp tới', value: stats.liveOrUpcoming, icon: <Radio size={18} />, bg: 'bg-red-50 dark:bg-red-900/10', iconBg: 'bg-red-100 dark:bg-red-900/20', iconColor: 'text-red-600 dark:text-red-400' },
          { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle2 size={18} />, bg: 'bg-emerald-50 dark:bg-emerald-900/10', iconBg: 'bg-emerald-100 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Tổng thời gian', value: stats.totalHours, suffix: 'h', icon: <Clock size={18} />, bg: 'bg-violet-50 dark:bg-violet-900/10', iconBg: 'bg-violet-100 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-xl border border-gray-100 p-4 dark:border-slate-800 ${stat.bg}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-black text-gray-900 dark:text-slate-100">
                  {typeof stat.value === 'number' ? <AnimatedCounter value={stat.value} /> : stat.value}
                  {stat.suffix && <span className="ml-0.5 text-base font-bold text-gray-400 dark:text-slate-500">{stat.suffix}</span>}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-slate-400">{stat.label}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconColor}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur-sm lg:mx-0 lg:px-0"
      >
        <div className="rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <MeetingFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            uniqueGroups={uniqueGroups}
          />
        </div>
      </motion.div>

      {/* Meeting List */}
      <AnimatePresence mode="wait">
        {isLoadingMeetings ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Đang tải...</p>
          </motion.div>
        ) : loadError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/30 py-16 text-center dark:border-red-900/30 dark:bg-red-900/5"
          >
            <p className="text-sm font-bold text-red-700 dark:text-red-300">{loadError}</p>
            <button
              onClick={() => targetOrgId && loadMeetings(targetOrgId)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              Tải lại
            </button>
          </motion.div>
        ) : filteredMeetings.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-300 dark:bg-slate-800 dark:text-slate-600">
              <FileText size={28} />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-slate-200">
              {orgMeetings.length === 0 ? 'Chưa có cuộc họp nào' : 'Không tìm thấy kết quả'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-slate-500">
              {orgMeetings.length === 0
                ? 'Tạo cuộc họp live hoặc tải âm thanh để bắt đầu.'
                : 'Thử thay đổi từ khóa hoặc bộ lọc.'}
            </p>
            <button
              onClick={() => navigate(orgMeetings.length === 0 ? '/meetings/create' : '/upload')}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900"
            >
              <Plus size={14} />
              {orgMeetings.length === 0 ? 'Tạo cuộc họp' : 'Tải âm thanh'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {paginatedMeetings.map((meeting, idx) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                index={idx}
                canManage={!isViewer}
                onEdit={handleEditMeeting}
                onDelete={handleDeleteMeeting}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {filteredMeetings.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-400 dark:text-slate-500">
            {paginatedMeetings.length}/{filteredMeetings.length}
            {totalPages > 1 && <span className="ml-1">· Trang {page}/{totalPages}</span>}
          </p>
          {totalPages > 1 && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                ‹
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
    <EditTitleModal
      isOpen={!!editingMeeting}
      currentTitle={editingMeeting?.title || ''}
      onClose={() => setEditingMeeting(null)}
      onSave={handleSaveTitle}
    />
    </>
  );
};

export default MeetingList;
