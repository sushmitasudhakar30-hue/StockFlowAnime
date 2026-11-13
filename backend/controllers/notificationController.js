import { notificationService as svc } from '../services/notificationService.js';
import { wrap } from '../utils/http.js';

export const listNotifications = wrap(async (req, res) => res.json(await svc.list(req.query)));
export const unreadCount = wrap(async (_req, res) => res.json(await svc.unreadCount()));
export const createNotification = wrap(async (req, res) => res.status(201).json(await svc.create(req.body || {})));
export const markRead = wrap(async (req, res) => res.json(await svc.markRead(req.params.id)));
export const markAllRead = wrap(async (_req, res) => res.json(await svc.markAllRead()));
export const deleteNotification = wrap(async (req, res) => {
  await svc.remove(req.params.id);
  res.json({ success: true });
});
