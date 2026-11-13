import Notification from '../models/Notification.js';
import { HttpError } from '../utils/http.js';
import { cleanStr, dateString, todayStr } from '../utils/validate.js';

const MAX_NOTIFICATIONS = 100; // same cap as the React app

export const notificationService = {
  async list({ unread } = {}) {
    const filter = unread === 'true' ? { read: false } : {};
    return Notification.find(filter).sort({ date: -1, createdAt: -1, _id: -1 }).limit(MAX_NOTIFICATIONS);
  },

  async unreadCount() {
    return { unread: await Notification.countDocuments({ read: false }) };
  },

  /**
   * Create a notification.
   * dedupe:true → skip if an identical unread one (same type + title) already exists today
   * (stops the bell filling up when stock stays low).
   */
  async create({ type, title, message, date, dedupe = false }) {
    if (!cleanStr(type)) throw new HttpError(400, 'Type is required');
    if (!cleanStr(title)) throw new HttpError(400, 'Title is required');
    const day = dateString(date, 'Date');

    if (dedupe) {
      const existing = await Notification.findOne({ type: cleanStr(type), title: cleanStr(title), date: day, read: false });
      if (existing) return existing;
    }

    const created = await Notification.create({
      type: cleanStr(type),
      title: cleanStr(title),
      message: cleanStr(message),
      date: day || todayStr(),
      read: false,
    });

    // keep only the newest MAX_NOTIFICATIONS
    const old = await Notification.find().sort({ date: -1, createdAt: -1, _id: -1 }).skip(MAX_NOTIFICATIONS).select('_id');
    if (old.length) await Notification.deleteMany({ _id: { $in: old.map((n) => n._id) } });
    return created;
  },

  async markRead(id) {
    const n = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!n) throw new HttpError(404, 'Notification not found');
    return n;
  },

  async markAllRead() {
    const result = await Notification.updateMany({ read: false }, { read: true });
    return { success: true, updated: result.modifiedCount ?? 0 };
  },

  async remove(id) {
    const n = await Notification.findByIdAndDelete(id);
    if (!n) throw new HttpError(404, 'Notification not found');
  },
};
