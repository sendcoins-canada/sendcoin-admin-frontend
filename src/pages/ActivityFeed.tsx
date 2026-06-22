import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  User,
  ArrowSwapHorizontal,
  ShieldTick,
  Setting2,
  SearchNormal1,
  Refresh,
  Activity as ActivityIcon,
} from 'iconsax-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useDebounce } from '@/hooks/useDebounce';
import { useActivity } from '@/hooks/useActivity';
import type { ActivityItem, ActivityKind } from '@/types/activity';

// Tabs map a UI label to the backend `kind` filter value.
const TABS: { key: string; label: string; kind?: ActivityKind }[] = [
  { key: 'all', label: 'All' },
  { key: 'signups', label: 'Signups', kind: 'SIGNUP' },
  { key: 'transactions', label: 'Transactions', kind: 'TRANSACTION' },
  { key: 'kyc', label: 'KYC', kind: 'KYC' },
  { key: 'admin', label: 'Admin actions', kind: 'ADMIN_ACTION' },
];

// Per-kind visual treatment (icon + accent colors).
const KIND_CONFIG: Record<
  ActivityKind,
  { Icon: typeof User; label: string; bg: string; fg: string }
> = {
  SIGNUP: { Icon: User, label: 'Signup', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  TRANSACTION: { Icon: ArrowSwapHorizontal, label: 'Transaction', bg: 'bg-blue-50', fg: 'text-blue-600' },
  KYC: { Icon: ShieldTick, label: 'KYC', bg: 'bg-amber-50', fg: 'text-amber-600' },
  ADMIN_ACTION: { Icon: Setting2, label: 'Admin', bg: 'bg-purple-50', fg: 'text-purple-600' },
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  verified: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-700',
};

const formatRelativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const [, navigate] = useLocation();
  const cfg = KIND_CONFIG[item.kind];
  const Icon = cfg.Icon;
  const statusClass = item.status
    ? STATUS_COLORS[item.status.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
    : '';

  return (
    <div
      className={`flex gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${item.link ? 'cursor-pointer' : ''}`}
      onClick={() => item.link && navigate(item.link)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
        <Icon size="20" variant="Bold" color="currentColor" className={cfg.fg} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{item.title}</span>
          {item.status && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusClass}`}>
              {item.status}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{item.description}</p>
        {item.actor && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.actor}</p>}
      </div>

      <div className="text-right shrink-0">
        {item.amount && (
          <div className="text-sm font-semibold text-gray-900">{item.amount.display}</div>
        )}
        <div className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(item.timestamp)}</div>
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = useMemo(() => {
    const kind = TABS.find((t) => t.key === activeTab)?.kind;
    return {
      ...(kind && { kind }),
      ...(debouncedSearch && { search: debouncedSearch }),
    };
  }, [activeTab, debouncedSearch]);

  const { data, isLoading, isFetching, isError, error, refetch } = useActivity({
    ...filters,
    page,
    limit: 20,
  });

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  const handleTab = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  return (
    <DashboardLayout title="Activity Feed">
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 bg-gray-50 p-1 rounded-full">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTab(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchNormal1 size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search activity"
                className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-100 outline-none w-56"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors"
              title="Refresh"
            >
              <Refresh size="18" color="currentColor" className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading activity…</div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500 text-sm">
              {(error as Error)?.message || 'Failed to load activity'}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
              <ActivityIcon size="32" color="currentColor" />
              <span className="text-sm">No activity found</span>
            </div>
          ) : (
            items.map((item) => <ActivityRow key={item.id} item={item} />)
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNext}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
