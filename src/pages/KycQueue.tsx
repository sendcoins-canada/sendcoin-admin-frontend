import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { kycQueueService } from '@/services/kycQueueService';
import { userService } from '@/services/userService';
import { Refresh, User, SearchNormal1, TickCircle, CloseCircle, Eye } from 'iconsax-react';
import { KycDetailModal } from '@/components/modals/KycDetailModal';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import { useHasPermission } from '@/hooks/useAuth';

// Type for KYC user from API
interface KycUser {
  userId?: number;
  azer_id?: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  kycStatus?: string;
  phone?: string | null;
  country?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
}

// Helper to get initials from name or email
function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName || lastName) {
    return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}` || '?';
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

// Helper to format date
function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function KycQueue() {
  const canVerifyKyc = useHasPermission('VERIFY_KYC');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  const { data: listData, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.kyc.list({
      page,
      limit,
      status: statusFilter,
      search: debouncedSearch,
      country: countryFilter !== 'all' ? countryFilter : undefined,
    }),
    queryFn: () => kycQueueService.getList({
      page,
      limit,
      status: statusFilter === 'all' ? 'all' : statusFilter,
      search: debouncedSearch || undefined,
      country: countryFilter !== 'all' ? countryFilter : undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.kyc.stats(),
    queryFn: kycQueueService.getStats,
  });

  // Quick approve mutation
  const approveMutation = useMutation({
    mutationFn: (userId: string) => userService.approveKyc(userId),
    onSuccess: () => {
      toast.success('KYC approved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve KYC');
    },
  });

  // Quick reject mutation (with prompt for reason)
  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      userService.rejectKyc(userId, '', reason),
    onSuccess: () => {
      toast.success('KYC rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject KYC');
    },
  });

  const handleQuickApprove = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to approve this KYC?')) {
      approveMutation.mutate(userId);
    }
  };

  const handleQuickReject = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      rejectMutation.mutate({ userId, reason });
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  const users = (listData?.data ?? []) as KycUser[];
  const pagination = listData?.pagination as { total?: number } | undefined;

  return (
    <DashboardLayout title="KYC Queue">
      {/* Stats and Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm">
          {stats && typeof stats === 'object' && (
            <span className="text-gray-500">
              Pending: {String((stats as Record<string, number>).pending ?? 0)} · Verified: {String((stats as Record<string, number>).verified ?? 0)}
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
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchNormal1 size={18} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
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
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Country Filter */}
        <select
          value={countryFilter}
          onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Countries</option>
          <option value="NG">Nigeria</option>
          <option value="GH">Ghana</option>
          <option value="KE">Kenya</option>
          <option value="ZA">South Africa</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : users.length === 0 ? (
          <TableEmpty
            message="No KYC submissions found"
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Country</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Submitted</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const firstName = u.firstName;
                  const lastName = u.lastName;
                  const email = u.email;
                  const profilePicture = u.profilePicture;
                  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '-';
                  const initials = getInitials(firstName, lastName, email);
                  const id = String(u.userId ?? u.azer_id ?? i);
                  const isPending = u.kycStatus !== 'verified';

                  return (
                    <tr
                      key={id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => handleViewDetails(id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {profilePicture ? (
                            <img
                              src={profilePicture}
                              alt={fullName}
                              className="w-9 h-9 rounded-full object-cover bg-gray-100"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling;
                                if (sibling) sibling.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium ${profilePicture ? 'hidden' : ''}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{fullName}</p>
                            <p className="text-xs text-gray-400">ID: {id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{String(email ?? '-')}</td>
                      <td className="py-3 px-4 text-gray-600">{String(u.country ?? '-')}</td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.kycStatus === 'verified'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {u.kycStatus === 'verified' ? 'Verified' : 'Pending'}
                        </span>
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
                                disabled={approveMutation.isPending || !canVerifyKyc}
                                title={!canVerifyKyc ? 'You need VERIFY_KYC permission.' : 'Approve KYC'}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <TickCircle size={16} color="currentColor" />
                              </button>
                              <button
                                onClick={(e) => handleQuickReject(e, id)}
                                disabled={rejectMutation.isPending || !canVerifyKyc}
                                title={!canVerifyKyc ? 'You need VERIFY_KYC permission.' : 'Reject KYC'}
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

      {/* KYC Detail Modal */}
      {selectedUserId && (
        <KycDetailModal
          userId={selectedUserId}
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) setSelectedUserId(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
