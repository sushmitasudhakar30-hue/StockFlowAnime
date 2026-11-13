/**
 * notificationService.js — alerts shown in the notification bell (Express/MongoDB backend).
 * Low-stock alerts are created by the server whenever stock drops; the app only reads / marks them.
 */
import { api } from './api';

export const notificationService = {
  getNotifications: () => api('/notifications'),
  addNotification: (notif) => api('/notifications', { method: 'POST', body: notif }),
  async markAsRead(id) {
    await api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    return true;
  },
  async markAllAsRead() {
    await api('/notifications/read-all', { method: 'PATCH' });
    return true;
  },
};
