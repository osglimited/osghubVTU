'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { X } from 'lucide-react';

export default function Notification() {
  const { notifications, removeNotification } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  const getVariantStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-500 text-green-900';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900';
    }
  };

  return (
    <div className="fixed z-30 space-y-2 left-1/2 -translate-x-1/2 top-16 w-[95vw] max-w-md sm:left-auto sm:translate-x-0 sm:right-4 sm:top-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between p-4 rounded-lg border shadow-lg max-w-sm ${getVariantStyles(notification.type)}`}
        >
          <div>
            <h4 className="font-semibold">{notification.title}</h4>
            {notification.message && <p className="text-sm">{notification.message}</p>}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
