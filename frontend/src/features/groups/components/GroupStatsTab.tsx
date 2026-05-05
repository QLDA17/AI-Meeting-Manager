/**
 * GroupStatsTab - Tab thống kê group
 */
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
import {
  FileText,
  Users,
  Clock,

  TrendingUp,
  Calendar,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { getGroupById, getMeetingsByGroupId } from '@/shared/mockData';

interface GroupStatsTabProps {
  groupId: string;
}

const GroupStatsTab: React.FC<GroupStatsTabProps> = ({ groupId }) => {
  const group = getGroupById(groupId);
  const meetings = getMeetingsByGroupId(groupId);

  // Calculate stats
  const stats = useMemo(() => {
    const totalMeetings = meetings.length;
    const totalHours = meetings.reduce((sum, m) => sum + m.duration, 0) / 60;
    const avgMeetingDuration = totalMeetings > 0 ? meetings.reduce((sum, m) => sum + m.duration, 0) / totalMeetings : 0;
    const totalKeyPoints = meetings.reduce((sum, m) => sum + (m.keyPoints?.length || 0), 0);
    const totalDecisions = meetings.reduce((sum, m) => sum + (m.decisions?.length || 0), 0);

    return {
      totalMeetings,
      totalHours,
      avgMeetingDuration,
      totalKeyPoints,
      totalDecisions,
    };
  }, [meetings]);

  // Weekly meeting trend (mock data)
  const weeklyTrend = [
    { week: 'W1', meetings: 3, hours: 4.5 },
    { week: 'W2', meetings: 5, hours: 7.2 },
    { week: 'W3', meetings: 4, hours: 6.0 },
    { week: 'W4', meetings: 6, hours: 8.5 },
    { week: 'W5', meetings: 4, hours: 5.8 },
    { week: 'W6', meetings: 7, hours: 10.2 },
  ];

  // Meeting duration distribution
  const durationDistribution = [
    { range: '< 30 min', count: 5 },
    { range: '30-60 min', count: 12 },
    { range: '60-90 min', count: 8 },
    { range: '90+ min', count: 3 },
  ];

  // AI summary breakdown (mock)
  const aiBreakdown = [
    { name: 'Key Points', value: 45 },
    { name: 'Decisions', value: 30 },
    { name: 'Summaries', value: 25 },
  ];

  // Top speakers (mock)
  const topSpeakers = [
    { name: 'Nguyễn Văn A', meetings: 18, hours: 24 },
    { name: 'Trần Thị B', meetings: 15, hours: 18 },
    { name: 'Phạm Văn C', meetings: 12, hours: 15 },
    { name: 'Hoàng Hữu D', meetings: 10, hours: 12 },
    { name: 'Phan Minh E', meetings: 8, hours: 10 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (!group) {
    return <div className="py-8 text-center text-gray-500">Group not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          Group Statistics
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Insights and analytics for {group.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Meetings', value: stats.totalMeetings, icon: <FileText size={18} />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Hours', value: `${stats.totalHours.toFixed(1)}h`, icon: <Clock size={18} />, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Members', value: group.memberCount, icon: <Users size={18} />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Key Points', value: stats.totalKeyPoints, icon: <TrendingUp size={18} />, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Avg Duration', value: `${stats.avgMeetingDuration.toFixed(0)}m`, icon: <TrendingUp size={18} />, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Decisions', value: stats.totalDecisions, icon: <CheckCircle2 size={18} />, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.bgColor}`}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <Calendar size={16} className="text-blue-600" />
            Weekly Meeting Trend
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="meetings" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} name="Meetings" />
              <Line type="monotone" dataKey="hours" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} name="Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Duration Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <Clock size={16} className="text-purple-600" />
            Meeting Duration Distribution
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI Summary Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <TrendingUp size={16} className="text-amber-600" />
            AI Summary Breakdown
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={aiBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {aiBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Speakers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100">
            <MessageSquare size={16} className="text-green-600" />
            Top Speakers
          </h4>
          <div className="space-y-3">
            {topSpeakers.map((speaker, idx) => (
              <div key={speaker.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{speaker.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{speaker.meetings} meetings</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {speaker.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupStatsTab;
