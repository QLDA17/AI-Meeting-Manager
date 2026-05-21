import React from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Flag, Pencil, Trash2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { ActionItem, ActionItemAssigneeOption, User } from '../../types';
import { cn } from '../../lib/utils';

type ActionEditDraft = {
  title: string;
  assignedEmails: string[];
  dueDate: string;
  status: string;
  priority: string;
};

type MeetingActionItemCardProps = {
  item: ActionItem;
  currentUser?: User | null;
  assigneeOptions: ActionItemAssigneeOption[];
  canManage: boolean;
  isCurrentUserAssignee: boolean;
  isEditing: boolean;
  isSaving: boolean;
  draft: ActionEditDraft | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onPatchDraft: (updates: Partial<ActionEditDraft>) => void;
  onConfirmEdit: () => void;
  onDelete: () => void;
  onUpdateSelfStatus: (status: ActionItem['status']) => void;
};

const priorityConfig: Record<ActionItem['priority'], { 
  label: string, 
  color: string, 
  dot: string,
  glow: string,
  bg: string,
  border: string
}> = {
  LOW: { 
    label: 'Thấp', 
    color: 'text-gray-400', 
    dot: 'bg-gray-300',
    glow: 'group-hover:shadow-gray-200/40',
    bg: 'hover:bg-gray-50/30',
    border: 'group-hover:border-gray-200'
  },
  MEDIUM: { 
    label: 'Trung bình', 
    color: 'text-blue-500', 
    dot: 'bg-blue-500',
    glow: 'group-hover:shadow-blue-200/40',
    bg: 'hover:bg-blue-50/10',
    border: 'group-hover:border-blue-100'
  },
  HIGH: { 
    label: 'Cao', 
    color: 'text-orange-500', 
    dot: 'bg-orange-500',
    glow: 'group-hover:shadow-orange-200/40',
    bg: 'hover:bg-orange-50/20',
    border: 'group-hover:border-orange-100'
  },
  URGENT: { 
    label: 'Khẩn cấp', 
    color: 'text-red-500', 
    dot: 'bg-red-500',
    glow: 'group-hover:shadow-red-200/50',
    bg: 'hover:bg-red-50/30',
    border: 'group-hover:border-red-100'
  },
};

const initialsFor = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const formatDueDate = (value?: string) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return 'Hôm nay';
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  } catch {
    return null;
  }
};

