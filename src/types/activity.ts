/**
 * Activity Feed Types
 * Unified chronological stream of platform events (signups, transactions,
 * KYC decisions, admin actions).
 */

export type ActivityKind = 'SIGNUP' | 'TRANSACTION' | 'KYC' | 'ADMIN_ACTION';

export interface ActivityAmount {
  value: number;
  currency: string;
  display: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  actor?: string;
  status?: string;
  amount?: ActivityAmount;
  timestamp: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilters {
  kind?: ActivityKind | 'ALL';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
