import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Hash,
  Loader2,
  Pencil,
  Radio,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Meeting } from '../../types';

interface MeetingCardProps {
  meeting: Meeting;
  index: number;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
  canManage?: boolean;
}

const statusConfig = {
  live: {
    label: 'Live',
    accent: 'border-t-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    icon: <Radio size={11} />,
    action: 'Vào phòng',
    href: (m: Meeting) => `/room/${m.code || m.id}`,
    actionClass: 'bg-red-600 text-white hover:bg-red-700',
  },
  upcoming: {
    label: 'Sắp tới',
    accent: 'border-t-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    icon: <Calendar size={11} />,
    action: 'Vào phòng',
    href: (m: Meeting) => `/room/${m.code || m.id}`,
    actionClass: 'bg-primary-600 text-white hover:bg-primary-700',
  },
  completed: {
    label: 'Hoàn tất',
    accent: 'border-t-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    icon: <CheckCircle2 size={11} />,
    action: 'Biên bản',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  },
  processing: {
    label: 'Xử lý',
    accent: 'border-t-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    icon: <Loader2 size={11} className="animate-spin" />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  queued: {
    label: 'Chờ',
    accent: 'border-t-amber-400',
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    icon: <Clock size={11} />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-amber-600 text-white hover:bg-amber-700',
  },
  failed: {
    label: 'Lỗi',
    accent: 'border-t-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    icon: <AlertCircle size={11} />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-rose-600 text-white hover:bg-rose-700',
  },
  canceled: {
    label: 'Hủy',
    accent: 'border-t-gray-300 dark:border-t-slate-600',
    badge: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
    icon: <AlertCircle size={11} />,
    action: 'Chi tiết',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-300',
  },
} as const;

const safeDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  index,
  onEdit,
  onDelete,
  canManage = false,
}) => {
  const status = statusConfig[meeting.status] || statusConfig.upcoming;
  const start = safeDate(meeting.startTime);
  const hasTranscript = Boolean(meeting.transcriptUrl || meeting.audioUrl || meeting.status === 'completed');
  const hasAiNotes = Boolean(meeting.summary || meeting.keyPoints?.length || meeting.decisions?.length);
  const insightCount = (meeting.keyPoints?.length || 0) + (meeting.decisions?.length || 0);
  const actionHref = status.href(meeting);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.25 }}
      className={`group flex flex-col rounded-xl border border-gray-200 bg-white transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 border-t-4 ${status.accent}`}
    >
      {/* Top: Status + Actions */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${status.badge}`}>
            {status.icon}
            {status.label}
          </span>
          {meeting.isPinned && <Star size={12} className="text-amber-500" fill="currentColor" />}
        </div>
        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit?.(meeting)}
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Sửa"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(meeting)}
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Xóa"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <Link to={`/meetings/${meeting.id}`} className="flex flex-1 flex-col px-4 pb-3">
        {/* Group & Org */}
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-slate-500">
          {meeting.groupName ? (
            <span className="inline-flex items-center gap-1">
              <FolderOpen size={11} />
              {meeting.groupName}
            </span>
          ) : meeting.organizationName ? (
            <span className="inline-flex items-center gap-1">
              <FolderOpen size={11} />
              {meeting.organizationName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <FolderOpen size={11} />
              Chưa phân nhóm
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
          {meeting.title}
        </h3>

        {/* Summary / Description */}
        {(meeting.summary || meeting.description) && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
            {meeting.summary || meeting.description}
          </p>
        )}

        {/* Date & Duration grid */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-slate-800/60">
            <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
              <Calendar size={10} />
              Ngày
            </div>
            <p className="text-xs font-black text-gray-800 dark:text-slate-200">{format(start, 'dd/MM')}</p>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">{format(start, 'HH:mm')}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-slate-800/60">
            <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 dark:text-slate-500">
              <Clock size={10} />
              Thời lượng
            </div>
            <p className="text-xs font-black text-gray-800 dark:text-slate-200">{meeting.duration || 60} phút</p>
            <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">{meeting.attendees?.length || 0} người</p>
          </div>
        </div>

        {/* Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${hasTranscript ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500'}`}>
            <FileText size={10} />
            {hasTranscript ? 'Bản ghi' : '—'}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${hasAiNotes ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500'}`}>
            <Bot size={10} />
            {hasAiNotes ? 'AI' : '—'}
          </span>
          {insightCount > 0 && (
            <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
              {insightCount}
            </span>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-slate-800">
        <div className="text-[11px] font-medium text-gray-400 dark:text-slate-500">
          {meeting.code ? (
            <span className="inline-flex items-center gap-1 font-mono">
              <Hash size={10} />
              {meeting.code}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Users size={10} />
              {meeting.attendees?.length || 0}
            </span>
          )}
        </div>
        <Link
          to={actionHref}
          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${status.actionClass}`}
        >
          {status.action}
        </Link>
      </div>
    </motion.article>
  );
};

export default MeetingCard;
