import { useLanguage } from '../../lib/translations';
﻿import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  Search,
  Trash2,
  Mail,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ApiError } from '../../lib/api';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
  type AppNotificationRecord,
} from '../../lib/admin';

type NotificationFilter = 'all' | 'unread' | 'alerts';
type NotificationCategory = 'system' | 'security' | 'user';

type AdminNotificationRecord = AppNotificationRecord & {
  category: NotificationCategory;
};

function deriveCategory(notification: AppNotificationRecord): NotificationCategory {
  const content = `${notification.title} ${notification.message}`.toLowerCase();

  if (
    notification.type === 'error' ||
    notification.type === 'warning' ||
    content.includes('security') ||
    content.includes('login') ||
    content.includes('password') ||
    content.includes('biometric')
  ) {
    return 'security';
  }

  if (
    content.includes('employee') ||
    content.includes('user') ||
    content.includes('leave') ||
    content.includes('attendance')
  ) {
    return 'user';
  }

  return 'system';
}

export default function Notifications() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<AdminNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Record<NotificationCategory, boolean>>({
    system: true,
    security: true,
    user: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchNotifications();
        if (!cancelled) {
          setNotifications(
            data.map((notification) => ({
              ...notification,
              category: deriveCategory(notification),
            })),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Unable to load system notifications right now.',
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

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesCategory = activeCategories[notification.category];
      const matchesSearch =
        !normalizedSearch ||
        notification.title.toLowerCase().includes(normalizedSearch) ||
        notification.message.toLowerCase().includes(normalizedSearch);

      if (!matchesCategory || !matchesSearch) {
        return false;
      }

      if (filter === 'unread') {
        return notification.unread;
      }

      if (filter === 'alerts') {
        return notification.type === 'warning' || notification.type === 'error';
      }

      return true;
    });
  }, [activeCategories, filter, notifications, searchQuery]);

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
      setError(
        markError instanceof ApiError
          ? markError.message
          : 'Unable to mark notifications as read.',
      );
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, unread: false }
            : notification,
        ),
      );
    } catch (markError) {
      setError(
        markError instanceof ApiError
          ? markError.message
          : 'Unable to update notification status.',
      );
    }
  }

  async function handleDelete(notificationId: string) {
    const confirmed = window.confirm('Are you sure you want to delete this notification?');

    if (!confirmed) {
      return;
    }

    try {
      await removeNotification(notificationId);
      setNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Unable to delete this notification.',
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('System Notifications')}</h1>
          <p className="text-slate-500 mt-1">{t('Monitor system alerts, security events, and administrative messages')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleMarkAllAsRead} className="secondary-button gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Mark all as read
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-red-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="professional-card p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Filters
            </h3>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Notifications', icon: Bell },
                { id: 'unread', label: 'Unread', icon: Mail },
                { id: 'alerts', label: 'Alerts & Warnings', icon: AlertCircle },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id as NotificationFilter)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium transition-colors',
                    filter === item.id
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="professional-card p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
              Categories
            </h3>
            <div className="space-y-2">
              {[
                { id: 'system', label: 'System' },
                { id: 'security', label: 'Security' },
                { id: 'user', label: 'User Management' },
              ].map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={activeCategories[category.id as NotificationCategory]}
                    onChange={(event) =>
                      setActiveCategories((current) => ({
                        ...current,
                        [category.id]: event.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="professional-card p-12 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'professional-card p-4 flex gap-4 transition-all hover:shadow-md',
                    notification.unread && 'border-l-4 border-l-indigo-600',
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                      notification.type === 'warning' || notification.type === 'error'
                        ? 'bg-red-50 text-rose-600'
                        : notification.type === 'success'
                          ? 'bg-green-50 text-emerald-600'
                          : 'bg-indigo-50 text-indigo-600',
                    )}
                  >
                    {notification.type === 'warning' || notification.type === 'error' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : notification.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3
                        className={cn(
                          'text-sm font-bold',
                          notification.unread ? 'text-slate-900' : 'text-slate-700',
                        )}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {notification.timestamp
                            ? new Date(notification.timestamp).toLocaleString()
                            : notification.time}
                        </span>
                        {notification.unread && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                            title="Mark as read"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">
                        {notification.category}
                      </span>
                      {notification.unread && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="professional-card p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No notifications found</h3>
                <p className="text-slate-500 mt-1">{t('Try adjusting your filters or search query')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
