import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  useTeamMembers,
  useRoles,
  useDepartments,
  useActivateMember,
  useDeactivateMember,
  useDeleteMemberPermanently,
} from '@/hooks/useTeam';
import { useDebounce } from '@/hooks/useDebounce';
import { InviteTeamMemberModal } from '@/components/modals/InviteTeamMemberModal';
import { CreateRoleModal } from '@/components/modals/CreateRoleModal';
import { TeamMemberDetailModal } from '@/components/modals/TeamMemberDetailModal';
import {
  Add,
  Refresh,
  SearchNormal1,
  ShieldTick,
  Trash,
  UserTick,
  UserRemove,
  ArrowDown2,
  RecordCircle,
} from 'iconsax-react';
import type { AdminStatus } from '@/types/auth';
import type { TeamFilters, TeamMember } from '@/types/team';
import { TableLoader } from '@/components/ui/TableLoader';
import { TableEmpty } from '@/components/ui/TableEmpty';

// =============================================================================
// Constants
// =============================================================================

const TABS = [
  { key: 'members', label: 'Team members' },
  { key: 'roles', label: 'Roles' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-700' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-700' },
  SUSPENDED: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  LOCKED: { bg: 'bg-orange-50', text: 'text-orange-700' },
  DELETED: { bg: 'bg-red-50', text: 'text-red-700' },
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  // const index = name.charCodeAt(0) % colors.length;
  return colors[2];
};

// =============================================================================
// Manage Team Page Component
// =============================================================================

