import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { useAppStore, useOrgStore } from '../stores';
import { AnimatedCounter } from '../components/ui';
import MeetingCard from '../components/meeting/MeetingCard';
import MeetingFilters from '../components/meeting/MeetingFilters';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';

type SortOption = 'newest' | 'oldest' | 'longest' | 'most-attendees';

const MeetingList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSystemAdmin, isOrgAdmin, isGroupAdmin, isViewer } = usePermission();
  const { meetings } = useAppStore();
  const { currentOrg, groups } = useOrgStore();
  const { loadMeetings } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Filter meetings by current organization first
  const orgMeetings = useMemo(() => {
    if (!currentOrg) return meetings;
    return meetings.filter(m => m.orgId === currentOrg.id);
  }, [meetings, currentOrg]);

  // Get unique groups from meetings of current org
  const uniqueGroups = useMemo(() => {
    const groupIds = [...new Set(orgMeetings.map((m) => m.groupId))];
    return groupIds
      .map((id) => groups.find((group) => group.id === id))
      .filter(Boolean);
  }, [groups, orgMeetings]);

  // Filter and sort meetings
  const filteredMeetings = useMemo(() => {
    let result = [...orgMeetings];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term)
      );
    }

    // Group filter
    if (groupFilter !== 'all') {
      result = result.filter((m) => m.groupId === groupFilter);
    }

    // Sort
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

  // Stats
  const stats = useMemo(() => {
    const total = orgMeetings.length;
    const completed = orgMeetings.filter((meeting) => meeting.status === 'completed').length;
    const totalHours = orgMeetings.reduce((sum, m) => sum + m.duration, 0) / 60;

    return { total, completed, totalHours };
  }, [orgMeetings]);

  const handleEditMeeting = async (meeting: any) => {
    const nextTitle = window.prompt('Nhập tiêu đề mới cho cuộc họp', meeting.title);
    if (!nextTitle || !nextTitle.trim()) return;
    try {
      await api.put(`/api/meetings/${meeting.id}`, { title: nextTitle.trim() });
      if (currentOrg?.id) {
        await loadMeetings(currentOrg.id);
      }
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Không thể cập nhật cuộc họp');
    }
  };

  const canDeleteMeeting = (meeting: any) =>
    Boolean(
      user &&
        (isSystemAdmin ||
          isOrgAdmin ||
          isGroupAdmin ||
          meeting.createdBy === user.id),
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
      if (currentOrg?.id) {
        await loadMeetings(currentOrg.id);
      }
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Không thể xóa cuộc họp');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">
            Cuộc họp {currentOrg && <span className="text-primary-600 dark:text-primary-400">· {currentOrg.name}</span>}
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-slate-400">
            {orgMeetings.length} cuộc họp đã ghi âm và xử lý AI
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition-all hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-95"
          >
            <Plus size={18} />
            Tải âm thanh mới
          </button>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {[
          { label: 'Tổng cuộc họp', value: stats.total, icon: <FileText size={20} />, color: 'blue' },
          { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle2 size={20} />, color: 'green' },
          { label: 'Tổng thời gian', value: `${stats.totalHours.toFixed(1)}h`, icon: <Clock size={20} />, color: 'purple' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${stat.color}-50/50 transition-transform group-hover:scale-110 dark:bg-${stat.color}-900/10`} />
            <div className="relative z-10">
              <div className={`mb-4 inline-flex rounded-xl bg-${stat.color}-50 p-3 text-${stat.color}-600 dark:bg-${stat.color}-900/20 dark:text-${stat.color}-400`}>
                {stat.icon}
              </div>
              <p className="text-3xl font-black text-gray-900 dark:text-slate-100">
                {typeof stat.value === 'number' ? (
                  <AnimatedCounter value={stat.value} />
                ) : (
                  stat.value
                )}
              </p>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Filters Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="sticky top-0 z-20 -mx-4 px-4 py-2 backdrop-blur-sm lg:mx-0 lg:px-0"
      >
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
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

      {/* Meetings Grid */}
      <AnimatePresence mode="wait">
        {filteredMeetings.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white p-20 text-center dark:border-slate-800 dark:bg-slate-900/50"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-gray-300 dark:bg-slate-800 dark:text-slate-600">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Không tìm thấy cuộc họp nào</h3>
            <p className="mt-2 max-w-xs text-gray-500 dark:text-slate-400">
              Thử thay đổi bộ lọc hoặc tải lên tệp âm thanh đầu tiên của bạn để bắt đầu.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition hover:bg-primary-700"
            >
              <Mic size={18} />
              Tải âm thanh mới
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
          >
            {filteredMeetings.map((meeting, idx) => (
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

      {/* Pagination / Results count footer */}
      {filteredMeetings.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 dark:border-slate-800 sm:flex-row">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            Hiển thị <span className="font-bold text-gray-900 dark:text-slate-100">{filteredMeetings.length}</span> / {orgMeetings.length} cuộc họp
          </p>
          <div className="flex gap-2">
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50" disabled>
              Trước
            </button>
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50" disabled>
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingList;
