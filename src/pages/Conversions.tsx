import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { conversionService, Conversion } from '@/services/conversionService';
import { settingsService } from '@/services/settingsService';
import { Refresh, ArrowSwapHorizontal, SearchNormal1, Eye, TickCircle, CloseCircle, DollarCircle } from 'iconsax-react';
import { ConversionDetailModal } from '@/components/modals/ConversionDetailModal';
import { MfaVerificationModal } from '@/components/modals/MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import { useHasPermission } from '@/hooks/useAuth';

export default function Conversions() {
  const canVerifyConversion = useHasPermission('VERIFY_TRANSACTIONS');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [cryptoFilter, setCryptoFilter] = useState<string>('all');
  const [fiatFilter, setFiatFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedConversionId, setSelectedConversionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const limit = 20;

  const queryClient = useQueryClient();

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.conversions.list({
      page,
      limit,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: debouncedSearch || undefined,
    }),
    queryFn: () => conversionService.getList({
      page,
      limit,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: debouncedSearch || undefined,
    }),
  });

  // Quick approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => conversionService.approve(id),
    onSuccess: () => {
      toast.success('Conversion approved');
      queryClient.invalidateQueries({ queryKey: queryKeys.conversions.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve');
    },
  });

  // Quick reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      conversionService.reject(id, reason),
    onSuccess: () => {
      toast.success('Conversion rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.conversions.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject');
    },
  });

  const handleQuickApprove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to approve this conversion?')) {
      approveMutation.mutate(id);
    }
  };

  const handleQuickReject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      rejectMutation.mutate({ id, reason });
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedConversionId(id);
    setModalOpen(true);
  };

  const list = (data?.data ?? []) as Conversion[];
  const pagination = data?.pagination as { total?: number } | undefined;

  // Platform fee settings (below conversions list)
  const { data: feeSettingsData, isLoading: feeSettingsLoading } = useQuery({
    queryKey: ['settings', 'fees'],
    queryFn: settingsService.getFeeSettings,
  });
  const [feePlatformPercent, setFeePlatformPercent] = useState<string>('1.2');
  useEffect(() => {
    if (feeSettingsData?.platformFeePercentage != null) {
      setFeePlatformPercent(String(feeSettingsData.platformFeePercentage));
    }
  }, [feeSettingsData?.platformFeePercentage]);

  const updateFeeSettingsMutation = useMutation({
    mutationFn: (body: { platformFeePercentage: number }) =>
      settingsService.updateFeeSettings(body),
    onSuccess: () => {
      toast.success('Platform fee updated');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'fees'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update fee settings');
    },
  });

  const mfaFeesUpdate = useMfaProtectedAction({
    actionName: 'Update Platform Fee',
    actionDescription: 'You are about to change the platform fee percentage for crypto-to-fiat conversions. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'fees'] });
    },
  });

  const handleMfaVerified = (actionToken: string) => {
    if (mfaFeesUpdate.isMfaModalOpen) {
      mfaFeesUpdate.handleMfaVerified(actionToken);
    }
  };

  return (
    <DashboardLayout title="Conversions">
      {/* Platform fee (conversion) – at top */}
      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarCircle size={22} color="currentColor" className="text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">Platform fee (conversion)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Percentage deducted from crypto-to-fiat conversion destination amount. The main Sendcoins backend uses this value.
        </p>
        {feeSettingsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Refresh size={16} color="currentColor" className="animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={feePlatformPercent}
                onChange={(e) => setFeePlatformPercent(e.target.value)}
                className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const num = parseFloat(feePlatformPercent);
                if (Number.isNaN(num) || num < 0 || num > 100) {
                  toast.error('Enter a number between 0 and 100');
                  return;
                }
                await mfaFeesUpdate.executeWithMfa(async () => {
                  await updateFeeSettingsMutation.mutateAsync({
                    platformFeePercentage: num,
                  });
                });
              }}
              disabled={updateFeeSettingsMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {updateFeeSettingsMutation.isPending ? (
                <>
                  <Refresh size={14} color="currentColor" className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <TickCircle size={14} color="currentColor" />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {pagination?.total != null ? `${pagination.total} conversion(s)` : 'Crypto-to-fiat conversions'}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          <Refresh size={18} color="currentColor" className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchNormal1 size={18} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by reference or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="locked">Locked</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        {/* Crypto Filter */}
        <select
          value={cryptoFilter}
          onChange={(e) => { setCryptoFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Cryptos</option>
          <option value="BTC">Bitcoin</option>
          <option value="ETH">Ethereum</option>
          <option value="USDT">USDT</option>
          <option value="USDC">USDC</option>
        </select>

        {/* Fiat Currency Filter */}
        <select
          value={fiatFilter}
          onChange={(e) => { setFiatFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Fiat</option>
          <option value="NGN">NGN (Naira)</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
          <option value="EUR">EUR</option>
          <option value="GHS">GHS (Cedis)</option>
          <option value="KES">KES (Shilling)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : list.length === 0 ? (
          <TableEmpty
            message="No conversions found"
            action={
              (debouncedSearch || statusFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Destination</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Recipient</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Bank</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, i) => {
                  const id = String(row.id ?? row.reference ?? i);
                  const isPending = row.status === 'pending' || row.status === 'locked';

                  return (
                    <tr
                      key={id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleViewDetails(id)}
                    >
                      <td className="py-3 px-4 font-mono text-xs">{String(row.reference ?? '-')}</td>
                      <td className="py-3 px-4">{String(row.userEmail ?? '-')}</td>
                      <td className="py-3 px-4">{String(row.destinationCountry ?? '-')} ({String(row.currency ?? row.fiatCurrency ?? '-')})</td>
                      <td className="py-3 px-4 font-medium">{String(row.fiatAmount ?? row.amount ?? '-')}</td>
                      <td className="py-3 px-4">{String(row.recipientName ?? '-')}</td>
                      <td className="py-3 px-4">{String(row.bankName ?? '-')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.status === 'completed' ? 'bg-green-100 text-green-700' :
                          row.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          row.status === 'locked' ? 'bg-blue-100 text-blue-700' :
                          row.status === 'processing' ? 'bg-purple-100 text-purple-700' :
                          row.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {String(row.status ?? 'pending')}
                        </span>
                        {row.isFlagged && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Flagged
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} color="currentColor" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={(e) => handleQuickApprove(e, id)}
                                disabled={approveMutation.isPending || !canVerifyConversion}
                                title={!canVerifyConversion ? 'You need VERIFY_TRANSACTIONS permission.' : 'Approve'}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <TickCircle size={16} color="currentColor" />
                              </button>
                              <button
                                onClick={(e) => handleQuickReject(e, id)}
                                disabled={rejectMutation.isPending || !canVerifyConversion}
                                title={!canVerifyConversion ? 'You need VERIFY_TRANSACTIONS permission.' : 'Reject'}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <CloseCircle size={16} color="currentColor" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination?.total != null && pagination.total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} results
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
              onClick={() => setPage((p) => Math.min(Math.ceil((pagination?.total ?? 0) / limit), p + 1))}
              disabled={page >= Math.ceil(pagination.total / limit)}
              className="px-4 py-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Conversion Detail Modal */}
      {selectedConversionId && (
        <ConversionDetailModal
          conversionId={selectedConversionId}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedConversionId(null);
          }}
        />
      )}

      <MfaVerificationModal
        open={mfaFeesUpdate.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaFeesUpdate.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaFeesUpdate.modalConfig.actionName}
        actionDescription={mfaFeesUpdate.modalConfig.actionDescription}
      />
    </DashboardLayout>
  );
}
