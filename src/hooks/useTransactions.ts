/**
 * Transaction Hooks
 * React Query hooks for transaction operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { transactionService } from '../services/transactionService';
import { queryKeys } from '../lib/queryClient';
import type { TransactionFilters, FlagTransactionRequest } from '../types/transaction';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to get paginated transactions with filters
 */
export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => transactionService.getTransactions(filters),
  });
};

/**
 * Hook to get a single transaction by ID
 */
export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => transactionService.getTransaction(id),
    enabled: !!id,
  });
};

/**
 * Hook to get transaction statistics
 */
export const useTransactionStats = (params?: { dateFrom?: string; dateTo?: string }) => {
  return useQuery({
    queryKey: queryKeys.transactions.stats(),
    queryFn: () => transactionService.getStats(params),
  });
};

/**
 * Hook to get transactions requiring approval
 */
export const usePendingApprovals = () => {
  return useQuery({
    queryKey: [...queryKeys.transactions.all, 'pending-approvals'],
    queryFn: transactionService.getPendingApprovals,
  });
};

/**
 * Hook to get transactions for a specific user
 */
export const useUserTransactions = (
  userId: string,
  filters?: Omit<TransactionFilters, 'userId'>
) => {
  return useQuery({
    queryKey: [...queryKeys.users.detail(userId), 'transactions', filters],
    queryFn: () => transactionService.getUserTransactions(userId, filters),
    enabled: !!userId,
  });
};

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to flag a transaction
 */
export const useFlagTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FlagTransactionRequest }) =>
      transactionService.flagTransaction(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() });
    },
  });
};

/**
 * Hook to unflag a transaction
 */
export const useUnflagTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionService.unflagTransaction(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() });
    },
  });
};

/**
 * Hook to approve a transaction
 */
export const useApproveTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note, txHash }: { id: string; note?: string; txHash?: string }) =>
      transactionService.approveTransaction(id, note, txHash),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.transactions.all, 'pending-approvals'],
      });
    },
  });
};

/**
 * Hook to reject a transaction
 */
export const useRejectTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      transactionService.rejectTransaction(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.transactions.all, 'pending-approvals'],
      });
    },
  });
};

/**
 * Hook to update a transaction's blockchain hash
 */
export const useUpdateTxHash = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, txHash, type }: { id: string; txHash: string; type?: string }) =>
      transactionService.updateTxHash(id, txHash, type),
    onSuccess: (_, { id }) => {
      toast.success('Transaction hash updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() });
    },
    onError: (err: Error) => {
      toast.error(err?.message || 'Failed to update transaction hash');
    },
  });
};

/**
 * Hook to export transactions
 */
export const useExportTransactions = () => {
  return useMutation({
    mutationFn: (filters?: TransactionFilters) =>
      transactionService.exportTransactions(filters),
    onError: (err: Error) => {
      toast.error(err?.message || 'Failed to export transactions');
    },
    onSuccess: (blob) => {
      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};
