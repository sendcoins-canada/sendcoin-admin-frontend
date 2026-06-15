import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser, useUserKyc, useUserActivity, useUserWallets, useSuspendUser, useUnsuspendUser } from '@/hooks/useUsers';
import { useHasPermission } from '@/hooks/useAuth';
import {
  Refresh,
  ShieldTick,
  ShieldCross,
  Clock,
  Warning2,
  User as UserIcon,
  Sms,
  Call,
  Location,
  Calendar,
  Wallet,
  Card,
  UserRemove,
  UserTick,
  Copy,
  TickCircle,
  Login,
  Logout,
  ArrowSwapHorizontal,
  DocumentText,
  Setting2,
  Monitor,
} from 'iconsax-react';
import type { UserActivity, UserWallet } from '@/types/user';
import type { UserStatus, KycStatus } from '@/types/user';

// =============================================================================
// Types
// =============================================================================

interface UserDetailModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<UserStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700' },
  SUSPENDED: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  BANNED: { bg: 'bg-red-50', text: 'text-red-700' },
  DELETED: { bg: 'bg-gray-50', text: 'text-gray-700' },
};

const KYC_CONFIG: Record<KycStatus, { color: string; icon: React.ReactNode; label: string }> = {
  VERIFIED: { color: 'text-green-600', icon: <ShieldTick size="16" color="currentColor" variant="Bold" />, label: 'Verified' },
  PENDING: { color: 'text-yellow-600', icon: <Clock size="16" color="currentColor" variant="Bold" />, label: 'Pending' },
  NOT_STARTED: { color: 'text-gray-400', icon: <ShieldCross size="16" color="currentColor" variant="Bold" />, label: 'Not Started' },
  REJECTED: { color: 'text-red-600', icon: <Warning2 size="16" color="currentColor" variant="Bold" />, label: 'Rejected' },
  EXPIRED: { color: 'text-orange-600', icon: <Clock size="16" color="currentColor" variant="Bold" />, label: 'Expired' },
};

const ACTIVITY_TYPE_CONFIG: Record<UserActivity['type'], { icon: React.ReactNode; color: string }> = {
  LOGIN: { icon: <Login size="14" color="currentColor" />, color: 'text-green-600 bg-green-100' },
  LOGOUT: { icon: <Logout size="14" color="currentColor" />, color: 'text-gray-600 bg-gray-100' },
  TRANSACTION: { icon: <ArrowSwapHorizontal size="14" color="currentColor" />, color: 'text-blue-600 bg-blue-100' },
  KYC_UPDATE: { icon: <DocumentText size="14" color="currentColor" />, color: 'text-purple-600 bg-purple-100' },
  PROFILE_UPDATE: { icon: <UserIcon size="14" color="currentColor" />, color: 'text-orange-600 bg-orange-100' },
  WALLET_ACTION: { icon: <Wallet size="14" color="currentColor" />, color: 'text-yellow-600 bg-yellow-100' },
  SECURITY: { icon: <ShieldTick size="14" color="currentColor" />, color: 'text-red-600 bg-red-100' },
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const getInitials = (firstName?: string, lastName?: string) => {
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

const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// =============================================================================
// Info Row Component
// =============================================================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
}

const InfoRow = ({ icon, label, value, copyable }: InfoRowProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof value === 'string') {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm text-gray-900 font-medium">{value || 'N/A'}</div>
      </div>
      {copyable && typeof value === 'string' && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          {copied ? <TickCircle size="14" color="currentColor" className="text-green-600" /> : <Copy size="14" color="currentColor" />}
        </button>
      )}
    </div>
  );
};

