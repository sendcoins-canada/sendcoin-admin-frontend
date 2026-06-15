import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { userService } from '@/services/userService';
import {
  Refresh,
  ShieldTick,
  Clock,
  User as UserIcon,
  Sms,
  Call,
  Location,
  Calendar,
  TickCircle,
  CloseCircle,
} from 'iconsax-react';
import { toast } from 'sonner';
import { MfaVerificationModal } from './MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';
import { apiClient } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

interface KycDetailModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface KycUserData {
  userId: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  kycStatus?: string;
  phone?: string | null;
  country?: string | null;
  location?: string | null;
  address?: string | null;
  profilePicture?: string | null;
  createdAt?: string | null;
  verification?: {
    verificationId?: string;
    submittedAt?: string | null;
  } | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null): string => {
  if (firstName || lastName) {
    return `${(firstName?.[0] || '').toUpperCase()}${(lastName?.[0] || '').toUpperCase()}` || '?';
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
};

// =============================================================================
// Info Row Component
// =============================================================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const InfoRow = ({ icon, label, value }: InfoRowProps) => {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm text-gray-900 font-medium">{value || 'N/A'}</div>
      </div>
    </div>
  );
};

// =============================================================================
// KYC Detail Modal Component
// =============================================================================

export function KycDetailModal({ userId, open, onOpenChange }: KycDetailModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch KYC details
  const { data: kycData, isLoading, refetch } = useQuery({
    queryKey: ['kyc', 'detail', userId],
    queryFn: () => apiClient.get<KycUserData>(`/kyc/${userId}`),
    enabled: !!userId && open,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => userService.approveKyc(userId),
    onSuccess: () => {
      toast.success('KYC approved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
      queryClient.invalidateQueries({ queryKey: ['kyc', 'detail', userId] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve KYC');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => userService.rejectKyc(userId, '', reason),
    onSuccess: () => {
      toast.success('KYC rejected');
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
      queryClient.invalidateQueries({ queryKey: ['kyc', 'detail', userId] });
      setShowRejectForm(false);
      setRejectReason('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject KYC');
    },
  });

  // MFA Protection for KYC approval
  const mfaApprove = useMfaProtectedAction({
    actionName: 'Approve KYC',
    actionDescription: 'You are about to approve this KYC verification. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
    },
  });

  // MFA Protection for KYC rejection
  const mfaReject = useMfaProtectedAction({
    actionName: 'Reject KYC',
    actionDescription: 'You are about to reject this KYC verification. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
    },
  });

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this KYC?')) {
      return;
    }

    await mfaApprove.executeWithMfa(async () => {
      await approveMutation.mutateAsync();
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    const reason = rejectReason;
    await mfaReject.executeWithMfa(async () => {
      await rejectMutation.mutateAsync(reason);
    });
  };

  const handleMfaVerified = (actionToken: string) => {
    if (mfaApprove.isMfaModalOpen) {
      mfaApprove.handleMfaVerified(actionToken);
    } else if (mfaReject.isMfaModalOpen) {
      mfaReject.handleMfaVerified(actionToken);
    }
  };

  const fullName = kycData
    ? [kycData.firstName, kycData.lastName].filter(Boolean).join(' ') || 'Unknown User'
    : 'Loading...';

  const isPending = kycData?.kycStatus === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Refresh className="animate-spin text-blue-600"  size="32" color="currentColor" />
          </div>
        ) : kycData ? (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-start gap-4">
                {kycData.profilePicture ? (
                  <img
                    src={kycData.profilePicture}
                    alt={fullName}
                    className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                    {getInitials(kycData.firstName, kycData.lastName, kycData.email)}
                  </div>
                )}
                <div className="flex-1">
                  <DialogTitle className="text-lg">{fullName}</DialogTitle>
                  <div className="text-sm text-gray-500 mt-0.5">{kycData.email || 'No email'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        kycData.kycStatus === 'verified'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {kycData.kycStatus === 'verified' ? (
                        <ShieldTick size="14" color="currentColor" variant="Bold" />
                      ) : (
                        <Clock size="14" color="currentColor" variant="Bold" />
                      )}
                      {kycData.kycStatus === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                    <span className="text-xs text-gray-400">ID: {kycData.userId}</span>
                  </div>
                </div>
                <button
                  onClick={() => refetch()}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <Refresh size="18" color="currentColor" />
                </button>
              </div>
            </DialogHeader>

            {/* User Info */}
            <div className="py-4 space-y-1">
              <h3 className="text-sm font-medium text-gray-900 mb-3">User Information</h3>
              <InfoRow
                icon={<UserIcon size="16" color="currentColor" />}
                label="Full Name"
                value={fullName}
              />
              <InfoRow
                icon={<Sms size="16" color="currentColor" />}
                label="Email"
                value={kycData.email}
              />
              <InfoRow
                icon={<Call size="16" color="currentColor" />}
                label="Phone"
                value={kycData.phone}
              />
              <InfoRow
                icon={<Location size="16" color="currentColor" />}
                label="Country"
                value={kycData.country}
              />
              <InfoRow
                icon={<Location size="16" color="currentColor" />}
                label="Location"
                value={kycData.location}
              />
              <InfoRow
                icon={<Calendar size="16" color="currentColor" />}
                label="Registered"
                value={formatDate(kycData.createdAt)}
              />
              {kycData.verification?.submittedAt && (
                <InfoRow
                  icon={<Calendar size="16" color="currentColor" />}
                  label="KYC Submitted"
                  value={formatDate(kycData.verification.submittedAt)}
                />
              )}
              {kycData.verification?.verificationId && (
                <InfoRow
                  icon={<ShieldTick size="16" color="currentColor" />}
                  label="Verification ID"
                  value={
                    <span className="font-mono text-xs">
                      {kycData.verification.verificationId}
                    </span>
                  }
                />
              )}
            </div>

            {/* Reject Form */}
            {showRejectForm && (
              <div className="border-t border-gray-100 pt-4">
                <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !rejectReason.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {rejectMutation.isPending ? (
                      <Refresh size="16" color="currentColor" className="animate-spin" />
                    ) : (
                      <CloseCircle size="16" color="currentColor" />
                    )}
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && !showRejectForm && (
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <CloseCircle size="18" color="currentColor" />
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approveMutation.isPending ? (
                    <Refresh size="18" color="currentColor" className="animate-spin" />
                  ) : (
                    <TickCircle size="18" color="currentColor" />
                  )}
                  Approve KYC
                </button>
              </div>
            )}

            {/* Already Verified */}
            {kycData.kycStatus === 'verified' && (
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                  <ShieldTick size="20" color="currentColor" variant="Bold" />
                  <span className="text-sm font-medium">This user's KYC has been verified</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500">
            KYC details not found
          </div>
        )}
      </DialogContent>

      {/* MFA Verification Modals */}
      <MfaVerificationModal
        open={mfaApprove.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaApprove.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaApprove.modalConfig.actionName}
        actionDescription={mfaApprove.modalConfig.actionDescription}
      />

      <MfaVerificationModal
        open={mfaReject.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaReject.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaReject.modalConfig.actionName}
        actionDescription={mfaReject.modalConfig.actionDescription}
      />
    </Dialog>
  );
}

export default KycDetailModal;
