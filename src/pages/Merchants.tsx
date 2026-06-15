import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantService, Merchant } from '@/services/merchantService';
import {
  Refresh,
  Shop,
  SearchNormal1,
  TickCircle,
  CloseCircle,
  Danger,
  Eye,
} from 'iconsax-react';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import { MerchantDetailModal } from '@/components/modals/MerchantDetailModal';

// Helper to format date from unix timestamp
function formatDate(timestamp?: number | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    suspended: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Suspended' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function Merchants() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const limit = 20;

  const queryClient = useQueryClient();

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch merchants
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: [
      'merchants',
      { search: debouncedSearch, status: statusFilter, active: activeFilter },
    ],
    queryFn: () =>
      merchantService.getMerchants({
        page: 1,
        limit: 100,
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['merchants', 'stats'],
    queryFn: merchantService.getStats,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (keychain: string) => merchantService.approve(keychain),
    onSuccess: () => {
      toast.success('Merchant approved');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve merchant');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ keychain, reason }: { keychain: string; reason: string }) =>
      merchantService.reject(keychain, reason),
    onSuccess: () => {
      toast.success('Merchant rejected');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject merchant');
    },
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: ({ keychain, reason }: { keychain: string; reason: string }) =>
      merchantService.suspend(keychain, reason),
    onSuccess: () => {
      toast.success('Merchant suspended');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend merchant');
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ keychain, isActive }: { keychain: string; isActive: boolean }) =>
      merchantService.toggleStatus(keychain, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Merchant activated' : 'Merchant deactivated');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle merchant status');
    },
  });

  const handleApprove = (e: React.MouseEvent, keychain: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to approve this merchant?')) {
      approveMutation.mutate(keychain);
    }
  };

  const handleReject = (e: React.MouseEvent, keychain: string) => {
    e.stopPropagation();
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      rejectMutation.mutate({ keychain, reason });
    }
  };

  const handleSuspend = (e: React.MouseEvent, keychain: string) => {
    e.stopPropagation();
    const reason = prompt('Enter suspension reason:');
    if (reason) {
      suspendMutation.mutate({ keychain, reason });
    }
  };

  const handleToggle = (e: React.MouseEvent, keychain: string, currentActive: boolean) => {
    e.stopPropagation();
    const action = currentActive ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${action} this merchant?`)) {
      toggleMutation.mutate({ keychain, isActive: !currentActive });
    }
  };

  const handleViewDetails = (keychain: string) => {
    setSelectedMerchant(keychain);
    setModalOpen(true);
  };

  const merchants = data?.merchants ?? [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Merchants">
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm">
          {stats && (
            <span className="text-gray-500">
              Total: {stats.total} · Pending: {stats.pending} · Approved:{' '}
              {stats.approved} · Active: {stats.active}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchNormal1
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, email, bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Active Filter */}
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : merchants.length === 0 ? (
          <TableEmpty
            message="No merchants found"
            action={
              (debouncedSearch || statusFilter !== 'all' || activeFilter !== 'all') ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setActiveFilter('all');
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Merchant
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Bank Details
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Orders
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Active
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr
                    key={merchant.keychain}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => handleViewDetails(merchant.keychain)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <Shop size={18} color="currentColor" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{merchant.userName}</p>
                          <p className="text-xs text-gray-400">{merchant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-900">{merchant.bankName}</p>
                      <p className="text-xs text-gray-400">
                        {merchant.bankAccountName} - ****
                        {merchant.bankAccountNumber.slice(-4)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">
                        <span className="text-green-600">{merchant.completedOrders}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{merchant.totalOrders}</span>
                      </div>
                      {merchant.pendingOrders > 0 && (
                        <p className="text-xs text-yellow-600">
                          {merchant.pendingOrders} pending
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={merchant.verificationStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          merchant.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {merchant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDate(merchant.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(merchant.keychain);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} color="currentColor" />
                        </button>

                        {merchant.verificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={(e) => handleApprove(e, merchant.keychain)}
                              disabled={approveMutation.isPending}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <TickCircle size={16} color="currentColor" />
                            </button>
                            <button
                              onClick={(e) => handleReject(e, merchant.keychain)}
                              disabled={rejectMutation.isPending}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <CloseCircle size={16} color="currentColor" />
                            </button>
                          </>
                        )}

                        {merchant.verificationStatus === 'approved' && (
                          <>
                            <button
                              onClick={(e) => handleSuspend(e, merchant.keychain)}
                              disabled={suspendMutation.isPending}
                              className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Suspend"
                            >
                              <Danger size={16} color="currentColor" />
                            </button>
                            <button
                              onClick={(e) =>
                                handleToggle(e, merchant.keychain, merchant.isActive)
                              }
                              disabled={toggleMutation.isPending}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                merchant.isActive
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={merchant.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {merchant.isActive ? (
                                <TickCircle size={16} color="currentColor" />
                              ) : (
                                <CloseCircle size={16} color="currentColor" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} merchants
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

      {/* Detail Modal */}
      {selectedMerchant && (
        <MerchantDetailModal
          keychain={selectedMerchant}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedMerchant(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
