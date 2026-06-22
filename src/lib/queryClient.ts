import { QueryClient } from '@tanstack/react-query';

// =============================================================================
// Query Client Configuration
// =============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus (can be annoying in admin dashboards)
      refetchOnWindowFocus: false,

      // Consider data fresh for 30 seconds
      staleTime: 30 * 1000,

      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry failed requests once
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network error handling
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Don't retry mutations
      retry: false,

      // Network error handling
      networkMode: 'offlineFirst',
    },
  },
});

// =============================================================================
// Query Key Factory
// =============================================================================

export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },

  // Transactions
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters?: object) =>
      [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    stats: () => [...queryKeys.transactions.all, 'stats'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: object) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
  },

  // Team
  team: {
    all: ['team'] as const,
    members: (filters?: object) => ['team', 'members', filters] as const,
    member: (id: string) => ['team', 'members', id] as const,
    roles: () => ['team', 'roles'] as const,
    role: (id: number) => ['team', 'roles', id] as const,
    departments: () => ['team', 'departments'] as const,
    department: (id: number) => ['team', 'departments', id] as const,
    permissions: () => ['team', 'permissions'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: object) => ['notifications', 'list', filters] as const,
    count: () => ['notifications', 'count'] as const,
  },

  // Activity feed
  activity: {
    all: ['activity'] as const,
    list: (filters?: object) => ['activity', 'list', filters] as const,
  },

  // Audit logs
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (filters?: object) => ['audit-logs', 'list', filters] as const,
  },

  // Emails (sent mail)
  emails: {
    all: ['emails'] as const,
    list: (params?: object) => ['emails', 'list', params] as const,
    detail: (id: number) => ['emails', id] as const,
  },

  // Platform
  platform: {
    balance: () => ['platform', 'balance'] as const,
    revenue: (params?: object) => ['platform', 'revenue', params] as const,
    settings: () => ['platform', 'settings'] as const,
    account: () => ['platform', 'account'] as const,
  },

  // Dashboard
  dashboard: {
    overview: () => ['dashboard', 'overview'] as const,
    pending: () => ['dashboard', 'pending'] as const,
  },

  // Wallets
  wallets: {
    all: ['wallets'] as const,
    list: (filters?: object) => ['wallets', 'list', filters] as const,
    stats: () => ['wallets', 'stats'] as const,
  },

  // KYC (queue)
  kyc: {
    all: ['kyc'] as const,
    list: (filters?: object) => ['kyc', 'list', filters] as const,
    stats: () => ['kyc', 'stats'] as const,
  },

  // Conversions
  conversions: {
    all: ['conversions'] as const,
    list: (filters?: object) => ['conversions', 'list', filters] as const,
    stats: () => ['conversions', 'stats'] as const,
  },

  // Analytics
  analytics: {
    transactions: (params?: object) => ['analytics', 'transactions', params] as const,
    users: (params?: object) => ['analytics', 'users', params] as const,
    revenue: (params?: object) => ['analytics', 'revenue', params] as const,
    topUsers: (params?: object) => ['analytics', 'top-users', params] as const,
  },

  // Rates
  rates: {
    all: ['rates'] as const,
    list: () => ['rates', 'list'] as const,
    detail: (id: number) => ['rates', id] as const,
  },
};
