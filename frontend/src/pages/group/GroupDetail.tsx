import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGroupStore, useOrgStore, useAppStore } from '../../stores';
import { usePermission } from '../../hooks';
import GroupMeetingsTab from '../../components/group/GroupMeetingsTab';
import GroupMembersTab from '../../components/group/GroupMembersTab';
import GroupChatTab from '../../components/group/GroupChatTab';
import GroupStatsTab from '../../components/group/GroupStatsTab';
import GroupSettingsTab from '../../components/group/GroupSettingsTab';
import CreateGroupModal from '../../components/group/CreateGroupModal';
import { Button, Badge, Card } from '../../components/ui';
import type { Group } from '../../types';

type TabKey = 'meetings' | 'members' | 'chat' | 'stats' | 'settings';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentGroup, group: groupData, loadGroup, loadMembers, loadMeetings, members, meetings } = useGroupStore();
  const { isGroupAdmin, isOrgAdmin } = usePermission();

  const [activeTab, setActiveTab] = useState<TabKey>('meetings');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const initGroup = async () => {
      if (id) {
        setLoading(true);
        await Promise.all([
          loadGroup(id),
          loadMembers(id),
          loadMeetings(id)
        ]);
        setLoading(false);
      }
    };
    initGroup();
  }, [id, loadGroup, loadMembers, loadMeetings]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent shadow-lg" />
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="mx-auto max-w-lg mt-10 rounded-[2.5rem] border border-gray-100 bg-white p-12 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
          <Lock size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100">Không tìm thấy nhóm</h2>
        <p className="mt-3 text-gray-500 dark:text-slate-400">
          {useGroupStore.getState().error || "Nhóm bạn đang tìm kiếm không tồn tại hoặc bạn không có quyền truy cập."}
        </p>
        <Button variant="primary" className="mt-8 px-10 rounded-2xl" onClick={() => navigate('/')}>
          Về Trang chủ
        </Button>
      </div>
    );
  }

  const privacyLabel = (level: string) => {
    switch (level) {
      case 'private': return 'Riêng tư';
      case 'internal': return 'Nội bộ';
      case 'public': return 'Công khai';
      default: return level;
    }
  };

  const privacyIcon = (level: string) => {
    switch (level) {
      case 'private': return <Lock size={14} className="text-rose-500" />;
      case 'internal': return <Building2 size={14} className="text-primary-500" />;
      case 'public': return <Globe size={14} className="text-emerald-500" />;
      default: return null;
    }
  };

  const hasSettingsAccess = isGroupAdmin || isOrgAdmin;

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'meetings', label: 'Cuộc họp', icon: <FileText size={16} /> },
    { key: 'members', label: 'Thành viên', icon: <Users size={16} /> },
    { key: 'chat', label: 'Thảo luận', icon: <MessageSquare size={16} /> },
    { key: 'stats', label: 'Thống kê', icon: <BarChart3 size={16} /> },
    ...(hasSettingsAccess ? [{ key: 'settings' as TabKey, label: 'Cài đặt', icon: <Settings size={16} /> }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* Premium Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-primary-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-10"
      >
        {/* Background Accent */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary-50/50 blur-3xl dark:bg-primary-900/10" />

        <div className="relative z-10">
          <nav className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
            <Link to="/" className="hover:text-primary-600 transition-colors">Workspace</Link>
            <ChevronRight size={12} />
            <span className="text-gray-900 dark:text-slate-100">Chi tiết Nhóm</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                  {groupData.name}
                </h1>
                <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                  {privacyIcon(groupData.privacyLevel)}
                  {privacyLabel(groupData.privacyLevel)}
                </Badge>
                {hasSettingsAccess && (
                  <Badge variant="primary" className="gap-1.5 px-3 py-1 text-xs">
                    <ShieldCheck size={12} />
                    Quản trị viên
                  </Badge>
                )}
              </div>

              {groupData.description && (
                <p className="mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
                  {groupData.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                    <Users size={16} />
                  </div>
                  <span><b className="text-gray-900 dark:text-white">{groupData.memberCount || 0}</b> thành viên</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                    <FileText size={16} />
                  </div>
                  <span><b className="text-gray-900 dark:text-white">{groupData.meetingCount || 0}</b> cuộc họp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
                    <BarChart3 size={16} />
                  </div>
                  <span>Tổng cộng <b className="text-gray-900 dark:text-white">{groupData.totalHours || 0}h</b></span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button 
                size="lg" 
                onClick={() => navigate(`/meetings/create?groupId=${id}`)}
                className="h-12 rounded-2xl px-8 shadow-lg shadow-primary-500/20"
                icon={<Plus size={18} />}
              >
                Họp ngay
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                className="h-12 w-12 rounded-2xl p-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800"
              >
                <MoreVertical size={20} />
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Horizontal Tab Interface */}
      <div className="space-y-6">
        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-30 -mx-4 px-4 pb-4 pt-2 backdrop-blur-md">
          <div className="flex items-center justify-between rounded-full border border-gray-100 bg-white/80 p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-1 items-center gap-1 overflow-x-auto custom-scrollbar sm:gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300",
                    activeTab === tab.key
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/20"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <span className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    activeTab === tab.key ? "bg-white/20" : "bg-gray-100 dark:bg-slate-800"
                  )}>
                    {React.cloneElement(tab.icon as React.ReactElement<any>, { size: 14 })}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="hidden items-center gap-2 border-l border-gray-100 pl-4 dark:border-slate-800 md:flex pr-2">
               <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gray-200 shadow-sm dark:border-slate-900" />
                  ))}
               </div>
               <span className="text-xs font-black text-gray-400">+{Math.max(0, (groupData.memberCount || 0) - 3)}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-[500px]"
          >
            <Card className="border-none bg-transparent p-0 shadow-none">
              {activeTab === 'meetings' && (
                <GroupMeetingsTab meetings={meetings} />
              )}

              {activeTab === 'members' && (
                <GroupMembersTab
                  groupId={groupData.id}
                  members={members}
                />
              )}

              {activeTab === 'chat' && (
                <GroupChatTab groupId={groupData.id} />
              )}

              {activeTab === 'stats' && (
                <GroupStatsTab groupId={groupData.id} />
              )}

              {activeTab === 'settings' && (isGroupAdmin || isOrgAdmin) && (
                <GroupSettingsTab groupId={groupData.id} />
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Simple clsx utility since we don't have it imported everywhere yet
function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default GroupDetail;
