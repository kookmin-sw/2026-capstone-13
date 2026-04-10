import api from './api';
import type { AppNotification } from '../types';

export const getNotifications = async (page = 0, size = 20): Promise<AppNotification[]> => {
  const res = await api.get('/notifications', { params: { page, size } });
  const data = res.data.data;
  return data?.content ?? data ?? [];
};

export const getHasUnread = async (): Promise<boolean> => {
  const res = await api.get('/notifications/unread');
  return res.data.data?.hasUnread ?? false;
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};
