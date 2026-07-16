import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUsers, useUserStats, useExportUsers } from '@/hooks/useUsers';
import { useHasPermission } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { UserDetailModal } from '@/components/modals/UserDetailModal';
import { CreditBonusModal } from '@/components/modals/CreditBonusModal';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';
import {
  Filter,
  Add,
  RecordCircle,
  ArrowDown2,
  ShieldTick,
  ShieldCross,
  Clock,
  Refresh,
  SearchNormal1,
  DocumentDownload,
  Warning2,
  Gift,
} from 'iconsax-react';
import { toast } from 'sonner';
import type { UserStatus, KycStatus, UserFilters } from '@/types/user';

// =============================================================================
// Constants
// =============================================================================

const STATUS_TABS = [
  { key: 'all', label: 'All', status: undefined },
  { key: 'active', label: 'Active', status: 'ACTIVE' as UserStatus },
  { key: 'suspended', label: 'Suspended', status: 'SUSPENDED' as UserStatus },
  { key: 'banned', label: 'Banned', status: 'BANNED' as UserStatus },
];

const STATUS_COLORS: Record<UserStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700' },
  SUSPENDED: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  BANNED: { bg: 'bg-red-50', text: 'text-red-700' },
  DELETED: { bg: 'bg-gray-50', text: 'text-gray-700' },
};

