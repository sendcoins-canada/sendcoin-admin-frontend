/**
 * Platform Service
 * Handles all platform-related API calls (balance, revenue, settings)
 */

import { api } from '../lib/api';

// =============================================================================
// Types
// =============================================================================

export interface PlatformBalance {
  feeWallet: {
    address: string;
    balances: Array<{
      currency: string;
      amount: string;
      amountUsd: string;
    }>;
    totalUsd: string;
  };
  hotWallet: {
    address: string;
    balances: Array<{
      currency: string;
      amount: string;
      amountUsd: string;
    }>;
    totalUsd: string;
  };
  coldWallet?: {
    address: string;
    balances: Array<{
      currency: string;
      amount: string;
      amountUsd: string;
    }>;
    totalUsd: string;
  };
  totalUserFiat?: {
    totalBalance: string;
    totalUsers: number;
    balances: Array<{
      currency: string;
      availableBalance: string;
      actualBalance: string;
      userCount: number;
    }>;
  };
}

export interface PlatformRevenue {
  period: string;
  totalRevenue: string;
  totalRevenueUsd: string;
  breakdown: Array<{
    category: string;
    amount: string;
    amountUsd: string;
    percentage: number;
  }>;
  daily: Array<{
    date: string;
    amount: string;
    amountUsd: string;
  }>;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  transactionVolume: string;
  transactionVolumeUsd: string;
  pendingKyc: number;
  flaggedTransactions: number;
  // Optional trend data (percentage change from previous period)
  trends?: {
    users?: { value: number; isPositive: boolean };
    transactions?: { value: number; isPositive: boolean };
    revenue?: { value: number; isPositive: boolean };
  };
}

