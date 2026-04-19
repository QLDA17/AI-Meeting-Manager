/**
 * MeetingCard Component
 * Hiển thị thông tin tóm tắt của một cuộc họp trong danh sách
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  FolderOpen,
  Building2,
  Star,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { getGroupById, getOrgById } from '../../data';
import type { Meeting } from '../../types';

interface MeetingCardProps {
  meeting: Meeting;
  index: number;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, index }) => {
  const group = getGroupById(meeting.groupId);
  const org = getOrgById(meeting.orgId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      {/* Pinned indicator */}
      {meeting.isPinned && (
        <div className="absolute right-4 top-4 z-10">
          <Star size={18} className="text-amber-500" fill="currentColor" />
        </div>
      )}

      <Link to={`/meetings/${meeting.id}`} className="flex flex-1 flex-col p-5">
        {/* Group & Org context */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 font-bold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
            <FolderOpen size={10} />
            {group?.name || 'Nhóm chung'}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
            <Building2 size={10} />
            {org?.name || 'Tổ chức'}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-300">
          {meeting.title}
        </h3>

        {/* Description */}
        {meeting.description && (
          <p className="mb-4 text-sm text-gray-600 line-clamp-2 dark:text-slate-400">
            {meeting.description}
          </p>
        )}

        <div className="mt-auto space-y-3">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Calendar size={14} className="text-gray-400" />
              <span>{format(new Date(meeting.startTime), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Clock size={14} className="text-gray-400" />
              <span>{meeting.duration} phút</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <Users size={14} className="text-gray-400" />
              <span>{meeting.attendees?.length || 0} người</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <span className="font-bold text-primary-600 dark:text-primary-400">
                {format(new Date(meeting.startTime), 'HH:mm')}
              </span>
            </div>
          </div>

          {/* AI Summary badges */}
          {(meeting.keyPoints || (meeting as any).decisions) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {meeting.keyPoints && meeting.keyPoints.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {meeting.keyPoints.length} Điểm chính
                </span>
              )}
              {meeting.decisions && meeting.decisions.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {meeting.decisions.length} Quyết định
                </span>
              )}
            </div>
          )}

          {/* Action Link */}
          <div className="flex items-center justify-end pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 transition-colors group-hover:text-primary-700 dark:text-primary-400 dark:group-hover:text-primary-300">
              Chi tiết
              <ExternalLink size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default MeetingCard;