export default function ManageTeam() {
  const [activeTab, setActiveTab] = useState('members');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Build filters based on search
  const filters: TeamFilters = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'all' && { status: statusFilter as AdminStatus }),
    ...(roleFilter !== 'all' && { roleId: roleFilter }),
    ...(departmentFilter !== 'all' && { departmentId: departmentFilter }),
  };

  // Fetch team members with React Query
  const {
    data: membersData,
    isLoading: membersLoading,
    isFetching: membersFetching,
    refetch: refetchMembers,
  } = useTeamMembers({ ...filters, page, limit: 20 });

  // Fetch roles
  const {
    data: rolesData,
    isLoading: rolesLoading,
    isFetching: rolesFetching,
    refetch: refetchRoles,
  } = useRoles();

  // Fetch departments for filter dropdown
  const { data: departmentsData } = useDepartments();

  // Mutations
  const activateMutation = useActivateMember();
  const deactivateMutation = useDeactivateMember();
  const deleteMutation = useDeleteMemberPermanently();

  const members = membersData?.data ?? [];
  const membersPagination = membersData?.pagination;
  const roles = Array.isArray(rolesData) ? rolesData : (rolesData as { data?: unknown[] })?.data ?? [];

  const isLoading = activeTab === 'members' ? membersLoading : rolesLoading;
  const isFetching = activeTab === 'members' ? membersFetching : rolesFetching;

  const handleActivate = (id: string) => {
    activateMutation.mutate(id);
  };

  const handleDeactivate = (id: string) => {
    if (confirm('Deactivate this team member? They will not be able to sign in until reactivated.')) {
      deactivateMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this team member? They will be removed from the system and cannot be restored.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'members') {
      refetchMembers();
    } else {
      refetchRoles();
    }
  };

  return (
    <DashboardLayout title="Manage Team">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-1 mb-6">
        <div className="flex gap-8">
          {TABS.map((tab) => (
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
              <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                {tab.key === 'members' ? members.length : roles.length}
              </span>
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
            <SearchNormal1 size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'members' ? 'Search members...' : 'Search roles...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="LOCKED">Locked</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Departments</option>
            {(departmentsData?.data ?? []).map((dept: { id: string; name: string }) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {activeTab === 'members' && members.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              Members
              <div className="flex -space-x-2">
                {members.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className={`w-5 h-5 rounded-full ${
                      m.avatar ? '' : getAvatarColor(m.fullName)
                    } border border-white flex items-center justify-center text-[8px] text-white font-medium`}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      getInitials(m.firstName, m.lastName)
                    )}
                  </div>
                ))}
                {members.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[10px] font-medium text-gray-600">
                    +{members.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Refresh size="16" color="currentColor" className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              if (activeTab === 'members') {
                setShowInviteModal(true);
              } else {
                setShowRoleModal(true);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Add size="16" color="currentColor" />
            {activeTab === 'members' ? 'Invite member' : 'Create role'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-100 bg-white min-h-[256px] overflow-x-auto">
        {isLoading ? (
          <TableLoader />
        ) : activeTab === 'members' ? (
          members.length === 0 ? (
            <TableEmpty message="No team members found" />
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-medium tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">MFA</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right min-w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedMember(member)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full ${getAvatarColor(
                                member.fullName
                              )} flex items-center justify-center text-white text-sm font-medium`}
                            >
                              {getInitials(member.firstName, member.lastName)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.fullName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-blue-600 font-medium text-xs">
                          <div className="w-4 h-4 rounded-full border border-blue-200 flex items-center justify-center text-[8px]">
                            👤
                          </div>
                          {member.roleName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {member.departmentName ?? '-'}
                      </td>
                      <td className="px-6 py-4">
                        {member.mfaEnabled ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <ShieldTick size="14" color="currentColor" variant="Bold" />
                            <span className="text-xs">Enabled</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {formatDate(member.lastActive)}
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[member.status]?.bg ?? 'bg-gray-50'
                          } ${STATUS_COLORS[member.status]?.text ?? 'text-gray-700'}`}
                        >
                          {member.status}
                          <ArrowDown2 size="10" color="currentColor" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right min-w-[140px] whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {(String(member.status).toUpperCase() === 'SUSPENDED' || String(member.status).toUpperCase() === 'INACTIVE') && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleActivate(String(member.id)); }}
                              disabled={activateMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-green-50 rounded-lg text-green-700 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Activate member"
                              type="button"
                            >
                              <UserTick size="18" color="currentColor" variant="Bold" />
                              <span>Activate</span>
                            </button>
                          )}
                          {String(member.status).toUpperCase() === 'ACTIVE' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeactivate(String(member.id)); }}
                              disabled={deactivateMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-amber-50 rounded-lg text-amber-700 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Deactivate member"
                              type="button"
                            >
                              <UserRemove size="18" color="currentColor" variant="Bold" />
                              <span>Deactivate</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(String(member.id)); }}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-red-50 rounded-lg text-red-700 text-xs font-medium transition-colors disabled:opacity-50"
                            title="Delete permanently"
                            type="button"
                          >
                            <Trash size="18" color="currentColor" variant="Bold" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {membersPagination && (
                <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Showing {(page - 1) * membersPagination.limit + 1} to{' '}
                    {Math.min(page * membersPagination.limit, membersPagination.total)} of{' '}
                    {membersPagination.total} members
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
                      onClick={() => setPage((p) => Math.min(membersPagination.totalPages, p + 1))}
                      disabled={page === membersPagination.totalPages}
                      className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          /* Roles Table */
          roles.length === 0 ? (
            <TableEmpty message="No roles found" />
          ) : (
            <>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-medium tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Role Name</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Permissions</th>
                    <th className="px-6 py-4">Members</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <ShieldTick size="16" color="currentColor" variant="Bold" />
                          </div>
                          <span className="font-medium text-gray-900">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                        {role.description ?? '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((perm) => (
                            <span
                              key={perm}
                              className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600"
                            >
                              {perm.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {role.permissions.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                              +{role.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                          {role.memberCount} members
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {role.isSystem ? (
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">
                            System
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {formatDate(role.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                          disabled={role.isSystem}
                        >
                          <RecordCircle size="16" color="currentColor" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}
      </div>

      {/* Team member detail modal */}
      {selectedMember && (
        <TeamMemberDetailModal
          member={selectedMember}
          open={!!selectedMember}
          onOpenChange={(open) => {
            if (!open) setSelectedMember(null);
          }}
          onUpdated={refetchMembers}
        />
      )}

      {/* Invite Team Member Modal */}
      <InviteTeamMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSuccess={() => refetchMembers()}
      />

      {/* Create Role Modal */}
      <CreateRoleModal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        onSuccess={() => refetchRoles()}
      />
    </DashboardLayout>
  );
}
