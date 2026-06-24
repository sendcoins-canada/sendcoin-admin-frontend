import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  useNotificationCounts,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import {
  Notification,
  Refresh,
  TickCircle,
  Trash,
  Warning2,
  Shield,
  ArrowSwapHorizontal,
  User,
  Setting2,
  Timer,
} from 'iconsax-react';
import { Link } from 'wouter';
import type { NotificationType, NotificationPriority, NotificationCategory } from '@/types/notification';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TYPE_CONFIG = { icon: <Setting2 size="14" color="currentColor" />, color: 'text-gray-600 bg-gray-100' };

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  ADMIN_LOGIN: { icon: <Shield size="14" color="currentColor" />, color: 'text-blue-600 bg-blue-100' },
  ADMIN_LOGIN_FAILED: { icon: <Warning2 size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
  ADMIN_PASSWORD_CHANGED: { icon: <Shield size="14" color="currentColor" />, color: 'text-blue-600 bg-blue-100' },
  SUSPICIOUS_LOGIN_ATTEMPT: { icon: <Warning2 size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
  NEW_IP_LOGIN: { icon: <Shield size="14" color="currentColor" />, color: 'text-yellow-600 bg-yellow-100' },
  ADMIN_CREATED: { icon: <User size="14" color="currentColor" />, color: 'text-green-600 bg-green-100' },
  ADMIN_DEACTIVATED: { icon: <User size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
  ADMIN_ROLE_CHANGED: { icon: <Shield size="14" color="currentColor" />, color: 'text-indigo-600 bg-indigo-100' },
  TRANSACTION_FLAGGED: { icon: <Warning2 size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
  TRANSACTION_APPROVED: { icon: <ArrowSwapHorizontal size="14" color="currentColor" />, color: 'text-green-600 bg-green-100' },
  TRANSACTION_REJECTED: { icon: <ArrowSwapHorizontal size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
  HIGH_VALUE_TRANSACTION: { icon: <ArrowSwapHorizontal size="14" color="currentColor" />, color: 'text-purple-600 bg-purple-100' },
  ROLE_CREATED: { icon: <Setting2 size="14" color="currentColor" />, color: 'text-indigo-600 bg-indigo-100' },
  ROLE_UPDATED: { icon: <Setting2 size="14" color="currentColor" />, color: 'text-blue-600 bg-blue-100' },
  ROLE_DELETED: { icon: <Setting2 size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
};

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// =============================================================================
// Notifications Dropdown Component
// =============================================================================

interface NotificationsDropdownProps {
  className?: string;
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);

  // Fetch notifications and counts
  const { data: notificationsData, isLoading, refetch } = useNotifications({ limit: 10 });
  const { data: counts } = useNotificationCounts();

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const notifications = notificationsData?.data ?? [];
  const unreadCount = counts?.unread ?? 0;

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        >
          <Notification size="20" color="currentColor" className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            >
              <Refresh size="14" color="currentColor" className={isLoading ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                title="Mark all as read"
              >
                <TickCircle size="14" color="currentColor" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Refresh size="24" color="currentColor" className="animate-spin text-blue-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Notification size="32" color="currentColor" className="mb-2 text-gray-300" />
              <span className="text-sm">No notifications</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => {
                const typeConfig = TYPE_CONFIG[notification.type] ?? DEFAULT_TYPE_CONFIG;

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}
                      >
                        {typeConfig.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </span>
                          {notification.priority !== 'NORMAL' && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                PRIORITY_COLORS[notification.priority]
                              }`}
                            >
                              {notification.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Timer size="10" color="currentColor" />
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!notification.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          disabled={markAsReadMutation.isPending}
                          className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 flex-shrink-0"
                          title="Mark as read"
                        >
                          <TickCircle size="14" color="currentColor" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <Link
            href="/activity"
            onClick={() => setOpen(false)}
            className="block text-center text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsDropdown;
