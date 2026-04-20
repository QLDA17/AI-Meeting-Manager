/**
 * GroupDetail Page
 * Trang chi tiết group với tabs: Meetings, Members, Stats, Settings
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  FileText,
  BarChart3,
  Settings,
  Crown,
  Lock,
  Globe,
  Building2,
  Plus,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGroupStore, useOrgStore } from '../../stores';
import { usePermission } from '../../hooks';
import { getGroupById, getMeetingsByGroupId, getMembersByGroupId } from '../../data';
import GroupMeetingsTab from '../../components/group/GroupMeetingsTab';
import GroupMembersTab from '../../components/group/GroupMembersTab';
import GroupChatTab from '../../components/group/GroupChatTab';
import GroupStatsTab from '../../components/group/GroupStatsTab';
import GroupSettingsTab from '../../components/group/GroupSettingsTab';
import CreateGroupModal from '../../components/group/CreateGroupModal';
import type { Group } from '../../types';

type TabKey = 'meetings' | 'members' | 'chat' | 'stats' | 'settings';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setCurrentGroup } = useGroupStore();
  const { currentOrg } = useOrgStore();
  const { isGroupAdmin } = usePermission();

  const [group, setGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('meetings');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (id) {
      const groupData = getGroupById(id);
      if (groupData) {
        setGroup(groupData);
        setCurrentGroup(id);
      }
      setLoading(false);
    }
  }, [id, setCurrentGroup]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-h2 text-gray-900 dark:text-slate-100">Group not found</h2>
        <Link to="/" className="mt-4 inline-flex text-body font-semibold text-primary-700 hover:text-primary-800">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const privacyIcon = (level: string) => {
    switch (level) {
      case 'private':
        return <Lock size={14} className="text-gray-500" />;
      case 'internal':
        return <Building2 size={14} className="text-blue-500" />;
      case 'public':
        return <Globe size={14} className="text-green-500" />;
    }
  };

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'meetings' as TabKey, label: 'Meetings', icon: <FileText size={16} /> },
    { key: 'members' as TabKey, label: 'Members', icon: <Users size={16} /> },
    { key: 'chat' as TabKey, label: 'Chat', icon: <MessageSquare size={16} /> },
    { key: 'stats' as TabKey, label: 'Statistics', icon: <BarChart3 size={16} /> },
    ...(isGroupAdmin ? [{ key: 'settings' as TabKey, label: 'Settings', icon: <Settings size={16} /> }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-3 flex items-center gap-1 text-sm text-gray-600 transition hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              <ArrowLeft size={14} />
              Back
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {group.name}
              </h1>
              {privacyIcon(group.privacyLevel)}
              {isGroupAdmin && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                  <Crown size={10} className="mr-1 inline" />
                  Chủ nhóm
                </span>
              )}
            </div>

            {group.description && (
              <p className="mt-2 text-gray-600 dark:text-slate-300">{group.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {group.memberCount} members
              </span>
              <span className="flex items-center gap-1">
                <FileText size={14} />
                {group.meetingCount} meetings
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 size={14} />
                {group.totalHours}h total
              </span>
              {currentOrg && (
                <span className="flex items-center gap-1">
                  <Building2 size={14} />
                  {currentOrg.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/create?groupId=${id}`)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Plus size={14} />
              Cuộc họp mới
            </button>
            {isGroupAdmin && (
              <button className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                <MoreVertical size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 px-2 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:border-primary-300 dark:text-primary-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'meetings' && (
            <GroupMeetingsTab meetings={getMeetingsByGroupId(group.id)} />
          )}

          {activeTab === 'members' && (
            <GroupMembersTab
              groupId={group.id}
              members={getMembersByGroupId(group.id)}
            />
          )}

          {activeTab === 'chat' && (
            <GroupChatTab groupId={group.id} />
          )}

          {activeTab === 'stats' && (
            <GroupStatsTab groupId={group.id} />
          )}

          {activeTab === 'settings' && isGroupAdmin && (
            <GroupSettingsTab groupId={group.id} />
          )}
        </div>
      </div>

      {/* Create Group Modal (for future use) */}
      {showCreateModal && (
        <CreateGroupModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default GroupDetail;
