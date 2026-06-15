import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDashboardOverview, useDashboardPending } from '@/hooks/useDashboard';
import { usePlatformStats, usePlatformBalance, usePlatformRevenue } from '@/hooks/usePlatform';
import {
  Refresh,
  People,
  ArrowSwapHorizontal,
  WalletMoney,
  ShieldTick,
  Warning2,
  TrendUp,
  TrendDown,
  Bitcoin,
  Ethereum,
  ArrowRight2,
} from 'iconsax-react';
import { Link } from 'wouter';
import { useAppSelector } from '@/store';
import { selectPermissions } from '@/store/slices/authSlice';
import type { Permission } from '@/types/auth';

// =============================================================================
// Helper Functions
// =============================================================================

const formatCurrency = (amount: string | number, decimals = 2) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatNaira = (amount: string | number, decimals = 2) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const formatCompact = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
};

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
}

const StatCard = ({ title, value, icon, iconBg, trend, subtitle }: StatCardProps) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend.isPositive ? <TrendUp size="14" color="currentColor" /> : <TrendDown size="14" color="currentColor" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-500">{title}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
  </div>
);

// =============================================================================
// Balance Card Component
// =============================================================================

interface BalanceCardProps {
  title: string;
  totalUsd: string;
  balances: Array<{
    currency: string;
    amount: string;
    amountUsd: string;
  }>;
  icon: React.ReactNode;
  iconBg: string;
}

const BalanceCard = ({ title, totalUsd, balances, icon, iconBg }: BalanceCardProps) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-xl font-bold text-gray-900">{formatNaira(totalUsd)}</div>
      </div>
    </div>
    <div className="space-y-2">
      {balances.slice(0, 4).map((balance) => (
        <div key={balance.currency} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
              {balance.currency.slice(0, 2)}
            </div>
            <span className="text-gray-600">{balance.currency}</span>
          </div>
          <div className="text-right">
            <div className="font-medium text-gray-900">{balance.amount}</div>
            <div className="text-xs text-gray-400">{formatNaira(balance.amountUsd)}</div>
          </div>
        </div>
      ))}
      {balances.length > 4 && (
        <div className="text-xs text-blue-600 font-medium pt-2">
          +{balances.length - 4} more currencies
        </div>
      )}
    </div>
  </div>
);

// =============================================================================
// Revenue Breakdown Component
// =============================================================================

interface RevenueBreakdownProps {
  breakdown: Array<{
    category: string;
    amount: string;
    amountUsd: string;
    percentage: number;
  }>;
}

