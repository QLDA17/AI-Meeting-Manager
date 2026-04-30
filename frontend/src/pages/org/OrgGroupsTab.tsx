import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, BarChart3, Building2, FileText, FolderOpen, FolderPlus, Globe, Lock, MoreVertical, Search, Settings, Users } from 'lucide-react';
import { useOrgStore } from '../../stores';
import type { Group, PrivacyLevel } from '../../types';
import api from '../../services/api';
import { toast } from '../../components/ui/Toast';

interface OrgGroupsTabProps {
  orgId: string;
}

const OrgGroupsTab: React.FC<OrgGroupsTabProps> = ({ orgId }) => {
  const navigate = useNavigate();
  const { currentOrg, groups, loadGroups } = useOrgStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const orgGroups = useMemo(
    () => groups.filter((group) => group.organization_id === orgId || group.orgId === orgId),
    [groups, orgId],
  );

  const filteredGroups = useMemo(
    () =>
      orgGroups.filter((group) => {
        const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPrivacy = privacyFilter === 'all' || group.privacyLevel === privacyFilter;
        return matchesSearch && matchesPrivacy;
      }),
    [orgGroups, privacyFilter, searchTerm],
  );

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
        return 'Rieng tu';
      case 'internal':
        return 'Noi bo';
      case 'public':
        return 'Cong khai';
    }
  };

  const handleArchive = async (group: Group) => {
    try {
      await api.patch(`/api/groups/${group.id}`, {
        settings: {
          ...(group.settings || {}),
          archived: true,
          archivedAt: new Date().toISOString(),
        },
      });
      toast.success(`Da luu tru nhom ${group.name}`);
      await loadGroups(orgId);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Khong the luu tru nhom');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Nhom trong {currentOrg?.name} ({orgGroups.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">Quan ly nhom va cai dat.</p>
        </div>
        <Link
          to="/groups/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <FolderPlus size={14} />
          Tao nhom
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tim nhom..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-primary-900/30"
          />
        </div>
        <select
          value={privacyFilter}
          onChange={(event) => setPrivacyFilter(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="all">Tat ca rieng tu</option>
          <option value="private">Rieng tu</option>
          <option value="internal">Noi bo</option>
          <option value="public">Cong khai</option>
        </select>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Khong tim thay nhom</p>
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
                    <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">{group.name}</h4>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                      {privacyLabel(group.privacyLevel)}
                    </span>
                  </div>
                  {group.description && <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">{group.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Users size={14} />{group.memberCount} members</span>
                    <span className="flex items-center gap-1.5"><FileText size={14} />{group.meetingCount} meetings</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">{group.totalHours}h</span>
                  </div>
                </div>

                <div className="relative flex items-center gap-2">
                  <Link to={`/groups/${group.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Xem
                  </Link>
                  <button
                    onClick={() => setOpenMenuId((prev) => (prev === group.id ? null : group.id))}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {openMenuId === group.id && (
                    <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <button onClick={() => navigate(`/groups/${group.id}`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-slate-800">
                        <Settings size={12} /> Cai dat nhom
                      </button>
                      <button onClick={() => navigate(`/groups/${group.id}`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-slate-800">
                        <BarChart3 size={12} /> Phan tich
                      </button>
                      <button onClick={() => handleArchive(group)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20">
                        <Archive size={12} /> Luu tru
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrgGroupsTab;
