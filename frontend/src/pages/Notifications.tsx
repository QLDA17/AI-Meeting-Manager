/**
 * Trang Thông báo - kết nối với API thật
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  FileText,
  MessageSquare,
  UserPlus,
  Clock,
  X,
  Settings,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  actions?: Array<{ label: string; variant: 'primary' | 'secondary'; onClick?: () => void }>;
  metadata?: {
    group?: string;
    org?: string;
    dueDate?: string;
    assignedBy?: string;
    meeting_id?: string;
    meetingId?: string;
  };
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token) {
      setLoading(false);
      return;
    }
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!res.ok) throw new Error(`Lỗi ${res.status}: Không thể tải thông báo`);
        const data = await res.json();
        const mapped: Notification[] = data.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          actions: n.type === 'meeting' ? [{
            label: 'Xem cuộc họp',
            variant: 'primary' as const,
            onClick: () => {
              const meetingId = n?.metadata?.meeting_id || n?.metadata?.meetingId;
              if (meetingId) navigate(`/meetings/${meetingId}`);
            },
          }] : [],
        }));
        setNotifications(mapped);
      } catch (err: any) {
        setError(err.message || 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [session?.token]);


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

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
  };

  const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => (
    (() => {
      const normalizedTitle = (notification.title || '').toLowerCase();
      const normalizedMessage = (notification.message || '').toLowerCase();
      const isDeleteRequest =
        normalizedTitle.includes('yeu cau xoa') || normalizedMessage.includes('yeu cau xoa');

      return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`group rounded-xl border p-4 transition hover:border-gray-300 dark:hover:border-slate-600 ${
        isDeleteRequest
          ? 'border-red-300 bg-red-500/10 dark:border-red-800/70 dark:bg-red-900/20'
          :
        notification.isRead
          ? 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
          : 'border-primary-200 bg-primary-50/50 dark:border-primary-900/40 dark:bg-primary-900/10'
      }`}
      onClick={() => handleMarkRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isDeleteRequest ? (
            <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
          ) : (
            getNotificationIcon(notification.type)
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${
                isDeleteRequest
                  ? 'text-red-700 dark:text-red-300'
                  :
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
                  {notification.metadata.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Hạn: {notification.metadata.dueDate}
                    </span>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick?.();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isDeleteRequest
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : action.variant === 'primary'
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
    })()
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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-900/10">
      <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
    </div>
  );

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
              ? `Bạn có ${unreadCount} thông báo chưa đọc`
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