const isOverdue = (item: ActionItem) => {
  if (!item.due_date || item.status === 'COMPLETED') return false;
  const due = new Date(item.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
};

const MeetingActionItemCard: React.FC<MeetingActionItemCardProps> = ({
  item,
  currentUser,
  assigneeOptions,
  canManage,
  isCurrentUserAssignee,
  isEditing,
  isSaving,
  draft,
  onStartEdit,
  onCancelEdit,
  onPatchDraft,
  onConfirmEdit,
  onDelete,
  onUpdateSelfStatus,
}) => {
  const isDone = item.status === 'COMPLETED';
  const overdue = isOverdue(item);
  const priority = priorityConfig[item.priority] || priorityConfig.MEDIUM;
  const dueDateLabel = formatDueDate(item.due_date);
  const canUpdateOwnStatus = isCurrentUserAssignee;
  const completedAssigneeCount = item.assignees.filter((assignee) => assignee.status === 'COMPLETED').length;
  const currentUserAssignee = item.assignees.find((assignee) => {
    const currentUserId = currentUser?.id;
    const currentUserEmail = currentUser?.email?.toLowerCase();
    return (
      (currentUserId && assignee.user_id === currentUserId) ||
      (currentUserEmail && (assignee.email || '').toLowerCase() === currentUserEmail)
    );
  });
  const selfStatusLabel = currentUserAssignee
    ? ({
        PENDING: 'Đang chờ',
        IN_PROGRESS: 'Đang làm',
        COMPLETED: 'Đã xong',
        CANCELLED: 'Đã hủy',
      }[currentUserAssignee.status])
    : 'Không được giao';
  const overallProgressLabel = item.assignees.length
    ? `${completedAssigneeCount}/${item.assignees.length} hoàn thành`
    : 'Chưa giao';

  const handleToggleDone = () => {
    if (canUpdateOwnStatus) {
      onUpdateSelfStatus(isDone ? 'PENDING' : 'COMPLETED');
    }
  };

  if (isEditing && draft) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary-200 bg-white p-5 shadow-2xl shadow-primary-500/10 ring-1 ring-primary-500/20"
      >
        <div className="space-y-4">
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => onPatchDraft({ title: e.target.value })}
            className="w-full text-lg font-black text-gray-900 outline-none placeholder:text-gray-300"
            placeholder="Tên công việc..."
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Người phụ trách</label>
                <div className="flex flex-wrap gap-2">
                   {assigneeOptions.map(opt => {
                      const selected = draft.assignedEmails.includes(opt.email);
                      return (
                        <button
                          key={opt.email}
                          onClick={() => {
                            const next = selected 
                              ? draft.assignedEmails.filter(e => e !== opt.email)
                              : [...draft.assignedEmails, opt.email];
                            onPatchDraft({ assignedEmails: next });
                          }}
                          className={cn(
                            "h-8 w-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all",
                            selected ? "bg-primary-600 text-white border-primary-100 shadow-lg shadow-primary-600/20" : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                          )}
                          title={opt.label}
                        >
                          {initialsFor(opt.label)}
                        </button>
                      )
                   })}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Ưu tiên</label>
                   <select 
                     value={draft.priority}
                     onChange={(e) => onPatchDraft({ priority: e.target.value })}
                     className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 outline-none focus:border-primary-300 transition-all"
                   >
                     {Object.entries(priorityConfig).map(([val, cfg]) => (
                       <option key={val} value={val}>{cfg.label}</option>
                     ))}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Hạn</label>
                   <input 
                     type="date"
                     value={draft.dueDate}
                     onChange={(e) => onPatchDraft({ dueDate: e.target.value })}
                     className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-black text-gray-700 outline-none focus:border-primary-300 transition-all"
                   />
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button onClick={onCancelEdit} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Hủy bỏ</button>
            <button 
              onClick={onConfirmEdit} 
              disabled={isSaving} 
              className="rounded-xl bg-primary-600 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
            >
              Cập nhật ngay
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border border-gray-100/50 bg-white/70 p-4 backdrop-blur-md transition-all duration-500",
        priority.glow,
        priority.bg,
        priority.border,
        "hover:shadow-2xl hover:border-white hover:ring-1 hover:ring-gray-100",
        isDone && "opacity-80 grayscale-[0.3]"
      )}
    >
      {/* Premium Checkbox */}
      <div className="relative flex items-center justify-center">
        <button 
          onClick={handleToggleDone}
          disabled={!canUpdateOwnStatus}
          className={cn(
            "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
            !canUpdateOwnStatus && "cursor-not-allowed opacity-50",
            isDone 
              ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 rotate-[360deg]" 
              : "bg-white border-gray-200 text-transparent hover:border-primary-400 hover:shadow-lg hover:shadow-primary-500/10"
          )}
          title={canUpdateOwnStatus ? "Cập nhật tiến độ phần việc của bạn" : "Chỉ người được giao mới cập nhật được phần việc của mình"}
        >
          <motion.div
            initial={false}
            animate={{ scale: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <CheckCircle2 size={18} strokeWidth={3} />
          </motion.div>
          {!isDone && (
            <div className="absolute inset-0 rounded-full bg-primary-500/5 opacity-0 hover:opacity-100 transition-opacity" />
          )}
        </button>
        
        {/* Animated Checkbox background ripple */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute h-7 w-7 rounded-full bg-emerald-400"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Content Area */}
      <div className="min-w-0 flex-1 py-0.5">
        <h4 className={cn(
          "text-[15px] font-black tracking-tight leading-tight transition-all duration-500",
          isDone ? "text-gray-400 line-through decoration-emerald-500/30" : "text-gray-900 group-hover:text-primary-900"
        )}>
          {item.title}
        </h4>
        {item.description && (
          <p className={cn(
            "mt-1.5 text-xs font-medium leading-relaxed text-gray-400 line-clamp-1 group-hover:line-clamp-none transition-all duration-300",
            isDone ? "opacity-40" : "group-hover:text-gray-500"
          )}>
            {item.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
            Phần tôi: {selfStatusLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
            Trạng thái tổng: {overallProgressLabel}
          </span>
        </div>
      </div>

      {/* Meta Indicators Container */}
      <div className="flex shrink-0 items-center gap-6">
        {/* Priority & Date Row */}
        <div className="flex items-center gap-4">
          {/* Due Date Glass Pill */}
          {dueDateLabel && (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] border transition-all shadow-sm",
                overdue 
                  ? "bg-red-50/50 border-red-100 text-red-600 shadow-red-200/20" 
                  : "bg-gray-50/50 border-gray-100 text-gray-500 shadow-gray-100/20"
              )}
            >
              <Clock size={10} strokeWidth={3} className={overdue ? "animate-pulse" : ""} />
              {dueDateLabel}
            </motion.div>
          )}

          {/* Priority Indicator */}
          <div className="flex items-center gap-2 px-1">
             <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px] transition-all", priority.dot, isDone ? "shadow-transparent" : priority.glow.replace('group-hover:', ''))} />
             <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] hidden md:block", isDone ? "text-gray-300" : priority.color)}>
                {priority.label}
             </span>
          </div>

          {/* Interactive Avatar Stack */}
          <motion.div 
            className="flex -space-x-2.5"
            whileHover={{ spacing: 4 }}
          >
            {item.assignees.length > 0 ? (
              item.assignees.slice(0, 3).map((assignee, idx) => (
                <motion.div
                  key={assignee.id || assignee.email}
                  initial={false}
                  whileHover={{ y: -4, zIndex: 20, scale: 1.1 }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-50 to-primary-100 text-[10px] font-black text-primary-700 shadow-lg transition-transform",
                    idx === 0 && "ring-2 ring-primary-500/20 shadow-primary-500/10"
                  )}
                  title={assignee.display_name || assignee.email}
                >
                  {initialsFor(assignee.display_name || assignee.email)}
                </motion.div>
              ))
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-300 transition-colors group-hover:text-primary-300 group-hover:border-primary-200" title="Chưa có người phụ trách">
                 <Users size={14} />
              </div>
            )}
            {item.assignees.length > 3 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-50 text-[10px] font-black text-gray-400 shadow-md">
                +{item.assignees.length - 3}
              </div>
            )}
          </motion.div>
        </div>

        {/* Hover-only Premium Action Buttons */}
        {canManage && (
          <div className="flex items-center gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
            <button
              onClick={onStartEdit}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm border border-gray-100 hover:text-primary-600 hover:border-primary-100 hover:shadow-xl hover:shadow-primary-500/10 transition-all active:scale-90"
              title="Chỉnh sửa"
            >
              <Pencil size={15} strokeWidth={2.5} />
            </button>
            <button
              onClick={onDelete}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm border border-gray-100 hover:text-red-500 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/10 transition-all active:scale-90"
              title="Xóa"
            >
              <Trash2 size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* Hover background glow accent */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10",
        "bg-gradient-to-r from-transparent via-transparent to-white/80"
      )} />
    </motion.div>
  );
};

export default MeetingActionItemCard;
