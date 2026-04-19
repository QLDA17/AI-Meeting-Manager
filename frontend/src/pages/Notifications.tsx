/**
 * Thông báo - Thông báo page
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  Calendar,
  FileText,
  MessageSquare,

  UserPlus,
  CheckCircle2,
  Clock,
  X,
  Eye,
  Download,
  Settings,
  Trash2,
  FolderOpen,
  Building2,
  User,
} from 'lucide-react';

type NotificationType = 'meeting' | 'mention' | 'system' | 'user';
type NotificationPriority = 'urgent' | 'today' | 'recent';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actions?: Array<{ label: string; variant: 'primary' | 'secondary' }>;
  metadata?: {
    group?: string;
    org?: string;
    dueDate?: string;
    assignedBy?: string;
  };
}

const Notifications: React.FC = () => {
  // Mock notifications
  const [notifications, setNotifications] = useState<Notification[]>([
    // URGENT
    {
      id: 'notif-001',
      type: 'meeting',
      priority: 'urgent',
      title: 'Cuộc họp đang chờ xử lý',
      message: '"Q1 Planning" đang được AI phân tích, sẽ hoàn thành trong vài phút.',
      timestamp: new Date(Date.now() - 3600000 * 2),
      isRead: false,
      actions: [{ label: 'Xem chi tiết', variant: 'primary' }],
      metadata: { group: 'Phòng Kinh Doanh', org: 'ABC Company' },
    },

    // TODAY
    {
      id: 'notif-003',
      type: 'meeting',
      priority: 'today',
      title: 'Cuộc họp mới được tạo',
      message: '"Sprint Review #26" đã được lên lịch bởi Hoàng Hữu D',
      timestamp: new Date(Date.now() - 3600000 * 5),
      isRead: false,
      actions: [{ label: 'Xem cuộc họp', variant: 'primary' }],
      metadata: { group: 'Phòng Kỹ Thuật', org: 'ABC Company' },
    },
    {
      id: 'notif-004',
      type: 'meeting',
      priority: 'today',
      title: 'Meeting Summary Ready',
      message: '"Sprint Review #25" has been processed. AI summary is available for review.',
      timestamp: new Date(Date.now() - 3600000 * 6),
      isRead: false,
      actions: [{ label: 'View Summary', variant: 'primary' }, { label: 'Export', variant: 'secondary' }],
      metadata: { group: 'Phòng Kỹ Thuật', org: 'ABC Company' },
    },
    {
      id: 'notif-005',
      type: 'mention',
      priority: 'today',
      title: 'Mentioned in Group Chat',
      message: 'Trần Thị B mentioned you: "@Nguyễn Văn A can you review the Q1 planning notes?"',
      timestamp: new Date(Date.now() - 3600000 * 8),
      isRead: false,
      actions: [{ label: 'View Message', variant: 'primary' }],
      metadata: { group: 'Phòng Kinh Doanh' },
    },

    // RECENT
    {
      id: 'notif-006',
      type: 'meeting',
      priority: 'recent',
      title: 'Meeting Processed Successfully',
      message: '"Weekly Sync" has been processed with 94% STT accuracy.',
      timestamp: new Date(Date.now() - 3600000 * 24),
      isRead: true,
      actions: [{ label: 'View Meeting', variant: 'secondary' }],
      metadata: { group: 'Phòng Kinh Doanh', org: 'ABC Company' },
    },
    {
      id: 'notif-007',
      type: 'user',
      priority: 'recent',
      title: 'New Member Joined',
      message: 'Phạm Văn C has joined group "Phòng Kinh Doanh".',
      timestamp: new Date(Date.now() - 3600000 * 26),
      isRead: true,
      actions: [{ label: 'View Profile', variant: 'secondary' }],
      metadata: { group: 'Phòng Kinh Doanh' },
    },
    {
      id: 'notif-008',
      type: 'system',
      priority: 'recent',
      title: 'System Update',
      message: 'New AI model deployed with improved STT accuracy. Average accuracy increased to 96%.',
      timestamp: new Date(Date.now() - 3600000 * 48),
      isRead: true,
    },
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  // Group notifications by priority
  const groupedNotifications = useMemo(() => {
    const filtered = filterType === 'all' 
      ? notifications 
      : notifications.filter((n) => n.priority === filterType);

    const urgent = filtered.filter((n) => n.priority === 'urgent');
    const today = filtered.filter((n) => n.priority === 'today');
    const recent = filtered.filter((n) => n.priority === 'recent');

    return { urgent, today, recent };
  }, [notifications, filterType]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const urgentCount = groupedNotifications.urgent.length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'meeting':
        return <FileText size={18} className="text-green-600 dark:text-green-400" />;
      case 'mention':
        return <MessageSquare size={18} className="text-purple-600 dark:text-purple-400" />;
      case 'user':
        return <UserPlus size={18} className="text-cyan-600 dark:text-cyan-400" />;
      case 'system':
        return <Settings size={18} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`group rounded-xl border p-4 transition hover:border-gray-300 dark:hover:border-slate-600 ${
        notification.isRead
          ? 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
          : 'border-primary-200 bg-primary-50/50 dark:border-primary-900/40 dark:bg-primary-900/10'
      }`}
      onClick={() => handleMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${
                notification.isRead 
                  ? 'text-gray-900 dark:text-slate-100' 
                  : 'text-primary-700 dark:text-primary-300'
              }`}>
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {notification.message}
              </p>

              {/* Metadata */}
              {notification.metadata && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-500">
                  {notification.metadata.group && (
                    <span className="flex items-center gap-1"><FolderOpen size={10} /> {notification.metadata.group}</span>
                  )}
                  {notification.metadata.org && (
                    <span className="flex items-center gap-1"><Building2 size={10} /> {notification.metadata.org}</span>
                  )}
                  {notification.metadata.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Due: {notification.metadata.dueDate}
                    </span>
                  )}
                  {notification.metadata.assignedBy && (
                    <span className="flex items-center gap-1"><User size={10} /> {notification.metadata.assignedBy}</span>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp & Actions */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-gray-400 dark:text-slate-500">
                {formatTime(notification.timestamp)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(notification.id);
                }}
                className="opacity-0 transition group-hover:opacity-100 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {notification.actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={(e) => e.stopPropagation()}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    action.variant === 'primary'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const NotificationSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    color: string;
    items: Notification[];
  }> = ({ title, icon, color, items }) => {
    if (items.length === 0) return null;

    return (
      <div>
        <h3 className={`mb-3 flex items-center gap-2 text-base font-bold ${color}`}>
          {icon}
          {title} ({items.length})
        </h3>
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <NotificationItem key={item.id} notification={item} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Thông báo
          </h1>
          <p className="mt-1 text-gray-600 dark:text-slate-400">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notifications` 
              : 'Bạn đã xem hết thông báo!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={14} />
            Đánh dấu tất cả đã đọc
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-slate-100">
            Notification Preferences
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Tóm tắt cuộc họp
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Thông báo khi AI tóm tắt xong cuộc họp
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-primary-600" />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  Cuộc họp mới
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Thông báo khi có cuộc họp mới trong nhóm
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-primary-600" />
            </label>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All', count: notifications.length },
          { key: 'urgent', label: 'Khẩn cấp', count: urgentCount },
          { key: 'today', label: 'Hôm nay', count: groupedNotifications.today.length },
          { key: 'recent', label: 'Gần đây', count: groupedNotifications.recent.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filterType === tab.key
                ? 'bg-primary-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                filterType === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Thông báo List */}
      <div className="space-y-6">
        <NotificationSection
          title="URGENT"
          icon={<AlertCircle size={16} />}
          color="text-red-600 dark:text-red-400"
          items={groupedNotifications.urgent}
        />

        <NotificationSection
          title="DUE TODAY"
          icon={<Clock size={16} />}
          color="text-amber-600 dark:text-amber-400"
          items={groupedNotifications.today}
        />

        <NotificationSection
          title="RECENT"
          icon={<Bell size={16} />}
          color="text-gray-600 dark:text-gray-400"
          items={groupedNotifications.recent}
        />

        {notifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-slate-700">
            <Bell size={40} className="mx-auto mb-4 text-gray-400 dark:text-slate-500" />
            <p className="text-lg font-semibold text-gray-700 dark:text-slate-300">
              Không có thông báo
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              You're all xem hết thông báo! We'll notify you when something new arrives.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
