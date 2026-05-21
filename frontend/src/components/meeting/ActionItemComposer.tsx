import React from 'react';
import { Calendar, ChevronDown, ChevronUp, Flag, Plus, Sparkles, UserPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { ActionItem, ActionItemAssigneeOption } from '../../types/actionItem';
import { cn } from '../../lib/utils';

type ActionItemComposerProps = {
  canManage: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  assigneeOptions: ActionItemAssigneeOption[];
  selectedAssignees: string[];
  onSelectedAssigneesChange: (emails: string[]) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  priority: ActionItem['priority'];
  onPriorityChange: (value: ActionItem['priority']) => void;
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
  showAdvanced: boolean;
  onShowAdvancedChange: (next: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
};

const priorityConfig: Record<ActionItem['priority'], { label: string, color: string, icon: React.ReactNode }> = {
  LOW: { label: 'Thấp', color: 'text-gray-400', icon: <Flag size={14} /> },
  MEDIUM: { label: 'Trung bình', color: 'text-blue-500', icon: <Flag size={14} /> },
  HIGH: { label: 'Cao', color: 'text-orange-500', icon: <Flag size={14} /> },
  URGENT: { label: 'Khẩn cấp', color: 'text-red-500', icon: <Flag size={14} /> },
};

const toggleSelection = (current: string[], email: string) =>
  current.includes(email) ? current.filter((item) => item !== email) : [...current, email];

const initialsFor = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

const ActionItemComposer: React.FC<ActionItemComposerProps> = ({
  canManage,
  title,
  onTitleChange,
  assigneeOptions,
  selectedAssignees,
  onSelectedAssigneesChange,
  dueDate,
  onDueDateChange,
  priority,
  onPriorityChange,
  isExpanded,
  onExpandedChange,
  isSubmitting,
  onSubmit,
}) => {
  if (!canManage) return null;

  const resetForm = () => {
    onTitleChange('');
    onExpandedChange(false);
  };

  return (
    <div className="group relative">
      <form
        onSubmit={onSubmit}
        className={cn(
          "overflow-hidden rounded-2xl border transition-all duration-500",
          isExpanded 
            ? "border-primary-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-primary-500/10" 
            : "border-gray-100 bg-white/60 backdrop-blur-sm hover:border-gray-200 hover:bg-white hover:shadow-lg"
        )}
      >
        <div className="flex items-center px-4 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-gray-300">
            {isSubmitting ? (
              <Sparkles size={20} className="animate-spin text-primary-500" />
            ) : (
              <Plus size={20} className={cn("transition-transform duration-300", isExpanded ? "text-primary-500 rotate-90" : "")} />
            )}
          </div>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onFocus={() => onExpandedChange(true)}
            placeholder="Thêm việc cần làm mới..."
            className="h-10 w-full bg-transparent px-2 text-[15px] font-black text-gray-900 outline-none placeholder:text-gray-300 transition-all"
          />
          
          <AnimatePresence>
            {!isExpanded && title.trim() && (
              <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  type="submit"
                  className="ml-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary-600/20 active:scale-95"
              >
                  Tạo nhanh
              </motion.button>
            )}
          </AnimatePresence>

          {isExpanded && (
            <button
              type="button"
              onClick={resetForm}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="border-t border-gray-50 bg-gray-50/30"
            >
              <div className="space-y-6 p-6">
                {/* Premium Assignees Selector */}
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">
                    Người phụ trách
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {assigneeOptions.map((option) => {
                      const selected = selectedAssignees.includes(option.email);
                      return (
                        <button
                          key={option.email}
                          type="button"
                          onClick={() => onSelectedAssigneesChange(toggleSelection(selectedAssignees, option.email))}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-full border px-1.5 py-1 transition-all duration-300",
                            selected
                              ? "border-primary-200 bg-white shadow-md shadow-primary-500/5 ring-2 ring-primary-500/10"
                              : "border-transparent bg-white/50 hover:bg-white hover:border-gray-100 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black transition-all",
                            selected ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" : "bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600"
                          )}>
                            {initialsFor(option.label)}
                          </div>
                          <span className={cn(
                            "pr-2 text-xs font-black transition-colors tracking-tight",
                            selected ? "text-primary-900" : "text-gray-500 group-hover:text-gray-900"
                          )}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                    {assigneeOptions.length === 0 && (
                      <div className="flex items-center gap-2 px-2 py-2 text-xs font-black text-gray-400 italic">
                        <UserPlus size={16} /> Chưa có thành viên
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                  {/* Elegant Due Date Selector */}
                  <div className="flex-1">
                    <label className="mb-2 block px-0.5 text-[11px] font-bold text-gray-500">
                      Hạn hoàn thành
                    </label>
                    <div className="group relative flex h-10 items-center rounded-xl border border-gray-100 bg-white px-3 transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/5 hover:border-gray-200">
                      <Calendar size={14} className="text-gray-400 transition-colors group-focus-within:text-primary-500" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) => onDueDateChange(event.target.value)}
                        className="h-full w-full cursor-pointer bg-transparent px-2 text-xs font-bold text-gray-700 outline-none"
                      />
                    </div>
                  </div>

                  {/* Elegant Priority Selector */}
                  <div className="flex-1">
                    <label className="mb-2 block px-0.5 text-[11px] font-bold text-gray-500">
                      Mức ưu tiên
                    </label>
                    <div className="group relative flex h-10 items-center rounded-xl border border-gray-100 bg-white px-3 transition-all focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/5 hover:border-gray-200">
                      <div className={cn(priorityConfig[priority].color, "shrink-0 transition-transform group-hover:scale-110")}>
                        {priorityConfig[priority].icon}
                      </div>
                      <select
                        value={priority}
                        onChange={(event) => onPriorityChange(event.target.value as ActionItem['priority'])}
                        className="h-full w-full cursor-pointer appearance-none bg-transparent px-2 text-xs font-bold text-gray-700 outline-none"
                      >
                        {Object.entries(priorityConfig).map(([val, cfg]) => (
                          <option key={val} value={val}>{cfg.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none text-gray-400 transition-transform group-focus-within:rotate-180 group-hover:text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Premium Submit Row */}
                <div className="flex items-center justify-end border-t border-gray-50 pt-5">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !title.trim()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? <Sparkles size={16} className="animate-spin" /> : <Plus size={18} className="stroke-[3]" />}
                      Tạo công việc
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default ActionItemComposer;
