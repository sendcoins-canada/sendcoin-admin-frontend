import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuditLogs, useExportAuditLogs } from '@/hooks/useAuditLogs';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Filter,
  Refresh,
  SearchNormal1,
  DocumentDownload,
  Eye,
  User,
  Setting2,
  Shield,
  Wallet,
  ArrowSwapHorizontal,
  Timer,
} from 'iconsax-react';
import { toast } from 'sonner';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';

// =============================================================================
// Types
// =============================================================================

interface AuditLogFilters {
  search?: string;
  action?: string;
  resourceType?: string;
  adminId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// =============================================================================
// Constants
// =============================================================================

const RESOURCE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  USER: { icon: <User size="14" color="currentColor" />, color: 'text-blue-600 bg-blue-100', label: 'User' },
  TRANSACTION: { icon: <ArrowSwapHorizontal size="14" color="currentColor" />, color: 'text-green-600 bg-green-100', label: 'Transaction' },
  ADMIN: { icon: <Shield size="14" color="currentColor" />, color: 'text-purple-600 bg-purple-100', label: 'Admin' },
  WALLET: { icon: <Wallet size="14" color="currentColor" />, color: 'text-orange-600 bg-orange-100', label: 'Wallet' },
  SETTINGS: { icon: <Setting2 size="14" color="currentColor" />, color: 'text-gray-600 bg-gray-100', label: 'Settings' },
  ROLE: { icon: <Shield size="14" color="currentColor" />, color: 'text-indigo-600 bg-indigo-100', label: 'Role' },
};

const ACTION_TABS = [
  { key: 'all', label: 'All Actions', action: undefined },
  { key: 'create', label: 'Create', action: 'CREATE' },
  { key: 'update', label: 'Update', action: 'UPDATE' },
  { key: 'delete', label: 'Delete', action: 'DELETE' },
  { key: 'view', label: 'View', action: 'VIEW' },
];

// =============================================================================
// Helper Functions
// =============================================================================

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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

const getActionColor = (action: string) => {
  switch (action.toUpperCase()) {
    case 'CREATE':
      return 'bg-green-100 text-green-700';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-700';
    case 'DELETE':
      return 'bg-red-100 text-red-700';
    case 'VIEW':
      return 'bg-gray-100 text-gray-700';
    case 'LOGIN':
      return 'bg-purple-100 text-purple-700';
    case 'LOGOUT':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

// =============================================================================
// Audit Logs Page Component
// =============================================================================

export default function AuditLogs({ embedded }: { embedded?: boolean }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  // Filter states
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');

  // Build filters based on active tab and search
  const filters: AuditLogFilters = {
    ...(activeTab !== 'all' && { action: ACTION_TABS.find((t) => t.key === activeTab)?.action }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(resourceTypeFilter !== 'all' && { resourceType: resourceTypeFilter }),
  };

  // Fetch audit logs with React Query
  const {
    data: logsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAuditLogs({ ...filters, page, limit: 20 });

  useEffect(() => {
    if (isError && error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load audit logs');
    }
  }, [isError, error]);

  // Export mutation
  const exportMutation = useExportAuditLogs();

  const logs = logsData?.data ?? [];
  const pagination = logsData?.pagination;

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  const body = (
    <>
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-6">
        <div className="flex gap-8">
          {ACTION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`pb-3 text-sm font-medium relative ${
                activeTab === tab.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <SearchNormal1
              size="16"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
            />
          </div>

          {/* Resource Type Filter */}
          <select
            value={resourceTypeFilter}
            onChange={(e) => { setResourceTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Resources</option>
            <option value="USER">User</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="ADMIN">Admin</option>
            <option value="WALLET">Wallet</option>
            <option value="SETTINGS">Settings</option>
            <option value="ROLE">Role</option>
            <option value="KYC">KYC</option>
            <option value="CONVERSION">Conversion</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Refresh size="16" color="currentColor" className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600 flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <DocumentDownload size="16" color="currentColor" />
            Export
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white min-h-[256px]">
        {isLoading ? (
          <TableLoader />
        ) : logs.length === 0 ? (
          <TableEmpty
            message={filters.action || filters.search || filters.resourceType ? 'No audit logs match your filters.' : 'No audit logs found.'}
            action={
              filters.action || filters.search || filters.resourceType ? (
                <button
                  type="button"
                  onClick={() => { setActiveTab('all'); setSearchQuery(''); setResourceTypeFilter('all'); setPage(1); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const resourceConfig =
                RESOURCE_TYPE_CONFIG[log.resourceType] ?? RESOURCE_TYPE_CONFIG.SETTINGS;

              return (
                <div
                  key={log.id}
                  className={`p-4 hover:bg-gray-50/50 transition-colors ${
                    selectedLog === log.id ? 'bg-blue-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${resourceConfig.color}`}
                    >
                      {resourceConfig.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{log.adminName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-500">
                          {resourceConfig.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {log.action.toLowerCase()}d {log.resourceType.toLowerCase()}{' '}
                        <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {log.resourceId.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Timer size="12" color="currentColor" />
                          {formatRelativeTime(log.createdAt)}
                        </div>
                        <span>{log.ip}</span>
                        <span className="truncate max-w-[200px]">{log.adminEmail}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                      <button
                        onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                      >
                        <Eye size="16" color="currentColor" />
                      </button>
                    </div>
                  </div>

                  {/* Details (expanded) */}
                  {selectedLog === log.id && log.details && (
                    <div className="mt-4 ml-14 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 mb-2">Details</div>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
            <div>
              Showing {(page - 1) * pagination.limit + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} logs
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
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
  return embedded ? body : <DashboardLayout title="Audit Logs">{body}</DashboardLayout>;
}
