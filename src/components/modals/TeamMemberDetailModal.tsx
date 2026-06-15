import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRoles } from '@/hooks/useTeam';
import { useAdminAuditLogs } from '@/hooks/useAuditLogs';
import { useUpdateMember } from '@/hooks/useTeam';
import type { TeamMember, Role } from '@/types/team';
import {
  Refresh,
  ShieldTick,
  Sms,
  Calendar,
  Profile2User,
  DocumentText,
  ArrowSwapHorizontal,
} from 'iconsax-react';
import { toast } from 'sonner';

interface TeamMemberDetailModalProps {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

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

export function TeamMemberDetailModal({
  member,
  open,
  onOpenChange,
  onUpdated,
}: TeamMemberDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'permissions'>('overview');
  const [logsPage, setLogsPage] = useState(1);

  const { data: rolesData } = useRoles();
  const roles: Role[] = Array.isArray(rolesData)
    ? rolesData
    : ((rolesData as { data?: Role[] })?.data ?? []);
  const currentRole = roles.find((r) => r.id === member.roleId);

  const { data: logsData, isLoading: logsLoading } = useAdminAuditLogs(member.id, {
    page: logsPage,
    limit: 10,
  });
  const logs = logsData?.data ?? [];
  const pagination = logsData?.pagination;

  const updateMember = useUpdateMember();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;
    const newRoleId = Number(value);
    if (!newRoleId || newRoleId === member.roleId) return;
    updateMember.mutate(
      { id: member.id, data: { roleId: newRoleId } },
      {
        onSuccess: () => {
          toast.success('Role updated for admin');
          onUpdated?.();
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to update role');
        },
      },
    );
  };

  const content = (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      {/* Header */}
      <DialogHeader className="border-b border-gray-100 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-semibold">
            {(member.fullName || member.email)[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1">
            <DialogTitle className="text-lg">{member.fullName}</DialogTitle>
            <div className="text-sm text-gray-500">{member.email}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              {currentRole && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  <Profile2User size={14} color="currentColor" />
                  {currentRole.name}
                </span>
              )}
              {member.departmentName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">
                  {member.departmentName}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {member.status}
              </span>
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 pt-3 border-b border-gray-100">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'activity', label: 'Activity' },
          { key: 'permissions', label: 'Permissions' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`pb-2 text-xs font-medium border-b-2 ${
              activeTab === tab.key ? 'border-blue-600 text-gray-900' : 'border-transparent text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase">Profile</div>
              <div className="flex items-center gap-2 text-gray-700">
                <Sms size={16} color="currentColor" className="text-gray-400" />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={16} color="currentColor" className="text-gray-400" />
                <span>Joined {formatDateTime(member.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <ShieldTick size={16} color="currentColor" className={member.mfaEnabled ? 'text-green-600' : 'text-gray-400'} />
                <span>{member.mfaEnabled ? 'MFA enabled' : 'MFA not enabled'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase">Last Activity</div>
              <div className="flex items-center gap-2 text-gray-700">
                <DocumentText size={16} color="currentColor" className="text-gray-400" />
                <span>Last active: {member.lastActive ? formatDateTime(member.lastActive) : 'Never'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Refresh className="animate-spin text-blue-600"  size="24" color="currentColor" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No recent activity for this admin.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <li key={log.id} className="py-2 flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500"
                      >
                        <ArrowSwapHorizontal size={14} color="currentColor" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">
                          {log.action}{' '}
                          <span className="text-gray-400">
                            on {log.resourceType} {log.resourceId}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                        disabled={logsPage <= 1}
                        className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLogsPage((p) => Math.min(pagination.totalPages, p + 1))
                        }
                        disabled={logsPage >= pagination.totalPages}
                        className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                Role
              </div>
              <select
                value={member.roleId || ''}
                onChange={handleRoleChange}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                Permissions
              </div>
              {currentRole && currentRole.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {currentRole.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  This role has no explicit permissions assigned yet.
                </p>
              )}
              <p className="mt-3 text-[11px] text-gray-400">
                To adjust individual permissions, edit the role in the Roles tab on the Manage
                Team page.
              </p>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {content}
    </Dialog>
  );
}