// =============================================================================
// User Detail Modal Component
// =============================================================================

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'kyc' | 'wallets' | 'activity'>('info');
  const [activityPage, setActivityPage] = useState(1);

  // Fetch user data
  const { data: user, isLoading, refetch } = useUser(userId);
  const { data: kycData } = useUserKyc(userId);
  const { data: userWalletsRaw, isLoading: walletsLoading } = useUserWallets(userId);
  const { data: activityData, isLoading: activityLoading } = useUserActivity(userId, {
    page: activityPage,
    limit: 10,
  });

  // Map backend wallets to UserWallet shape (getWalletsByUser returns array of { crypto, walletId, walletAddress, cryptoBalance, fiatBalance, frozen, network })
  const walletsList = ((): UserWallet[] => {
    const raw = userWalletsRaw;
    if (!raw) return user?.wallets ?? [];
    const list = Array.isArray(raw) ? raw : (raw as { wallets?: unknown[] })?.wallets;
    if (!Array.isArray(list)) return user?.wallets ?? [];
    return list.map((w: Record<string, unknown>) => ({
      id: String(w.walletId ?? w.walletAddress ?? w.id ?? ''),
      currency: (w.crypto as string) ?? '—',
      network: (w.network as string) ?? '—',
      address: (w.walletAddress as string) ?? (w.address as string) ?? '',
      balance: parseFloat((w.cryptoBalance as string) ?? '0') || 0,
      balanceUsd: parseFloat((w.fiatBalance as string) ?? '0') || 0,
      isFrozen: (w.frozen as boolean) ?? false,
    }));
  })();

  // Mutations
  const suspendMutation = useSuspendUser();
  const unsuspendMutation = useUnsuspendUser();
  const canSuspendUser = useHasPermission('SUSPEND_USERS');

  const handleSuspend = () => {
    const reason = prompt('Enter reason for suspension:');
    if (reason) {
      suspendMutation.mutate({ id: userId, reason });
    }
  };

  const handleUnsuspend = () => {
    unsuspendMutation.mutate(userId);
  };

  const tabs = [
    { key: 'info', label: 'Info' },
    { key: 'kyc', label: 'KYC' },
    { key: 'wallets', label: 'Wallets' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Refresh className="animate-spin text-blue-600"  size="32" color="currentColor" />
          </div>
        ) : user ? (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-xl ${getAvatarColor(
                    user.fullName
                  )} flex items-center justify-center text-white text-xl font-bold`}
                >
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl">{user.fullName}</DialogTitle>
                  <div className="text-sm text-gray-500 mt-1">{user.email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[user.status]?.bg ?? 'bg-gray-50'
                      } ${STATUS_COLORS[user.status]?.text ?? 'text-gray-700'}`}
                    >
                      {user.status}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        KYC_CONFIG[user.kycStatus]?.color ?? 'text-gray-400'
                      }`}
                    >
                      {KYC_CONFIG[user.kycStatus]?.icon}
                      {KYC_CONFIG[user.kycStatus]?.label ?? user.kycStatus}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Refresh size="18" color="currentColor" />
                  </button>
                  {user.status === 'ACTIVE' ? (
                    <button
                      onClick={handleSuspend}
                      disabled={suspendMutation.isPending || !canSuspendUser}
                      title={!canSuspendUser ? 'You need SUSPEND_USERS permission.' : undefined}
                      className="px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-yellow-100 disabled:opacity-50"
                    >
                      <UserRemove size="16" color="currentColor" />
                      Suspend
                    </button>
                  ) : user.status === 'SUSPENDED' ? (
                    <button
                      onClick={handleUnsuspend}
                      disabled={unsuspendMutation.isPending || !canSuspendUser}
                      title={!canSuspendUser ? 'You need SUSPEND_USERS permission.' : undefined}
                      className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-green-100 disabled:opacity-50"
                    >
                      <UserTick size="16" color="currentColor" />
                      Activate
                    </button>
                  ) : null}
                </div>
              </div>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h3>
                    <InfoRow
                      icon={<UserIcon size="16" color="currentColor" />}
                      label="User ID"
                      value={user.id}
                      copyable
                    />
                    <InfoRow
                      icon={<Sms size="16" color="currentColor" />}
                      label="Email"
                      value={user.email}
                      copyable
                    />
                    <InfoRow
                      icon={<Call size="16" color="currentColor" />}
                      label="Phone"
                      value={user.phone}
                      copyable
                    />
                    <InfoRow
                      icon={<Location size="16" color="currentColor" />}
                      label="Country"
                      value={user.country}
                    />
                    <InfoRow
                      icon={<Calendar size="16" color="currentColor" />}
                      label="Date Joined"
                      value={formatDate(user.createdAt)}
                    />
                  </div>

                  {/* Account Info */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Account Information</h3>
                    <InfoRow
                      icon={<Wallet size="16" color="currentColor" />}
                      label="Account Type"
                      value={user.accountType === 'PERSONAL' ? 'Individual' : 'Business'}
                    />
                    <InfoRow
                      icon={<Wallet size="16" color="currentColor" />}
                      label="Wallets"
                      value={walletsList.length > 0 ? walletsList.length : (user.walletCount ?? 'N/A')}
                    />
                    <InfoRow
                      icon={<Card size="16" color="currentColor" />}
                      label="Total Balance"
                      value={formatCurrency(
                        walletsList.length > 0
                          ? walletsList.reduce((sum, w) => sum + (typeof w.balanceUsd === 'number' ? w.balanceUsd : 0), 0)
                          : (user.totalBalance ?? 0)
                      )}
                    />
                    <InfoRow
                      icon={<Clock size="16" color="currentColor" />}
                      label="Last Activity"
                      value={formatDateTime(user.lastActivity)}
                    />
                    <InfoRow
                      icon={<Card size="16" color="currentColor" />}
                      label="Transactions"
                      value={user.transactionCount}
                    />
                  </div>

                  {/* Security Info */}
                  <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Security</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Email Verified</div>
                        <div className="flex items-center gap-2 mt-1">
                          {user.emailVerified ? (
                            <>
                              <TickCircle size="16" color="currentColor" className="text-green-600" />
                              <span className="text-sm font-medium text-green-700">Verified</span>
                            </>
                          ) : (
                            <>
                              <Warning2 size="16" color="currentColor" className="text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700">Not Verified</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">Phone Verified</div>
                        <div className="flex items-center gap-2 mt-1">
                          {user.phoneVerified ? (
                            <>
                              <TickCircle size="16" color="currentColor" className="text-green-600" />
                              <span className="text-sm font-medium text-green-700">Verified</span>
                            </>
                          ) : (
                            <>
                              <Warning2 size="16" color="currentColor" className="text-yellow-600" />
                              <span className="text-sm font-medium text-yellow-700">Not Verified</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500">2FA Enabled</div>
                        <div className="flex items-center gap-2 mt-1">
                          {user.mfaEnabled ? (
                            <>
                              <ShieldTick size="16" color="currentColor" className="text-green-600" />
                              <span className="text-sm font-medium text-green-700">Enabled</span>
                            </>
                          ) : (
                            <>
                              <ShieldCross size="16" color="currentColor" className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-500">Disabled</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'kyc' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">KYC Status</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {user.kycSubmittedAt
                          ? `Submitted on ${formatDate(user.kycSubmittedAt)}`
                          : 'No KYC submission yet'}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        KYC_CONFIG[user.kycStatus]?.color ?? 'text-gray-400'
                      } bg-gray-50`}
                    >
                      {KYC_CONFIG[user.kycStatus]?.icon}
                      {KYC_CONFIG[user.kycStatus]?.label ?? user.kycStatus}
                    </span>
                  </div>

                  {user.kycRejectionReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <div className="text-sm font-medium text-red-700 mb-1">Rejection Reason</div>
                      <div className="text-sm text-red-600">{user.kycRejectionReason}</div>
                    </div>
                  )}

                  {/* KYC Documents would be shown here */}
                  {kycData && kycData.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Documents</h4>
                      {kycData.map((doc: { id: string; type: string; status: string; uploadedAt: string }) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.type}</div>
                            <div className="text-xs text-gray-500">
                              Uploaded: {formatDate(doc.uploadedAt)}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              doc.status === 'APPROVED'
                                ? 'bg-green-100 text-green-700'
                                : doc.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No KYC documents available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wallets' && (
                <div className="space-y-3">
                  {walletsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Refresh className="animate-spin text-blue-600"  size="24" color="currentColor" />
                    </div>
                  ) : walletsList.length > 0 ? (
                    walletsList.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {(wallet.currency || '—').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {wallet.currency} ({wallet.network})
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {wallet.address
                                ? `${wallet.address.slice(0, 10)}...${wallet.address.slice(-8)}`
                                : '—'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {typeof wallet.balance === 'number' ? wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 8 }) : wallet.balance}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(typeof wallet.balanceUsd === 'number' ? wallet.balanceUsd : 0)}
                          </div>
                        </div>
                        {wallet.isFrozen && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            Frozen
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No wallets found</div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Refresh className="animate-spin text-blue-600"  size="24" color="currentColor" />
                    </div>
                  ) : activityData?.data && activityData.data.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {activityData.data.map((activity) => {
                          const config = ACTIVITY_TYPE_CONFIG[activity.type] ?? {
                            icon: <Clock size="14" color="currentColor" />,
                            color: 'text-gray-600 bg-gray-100',
                          };
                          return (
                            <div
                              key={activity.id}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
                              >
                                {config.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {activity.action}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {formatRelativeTime(activity.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {activity.description}
                                </p>
                                {activity.ip && (
                                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Monitor size="10" color="currentColor" />
                                      IP: {activity.ip}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Activity Pagination */}
                      {activityData.pagination && activityData.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            Page {activityPage} of {activityData.pagination.totalPages}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                              disabled={activityPage === 1}
                              className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() =>
                                setActivityPage((p) =>
                                  Math.min(activityData.pagination.totalPages, p + 1)
                                )
                              }
                              disabled={activityPage === activityData.pagination.totalPages}
                              className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No activity recorded yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UserDetailModal;
