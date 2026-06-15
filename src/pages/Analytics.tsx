import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { analyticsService } from '@/services/analyticsService';
import {
  Refresh,
  Chart2,
  DocumentDownload,
  TrendUp,
  TrendDown,
  People,
  ArrowSwapHorizontal,
  DollarCircle,
} from 'iconsax-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';

type GroupBy = 'day' | 'week' | 'month';

export default function Analytics() {
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [dateRange, setDateRange] = useState('30'); // days

  const { data: txAnalytics, isLoading: txLoading, refetch: refetchTx, isFetching: fetchingTx } = useQuery({
    queryKey: queryKeys.analytics.transactions({ groupBy, dateRange }),
    queryFn: () => analyticsService.getTransactionAnalytics({ groupBy, dateRange }),
  });

  const { data: userAnalytics, isLoading: userLoading, refetch: refetchUser, isFetching: fetchingUser } = useQuery({
    queryKey: queryKeys.analytics.users({ groupBy, dateRange }),
    queryFn: () => analyticsService.getUserAnalytics({ groupBy, dateRange }),
  });

  const { data: revenueAnalytics, isLoading: revenueLoading, refetch: refetchRevenue, isFetching: fetchingRevenue } = useQuery({
    queryKey: queryKeys.analytics.revenue({ groupBy, dateRange }),
    queryFn: () => analyticsService.getRevenueAnalytics({ groupBy, dateRange }),
  });

  const { data: topUsers, isLoading: topLoading } = useQuery({
    queryKey: queryKeys.analytics.topUsers({ limit: 10 }),
    queryFn: () => analyticsService.getTopUsers({ limit: 10 }),
  });

  const isLoading = txLoading || userLoading || revenueLoading;
  const isFetching = fetchingTx || fetchingUser || fetchingRevenue;

  const refetchAll = () => {
    refetchTx();
    refetchUser();
    refetchRevenue();
  };

  // Parse analytics data safely
  const txData = txAnalytics as
    | {
        timeSeries?: Array<{
          period: string;
          transactionCount: number;
          completedCount: number;
          totalVolume: string;
          completedVolume: string;
        }>;
        total?: number;
        totalTransactions?: number;
        volume?: number;
        totalVolume?: number;
      }
    | undefined;
  const userData = userAnalytics as Record<string, unknown> | undefined;
  const revData = revenueAnalytics as Record<string, unknown> | undefined;
  const topList = Array.isArray(topUsers) ? topUsers : [];

  // Extract user analytics arrays
  const registrations = Array.isArray(userData?.registrations) 
    ? userData.registrations as Array<{ period: string; count: number }>
    : [];
  const byCountry = Array.isArray(userData?.byCountry)
    ? userData.byCountry as Array<{ country: string; count: number }>
    : [];
  const byVerification = Array.isArray(userData?.byVerification)
    ? userData.byVerification as Array<{ status: string; count: number }>
    : [];

  // Extract summary values
  const totalTransactions = Number(txData?.total ?? txData?.totalTransactions ?? 0);
  const totalVolume = Number(txData?.volume ?? txData?.totalVolume ?? 0);
  const totalUsers = registrations.reduce((sum, r) => sum + r.count, 0) || 
                     Number(userData?.total ?? userData?.totalUsers ?? 0);
  const newUsers = registrations.length > 0 
    ? registrations[registrations.length - 1]?.count || 0
    : Number(userData?.new ?? userData?.newUsers ?? 0);
  const totalRevenue = Number(revData?.total ?? revData?.totalRevenue ?? 0);

  const txTimeSeries =
    Array.isArray(txData?.timeSeries) && txData.timeSeries.length > 0
      ? txData.timeSeries.map((d) => ({
          period: d.period,
          transactions: d.transactionCount,
          completed: d.completedCount,
          volume: Number(d.totalVolume ?? 0),
        }))
      : [];

  const registrationSeries =
    registrations.length > 0
      ? registrations.map((r) => ({ period: r.period, users: r.count }))
      : [];

  const revenueSeries =
    Array.isArray(revData?.timeSeries) && revData.timeSeries.length > 0
      ? (revData.timeSeries as Array<{ period: string; revenue: string; expenses: string }>).map(
          (r) => ({
            period: r.period,
            revenue: Number(r.revenue ?? 0),
            expenses: Number(r.expenses ?? 0),
          }),
        )
      : [];

  const topUsersSeries = Array.isArray(topUsers)
    ? (topUsers as Array<{ email?: string | null; totalVolume?: string; transactionCount?: number }>).map(
        (u) => ({
          label: (u.email ?? '').split('@')[0] || 'User',
          volume: Number(u.totalVolume ?? 0),
          count: Number(u.transactionCount ?? 0),
        }),
      )
    : [];

  const txChartConfig: ChartConfig = {
    transactions: {
      label: 'Transactions',
      color: 'hsl(var(--chart-1))',
    },
    completed: {
      label: 'Completed',
      color: 'hsl(var(--chart-2))',
    },
  };

  const registrationsChartConfig: ChartConfig = {
    users: {
      label: 'New users',
      color: 'hsl(var(--chart-3))',
    },
  };

  const revenueChartConfig: ChartConfig = {
    revenue: {
      label: 'Revenue',
      color: 'hsl(var(--chart-4))',
    },
    expenses: {
      label: 'Expenses',
      color: 'hsl(var(--chart-5))',
    },
  };

  const topUsersChartConfig: ChartConfig = {
    volume: {
      label: 'Volume',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <DashboardLayout title="Analytics">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Group By Selector */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refetchAll}
            disabled={isFetching}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Refresh size={18} color="currentColor" className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-100 transition-colors">
            <DocumentDownload size={16} color="currentColor" />
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white min-h-[256px]">
          <TableLoader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Transactions */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ArrowSwapHorizontal size={20} color="currentColor" className="text-blue-600" />
                </div>
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <TrendUp size={14} color="currentColor" />
                  +12%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalTransactions.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total Transactions</p>
            </div>

            {/* Total Volume */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarCircle size={20} color="currentColor" className="text-green-600" />
                </div>
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <TrendUp size={14} color="currentColor" />
                  +8%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Volume</p>
            </div>

            {/* Total Users */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <People size={20} color="currentColor" className="text-purple-600" />
                </div>
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <TrendUp size={14} color="currentColor" />
                  +{newUsers}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total Users</p>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Chart2 size={20} color="currentColor" className="text-yellow-600" />
                </div>
                <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                  <TrendDown size={14} color="currentColor" />
                  -3%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
            </div>
          </div>

          {/* Detailed Analytics with charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Transaction Analytics chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <ArrowSwapHorizontal size={18} color="currentColor" className="text-blue-600" />
                Transaction Analytics
              </h3>
              {txTimeSeries.length === 0 ? (
                <TableEmpty message="No transaction data for this period." />
              ) : (
                <ChartContainer config={txChartConfig} className="h-64">
                  <LineChart data={txTimeSeries}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke="var(--color-transactions)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="var(--color-completed)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>

            {/* User registrations chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <People size={18} color="currentColor" className="text-purple-600" />
                User Analytics
              </h3>
              {registrationSeries.length === 0 ? (
                <TableEmpty message="No registration data for this period." />
              ) : (
                <ChartContainer config={registrationsChartConfig} className="h-64">
                  <LineChart data={registrationSeries}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="var(--color-users)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>

            {/* Revenue Analytics chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 lg:col-span-2">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <DollarCircle size={18} color="currentColor" className="text-green-600" />
                Revenue Analytics
              </h3>
              {revData?.message ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  {String(revData.message)}
                </div>
              ) : revenueSeries.length === 0 ? (
                <TableEmpty message="No revenue data for this period." />
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-64">
                  <LineChart data={revenueSeries}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="var(--color-expenses)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </div>
          </div>

          {/* Top Users */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <People size={18} color="currentColor" className="text-blue-600" />
                Top Users by Volume
              </h3>
              <span className="text-xs text-gray-500">Last {dateRange} days</span>
            </div>
            {topLoading ? (
              <TableLoader />
            ) : topUsersSeries.length === 0 ? (
              <TableEmpty message="No data available" />
            ) : (
              <ChartContainer config={topUsersChartConfig} className="h-64">
                <BarChart data={topUsersSeries}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="volume"
                    fill="var(--color-volume)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
