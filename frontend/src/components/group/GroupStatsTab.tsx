import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Calendar, CheckCircle2, Clock, FileText, TrendingUp, Users } from 'lucide-react';

import { useGroupStore } from '../../stores';

interface GroupStatsTabProps {
  groupId: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const GroupStatsTab: React.FC<GroupStatsTabProps> = ({ groupId }) => {
  const { group, meetings } = useGroupStore();

  const stats = useMemo(() => {
    const totalMeetings = meetings.length;
    const totalMinutes = meetings.reduce((sum, meeting) => sum + (meeting.duration || 0), 0);
    const totalHours = totalMinutes / 60;
    const avgMeetingDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0;
    const totalKeyPoints = meetings.reduce((sum, meeting) => sum + (meeting.keyPoints?.length || 0), 0);
    const totalDecisions = meetings.reduce((sum, meeting) => sum + (meeting.decisions?.length || 0), 0);

    return {
      totalMeetings,
      totalHours,
      avgMeetingDuration,
      totalKeyPoints,
      totalDecisions,
    };
  }, [meetings]);

  const timelineTrend = useMemo(() => {
    if (meetings.length === 0) return [];
    const grouped = meetings.reduce((acc, meeting) => {
      const dateLabel = meeting.startTime
        ? new Date(meeting.startTime).toLocaleDateString('vi-VN')
        : 'Không rõ';
      if (!acc[dateLabel]) acc[dateLabel] = { date: dateLabel, meetings: 0, hours: 0 };
      acc[dateLabel].meetings += 1;
      acc[dateLabel].hours += (meeting.duration || 0) / 60;
      return acc;
    }, {} as Record<string, { date: string; meetings: number; hours: number }>);

    return Object.values(grouped).slice(-7);
  }, [meetings]);

  const durationDistribution = useMemo(() => {
    const buckets = { 'Dưới 30 phút': 0, '30-60 phút': 0, '60-90 phút': 0, 'Trên 90 phút': 0 };
    meetings.forEach((meeting) => {
      const duration = meeting.duration || 0;
      if (duration < 30) buckets['Dưới 30 phút'] += 1;
      else if (duration < 60) buckets['30-60 phút'] += 1;
      else if (duration < 90) buckets['60-90 phút'] += 1;
      else buckets['Trên 90 phút'] += 1;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [meetings]);

  const aiBreakdown = useMemo(() => [
    { name: 'Ý chính', value: stats.totalKeyPoints || 1 },
    { name: 'Quyết định', value: stats.totalDecisions || 1 },
    { name: 'Tóm tắt', value: meetings.filter((meeting) => meeting.summary).length || 1 },
  ], [meetings, stats.totalDecisions, stats.totalKeyPoints]);

  if (!group || group.id !== groupId) {
    return <div className="py-8 text-center text-gray-500">Không tìm thấy thông tin thống kê của nhóm.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Thống kê nhóm</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Tổng quan nhanh về hoạt động họp và nội dung AI của nhóm {group.name}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Cuộc họp', value: stats.totalMeetings, icon: <FileText size={18} />, accent: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
          { label: 'Tổng giờ', value: `${stats.totalHours.toFixed(1)}h`, icon: <Clock size={18} />, accent: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20' },
          { label: 'Thành viên', value: group.memberCount, icon: <Users size={18} />, accent: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
          { label: 'Ý chính', value: stats.totalKeyPoints, icon: <TrendingUp size={18} />, accent: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' },
          { label: 'Quyết định', value: stats.totalDecisions, icon: <CheckCircle2 size={18} />, accent: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${item.accent}`}>
              {item.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{item.value}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <Calendar size={16} className="text-blue-600" />
            Xu hướng cuộc họp theo ngày
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="meetings" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="Cuộc họp" />
              <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} name="Số giờ" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <Clock size={16} className="text-purple-600" />
            Phân bố thời lượng cuộc họp
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={durationDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="range" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
          <TrendingUp size={16} className="text-amber-600" />
          Tỷ trọng nội dung AI
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={aiBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={84}
              dataKey="value"
            >
              {aiBreakdown.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Thời lượng trung bình mỗi cuộc họp</p>
        <p className="mt-2 text-3xl font-black text-gray-900 dark:text-slate-100">
          {stats.avgMeetingDuration.toFixed(0)} phút
        </p>
      </div>
    </div>
  );
};

export default GroupStatsTab;
