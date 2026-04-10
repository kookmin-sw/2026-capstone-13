// 알림 상태 관리 (Zustand) - 백엔드 API 연동
import { create } from 'zustand';
import {
  getNotifications,
  getHasUnread,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';
import type { AppNotification } from '../types';

interface NotificationState {
  notifications: AppNotification[];
  hasUnread: boolean;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchHasUnread: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  hasUnread: false,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const data = await getNotifications();
      set({ notifications: data, hasUnread: data.some((n) => !n.isRead) });
    } catch {
      // 실패 시 기존 상태 유지
    } finally {
      set({ loading: false });
    }
  },

  fetchHasUnread: async () => {
    try {
      const has = await getHasUnread();
      set({ hasUnread: has });
    } catch {
      // 실패 시 무시
    }
  },

  markAsRead: async (id: number) => {
    try {
      await markNotificationRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        hasUnread: state.notifications.some((n) => n.id !== id && !n.isRead),
      }));
    } catch {
      // 실패 시 무시
    }
  },

  markAllAsRead: async () => {
    try {
      await markAllNotificationsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        hasUnread: false,
      }));
    } catch {
      // 실패 시 무시
    }
  },
}));