export interface PlatformSettings {
  // Transaction limits
  transactionLimits: {
    dailyLimit: string;
    weeklyLimit: string;
    monthlyLimit: string;
    singleTransactionLimit: string;
    largeTransactionThreshold: string;
  };
  // Fee settings
  fees: {
    withdrawalFee: string;
    conversionFee: string;
    transferFee: string;
  };
  // KYC settings
  kyc: {
    requiredForWithdrawal: boolean;
    requiredDocuments: string[];
    verificationTimeout: number;
  };
  // Security settings
  security: {
    mfaRequired: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  // Maintenance mode
  maintenance: {
    enabled: boolean;
    message: string;
    allowedIps: string[];
  };
}

// =============================================================================
// Platform Service
// =============================================================================

export const platformService = {
  /**
   * Get platform wallet balances
   */
  getBalance: async (): Promise<PlatformBalance> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await api.get('/platform/balance');
      // Backend returns: { feeWallet: {...}, hotWallet: {...}, totalUserFiat: {...} }
      return {
        feeWallet: response.feeWallet || { address: 'Not configured', balances: [], totalUsd: '0' },
        hotWallet: response.hotWallet || { address: 'Not configured', balances: [], totalUsd: '0' },
        totalUserFiat: response.totalUserFiat || undefined,
      };
    } catch {
      // Return empty balances if endpoint doesn't exist
      return {
        feeWallet: { address: 'Not configured', balances: [], totalUsd: '0' },
        hotWallet: { address: 'Not configured', balances: [], totalUsd: '0' },
      };
    }
  },

  /**
   * Get platform revenue data
   */
  getRevenue: async (params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PlatformRevenue> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await api.get('/platform/revenue', { params });
      // Backend returns: { period, totalRevenue, totalRevenueUsd, breakdown, daily }
      return {
        period: response.period || params?.period || 'month',
        totalRevenue: response.totalRevenue || '0',
        totalRevenueUsd: response.totalRevenueUsd || '0',
        breakdown: (response.breakdown || []).map((item: { category: string; amount: string; amountUsd: string; percentage: number }) => ({
          category: item.category,
          amount: item.amount,
          amountUsd: item.amountUsd,
          percentage: item.percentage || 0,
        })),
        daily: response.daily || [],
      };
    } catch {
      // Return empty revenue if endpoint doesn't exist
      return {
        period: params?.period || 'month',
        totalRevenue: '0',
        totalRevenueUsd: '0',
        breakdown: [],
        daily: [],
      };
    }
  },

  /**
   * Get platform statistics by combining user and transaction stats
   */
  getStats: async (): Promise<PlatformStats> => {
    // Fetch user and transaction stats from their respective endpoints
    try {
      const [userStatsRes, txStatsRes] = await Promise.all([
        api.get('/users/stats').catch(() => ({})),
        api.get('/transactions/stats').catch(() => ({})),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userStats: any = userStatsRes || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txStats: any = txStatsRes || {};

      // Backend transaction stats structure:
      // { totalVolume: { crypto, fiat }, completed, pending, failed, flagged, byType: {...} }
      const totalTransactions =
        (txStats.completed || 0) + (txStats.pending || 0) + (txStats.failed || 0);

      // totalVolume is an object { crypto, fiat }
      const volumeCrypto = txStats.totalVolume?.crypto || 0;
      const volumeFiat = txStats.totalVolume?.fiat || 0;

      return {
        totalUsers: userStats.total || 0,
        activeUsers: userStats.active || 0,
        totalTransactions,
        transactionVolume: String(volumeCrypto),
        transactionVolumeUsd: String(volumeFiat),
        pendingKyc: userStats.pendingKyc || 0,
        flaggedTransactions: txStats.flagged || 0,
      };
    } catch {
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTransactions: 0,
        transactionVolume: '0',
        transactionVolumeUsd: '0',
        pendingKyc: 0,
        flaggedTransactions: 0,
      };
    }
  },

  /**
   * Get platform settings (backend may not implement)
   */
  getSettings: async (): Promise<PlatformSettings> => {
    try {
      const response = await api.get('/platform/settings');
      return response as unknown as PlatformSettings;
    } catch {
      return {} as PlatformSettings;
    }
  },

  /**
   * Update platform settings (backend may not implement)
   */
  updateSettings: async (settings: Partial<PlatformSettings>): Promise<PlatformSettings> => {
    try {
      const response = await api.patch('/platform/settings', settings);
      return response as unknown as PlatformSettings;
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Platform settings not available.');
    }
  },

  /**
   * Enable maintenance mode (backend may not implement)
   */
  enableMaintenance: async (message: string, allowedIps?: string[]): Promise<void> => {
    try {
      await api.post('/platform/maintenance/enable', { message, allowedIps });
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Maintenance mode not available.');
    }
  },

  /**
   * Disable maintenance mode (backend may not implement)
   */
  disableMaintenance: async (): Promise<void> => {
    try {
      await api.post('/platform/maintenance/disable');
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Maintenance mode not available.');
    }
  },

  // =========================================================================
  // Wallet Operations
  // =========================================================================

  /**
   * Transfer from hot wallet to cold wallet
   */
  transferToColdWallet: async (
    currency: string,
    amount: string
  ): Promise<{ txHash: string }> => {
    try {
      const response = await api.post('/platform/wallets/transfer-to-cold', {
        currency,
        amount,
      });
      return response as unknown as { txHash: string };
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Transfer not available.');
    }
  },

  /**
   * Transfer from cold wallet to hot wallet
   */
  transferToHotWallet: async (
    currency: string,
    amount: string
  ): Promise<{ txHash: string }> => {
    try {
      const response = await api.post('/platform/wallets/transfer-to-hot', {
        currency,
        amount,
      });
      return response as unknown as { txHash: string };
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Transfer not available.');
    }
  },

  /**
   * Withdraw fees to external wallet
   */
  withdrawFees: async (
    currency: string,
    amount: string,
    destinationAddress: string
  ): Promise<{ txHash: string }> => {
    try {
      const response = await api.post('/platform/wallets/withdraw-fees', {
        currency,
        amount,
        destinationAddress,
      });
      return response as unknown as { txHash: string };
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Withdraw not available.');
    }
  },

  // =========================================================================
  // Reports
  // =========================================================================

  /**
   * Generate platform report
   */
  generateReport: async (params: {
    type: 'transactions' | 'users' | 'revenue' | 'audit';
    dateFrom: string;
    dateTo: string;
    format: 'csv' | 'pdf';
  }): Promise<Blob> => {
    try {
      const response = await api.post<Blob>('/platform/reports/generate', params, {
        responseType: 'blob',
      });
      return response as unknown as Blob;
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Report generation not available.');
    }
  },

  /**
   * Get scheduled reports (backend may not implement)
   */
  getScheduledReports: async (): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      frequency: string;
      recipients: string[];
      nextRun: string;
    }>
  > => {
    try {
      const response = await api.get('/platform/reports/scheduled');
      return (response as unknown as Array<{
        id: string;
        name: string;
        type: string;
        frequency: string;
        recipients: string[];
        nextRun: string;
      }>) || [];
    } catch {
      return [];
    }
  },

  /**
   * Create scheduled report (backend may not implement)
   */
  createScheduledReport: async (data: {
    name: string;
    type: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  }): Promise<void> => {
    try {
      await api.post('/platform/reports/scheduled', data);
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Scheduled reports not available.');
    }
  },

  /**
   * Delete scheduled report (backend may not implement)
   */
  deleteScheduledReport: async (id: string): Promise<void> => {
    try {
      await api.delete(`/platform/reports/scheduled/${id}`);
    } catch (e) {
      throw new Error((e as Error)?.message ?? 'Scheduled reports not available.');
    }
  },
};

export default platformService;
