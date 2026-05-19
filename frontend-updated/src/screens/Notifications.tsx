import { useLanguage } from '../lib/translations';
﻿import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Clock, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ApiError } from '../lib/api';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
  type AppNotificationRecord,
} from '../lib/admin';

export default function Notifications() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchNotifications();
        if (!cancelled) {
          setNotifications(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load notifications right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          unread: false,
        })),
      );
    } catch (markError) {
      setError(markError instanceof ApiError ? markError.message : 'Unable to mark notifications as read.');
    }
  }

  async function handleOpenNotification(notification: AppNotificationRecord) {
    if (!notification.unread) {
      return;
    }

    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                unread: false,
              }
            : item,
        ),
      );
    } catch (markError) {
      setError(markError instanceof ApiError ? markError.message : 'Unable to update notification status.');
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await removeNotification(notificationId);
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : 'Unable to delete notification.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Notifications')}</h1>
          <p className="text-slate-500">{t('Stay updated with the latest activities and alerts')}</p>
        </div>
        <button onClick={handleMarkAllAsRead} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
          Mark all as read
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-red-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          <div className="professional-card p-6 text-sm text-slate-500">Loading notifications...</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleOpenNotification(notification)}
              className={cn(
                'professional-card p-4 flex gap-4 transition-all hover:shadow-md cursor-pointer',
                notification.unread ? 'border-l-4 border-l-indigo-600' : 'opacity-80',
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  notification.type === 'info'
                    ? 'bg-indigo-100 text-indigo-600'
                    : notification.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : notification.type === 'error'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-emerald-100 text-emerald-600',
                )}
              >
                {notification.type === 'info' ? (
                  <Info className="w-5 h-5" />
                ) : notification.type === 'warning' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{notification.title}</h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {notification.time}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{notification.message}</p>
              </div>

              <div className="flex flex-col justify-center">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(notification.id);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && notifications.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
          <p className="text-slate-500">{t('You have no new notifications at the moment.')}</p>
        </div>
      )}
    </div>
  );
}
