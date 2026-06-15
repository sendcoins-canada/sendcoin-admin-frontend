import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantService } from '@/services/merchantService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Shop,
  Bank,
  TickCircle,
  CloseCircle,
  Danger,
  Refresh,
  Calendar,
  Call,
  Sms,
  Global,
  Monitor,
} from 'iconsax-react';
import { MfaVerificationModal } from './MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';

interface MerchantDetailModalProps {
  keychain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(timestamp?: number | null): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MerchantDetailModal({
  keychain,
  open,
  onOpenChange,
}: MerchantDetailModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');

  const queryClient = useQueryClient();

  // Fetch merchant details
  const { data: merchant, isLoading } = useQuery({
    queryKey: ['merchant', keychain],
    queryFn: () => merchantService.getMerchant(keychain),
    enabled: open && !!keychain,
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ['merchant-transactions', keychain],
    queryFn: () => merchantService.getMerchantTransactions(keychain, { limit: 10 }),
    enabled: open && !!keychain,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => merchantService.approve(keychain, approveNotes),
    onSuccess: () => {
      toast.success('Merchant approved successfully');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', keychain] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve merchant');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => merchantService.reject(keychain, rejectReason),
    onSuccess: () => {
      toast.success('Merchant rejected');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', keychain] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject merchant');
    },
  });

  // Suspend mutation
  const suspendMutation = useMutation({
    mutationFn: () => merchantService.suspend(keychain, suspendReason),
    onSuccess: () => {
      toast.success('Merchant suspended');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', keychain] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to suspend merchant');
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) => merchantService.toggleStatus(keychain, isActive),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Merchant activated' : 'Merchant deactivated');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      queryClient.invalidateQueries({ queryKey: ['merchant', keychain] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle status');
    },
  });

  // MFA Protection for merchant actions
  const mfaApprove = useMfaProtectedAction({
    actionName: 'Approve Merchant',
    actionDescription: 'You are about to approve this merchant. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });

  const mfaReject = useMfaProtectedAction({
    actionName: 'Reject Merchant',
    actionDescription: 'You are about to reject this merchant. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });

  const mfaSuspend = useMfaProtectedAction({
    actionName: 'Suspend Merchant',
    actionDescription: 'You are about to suspend this merchant. This action requires MFA verification.',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
    },
  });

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this merchant?')) {
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

    await mfaReject.executeWithMfa(async () => {
      await rejectMutation.mutateAsync();
    });
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }

    await mfaSuspend.executeWithMfa(async () => {
      await suspendMutation.mutateAsync();
    });
  };

  const handleMfaVerified = (actionToken: string) => {
    if (mfaApprove.isMfaModalOpen) {
      mfaApprove.handleMfaVerified(actionToken);
    } else if (mfaReject.isMfaModalOpen) {
      mfaReject.handleMfaVerified(actionToken);
    } else if (mfaSuspend.isMfaModalOpen) {
      mfaSuspend.handleMfaVerified(actionToken);
    }
  };

  const transactions = transactionsData?.transactions ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shop size={24} color="currentColor" className="text-purple-600" />
            Merchant Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Refresh className="animate-spin text-blue-600"  size="32" color="currentColor" />
          </div>
        ) : !merchant ? (
          <div className="text-center py-12 text-gray-500">Merchant not found</div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Shop size={32} color="currentColor" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {merchant.userName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        merchant.verificationStatus === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : merchant.verificationStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : merchant.verificationStatus === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {merchant.verificationStatus}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        merchant.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {merchant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Sms size={16} color="currentColor" className="text-gray-400" />
                  <span className="text-gray-600">{merchant.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Call size={16} color="currentColor" className="text-gray-400" />
                  <span className="text-gray-600">{merchant.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} color="currentColor" className="text-gray-400" />
                  <span className="text-gray-600">
                    Joined: {formatDate(merchant.createdAt)}
                  </span>
                </div>
                {merchant.ipAddress && (
                  <div className="flex items-center gap-2">
                    <Global size={16} color="currentColor" className="text-gray-400" />
                    <span className="text-gray-600">{merchant.ipAddress}</span>
                  </div>
                )}
                {merchant.device && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Monitor size={16} color="currentColor" className="text-gray-400" />
                    <span className="text-gray-600 text-xs">{merchant.device}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Bank size={18} color="currentColor" className="text-blue-600" />
                Bank Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Bank Name</p>
                  <p className="font-medium">{merchant.bankName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account Name</p>
                  <p className="font-medium">{merchant.bankAccountName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account Number</p>
                  <p className="font-medium font-mono">{merchant.bankAccountNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Bank Code</p>
                  <p className="font-medium">{merchant.bankCode}</p>
                </div>
              </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{merchant.totalOrders}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {merchant.completedOrders}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {merchant.pendingOrders}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>

            {/* Verification Notes */}
            {merchant.verificationNotes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Verification Notes</h4>
                <p className="text-sm text-gray-600">{merchant.verificationNotes}</p>
                {merchant.verifiedByAdmin && (
                  <p className="text-xs text-gray-400 mt-2">
                    By Admin: {merchant.verifiedByAdmin} on{' '}
                    {formatDate(merchant.verificationDate)}
                  </p>
                )}
              </div>
            )}

            {/* Recent Transactions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Transactions</h4>
              {loadingTransactions ? (
                <div className="flex justify-center py-4">
                  <Refresh className="animate-spin text-gray-400"  size="20" color="currentColor" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No transactions yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {tx.cryptoAmount} {tx.cryptoSign}
                        </p>
                        <p className="text-xs text-gray-500">{tx.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">
                          {tx.currencySign} {tx.currencyAmount?.toLocaleString()}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t pt-4 space-y-3">
              {/* Pending status actions */}
              {merchant.verificationStatus === 'pending' && (
                <>
                  {!showRejectForm ? (
                    <div className="flex gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <TickCircle size={18} color="currentColor" />
                        Approve Merchant
                      </button>
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <CloseCircle size={18} color="currentColor" />
                        Reject Merchant
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full p-3 border rounded-lg text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={rejectMutation.isPending}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => {
                            setShowRejectForm(false);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Approved status actions */}
              {merchant.verificationStatus === 'approved' && (
                <>
                  {!showSuspendForm ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleMutation.mutate(!merchant.isActive)}
                        disabled={toggleMutation.isPending}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                          merchant.isActive
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } disabled:opacity-50`}
                      >
                        {merchant.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setShowSuspendForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        <Danger size={18} color="currentColor" />
                        Suspend
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Enter suspension reason..."
                        className="w-full p-3 border rounded-lg text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSuspend}
                          disabled={suspendMutation.isPending}
                          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          Confirm Suspension
                        </button>
                        <button
                          onClick={() => {
                            setShowSuspendForm(false);
                            setSuspendReason('');
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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

      <MfaVerificationModal
        open={mfaSuspend.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) mfaSuspend.closeMfaModal();
        }}
        onVerified={handleMfaVerified}
        actionName={mfaSuspend.modalConfig.actionName}
        actionDescription={mfaSuspend.modalConfig.actionDescription}
      />
    </Dialog>
  );
}