const RevenueBreakdown = ({ breakdown }: RevenueBreakdownProps) => {
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

  return (
    <div className="space-y-3">
      {breakdown.map((item, index) => (
        <div key={item.category}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">{item.category}</span>
            <span className="font-medium text-gray-900">{formatNaira(item.amountUsd)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[index % colors.length]} rounded-full`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// Quick Action Component
// =============================================================================

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
  countColor?: string;
}

const QuickAction = ({ title, description, icon, href, count, countColor = 'bg-blue-100 text-blue-600' }: QuickActionProps) => (
  <Link href={href}>
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      {count !== undefined && count > 0 && (
        <div className={`px-2.5 py-1 ${countColor} rounded-full text-xs font-medium`}>
          {count}
        </div>
      )}
      <ArrowRight2 size="16" color="currentColor" className="text-gray-400" />
    </div>
  </Link>
);

// =============================================================================
// Dashboard Page Component
// =============================================================================

type CombinedStats = {
  totalUsers?: number;
  activeUsers?: number;
  totalTransactions?: number;
  transactionVolumeUsd?: string;
  pendingKyc?: number;
  flaggedTransactions?: number;
};

export default function Dashboard() {
  const userPermissions = useAppSelector(selectPermissions);
  const canManagePlatform = userPermissions.includes('MANAGE_PLATFORM' as Permission);

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useDashboardOverview();
  const { data: pending } = useDashboardPending();
  const { data: platformStats, refetch: refetchPlatformStats } = usePlatformStats();
  const { data: platformBalance, isLoading: balanceLoading } = usePlatformBalance(canManagePlatform);
  const { data: platformRevenue, isLoading: revenueLoading } = usePlatformRevenue({ period: 'month' }, canManagePlatform);

  const statsFromOverview = overview?.users && overview?.transactions && overview?.kyc
    ? {
        totalUsers: overview.users.total,
        activeUsers: overview.users.active,
        totalTransactions: overview.transactions.total,
        transactionVolumeUsd: overview.transactions.totalFiatVolume ?? '0',
        pendingKyc: overview.kyc.pending,
        flaggedTransactions: overview.transactions.flagged,
      }
    : null;
  const stats = (statsFromOverview ?? platformStats ?? {}) as CombinedStats;
  const pendingKyc = pending?.pendingKyc ?? stats.pendingKyc ?? 0;
  const flaggedTx = pending?.flaggedTransactions ?? stats.flaggedTransactions ?? 0;
  const pendingTx = pending?.pendingTransactions ?? 0;

  const isLoading = overviewLoading || balanceLoading || revenueLoading;

  const refetchAll = () => {
    refetchOverview();
    refetchPlatformStats();
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
            <p className="text-sm text-gray-500">Welcome back! Here's what's happening.</p>
          </div>
          <button
            onClick={() => refetchAll()}
            disabled={isLoading}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Refresh size="18" color="currentColor" className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={formatNumber(stats.totalUsers ?? 0)}
            icon={<People size="20" color="currentColor" className="text-blue-600" />}
            iconBg="bg-blue-100"
            trend={platformStats?.trends?.users}
            subtitle={`${formatNumber(stats.activeUsers ?? 0)} active`}
          />
          <StatCard
            title="Transactions"
            value={formatNumber(stats.totalTransactions ?? 0)}
            icon={<ArrowSwapHorizontal size="20" color="currentColor" className="text-green-600" />}
            iconBg="bg-green-100"
            trend={platformStats?.trends?.transactions}
            subtitle={formatCurrency(stats.transactionVolumeUsd ?? '0')}
          />
          <StatCard
            title="Pending KYC"
            value={formatNumber(pendingKyc)}
            icon={<ShieldTick size="20" color="currentColor" className="text-yellow-600" />}
            iconBg="bg-yellow-100"
            subtitle="Requires verification"
          />
          <StatCard
            title="Flagged Transactions"
            value={formatNumber(flaggedTx)}
            icon={<Warning2 size="20" color="currentColor" className="text-red-600" />}
            iconBg="bg-red-100"
            subtitle="Needs review"
          />
        </div>

        {/* Wallets & Revenue Section (platform-level, gated by MANAGE_PLATFORM permission) */}
        {canManagePlatform && (
        <div className="grid grid-cols-3 gap-6">
          {/* Fee Wallet */}
          {platformBalance?.feeWallet && (
            <BalanceCard
              title="Fee Wallet"
              totalUsd={platformBalance.feeWallet.totalUsd}
              balances={platformBalance.feeWallet.balances}
              icon={<WalletMoney size="18" color="currentColor" className="text-green-600" />}
              iconBg="bg-green-100"
            />
          )}

          {/* Hot Wallet */}
          {platformBalance?.hotWallet && (
            <BalanceCard
              title="Hot Wallet"
              totalUsd={platformBalance.hotWallet.totalUsd}
              balances={platformBalance.hotWallet.balances}
              icon={<Bitcoin size="18" color="currentColor" className="text-orange-600" />}
              iconBg="bg-orange-100"
            />
          )}

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-gray-500">Monthly Revenue</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatNaira(platformRevenue?.totalRevenueUsd ?? '0')}
                </div>
              </div>
              {platformStats?.trends?.revenue && (
                <div className={`text-xs font-medium flex items-center gap-1 ${
                  platformStats.trends.revenue.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {platformStats.trends.revenue.isPositive ? <TrendUp size="12" color="currentColor" /> : <TrendDown size="12" color="currentColor" />}
                  {platformStats.trends.revenue.isPositive ? '+' : ''}{platformStats.trends.revenue.value}%
                </div>
              )}
            </div>
            {platformRevenue?.breakdown && (
              <RevenueBreakdown breakdown={platformRevenue.breakdown} />
            )}
          </div>
        </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickAction
              title="Review KYC Applications"
              description="Verify pending user identities"
              icon={<ShieldTick size="18" color="currentColor" />}
              href="/kyc"
              count={pendingKyc}
              countColor="bg-yellow-100 text-yellow-600"
            />
            <QuickAction
              title="Flagged Transactions"
              description="Review suspicious activities"
              icon={<Warning2 size="18" color="currentColor" />}
              href="/transactions?status=flagged"
              count={flaggedTx}
              countColor="bg-red-100 text-red-600"
            />
            <QuickAction
              title="Pending Transactions"
              description="Approve or reject pending transactions"
              icon={<ArrowSwapHorizontal size="18" color="currentColor" />}
              href="/transactions?status=pending"
              count={pendingTx}
              countColor="bg-blue-100 text-blue-600"
            />
            <QuickAction
              title="Manage Team"
              description="View and manage admin users"
              icon={<People size="18" color="currentColor" />}
              href="/manage-team"
            />
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Active Users
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCompact(stats.activeUsers ?? 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Verified KYC
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCompact(overview?.kyc?.verified ?? 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Completed TX
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCompact(overview?.transactions?.completed ?? 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              Suspended Users
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCompact(overview?.users?.suspended ?? 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Pending TX
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCompact(pendingTx)}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
            <Refresh color="currentColor" className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
