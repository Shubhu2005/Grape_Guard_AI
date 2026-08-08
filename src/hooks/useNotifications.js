import { useCallback, useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const NOTIFICATIONS_CHANGED_EVENT = 'grapeguard-notifications-changed';

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const authHeaders = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

export const emitNotificationsChanged = () => {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
};

export const useNotifications = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const headers = authHeaders();
    if (!headers) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications?limit=20`, { headers });
      const body = await safeJson(response);
      if (!response.ok) return;

      const list = Array.isArray(body.notifications) ? body.notifications : [];
      setNotifications(list);
      setUnreadCount(Number(body.unread_count || list.filter((item) => !item.read_at).length));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const markRead = useCallback(async (notificationId) => {
    const headers = authHeaders();
    if (!headers || !notificationId) return;
    const wasUnread = notifications.some((item) => item.id === notificationId && !item.read_at);
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read_at: item.read_at || new Date().toISOString() } : item
      )
    );
    if (wasUnread) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: 'POST', headers });
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || now })));
    setUnreadCount(0);
    await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'POST', headers });
  }, []);

  useEffect(() => {
    refresh();
    if (!user?.id) return undefined;

    const interval = setInterval(refresh, 30000);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [refresh, user?.id]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markRead,
    markAllRead,
  };
};
