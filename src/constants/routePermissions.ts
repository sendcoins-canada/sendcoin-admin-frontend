/**
 * Central config: which permission(s) are required to access each route.
 * Must stay in sync with App.tsx PermissionGuard usage.
 */

import type { Permission } from '@/types/auth';

export interface RoutePermissionConfig {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
}

/** Route path -> required permission(s). Used for sidebar visibility and access checks. */
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionConfig> = {
  '/dashboard': { permission: 'VIEW_DASHBOARD' },
  '/activity': { permission: 'VIEW_DASHBOARD' },
  '/transactions': { anyOf: ['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS'] },
  '/payouts': { anyOf: ['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS'] },
  '/users': { anyOf: ['READ_USERS', 'SUSPEND_USERS', 'VERIFY_KYC'] },
  '/team': { permission: 'MANAGE_ADMINS' },
  '/manage-team': { permission: 'MANAGE_ADMINS' },
  '/wallets': { permission: 'READ_WALLETS' },
  '/kyc': { permission: 'VERIFY_KYC' },
  '/conversions': { anyOf: ['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS'] },
  '/analytics': { permission: 'VIEW_ANALYTICS' },
  '/audit-logs': { permission: 'READ_AUDIT_LOGS' },
  '/bank-accounts': { permission: 'READ_USERS' },
  '/merchants': { anyOf: ['READ_USERS', 'VERIFY_KYC'] },
  '/mail': { anyOf: ['VIEW_ANALYTICS', 'MANAGE_ADMINS', 'SEND_EMAILS'] },
  '/settings': { permission: 'MANAGE_ADMINS' },
  '/rates': { permission: 'READ_RATES' },
   // Platform management routes (Super Admin / platform managers only)
  '/platform-wallet': { permission: 'MANAGE_PLATFORM' },
  '/revenue': { permission: 'MANAGE_PLATFORM' },
  '/settings/platform': { permission: 'MANAGE_PLATFORM' },
  '/security': {}, // all authenticated users (no entry = not in sidebar; direct access allowed)
};

/**
 * Returns true if the user has permission to access the given route.
 */
export function canAccessRoute(path: string, userPermissions: Permission[]): boolean {
  const config = ROUTE_PERMISSIONS[path];
  if (!config) return false;

  if (config.permission) {
    return userPermissions.includes(config.permission);
  }
  if (config.anyOf?.length) {
    return config.anyOf.some((p) => userPermissions.includes(p));
  }
  if (config.allOf?.length) {
    return config.allOf.every((p) => userPermissions.includes(p));
  }
  // security and any route with no required permission
  return true;
}
