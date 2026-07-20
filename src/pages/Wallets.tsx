import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { walletService } from '@/services/walletService';
import { Refresh, Wallet, SearchNormal1, DocumentDownload, Sun1 } from 'iconsax-react';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import { useHasPermission } from '@/hooks/useAuth';

export default function Wallets({ embedded }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const canFreezeWallets = useHasPermission('FREEZE_WALLETS');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cryptoFilter, setCryptoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.wallets.list({
      page,
      limit,
      search: debouncedSearch,
      crypto: cryptoFilter !== 'all' ? cryptoFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      network: networkFilter !== 'all' ? networkFilter : undefined,
    }),
    queryFn: () =>
      walletService.getWallets({
        page,
        limit,
        search: debouncedSearch || undefined,
        crypto: cryptoFilter !== 'all' ? cryptoFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        network: networkFilter !== 'all' ? networkFilter : undefined,
      }),
  });

  const freezeMutation = useMutation({
    mutationFn: ({ crypto, walletId, reason }: { crypto: string; walletId: number; reason?: string }) =>
      walletService.freezeWallet(crypto, walletId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all });
      toast.success('Wallet frozen');
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Failed to freeze wallet'),
  });

  const unfreezeMutation = useMutation({
    mutationFn: ({ crypto, walletId }: { crypto: string; walletId: number }) =>
      walletService.unfreezeWallet(crypto, walletId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all });
      toast.success('Wallet unfrozen');
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Failed to unfreeze wallet'),
  });

  const list = data?.data ?? [];
  const pagination = data?.pagination as {
    total?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
  } | undefined;

  // Filter the list client-side as well for immediate feedback
  const filteredList = list.filter((row: Record<string, unknown>) => {
    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      const address = String(row.walletAddress ?? row.wallet_address ?? row.address ?? '').toLowerCase();
      const userId = String(row.userId ?? '').toLowerCase();
      const crypto = String(row.crypto ?? row.asset ?? row.currency ?? '').toLowerCase();
      if (!address.includes(search) && !userId.includes(search) && !crypto.includes(search)) {
        return false;
      }
    }
    // Crypto filter
    if (cryptoFilter !== 'all') {
      const crypto = String(row.crypto ?? row.asset ?? row.currency ?? '').toUpperCase();
      if (crypto !== cryptoFilter) return false;
    }
    // Status filter
    if (statusFilter !== 'all') {
      const isFrozen = row.frozen || row.freeze === 'yes';
      if (statusFilter === 'frozen' && !isFrozen) return false;
      if (statusFilter === 'active' && isFrozen) return false;
    }
    // Network filter
    if (networkFilter !== 'all') {
      const network = String(row.network ?? '').toLowerCase();
      if (network !== networkFilter.toLowerCase()) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setCryptoFilter('all');
    setStatusFilter('all');
    setNetworkFilter('all');
    setPage(1);
  };

  const hasFilters = searchQuery || cryptoFilter !== 'all' || statusFilter !== 'all' || networkFilter !== 'all';

  const body = (
    <>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {pagination?.total != null ? `${pagination.total} wallet(s)` : 'Platform wallets'}
          {hasFilters && filteredList.length !== list.length && (
            <span className="ml-2 text-blue-600">({filteredList.length} shown)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
          >
            <Refresh size={18} color="currentColor" className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-100">
            <DocumentDownload size={16} color="currentColor" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchNormal1
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by address, user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Crypto Filter */}
        <select
          value={cryptoFilter}
          onChange={(e) => { setCryptoFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All Cryptos</option>
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="ETH">Ethereum (ETH)</option>
          <option value="USDT">Tether (USDT)</option>
          <option value="USDC">USD Coin (USDC)</option>
          <option value="SOL">Solana (SOL)</option>
          <option value="XRP">Ripple (XRP)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
        </select>

        {/* Network Filter */}
        <select
          value={networkFilter}
          onChange={(e) => { setNetworkFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All Networks</option>
          <option value="mainnet">Mainnet</option>
          <option value="testnet">Testnet</option>
          <option value="bsc">BSC</option>
          <option value="polygon">Polygon</option>
          <option value="tron">Tron</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : filteredList.length === 0 ? (
          <TableEmpty
            message="No wallets found"
            action={hasFilters ? <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Clear filters</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    ID / Address
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Crypto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Network</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row: Record<string, unknown>, i: number) => {
                  const walletId = Number(row.walletId ?? row.wallet_id ?? row.id ?? 0);
                  const crypto = String(row.crypto ?? row.asset ?? row.currency ?? '').toLowerCase();
                  const isFrozen = Boolean(row.frozen || row.freeze === 'yes');
                  return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/30">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs">
                        <div className="text-gray-400">
                          #{String(row.walletId ?? row.wallet_id ?? row.id ?? '-')}
                        </div>
                        <div className="text-gray-700 mt-1 truncate max-w-[200px]">
                          {String(row.walletAddress ?? row.wallet_address ?? row.address ?? '-')}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {row.userId ? (
                        <span className="text-sm">User #{String(row.userId)}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-xs font-bold">
                          {String(row.crypto ?? row.asset ?? row.currency ?? '-')[0]}
                        </div>
                        <span className="font-medium">
                          {String(row.crypto ?? row.asset ?? row.currency ?? '-')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>{String(row.cryptoBalance ?? row.crypto_balance ?? '0')}</div>
                        {row.fiatBalance && Number(row.fiatBalance) > 0 && (
                          <div className="text-xs text-gray-500">
                            ≈ ${String(row.fiatBalance)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {row.network ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {String(row.network)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isFrozen ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isFrozen ? 'Frozen' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {walletId && crypto ? (
                        isFrozen ? (
                          <button
                            type="button"
                            onClick={() => unfreezeMutation.mutate({ crypto, walletId })}
                            disabled={unfreezeMutation.isPending || !canFreezeWallets}
                            title={!canFreezeWallets ? 'You need FREEZE_WALLETS permission.' : undefined}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
                          >
                            <Sun1 size={14} color="currentColor" />
                            Unfreeze
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt('Reason for freeze (optional):');
                              freezeMutation.mutate({ crypto, walletId, reason: reason ?? undefined });
                            }}
                            disabled={freezeMutation.isPending || !canFreezeWallets}
                            title={!canFreezeWallets ? 'You need FREEZE_WALLETS permission.' : undefined}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                          >
                            <Sun1 size={14} color="currentColor" />
                            Freeze
                          </button>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing {((page - 1) * limit) + 1} to{' '}
              {Math.min(page * limit, pagination.total ?? 0)} of {pagination.total} wallets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages ?? 1, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
  return embedded ? body : <DashboardLayout title="Wallets">{body}</DashboardLayout>;
}
