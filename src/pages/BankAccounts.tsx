import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bankAccountService, FiatAccount } from '@/services/bankAccountService';
import { Refresh, Bank, SearchNormal1, Trash, Copy, TickCircle } from 'iconsax-react';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';

function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
}

function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency;
}

export default function BankAccounts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 20;

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bank-accounts', { page, search: debouncedSearch, currency: currencyFilter }],
    queryFn: () =>
      bankAccountService.getAccounts({
        page,
        limit,
        search: debouncedSearch || undefined,
        currency: currencyFilter === 'all' ? undefined : currencyFilter,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['bank-accounts', 'stats'],
    queryFn: bankAccountService.getStats,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bankAccountService.deleteAccount(id),
    onSuccess: () => {
      toast.success('Fiat account removed');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete account');
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string, accountName: string) => {
    e.stopPropagation();
    if (
      confirm(
        `Remove fiat account "${accountName}"? This is a system-managed CrayFi account. Only do this for support.`,
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const accounts = data?.accounts ?? [];
  const pagination = data?.pagination;
  const hasFilters = debouncedSearch || currencyFilter !== 'all';

  return (
    <DashboardLayout title="Fiat Accounts">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm">
          {stats && (
            <span className="text-gray-500">
              Total: {stats.total} · Wallets: {stats.uniqueUsers} · Banks: {stats.banks}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          <Refresh size={18} color="currentColor" className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchNormal1 size={18} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, account, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={currencyFilter}
          onChange={(e) => {
            setCurrencyFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All currencies</option>
          <option value="NGN">NGN</option>
          <option value="USD">USD</option>
          <option value="GHS">GHS</option>
          <option value="KES">KES</option>
          <option value="ZMW">ZMW</option>
          <option value="XOF">XOF</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : accounts.length === 0 ? (
          <TableEmpty
            message="No fiat accounts found"
            action={
              hasFilters ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrencyFilter('all');
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Account</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Bank</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Account Number</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Currency</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account: FiatAccount) => (
                  <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <Bank size={18} color="currentColor" />
                        </div>
                        <p className="font-medium text-gray-900">{account.accountName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{account.bankName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-900">
                          {maskAccountNumber(account.accountNumber)}
                        </span>
                        <button
                          onClick={(e) => handleCopy(e, account.accountNumber, account.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy full number"
                        >
                          {copiedId === account.id ? (
                            <TickCircle size={14} color="currentColor" className="text-green-600" />
                          ) : (
                            <Copy size={14} color="currentColor" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">
                      {formatBalance(account.actualBalance, account.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-gray-900">{account.userName}</p>
                        <p className="text-xs text-gray-400">{account.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {account.currency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(account.createdAt)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => handleDelete(e, account.id, account.accountName)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove account"
                      >
                        <Trash size={16} color="currentColor" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of{' '}
            {pagination.total} accounts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {page} of {Math.ceil(pagination.total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(pagination.total / limit), p + 1))}
              disabled={page >= Math.ceil(pagination.total / limit)}
              className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
