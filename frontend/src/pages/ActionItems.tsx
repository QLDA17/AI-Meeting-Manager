/**
 * ActionItems Page - Quản lý các việc cần làm từ tất cả cuộc họp
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

import { actionItemService } from '../services/actionItemService';
import { Button, Badge, Card, Modal, Input } from '../components/ui';
import type { ActionItem, ActionItemCreate } from '../types';

const ActionItems: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Task Form State
  const [newTask, setNewTask] = useState<ActionItemCreate>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'PENDING',
  });

  // Fetch Data
  const { data: actionItems = [], isLoading, error } = useQuery({
    queryKey: ['actionItems'],
    queryFn: () => actionItemService.list(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ActionItemCreate) => actionItemService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'MEDIUM', status: 'PENDING' });
      toast.success('Đã thêm việc cần làm mới');
    },
    onError: () => toast.error('Không thể tạo việc cần làm'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      actionItemService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => actionItemService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      toast.success('Đã xóa việc cần làm');
    },
  });

  // Logic
  const filteredItems = useMemo(() => {
    return actionItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (item.meeting_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [actionItems, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: actionItems.length,
      pending: actionItems.filter(i => i.status === 'PENDING').length,
      inProgress: actionItems.filter(i => i.status === 'IN_PROGRESS').length,
      completed: actionItems.filter(i => i.status === 'COMPLETED').length,
    };
  }, [actionItems]);

  const handleToggleStatus = (item: ActionItem) => {
    const newStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    updateStatusMutation.mutate({ id: item.id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa việc cần làm này?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    createMutation.mutate(newTask);
  };

  const getStatColor = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      case 'indigo': return 'text-indigo-600 dark:text-indigo-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

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
          <p className="text-gray-600 dark:text-slate-400">Quản lý các task từ cuộc họp và cá nhân</p>
        </div>
        <Button 
          variant="primary" 
          className="rounded-xl shadow-lg shadow-primary-500/20"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} className="mr-2" />
          Thêm việc mới
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Tổng số', value: stats.total, color: 'blue' },
          { label: 'Đang chờ', value: stats.pending, color: 'amber' },
          { label: 'Đang làm', value: stats.inProgress, color: 'indigo' },
          { label: 'Hoàn thành', value: stats.completed, color: 'green' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
            <p className={`text-2xl font-black ${getStatColor(stat.color)}`}>{stat.value}</p>
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
          <option value="PENDING">Đang chờ</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
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
                  <button 
                    onClick={() => handleToggleStatus(item)}
                    className={`mt-0.5 transition ${item.status === 'COMPLETED' ? 'text-green-500' : 'text-gray-300 hover:text-primary-500'}`}
                  >
                    {item.status === 'COMPLETED' ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold leading-tight ${item.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-slate-100'}`}>
                      {item.title}
                    </h3>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      item.priority === 'URGENT' || item.priority === 'HIGH' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                      item.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                      'bg-gray-50 text-gray-600 dark:bg-slate-800'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {item.meeting_title && (
                      <span className="flex items-center gap-1 font-medium italic transition hover:text-primary-600 cursor-pointer">
                        <MessageSquare size={12} />
                        {item.meeting_title}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Hạn: {(() => {
                          try {
                            return format(new Date(item.due_date), 'dd/MM/yyyy');
                          } catch (e) {
                            return 'Không hợp lệ';
                          }
                        })()}
                      </span>
                    )}
                    <span className="font-bold text-gray-400">{item.assigned_email || 'Chưa giao'}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between sm:mt-0 sm:shrink-0">
                  <div className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-widest ${
                    item.status === 'COMPLETED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    item.status === 'CANCELLED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  }`}>
                    {item.status}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-800">
                      <MoreVertical size={18} />
                    </button>
                  </div>
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

      {/* Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Thêm việc cần làm mới"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Tiêu đề</label>
            <Input 
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              placeholder="Nhập việc cần làm..."
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Mô tả (không bắt buộc)</label>
            <textarea 
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              placeholder="Thêm chi tiết..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Ưu tiên</label>
              <select 
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">Hạn chót</label>
              <Input 
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)} type="button">Hủy</Button>
            <Button variant="primary" className="flex-1" type="submit" isLoading={createMutation.isPending}>
              Tạo việc cần làm
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ActionItems;
