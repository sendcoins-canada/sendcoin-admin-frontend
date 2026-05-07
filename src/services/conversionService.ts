/**
 * Conversion Service
 * GET /conversions, GET /conversions/stats, GET /conversions/:id
 * POST /conversions/:id/approve, POST /conversions/:id/reject
 */

import { api } from '../lib/api';

export interface Conversion {
  id: string | number;
  reference?: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  fiatAmount?: number;
  fiatCurrency?: string;
  amount?: number;
  currency?: string;
  destinationCountry?: string;
  recipientName?: string;
  recipientAccountNumber?: string;
  bankName?: string;
  bankCode?: string;
  status?: string;
  isFlagged?: boolean;
  flagReason?: string;
  exchangeRate?: number;
  fee?: number;
  txHash?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export const conversionService = {
  getList: async (params?: { page?: number; limit?: number; status?: string; search?: string; country?: string }) => {
    const response = await api.get<{ data?: Conversion[]; conversions?: Conversion[]; pagination?: unknown }>('/conversions', { params });
    const list = (response as { data?: Conversion[]; conversions?: Conversion[] })?.data ?? (response as { conversions?: Conversion[] })?.conversions ?? [];
    const pagination = (response as { pagination?: unknown })?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 };
    return { data: Array.isArray(list) ? list : [], pagination };
  },

  getStats: async () => {
    try {
      return await api.get<Record<string, unknown>>('/conversions/stats');
    } catch {
      return {};
    }
  },

  getOne: async (id: string): Promise<Conversion | null> => {
    try {
      const response = await api.get<Conversion | { conversion: Conversion }>(`/conversions/${id}`);
      if (response && typeof response === 'object') {
        if ('conversion' in response) return response.conversion;
        return response as Conversion;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Approve a conversion
   */
  approve: async (id: string, txHash?: string, notes?: string): Promise<void> => {
    await api.post(`/conversions/${id}/approve`, { txHash, notes });
  },

  /**
   * Reject a conversion
   */
  reject: async (id: string, reason: string, notes?: string): Promise<void> => {
    await api.post(`/conversions/${id}/reject`, { reason, notes });
  },

  /**
   * Update the blockchain transaction hash for a conversion
   */
  updateHash: async (id: string, txHash: string): Promise<void> => {
    await api.patch(`/conversions/${id}/hash`, { txHash });
  },
};
