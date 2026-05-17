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
  ListChecks,
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
    accent: 'border-l-red-500',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    icon: <Radio size={10} />,
    action: 'Vào phòng',
    href: (m: Meeting) => `/room/${m.code || m.id}`,
    actionClass: 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/20',
  },
  upcoming: {
    label: 'Sắp tới',
    accent: 'border-l-blue-500',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    icon: <Calendar size={10} />,
    action: 'Vào phòng',
    href: (m: Meeting) => `/room/${m.code || m.id}`,
    actionClass: 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-600/20',
  },
  completed: {
    label: 'Hoàn tất',
    accent: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    icon: <CheckCircle2 size={10} />,
    action: 'Biên bản',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  },
  processing: {
    label: 'Đang xử lý',
    accent: 'border-l-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    icon: <Loader2 size={10} className="animate-spin" />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-600/20',
  },
  queued: {
    label: 'Chờ xử lý',
    accent: 'border-l-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    icon: <Clock size={10} />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20',
  },
  failed: {
    label: 'Lỗi',
    accent: 'border-l-rose-500',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    icon: <AlertCircle size={10} />,
    action: 'Xem',
    href: (m: Meeting) => `/meetings/${m.id}`,
    actionClass: 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20',
  },
  canceled: {
    label: 'Đã hủy',
    accent: 'border-l-gray-300 dark:border-l-slate-600',
    dot: 'bg-gray-300 dark:bg-slate-600',
    badge: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
    icon: <AlertCircle size={10} />,
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
  const actionCount = meeting.actionItemsCount || 0;

  // Time-based join gating
  const now = new Date();
  const isStartingSoon = start.getTime() - now.getTime() <= 15 * 60 * 1000;
  const isLive = meeting.status === 'live';
  const canJoin = isLive || isStartingSoon;

  const effectiveStatus = meeting.status === 'upcoming' && !canJoin
    ? { ...status, action: 'Chưa tới giờ', actionClass: 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' }
    : status;
  const actionHref = canJoin ? status.href(meeting) : '#';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.22 }}
      className={`group relative flex flex-col rounded-2xl border border-gray-200/70 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 dark:border-slate-700/60 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:shadow-slate-900/30 border-l-[3px] ${status.accent}`}
    >
      {/* Top: Status + Actions */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${status.badge}`}>
            {status.icon}
            {status.label}
          </span>
          {meeting.isPinned && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Star size={9} fill="currentColor" />
              Ghim
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit?.(meeting)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Sửa"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(meeting)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Xóa"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <Link to={`/meetings/${meeting.id}`} className="flex flex-1 flex-col px-4 pb-3">
        {/* Group & Org */}
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-slate-500">
          <FolderOpen size={10} />
          <span className="truncate">{meeting.groupName || meeting.organizationName || 'Chưa phân nhóm'}</span>
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-gray-900 transition-colors group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
          {meeting.title}
        </h3>

        {/* Summary */}
        {(meeting.summary || meeting.description) && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-400 dark:text-slate-500">
            {meeting.summary || meeting.description}
          </p>
        )}

        {/* Date & Duration */}
        <div className="mt-auto flex items-center gap-3 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-slate-400">
            <Calendar size={11} className="text-gray-400 dark:text-slate-500" />
            <span>{format(start, 'dd/MM')} &middot; {format(start, 'HH:mm')}</span>
          </div>
          <div className="h-3 w-px bg-gray-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-slate-400">
            <Clock size={11} className="text-gray-400 dark:text-slate-500" />
            <span>{
              meeting.duration
                ? `${meeting.duration}p`
                : (meeting.startTime && meeting.endTime)
                  ? `${Math.round((safeDate(meeting.endTime).getTime() - safeDate(meeting.startTime).getTime()) / 60000)}p`
                  : '--'
            }</span>
          </div>
          <div className="h-3 w-px bg-gray-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-slate-400">
            <Users size={11} className="text-gray-400 dark:text-slate-500" />
            <span>{meeting.attendees?.length || 0}</span>
          </div>
        </div>

        {/* Pills */}
        {(hasTranscript || hasAiNotes || insightCount > 0 || actionCount > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {hasTranscript && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <FileText size={9} />
                Bản ghi
              </span>
            )}
            {hasAiNotes && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Bot size={9} />
                AI
              </span>
            )}
            {insightCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                {insightCount} ý tưởng
              </span>
            )}
            {actionCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <ListChecks size={9} />
                {actionCount} việc
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-slate-800/60">
        <div className="text-[10px] font-medium text-gray-400 dark:text-slate-500">
          {meeting.code ? (
            <span className="inline-flex items-center gap-1 font-mono">
              <Hash size={9} />
              {meeting.code}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-slate-600">&mdash;</span>
          )}
        </div>
        <Link
          to={actionHref}
          onClick={(e) => { if (!canJoin && meeting.status === 'upcoming') e.preventDefault(); }}
          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all duration-150 hover:shadow-md ${effectiveStatus.actionClass}`}
        >
          {effectiveStatus.action}
        </Link>
      </div>
    </motion.article>
  );
};

export default MeetingCard;
