'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message?: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('notifications_log') : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Notification[];
        setNotifications(parsed);
      }
    } catch {}
  }, []);

  const addNotification = useCallback((type: NotificationType, title: string, message: string = '') => {
    const id = Math.random().toString(36).substr(2, 9);
    const item: Notification = { id, type, title, message, createdAt: new Date().toISOString() };
    setNotifications((prev) => {
      const next = [...prev, item].slice(-20);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('notifications_log', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('notifications_log', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('notifications_log');
      }
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
