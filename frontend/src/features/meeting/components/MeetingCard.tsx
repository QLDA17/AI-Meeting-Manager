/**
 * Professional MeetingCard Component
 * Refactored for Minimalist & Premium UI
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  Clock,
  ChevronRight,
  Star,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type { Meeting } from '../../../../types';

interface MeetingCardProps {
  meeting: Meeting;
  index: number;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 hover:border-primary-200 dark:hover:border-primary-800/50 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 overflow-hidden"
    >
      <Link to={`/meetings/${meeting.id}`} className="block p-6">
        {/* Top bar: Date & Pin */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5 rounded-full bg-gray-50 dark:bg-slate-800/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
            <Calendar size={12} className="text-primary-500" />
            <span>{format(new Date(meeting.startTime), 'dd MMM, yyyy')}</span>
          </div>
          {meeting.isPinned && (
            <div className="rounded-full bg-amber-50 dark:bg-amber-900/20 p-1.5">
              <Star size={14} className="text-amber-500 fill-amber-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 transition-colors line-clamp-1">
            {meeting.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-10">
            {meeting.description || "Không có nội dung mô tả cho cuộc thảo luận này."}
          </p>
        </div>

        {/* Info Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Users size={14} />
            <span>{meeting.attendees?.length || 0} người</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            <Clock size={14} />
            <span>{meeting.duration}m</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-5 border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-slate-500">
            <FileText size={14} />
            <span>{format(new Date(meeting.startTime), 'HH:mm')}</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
            Chi tiết
            <ChevronRight size={14} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
