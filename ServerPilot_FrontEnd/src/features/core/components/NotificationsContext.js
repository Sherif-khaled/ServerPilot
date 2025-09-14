import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

// Notification shape:
// { id: string, title: string, message: string, severity: 'info'|'success'|'warning'|'error', createdAt: number, read: boolean, meta?: any }
const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id,
      title: payload.title || 'Notification',
      message: payload.message || '',
      severity: payload.severity || 'info',
      createdAt: Date.now(),
      read: false,
      meta: payload.meta || null,
    };
    setNotifications((prev) => [item, ...prev].slice(0, 100)); // cap to last 100
    return id;
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAllRead,
    removeNotification,
    clearAll,
  }), [notifications, unreadCount, addNotification, markAllRead, removeNotification, clearAll]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
