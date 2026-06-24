/**
 * Notification Types
 * Types related to admin notifications
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Notification type
 */
export type NotificationType =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGIN_FAILED'
  | 'ADMIN_PASSWORD_CHANGED'
  | 'SUSPICIOUS_LOGIN_ATTEMPT'
  | 'NEW_IP_LOGIN'
  | 'ADMIN_CREATED'
  | 'ADMIN_DEACTIVATED'
  | 'ADMIN_ROLE_CHANGED'
  | 'TRANSACTION_FLAGGED'
  | 'TRANSACTION_APPROVED'
  | 'TRANSACTION_REJECTED'
  | 'HIGH_VALUE_TRANSACTION'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED';

/**
 * Notification category
 */
export type NotificationCategory =
  | 'SECURITY'
  | 'ADMIN_MANAGEMENT'
  | 'TRANSACTION'
  | 'SYSTEM'
  | 'ROLE_MANAGEMENT';

/**
 * Notification priority
 */
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// =============================================================================
// Notification
// =============================================================================

/**
 * Notification record
 */
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// =============================================================================
// Counts & Filters
// =============================================================================

/**
 * Notification counts
 */
export interface NotificationCounts {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
