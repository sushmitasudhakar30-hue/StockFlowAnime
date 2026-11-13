import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  /** (Re)load the bell from the server. */
  const refresh = useCallback(async () => {
    try {
      setNotifications(await notificationService.getNotifications());
    } catch { /* the bell is not critical — keep what we have */ }
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setNotifications([]); setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    notificationService
      .getNotifications()
      .then((list) => { if (!cancelled) setNotifications(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(async (notif) => {
    try {
      const created = await notificationService.addNotification(notif);
      setNotifications((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
    } catch { /* ignore */ }
  }, []);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await notificationService.markAsRead(id); } catch { refresh(); }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    if (!notifications.some((n) => !n.read)) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await notificationService.markAllAsRead(); } catch { refresh(); }
  }, [notifications, refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, refresh, loading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
