/**
 * ActionItems Page - Quản lý các việc cần làm từ tất cả cuộc họp
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Search,
  Calendar,
  MoreVertical,
  Flag,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useAppStore } from '@/shared/lib/stores';
import { format } from 'date-fns';

interface ActionItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  task: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
}

const ActionItems: React.FC = () => {
  const { meetings } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock action items derived from meetings
  const actionItems: ActionItem[] = useMemo(() => {
    return [
      { id: '1', meetingId: 'm1', meetingTitle: 'Họp Sprint 25', task: 'Hoàn thiện báo cáo tiến độ', assignee: 'Nguyễn Thành Huyền', dueDate: '2025-04-20', status: 'pending', priority: 'high' },
      { id: '2', meetingId: 'm1', meetingTitle: 'Họp Sprint 25', task: 'Thiết kế wireframes Org Admin', assignee: 'Trần Văn A', dueDate: '2025-04-22', status: 'pending', priority: 'medium' },
      { id: '3', meetingId: 'm2', meetingTitle: 'Thảo luận kỹ thuật', task: 'Fix bug login trên Safari', assignee: 'Lê Thị B', dueDate: '2025-04-15', status: 'completed', priority: 'high' },
      { id: '4', meetingId: 'm3', meetingTitle: 'Review thiết kế', task: 'Cập nhật bảng màu Brand', assignee: 'Nguyễn Thành Huyền', dueDate: '2025-04-10', status: 'overdue', priority: 'low' },
    ];
  }, []);

  const filteredItems = useMemo(() => {
    return actionItems.filter(item => {
      const matchesSearch = item.task.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.meetingTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [actionItems, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: actionItems.length,
      pending: actionItems.filter(i => i.status === 'pending').length,
      overdue: actionItems.filter(i => i.status === 'overdue').length,
      completed: actionItems.filter(i => i.status === 'completed').length,
    };
  }, [actionItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Việc cần làm</h1>
          <p className="text-gray-600 dark:text-slate-400">Quản lý các task được trích xuất từ cuộc họp</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng số', value: stats.total, color: 'blue' },
          { label: 'Đang chờ', value: stats.pending, color: 'amber' },
          { label: 'Quá hạn', value: stats.overdue, color: 'red' },
          { label: 'Hoàn thành', value: stats.completed, color: 'green' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-black text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm task..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Đang chờ</option>
          <option value="overdue">Quá hạn</option>
          <option value="completed">Hoàn thành</option>
        </select>
      </div>

      {/* Task List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="group flex flex-col p-4 transition hover:bg-gray-50/50 dark:hover:bg-slate-800/30 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="mb-2 flex shrink-0 items-start sm:mb-0">
                  <button className={`mt-0.5 transition ${item.status === 'completed' ? 'text-green-500' : 'text-gray-300 hover:text-primary-500'}`}>
                    {item.status === 'completed' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold leading-tight ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-slate-100'}`}>
                      {item.task}
                    </h3>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      item.priority === 'high' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                      item.priority === 'medium' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                      'bg-gray-50 text-gray-600 dark:bg-slate-800'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium italic transition hover:text-primary-600 cursor-pointer">
                      <MessageSquare size={12} />
                      {item.meetingTitle}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Hạn: {format(new Date(item.dueDate), 'dd/MM/yyyy')}
                    </span>
                    <span className="font-bold text-gray-400">{item.assignee}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between sm:mt-0 sm:shrink-0">
                  <div className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-widest ${
                    item.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    item.status === 'overdue' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  }`}>
                    {item.status}
                  </div>
                  <button className="ml-4 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-800">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="py-20 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-gray-200 dark:text-slate-800" />
            <p className="text-sm font-bold text-gray-500">Không có việc cần làm nào khớp với bộ lọc</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionItems;
