import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useInviteAdmin, useRoles, useDepartments } from '@/hooks/useTeam';
import { Refresh, Sms, User, ShieldTick, Building, Add } from 'iconsax-react';
import { MfaVerificationModal } from './MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';

// =============================================================================
// Types
// =============================================================================

interface InviteTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: number | '';
  departmentId: number | '';
}

// =============================================================================
// Invite Team Member Modal Component
// =============================================================================

export function InviteTeamMemberModal({
  open,
  onOpenChange,
  onSuccess,
}: InviteTeamMemberModalProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    departmentId: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Fetch roles and departments
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();

  // Invite mutation
  const inviteMutation = useInviteAdmin();

  // MFA Protection for inviting team members
  const mfaInvite = useMfaProtectedAction({
    actionName: 'Invite Team Member',
    actionDescription: 'You are about to invite a new team member to the admin panel. This action requires MFA verification.',
    onSuccess: () => {
      // Reset form after successful invite
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        roleId: '',
        departmentId: '',
      });
      setErrors({});
      onOpenChange(false);
      onSuccess?.();
    },
  });

  // Backend returns array directly; avoid .data so dropdowns get roles/departments
  const roles = Array.isArray(rolesData) ? rolesData : (rolesData as { data?: unknown[] })?.data ?? [];
  const departments = Array.isArray(departmentsData) ? departmentsData : (departmentsData as { data?: unknown[] })?.data ?? [];

  const isLoading = rolesLoading || departmentsLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'roleId' || name === 'departmentId' ? (value === '' ? '' : Number(value)) : value,
    }));
    // Clear error when user types
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (formData.roleId === '') {
      newErrors.roleId = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Execute with MFA protection
    await mfaInvite.executeWithMfa(async () => {
      await inviteMutation.mutateAsync({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.roleId as number,
        departmentId: formData.departmentId === '' ? undefined : (formData.departmentId as number),
      });
    });
  };

  const handleMfaVerified = (actionToken: string) => {
    mfaInvite.handleMfaVerified(actionToken);
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      roleId: '',
      departmentId: '',
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Add size="20" color="currentColor" />
            </div>
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Refresh className="animate-spin text-blue-600"  size="32" color="currentColor" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Sms size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.email ? 'border border-red-500' : ''
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <div className="relative">
                  <User size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      errors.firstName ? 'border border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <div className="relative">
                  <User size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      errors.lastName ? 'border border-red-500' : ''
                    }`}
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="relative">
                <ShieldTick size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="roleId"
                  value={formData.roleId}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none ${
                    errors.roleId ? 'border border-red-500' : ''
                  }`}
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.roleId && <p className="text-xs text-red-500">{errors.roleId}</p>}
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Department <span className="text-gray-400">(Optional)</span>
              </label>
              <div className="relative">
                <Building size="18" color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {inviteMutation.isError && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-sm text-red-600">
                  {(inviteMutation.error as Error)?.message || 'Failed to send invitation'}
                </p>
              </div>
            )}

            <DialogFooter className="pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {inviteMutation.isPending ? (
                  <>
                    <Refresh className="animate-spin"  size="16" color="currentColor" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Sms size="16" color="currentColor" />
                    Send Invitation
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>

      {/* MFA Verification Modal */}
      <MfaVerificationModal
        open={mfaInvite.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            mfaInvite.closeMfaModal();
          }
        }}
        onVerified={handleMfaVerified}
        actionName={mfaInvite.modalConfig.actionName}
        actionDescription={mfaInvite.modalConfig.actionDescription}
      />
    </Dialog>
  );
}

export default InviteTeamMemberModal;
