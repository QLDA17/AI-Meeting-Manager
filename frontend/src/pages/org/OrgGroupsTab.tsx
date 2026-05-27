import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  Building2,
  Clock3,
  EyeOff,
  FileText,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Search,
  Settings,
  Users,
} from 'lucide-react';

import { PageState } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import api from '../../services/api';
import { useOrgStore } from '../../stores';
import type { Group, GroupJoinPolicy, GroupVisibility } from '../../types';

interface OrgGroupsTabProps {
  orgId: string;
}

type ValidAccessMode =
  | 'hidden:invite_only'
  | 'organization:invite_only'
  | 'organization:request_approval'
  | 'organization:open_join';

const accessConfig: Record<
  ValidAccessMode,
  {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
  }
> = {
  'hidden:invite_only': {
    label: 'Ẩn · Chỉ theo lời mời',
    icon: <EyeOff size={14} className="text-gray-500" />,
    badgeClass:
      'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  },
  'organization:invite_only': {
    label: 'Hiển thị trong tổ chức · Chỉ theo lời mời',
    icon: <Building2 size={14} className="text-blue-500" />,
    badgeClass:
      'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900/40',
  },
  'organization:request_approval': {
    label: 'Hiển thị trong tổ chức · Yêu cầu phê duyệt',
    icon: <Building2 size={14} className="text-amber-500" />,
    badgeClass:
      'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/40',
  },
  'organization:open_join': {
    label: 'Hiển thị trong tổ chức · Tự tham gia',
    icon: <Building2 size={14} className="text-emerald-500" />,
    badgeClass:
      'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/40',
  },
};

const formatHours = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0h';
  return `${value.toFixed(value >= 10 ? 0 : 1)}h`;
};

const OrgGroupsTab: React.FC<OrgGroupsTabProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const { currentOrg, groups, loadGroups } = useOrgStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const orgGroups = useMemo(
    () => groups.filter((group) => group.organization_id === orgId || group.orgId === orgId),
    [groups, orgId],
  );

  const filteredGroups = useMemo(
    () =>
      orgGroups.filter((group) => {
        const haystack = `${group.name} ${group.description || ''}`.toLowerCase();
        const matchesSearch = haystack.includes(searchTerm.toLowerCase());
        const matchesVisibility = visibilityFilter === 'all' || group.visibility === visibilityFilter;
        return matchesSearch && matchesVisibility;
      }),
    [orgGroups, visibilityFilter, searchTerm],
  );

  const stats = useMemo(() => {
    const totalGroups = orgGroups.length;
    const totalMembers = orgGroups.reduce((sum, group) => sum + (group.memberCount || 0), 0);
    const totalMeetings = orgGroups.reduce((sum, group) => sum + (group.meetingCount || 0), 0);
    return { totalGroups, totalMembers, totalMeetings };
  }, [orgGroups]);

  const handleArchive = async (group: Group) => {
    try {
      await api.patch(`/api/groups/${group.id}`, {
        settings: {
          ...(group.settings || {}),
          archived: true,
          archivedAt: new Date().toISOString(),
        },
      });
      toast.success(`Đã lưu trữ nhóm ${group.name}`);
      await loadGroups(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Không thể lưu trữ nhóm');
    }
  };

  const emptyForFilters = orgGroups.length > 0;

  return (
    <div className="space-y-6">
      {/* Tab Sub-Header & Controls */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Danh sách nhóm ({filteredGroups.length})
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Phân tách không gian làm việc theo dự án, phòng ban và quản trị quyền truy cập.
          </p>
        </div>

        <Link
          to="/groups/create"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-primary-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-primary-600/30 self-start sm:self-center"
        >
          <FolderPlus size={14} className="stroke-[3]" />
          Tạo nhóm mới
        </Link>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="sticky top-0 z-20 px-1 py-1"
      >
        <div className="rounded-xl border border-gray-150 bg-gray-50/50 backdrop-blur-md p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
                size={15}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm nhóm theo tên hoặc mô tả..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100/50 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100 dark:focus:ring-primary-900/30"
              />
            </div>
            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100"
            >
              <option value="all">Tất cả phạm vi hiển thị</option>
              <option value="hidden">Ẩn khỏi tổ chức</option>
              <option value="organization">Hiển thị trong tổ chức</option>
            </select>
          </div>
        </div>
      </motion.div>

      {filteredGroups.length === 0 ? (
        <PageState
          title={
            emptyForFilters
              ? 'Không có nhóm nào khớp bộ lọc hiện tại'
              : 'Tổ chức này chưa có nhóm nào'
          }
          description={
            emptyForFilters
              ? 'Thử mở rộng từ khóa tìm kiếm hoặc đổi bộ lọc phạm vi hiển thị để xem thêm nhóm.'
              : 'Tạo nhóm đầu tiên để bắt đầu chia không gian cộng tác theo phòng ban, dự án hoặc chức năng.'
          }
          tone="empty"
          action={
            !emptyForFilters ? (
              <Link
                to="/groups/create"
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black text-white shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1"
              >
                <FolderPlus size={18} className="stroke-[3]" />
                Tạo nhóm đầu tiên
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const access = accessConfig[`${group.visibility}:${group.joinPolicy}`] || accessConfig['organization:invite_only'];
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-100 bg-white/70 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-200/80 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/30"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3.5 flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-indigo-50/50 dark:from-primary-950/20 dark:to-indigo-950/10 border border-primary-100/30 dark:border-primary-900/20 text-primary-600 dark:text-primary-350 shadow-sm shadow-primary-100/20">
                        {access.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-gray-900 dark:text-slate-100">
                          {group.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                          <span className={`rounded-full px-2.5 py-0.8 border ${access.badgeClass}`}>
                            {group.accessSummary || access.label}
                          </span>
                          <span>{group.memberCount} thành viên</span>
                          <span>·</span>
                          <span>{group.meetingCount} cuộc họp</span>
                          <span>·</span>
                          <span>{formatHours(group.totalHours)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-slate-350">
                      {group.description || 'Nhóm này chưa có mô tả chi tiết. Hãy bổ sung mục tiêu và phạm vi cộng tác để mọi người dễ theo dõi hơn.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-450 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100/50 px-2 py-1">
                        <Users size={13} className="text-gray-400" />
                        {group.memberCount} thành viên
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100/50 px-2 py-1">
                        <FileText size={13} className="text-gray-400" />
                        {group.meetingCount} cuộc họp
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50/50 dark:bg-primary-950/10 border border-primary-100/20 px-2 py-1 font-bold text-primary-700 dark:text-primary-300">
                        <Clock3 size={13} />
                        {formatHours(group.totalHours)}
                      </span>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-2 shrink-0">
                    <Link
                      to={`/groups/${group.id}`}
                      className="rounded-lg border border-gray-250 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-750 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Xem nhóm
                    </Link>
                    <button
                      onClick={() => setOpenMenuId((prev) => (prev === group.id ? null : group.id))}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-105 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenuId === group.id && (
                      <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-gray-150 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
                        <button
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                        >
                          <Settings size={13} />
                          Cài đặt nhóm
                        </button>
                        <button
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors"
                        >
                          <BarChart3 size={13} />
                          Xem phân tích
                        </button>
                        <button
                          onClick={() => handleArchive(group)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20 transition-colors"
                        >
                          <Archive size={13} />
                          Lưu trữ nhóm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgGroupsTab;
