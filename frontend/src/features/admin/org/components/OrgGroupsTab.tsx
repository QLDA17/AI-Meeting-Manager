/**
 * OrgGroupsTab - Quản lý groups trong organization
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  FolderPlus,
  FolderOpen,
  Lock,
  Building2,
  Globe,
  Users,
  FileText,
  MoreVertical,
  Settings,
  BarChart3,
  Archive,
} from 'lucide-react';
import { mockGroups, getOrgById } from '@/shared/mockData';
import type { Group, PrivacyLevel } from '@/shared/types';

interface OrgGroupsTabProps {
  orgId: string;
}

const OrgGroupsTab: React.FC<OrgGroupsTabProps> = ({ orgId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<string>('all');

  const org = getOrgById(orgId);

  // Get groups in this org
  const orgGroups = useMemo(() => {
    return mockGroups.filter((g) => g.orgId === orgId);
  }, [orgId]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return orgGroups.filter((group) => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrivacy = privacyFilter === 'all' || group.privacyLevel === privacyFilter;
      return matchesSearch && matchesPrivacy;
    });
  }, [orgGroups, searchTerm, privacyFilter]);

  const privacyIcon = (level: PrivacyLevel) => {
    switch (level) {
      case 'private':
        return <Lock size={14} className="text-gray-500" />;
      case 'internal':
        return <Building2 size={14} className="text-blue-500" />;
      case 'public':
        return <Globe size={14} className="text-green-500" />;
    }
  };

  const privacyLabel = (level: PrivacyLevel) => {
    switch (level) {
      case 'private':
        return 'Riêng tư';
      case 'internal':
        return 'Nội bộ';
      case 'public':
        return 'Công khai';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Nhóm trong {org?.name} ({orgGroups.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Quản lý nhóm và cài đặt
          </p>
        </div>
        <Link
          to="/groups/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <FolderPlus size={14} />
          Tạo nhóm
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm nhóm..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
          />
        </div>
        <select
          value={privacyFilter}
          onChange={(e) => setPrivacyFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">Tất cả riêng tư</option>
          <option value="private">Riêng tư</option>
          <option value="internal">Nội bộ</option>
          <option value="public">Công khai</option>
        </select>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
            Không tìm thấy nhóm
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Create a new group to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800">
                      {privacyIcon(group.privacyLevel)}
                    </div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">
                      {group.name}
                    </h4>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                      {privacyLabel(group.privacyLevel)}
                    </span>
                  </div>
                  {group.description && (
                    <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
                      {group.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} />
                      {group.memberCount} members
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} />
                      {group.meetingCount} meetings
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {group.totalHours}h ghi âm
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/groups/${group.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Xem
                  </Link>
                  <button className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800">
                  <Settings size={12} />
                  Settings
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800">
                  <BarChart3 size={12} />
                  Phân tích
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20">
                  <Archive size={12} />
                  Archive
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgGroupsTab;