const KYC_CONFIG: Record<KycStatus, { color: string; icon: React.ReactNode; label: string }> = {
  VERIFIED: { color: 'text-green-600', icon: <ShieldTick size="14" color="currentColor" variant="Bold" />, label: 'Verified' },
  PENDING: { color: 'text-yellow-600', icon: <Clock size="14" color="currentColor" variant="Bold" />, label: 'Pending' },
  NOT_STARTED: { color: 'text-gray-400', icon: <ShieldCross size="14" color="currentColor" variant="Bold" />, label: 'Not Started' },
  REJECTED: { color: 'text-red-600', icon: <Warning2 size="14" color="currentColor" variant="Bold" />, label: 'Rejected' },
  EXPIRED: { color: 'text-orange-600', icon: <Clock size="14" color="currentColor" variant="Bold" />, label: 'Expired' },
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// =============================================================================
// Users Page Component
// =============================================================================

export default function Users() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Row selection for bulk "credit bonus" (tracked by email — the identifier the
  // credit endpoint resolves; api_key isn't in the list data).
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  // Filter states
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const canExportUsers = useHasPermission('EXPORT_DATA');
  const canCreditBonus = useHasPermission('MANAGE_PLATFORM');

  // Build filters based on active tab and search
  const filters: UserFilters = {
    ...(activeTab !== 'all' && { status: STATUS_TABS.find(t => t.key === activeTab)?.status }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(kycFilter !== 'all' && { kycStatus: kycFilter as KycStatus }),
    ...(accountTypeFilter !== 'all' && { accountType: accountTypeFilter }),
    ...(countryFilter !== 'all' && { country: countryFilter }),
  };

  // Fetch users with React Query
  const {
    data: usersData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useUsers({ ...filters, page, limit: 20 });

  useEffect(() => {
    if (isError && error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    }
  }, [isError, error]);

  // Fetch stats
  const { data: stats } = useUserStats();

  // Export mutation
  const exportMutation = useExportUsers();

  const users = usersData?.data ?? [];
  const pagination = usersData?.pagination;

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  // ----- Row selection for bulk credit bonus -----
  const pageEmails = users.map((u) => u.email).filter(Boolean);
  const allPageSelected =
    pageEmails.length > 0 && pageEmails.every((e) => selectedEmails.has(e));

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };
  const toggleAllPage = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageEmails.forEach((e) => next.delete(e));
      else pageEmails.forEach((e) => next.add(e));
      return next;
    });
  };
  const clearSelection = () => setSelectedEmails(new Set());

  return (
    <DashboardLayout title="Users">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-6">
        <div className="flex gap-8">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`pb-3 text-sm font-medium relative ${
                activeTab === tab.key
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <SearchNormal1 size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
            />
          </div>

          {/* KYC Status Filter */}
          <select
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All KYC</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Account Type Filter */}
          <select
            value={accountTypeFilter}
            onChange={(e) => { setAccountTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Types</option>
            <option value="PERSONAL">Personal</option>
            <option value="BUSINESS">Business</option>
          </select>

          {/* Country Filter */}
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
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

        <div className="flex items-center gap-2">
          {canCreditBonus && selectedEmails.size > 0 && (
            <>
              <button
                onClick={() => setBonusModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-700 transition-colors"
              >
                <Gift size="16" color="currentColor" variant="Bold" />
                Credit bonus ({selectedEmails.size})
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Refresh size="16" color="currentColor" className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending || !canExportUsers}
            title={!canExportUsers ? 'You need EXPORT_DATA permission to export users.' : undefined}
            className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <DocumentDownload size="16" color="currentColor" />
            Export
          </button>
          <button
            disabled
            title="Coming soon – users register via the platform"
            className="px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded-full flex items-center gap-2 cursor-not-allowed"
          >
            <Add size="16" color="currentColor" />
            Add new user
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-8 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 border border-blue-500 rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" />
            </div>
            Total users
          </div>
          <div className="text-2xl font-bold">
            {stats?.total?.toLocaleString() ?? '-'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 border border-green-500 rounded-sm" />
            Active users
          </div>
          <div className="text-2xl font-bold">
            {stats?.active?.toLocaleString() ?? '-'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 border border-yellow-500 rounded-sm" />
            Pending KYC
          </div>
          <div className="text-2xl font-bold">
            {stats?.pendingKyc?.toLocaleString() ?? '-'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 border border-orange-500 rounded-sm" />
            Suspended
          </div>
          <div className="text-2xl font-bold">
            {stats?.suspended?.toLocaleString() ?? '-'}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-3 h-3 border border-red-500 rounded-sm" />
            Banned
          </div>
          <div className="text-2xl font-bold">
            {stats?.banned?.toLocaleString() ?? '-'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : users.length === 0 ? (
          <TableEmpty message="No users found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-medium tracking-wider border-b border-gray-100">
              <tr>
                {canCreditBonus && (
                  <th className="pl-6 pr-2 py-4 w-8">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllPage}
                      aria-label="Select all on page"
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Account Type</th>
                <th className="px-6 py-4">KYC</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Wallets</th>
                <th className="px-6 py-4">Total Balance</th>
                <th className="px-6 py-4">Date Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  {canCreditBonus && (
                    <td className="pl-6 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(user.email)}
                        onChange={() => toggleEmail(user.email)}
                        aria-label={`Select ${user.email}`}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full ${getAvatarColor(
                          user.fullName
                        )} flex items-center justify-center text-white text-sm font-medium`}
                      >
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.fullName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {user.accountType === 'PERSONAL' ? 'Individual' : 'Business'}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center gap-1 text-xs font-medium ${
                        KYC_CONFIG[user.kycStatus]?.color ?? 'text-gray-400'
                      }`}
                    >
                      {KYC_CONFIG[user.kycStatus]?.label ?? user.kycStatus}
                      {KYC_CONFIG[user.kycStatus]?.icon}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {formatDate(user.lastActivity)}
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[user.status]?.bg ?? 'bg-gray-50'
                      } ${STATUS_COLORS[user.status]?.text ?? 'text-gray-700'}`}
                    >
                      {user.status}
                      <ArrowDown2 size="10" color="currentColor" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {user.walletCount}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatCurrency(user.totalBalance)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                      <RecordCircle size="16" color="currentColor" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing {(page - 1) * pagination.limit + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => {
            if (!open) setSelectedUserId(null);
          }}
        />
      )}

      {/* Bulk credit-bonus modal */}
      <CreditBonusModal
        emails={Array.from(selectedEmails)}
        open={bonusModalOpen}
        onOpenChange={setBonusModalOpen}
        onCredited={clearSelection}
      />
    </DashboardLayout>
  );
}
