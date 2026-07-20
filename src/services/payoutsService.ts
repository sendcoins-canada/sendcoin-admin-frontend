/**
 * Payouts service — CrayFi NGN payouts with their real CrayFi outcome.
 * Backed by the NestJS admin `admin/payouts` routes. These payouts live in the
 * ACID `transactions` table (not fiat_bank_transfers), so they don't appear in
 * the normal Transactions view; this surfaces CrayFi's status + failure reason.
 */
import { apiClient } from '../lib/api';

export interface PayoutRow {
  id: string;
  userEmail: string | null;
  amount: number | null;
  currency: string;
  reference: string | null;
  crayfiTransactionId: string | null;
  ourStatus: string;
  crayfiStatus: string | null;
  effectiveStatus: string;
  failureReason: string | null;
  mismatch: boolean;
  refunded: boolean;
  recipient: { name: string | null; account: string | null; bank: string | null };
  createdAt: string;
  completedAt: string | null;
}

export interface PayoutListResponse {
  success: boolean;
  data: PayoutRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface PayoutStats {
  delivered: number;
  failed: number;
  pending: number;
  mislabeled: number;
  mislabeledAmount: number;
}

export const payoutsService = {
  list: (params: { limit?: number; offset?: number; status?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return apiClient.get<PayoutListResponse>(`/admin/payouts${qs ? `?${qs}` : ''}`);
  },
  stats: () => apiClient.get<{ success: boolean; data: PayoutStats }>('/admin/payouts/stats'),
};
