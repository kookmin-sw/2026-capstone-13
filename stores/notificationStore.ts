// 알림 상태 관리 (Zustand)
import { create } from 'zustand';
import type { AppNotification } from '../types';

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

let nextId = 10;

interface NotificationState {
  notifications: AppNotification[];
  hasUnreadForUser: (userId: number) => boolean;
  markAsRead: (id: number) => void;
  markAllAsRead: (userId: number) => void;
  addNotification: (type: AppNotification['type'], message: string, recipientId: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: INITIAL_NOTIFICATIONS,

  hasUnreadForUser: (userId: number) =>
    get().notifications.some((n) => n.recipientId === userId && !n.isRead),

  markAsRead: (id: number) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllAsRead: (userId: number) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.recipientId === userId ? { ...n, isRead: true } : n
      ),
    })),

  addNotification: (type: AppNotification['type'], message: string, recipientId: number) => {
    const newNotif: AppNotification = {
      id: nextId++,
      type,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      recipientId,
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications] }));
  },
}));
