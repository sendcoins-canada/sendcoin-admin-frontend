import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateRole, usePermissions } from '@/hooks/useTeam';
import { Refresh, ShieldTick, Add, TickSquare, CloseSquare } from 'iconsax-react';
import type { Permission } from '@/types/auth';

// =============================================================================
// Types
// =============================================================================

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  description: string;
  permissions: Permission[];
}

// =============================================================================
// Permission Categories
// =============================================================================

const PERMISSION_CATEGORIES: Record<string, { label: string; permissions: Permission[] }> = {
  users: {
    label: 'Users',
    permissions: ['READ_USERS', 'SUSPEND_USERS', 'VERIFY_KYC'],
  },
  transactions: {
    label: 'Transactions',
    permissions: ['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS', 'READ_TX_HASH', 'EXPORT_TRANSACTIONS'],
  },
  wallets: {
    label: 'Wallets',
    permissions: ['READ_WALLETS', 'FREEZE_WALLETS'],
  },
  admin: {
    label: 'Administration',
    permissions: ['MANAGE_ADMINS', 'MANAGE_ROLES', 'MANAGE_DEPARTMENTS', 'READ_AUDIT_LOGS'],
  },
  analytics: {
    label: 'Analytics & Reports',
    permissions: ['VIEW_DASHBOARD', 'VIEW_ANALYTICS', 'EXPORT_DATA'],
  },
  notifications: {
    label: 'Notifications',
    permissions: ['READ_NOTIFICATIONS', 'MANAGE_NOTIFICATION_SETTINGS'],
  },
};

const PERMISSION_LABELS: Record<Permission, string> = {
  READ_USERS: 'View users',
  SUSPEND_USERS: 'Suspend/ban users',
  READ_TRANSACTIONS: 'View transactions',
  VERIFY_TRANSACTIONS: 'Approve/reject transactions',
  READ_TX_HASH: 'View transaction hashes',
  EXPORT_TRANSACTIONS: 'Export transactions',
  READ_WALLETS: 'View wallets',
  FREEZE_WALLETS: 'Freeze wallets',
  READ_AUDIT_LOGS: 'View audit logs',
  VERIFY_KYC: 'Verify KYC documents',
  MANAGE_ADMINS: 'Manage team members',
  MANAGE_ROLES: 'Manage roles',
  MANAGE_DEPARTMENTS: 'Manage departments',
  VIEW_DASHBOARD: 'View dashboard',
  VIEW_ANALYTICS: 'View analytics',
  EXPORT_DATA: 'Export data',
  READ_NOTIFICATIONS: 'Read notifications',
  MANAGE_NOTIFICATION_SETTINGS: 'Manage notification settings',
};

// =============================================================================
// Create Role Modal Component
// =============================================================================

export function CreateRoleModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    permissions: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Fetch available permissions
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions();

  // Create role mutation
  const createRoleMutation = useCreateRole();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const togglePermission = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: undefined }));
    }
  };

  const toggleCategory = (categoryPermissions: Permission[]) => {
    const allSelected = categoryPermissions.every((p) => formData.permissions.includes(p));
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Role name must be at least 2 characters';
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    createRoleMutation.mutate(
      {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        permissions: formData.permissions,
      },
      {
        onSuccess: () => {
          setFormData({ name: '', description: '', permissions: [] });
          setErrors({});
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', permissions: [] });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <ShieldTick size="20" color="currentColor" />
            </div>
            Create New Role
          </DialogTitle>
        </DialogHeader>

        {permissionsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Refresh className="animate-spin text-blue-600"  size="32" color="currentColor" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Role Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Role Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter role name (e.g., Support Agent)"
                  className={`w-full px-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.name ? 'border border-red-500' : ''
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what this role is for..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Permissions</label>
                  <span className="text-xs text-gray-500">
                    {formData.permissions.length} selected
                  </span>
                </div>
                {errors.permissions && (
                  <p className="text-xs text-red-500">{errors.permissions}</p>
                )}

                <div className="space-y-4">
                  {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const allSelected = category.permissions.every((p) =>
                      formData.permissions.includes(p)
                    );
                    const someSelected =
                      !allSelected &&
                      category.permissions.some((p) => formData.permissions.includes(p));

                    return (
                      <div
                        key={key}
                        className="bg-gray-50 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {category.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCategory(category.permissions)}
                            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                              allSelected
                                ? 'bg-blue-100 text-blue-700'
                                : someSelected
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {allSelected ? (
                              <>
                                <CloseSquare size="12" color="currentColor" />
                                Deselect all
                              </>
                            ) : (
                              <>
                                <TickSquare size="12" color="currentColor" />
                                Select all
                              </>
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {category.permissions.map((permission) => (
                            <label
                              key={permission}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission)}
                                onChange={() => togglePermission(permission)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {PERMISSION_LABELS[permission]}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {createRoleMutation.isError && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mx-4">
                <p className="text-sm text-red-600">
                  {(createRoleMutation.error as Error)?.message || 'Failed to create role'}
                </p>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRoleMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {createRoleMutation.isPending ? (
                  <>
                    <Refresh className="animate-spin"  size="16" color="currentColor" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Add size="16" color="currentColor" />
                    Create Role
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateRoleModal;
