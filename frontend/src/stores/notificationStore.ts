/**
 * Notification Store - Dynamic notifications state
 */
import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'notif-001',
      type: 'info',
      title: 'Tóm tắt cuộc họp sẵn sàng',
      message: '"Sprint Review #25" đã được xử lý xong',
      timestamp: new Date(Date.now() - 3600000 * 2),
      isRead: false,
    },
    {
      id: 'notif-002',
      type: 'success',
      title: 'Cuộc họp mới đã tạo',
      message: '"Q1 Planning" đã được tạo thành công',
      timestamp: new Date(Date.now() - 3600000 * 6),
      isRead: false,
    },
  ],

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: `notif-${Date.now()}`,
          timestamp: new Date(),
          isRead: false,
        },
        ...state.notifications,
      ],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),

  get unreadCount() {
    return get().notifications.filter((n) => !n.isRead).length;
  },
}));
