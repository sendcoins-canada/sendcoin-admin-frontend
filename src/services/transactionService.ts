/**
 * Transaction Service
 * Handles all transaction-related API calls
 */

import { api } from '../lib/api';
import type {
  Transaction,
  TransactionDetail,
  TransactionFilters,
  TransactionStats,
  FlagTransactionRequest,
} from '../types/transaction';
import type { PaginatedResponse } from '../types/common';

// =============================================================================
// Helper to map backend transaction to frontend format
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTransaction = (tx: any): Transaction => ({
  id: String(tx.id),
  txId: tx.txId || tx.reference,
  type: tx.type?.toUpperCase() || 'OUTGOING',
  status: tx.status?.toUpperCase() || 'PENDING',
  currency: tx.currency?.crypto || tx.currency?.fiat || tx.currency?.display || 'USD',
  amount: tx.amount?.crypto ?? tx.amount?.fiat ?? 0,
  amountUsd: tx.amountUsd ?? 0,
  amountFiat: tx.amount?.fiat,
  fiatCurrency: tx.currency?.fiat,
  fee: tx.fee || 0,
  feeCurrency: tx.feeCurrency,
  feeUsd: tx.feeUsd || 0,
  source: {
    type: tx.source?.type || 'WALLET',
    address: tx.source?.address,
    name: tx.source?.name,
  },
  destination: {
    type: tx.destination?.type || 'EXTERNAL',
    address: tx.destination?.address,
    name: tx.destination?.name,
    network: tx.destination?.network || tx.network,
  },
  txHash: tx.txHash,
  blockNumber: tx.blockNumber,
  confirmations: tx.confirmations,
  userId: tx.userApiKey || tx.userId || '',
  userEmail: tx.userEmail || '',
  userName: tx.userName || tx.userEmail || tx.userApiKey || '',
  isFlagged: tx.isFlagged || false,
  flagReason: tx.flaggedReason,
  flaggedBy: tx.flaggedBy,
  flaggedAt: tx.flaggedAt,
  initiatedAt: tx.dateInitiated || tx.createdAt,
  completedAt: tx.completedAt || tx.statusUpdatedAt,
  createdAt: tx.createdAt,
  updatedAt: tx.updatedAt || tx.createdAt,
});

// =============================================================================
// Transaction Service
// =============================================================================

export const transactionService = {
  /**
   * Get paginated list of transactions with filters
   */
  getTransactions: async (
    filters?: TransactionFilters
  ): Promise<PaginatedResponse<Transaction>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get('/transactions', {
      params: filters,
    });
    // Map backend response to frontend format
    const transactions = (response.data || response.transactions || []).map(mapTransaction);
    const pagination = response.pagination || {};
    const total = pagination.total || transactions.length;
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const totalPages = pagination.totalPages || Math.ceil(total / limit);
    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },

  /**
   * Get transaction by ID
   */
  getTransaction: async (id: string): Promise<TransactionDetail> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get(`/transactions/${id}`);
    const tx = response.transaction || response;
    return {
      ...mapTransaction(tx),
      history: tx.history || [],
      relatedTransactions: tx.relatedTransactions?.map(mapTransaction) || [],
      adminNotes: tx.adminNotes || tx.notes,
    };
  },

  /**
   * Get transaction statistics
   */
  getStats: async (params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TransactionStats> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get('/transactions/stats', {
      params,
    });
    // Backend returns: { totalVolume: { crypto, fiat }, completed, pending, failed, flagged, byType }
    const completed = response.completed || 0;
    const pending = response.pending || 0;
    const failed = response.failed || 0;
    const flagged = response.flagged || 0;
    // Calculate total from individual counts since backend doesn't provide total
    const total = completed + pending + failed;
    // totalVolume is an object { crypto, fiat }
    const volumeCrypto = response.totalVolume?.crypto || 0;
    const volumeFiat = response.totalVolume?.fiat || 0;
    return {
      total,
      completed,
      pending,
      failed,
      flagged,
      totalVolume: volumeCrypto,
      totalVolumeUsd: volumeFiat,
    };
  },

  /**
   * Flag a transaction for review
   */
  flagTransaction: async (id: string, data: FlagTransactionRequest): Promise<void> => {
    await api.post(`/transactions/${id}/flag`, data);
  },

  /**
   * Unflag a transaction
   */
  unflagTransaction: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}/flag`);
  },

  /**
   * Approve a flagged/pending transaction
   */
  approveTransaction: async (id: string, note?: string, txHash?: string): Promise<void> => {
    await api.post(`/transactions/${id}/approve`, { note, txHash });
  },

  /**
   * Reject/Cancel a flagged/pending transaction
   */
  rejectTransaction: async (id: string, reason: string): Promise<void> => {
    await api.post(`/transactions/${id}/cancel`, { reason });
  },

  /**
   * Retry a pending_funding transfer (admin funded master wallet, re-attempt send)
   */
  retryTransaction: async (id: string): Promise<{ success: boolean; message: string; txid?: string }> => {
    const response: any = await api.post(`/transactions/${id}/retry`);
    return response;
  },

  /**
   * Get transactions requiring approval (large transactions, flagged, etc.)
   */
  getPendingApprovals: async (): Promise<PaginatedResponse<Transaction>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get('/transactions/pending-approvals');
    const transactions = (response.data || response.transactions || []).map(mapTransaction);
    const pagination = response.pagination || {};
    return {
      data: transactions,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || transactions.length,
        totalPages: pagination.totalPages || 1,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  },

  /**
   * Update blockchain transaction hash (post-approval correction)
   */
  updateTxHash: async (id: string, txHash: string, type?: string): Promise<void> => {
    await api.patch(`/transactions/${id}/hash`, { txHash, type });
  },

  /**
   * Export transactions to CSV
   */
  exportTransactions: async (filters?: TransactionFilters): Promise<Blob> => {
    const response = await api.get('/transactions/export', {
      params: filters,
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },

  /**
   * Get transaction history for a specific user
   */
  getUserTransactions: async (
    userId: string,
    filters?: Omit<TransactionFilters, 'userId'>
  ): Promise<PaginatedResponse<Transaction>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get(`/users/${userId}/transactions`, { params: filters });
    const transactions = (response.data || response.transactions || []).map(mapTransaction);
    const pagination = response.pagination || {};
    return {
      data: transactions,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || transactions.length,
        totalPages: pagination.totalPages || 1,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1,
      },
    };
  },
};

export default transactionService;
