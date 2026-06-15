import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useTransaction,
  useFlagTransaction,
  useUnflagTransaction,
  useApproveTransaction,
  useRejectTransaction,
  useUpdateTxHash,
  useRetryTransaction,
} from '@/hooks/useTransactions';
import {
  Refresh,
  Copy,
  TickCircle,
  ArrowUp,
  ArrowDown,
  ArrowSwapHorizontal,
  Warning2,
  Flag,
  Flag2,
  TickSquare,
  CloseSquare,
  Export,
  Clock,
  User,
  Wallet,
  Bank,
} from 'iconsax-react';
import type { TransactionType, TransactionStatus } from '@/types/transaction';
import { MfaVerificationModal } from './MfaVerificationModal';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';
import { useHasPermission } from '@/hooks/useAuth';

// =============================================================================
// Types
// =============================================================================

interface TransactionDetailModalProps {
  transactionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<TransactionStatus, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700' },
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  PENDING_FUNDING: { bg: 'bg-red-50', text: 'text-red-700' },
  PENDING_CONFIRMATION: { bg: 'bg-blue-50', text: 'text-blue-700' },
  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700' },
  FLAGGED: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

const TYPE_CONFIG: Record<TransactionType, { color: string; icon: React.ReactNode; label: string }> = {
  INCOMING: { color: 'text-green-600', icon: <ArrowDown size="16" />, label: 'Incoming' },
  OUTGOING: { color: 'text-red-600', icon: <ArrowUp size="16" />, label: 'Outgoing' },
  CONVERSION: { color: 'text-blue-600', icon: <ArrowSwapHorizontal size="16" />, label: 'Conversion' },
  BUY: { color: 'text-green-600', icon: <ArrowDown size="16" />, label: 'Buy' },
  SELL: { color: 'text-red-600', icon: <ArrowUp size="16" />, label: 'Sell' },
  TRANSFER: { color: 'text-purple-600', icon: <ArrowSwapHorizontal size="16" />, label: 'Transfer' },
};

// =============================================================================
// Helper Functions
// =============================================================================

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount) + ' ' + currency;
};

const formatUsd = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const truncateAddress = (address?: string, chars = 10) => {
  if (!address) return 'N/A';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

// =============================================================================
// Info Row Component
// =============================================================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
}

const InfoRow = ({ icon, label, value, copyable }: InfoRowProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof value === 'string') {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-sm text-gray-900 font-medium">{value || 'N/A'}</div>
      </div>
      {copyable && typeof value === 'string' && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          {copied ? <TickCircle size="14" className="text-green-600" /> : <Copy size="14" />}
        </button>
      )}
    </div>
  );
};

// =============================================================================
// Endpoint Card Component
// =============================================================================

interface EndpointCardProps {
  title: string;
  endpoint: {
    type: 'WALLET' | 'BANK' | 'EXTERNAL';
    address?: string;
    network?: string;
    name?: string;
    bankName?: string;
    accountNumber?: string;
  };
}

const EndpointCard = ({ title, endpoint }: EndpointCardProps) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="text-xs text-gray-500 mb-2">{title}</div>
    <div className="flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          endpoint.type === 'WALLET' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
        }`}
      >
        {endpoint.type === 'WALLET' ? <Wallet size="18" /> : <Bank size="18" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {endpoint.name ?? truncateAddress(endpoint.address) ?? endpoint.bankName ?? 'Unknown'}
        </div>
        <div className="text-xs text-gray-500">
          {endpoint.type === 'WALLET'
            ? endpoint.network ?? 'Unknown network'
            : endpoint.accountNumber
            ? `****${endpoint.accountNumber.slice(-4)}`
            : 'Bank Account'}
        </div>
      </div>
    </div>
  </div>
);

// =============================================================================
// Transaction Detail Modal Component
// =============================================================================

export function TransactionDetailModal({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [pendingAction, setPendingAction] = useState<{
    type: 'approve' | 'reject';
    data: { note?: string; reason?: string; txHash?: string };
  } | null>(null);
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveTxHash, setApproveTxHash] = useState('');
  const [showEditHashForm, setShowEditHashForm] = useState(false);
  const [editHashValue, setEditHashValue] = useState('');

  // Fetch transaction data
  const { data: transaction, isLoading, refetch } = useTransaction(transactionId);

  const canVerifyTx = useHasPermission('VERIFY_TRANSACTIONS');
  const flagMutation = useFlagTransaction();
  const unflagMutation = useUnflagTransaction();
  const approveMutation = useApproveTransaction();
  const rejectMutation = useRejectTransaction();
  const updateTxHashMutation = useUpdateTxHash();
  const retryMutation = useRetryTransaction();

  // MFA Protection for sensitive actions
  const mfaApprove = useMfaProtectedAction({
    actionName: 'Approve Transaction',
    actionDescription: 'You are about to approve this transaction. This action requires MFA verification.',
    onSuccess: () => refetch(),
  });

  const mfaReject = useMfaProtectedAction({
    actionName: 'Reject Transaction',
    actionDescription: 'You are about to reject this transaction. This action requires MFA verification.',
    onSuccess: () => refetch(),
  });

  const mfaRetry = useMfaProtectedAction({
    actionName: 'Retry Send',
    actionDescription: 'You are about to retry this transfer. The system will re-attempt to send from the master wallet. This requires MFA verification.',
    onSuccess: () => refetch(),
  });

  const handleRetry = async () => {
    if (!confirm('Retry this transfer? Make sure the master wallet has been funded first.')) return;

    await mfaRetry.executeWithMfa(async () => {
      const result = await retryMutation.mutateAsync({ id: transactionId });
      if (result.success) {
        alert(`Retry successful! TXID: ${result.txid || 'pending'}`);
      } else {
        alert(`Retry failed: ${result.message || 'Unknown error'}`);
      }
    });
  };

  const handleFlag = () => {
    const reason = prompt('Enter reason for flagging:');
    if (reason) {
      flagMutation.mutate({ id: transactionId, data: { reason } });
    }
  };

  const handleUnflag = () => {
    unflagMutation.mutate(transactionId);
  };

  const handleApprove = () => {
    setShowApproveForm(true);
  };

  const handleConfirmApprove = async () => {
    const hash = approveTxHash || undefined;
    setPendingAction({ type: 'approve', data: { txHash: hash } });

    await mfaApprove.executeWithMfa(async () => {
      await approveMutation.mutateAsync({ id: transactionId, txHash: hash });
      setShowApproveForm(false);
      setApproveTxHash('');
    });
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setPendingAction({ type: 'reject', data: { reason } });

    await mfaReject.executeWithMfa(async () => {
      await rejectMutation.mutateAsync({ id: transactionId, reason });
    });
  };

  const handleMfaVerified = async (actionToken: string) => {
    if (!pendingAction) return;

    if (pendingAction.type === 'approve') {
      mfaApprove.handleMfaVerified(actionToken);
    } else {
      mfaReject.handleMfaVerified(actionToken);
    }
    setPendingAction(null);
  };

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'history', label: 'History' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Refresh className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : transaction ? (
          <>
            {/* Header */}
            <DialogHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        TYPE_CONFIG[transaction.type]?.color ?? 'text-gray-600'
                      } bg-gray-100`}
                    >
                      {TYPE_CONFIG[transaction.type]?.icon}
                    </div>
                    <div>
                      <DialogTitle className="text-lg">
                        {TYPE_CONFIG[transaction.type]?.label ?? transaction.type} Transaction
                      </DialogTitle>
                      <div className="text-sm text-gray-500 font-mono">
                        {transaction.txId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[transaction.status]?.bg ?? 'bg-gray-50'
                      } ${STATUS_COLORS[transaction.status]?.text ?? 'text-gray-700'}`}
                    >
                      {transaction.status}
                    </span>
                    {transaction.isFlagged && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        <Warning2 size="12" />
                        Flagged
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <Refresh size="18" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* Amount Display */}
            <div className="py-4 border-b border-gray-100">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {formatAmount(transaction.amount, transaction.currency)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {formatUsd(transaction.amountUsd)}
                </div>
              </div>
            </div>

            {/* Approve Form */}
            {showApproveForm && (
              <div className="px-1 py-3 border-b border-gray-100">
                <label className="text-sm font-medium text-gray-700">
                  Transaction ID / Hash{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={approveTxHash}
                  onChange={(e) => setApproveTxHash(e.target.value)}
                  placeholder="Enter blockchain tx hash or payment reference..."
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowApproveForm(false); setApproveTxHash(''); }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmApprove}
                    disabled={approveMutation.isPending}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {approveMutation.isPending ? (
                      <Refresh size="16" className="animate-spin" />
                    ) : (
                      <TickSquare size="16" />
                    )}
                    Confirm Approve
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 py-3 border-b border-gray-100">
              {(transaction.status === 'PENDING' || transaction.status === 'PENDING_FUNDING') && !showApproveForm && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || !canVerifyTx}
                    title={!canVerifyTx ? 'You need VERIFY_TRANSACTIONS permission.' : 'Approve with manual TX hash'}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                  >
                    <TickSquare size="16" />
                    Approve
                  </button>
                  {transaction.status === 'PENDING_FUNDING' && (
                    <button
                      onClick={handleRetry}
                      disabled={retryMutation.isPending || !canVerifyTx}
                      title={!canVerifyTx ? 'You need VERIFY_TRANSACTIONS permission.' : 'Fund master wallet first, then retry auto-send'}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {retryMutation.isPending ? (
                        <Refresh size="16" className="animate-spin" />
                      ) : (
                        <Refresh size="16" />
                      )}
                      Retry Send
                    </button>
                  )}
                  <button
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !canVerifyTx}
                    title={!canVerifyTx ? 'You need VERIFY_TRANSACTIONS permission.' : undefined}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50"
                  >
                    <CloseSquare size="16" />
                    Reject
                  </button>
                </>
              )}
              {!transaction.isFlagged ? (
                <button
                  onClick={handleFlag}
                  disabled={flagMutation.isPending || !canVerifyTx}
                  title={!canVerifyTx ? 'You need VERIFY_TRANSACTIONS permission.' : undefined}
                  className="flex-1 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-orange-100 disabled:opacity-50"
                >
                  <Flag size="16" />
                  Flag
                </button>
              ) : (
                <button
                  onClick={handleUnflag}
                  disabled={unflagMutation.isPending || !canVerifyTx}
                  title={!canVerifyTx ? 'You need VERIFY_TRANSACTIONS permission.' : undefined}
                  className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50"
                >
                  <Flag2 size="16" />
                  Unflag
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`pb-3 text-sm font-medium relative ${
                    activeTab === tab.key
                      ? 'text-gray-900'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Source & Destination */}
                  <div className="grid grid-cols-2 gap-4">
                    <EndpointCard title="Source" endpoint={transaction.source} />
                    <EndpointCard title="Destination" endpoint={transaction.destination} />
                  </div>

                  {/* Transaction Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Transaction Info</h3>
                      <InfoRow
                        icon={<Clock size="16" />}
                        label="Initiated"
                        value={formatDateTime(transaction.initiatedAt)}
                      />
                      {transaction.completedAt && (
                        <InfoRow
                          icon={<TickCircle size="16" />}
                          label="Completed"
                          value={formatDateTime(transaction.completedAt)}
                        />
                      )}
                      <InfoRow
                        icon={<Wallet size="16" />}
                        label="Fee"
                        value={`${formatAmount(transaction.fee, transaction.currency)} (${formatUsd(transaction.feeUsd)})`}
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">User Info</h3>
                      <InfoRow
                        icon={<User size="16" />}
                        label="User"
                        value={transaction.userName}
                      />
                      <InfoRow
                        icon={<User size="16" />}
                        label="Email"
                        value={transaction.userEmail}
                        copyable
                      />
                      <InfoRow
                        icon={<User size="16" />}
                        label="User ID"
                        value={transaction.userId}
                        copyable
                      />
                    </div>
                  </div>

                  {/* Blockchain Info */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">Blockchain Info</h3>
                      {canVerifyTx && ['COMPLETED', 'FAILED', 'CANCELLED'].includes(transaction.status) && !showEditHashForm && (
                        <button
                          onClick={() => { setShowEditHashForm(true); setEditHashValue(transaction.txHash || ''); }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {transaction.txHash ? 'Edit Hash' : 'Add Hash'}
                        </button>
                      )}
                    </div>

                    {showEditHashForm ? (
                      <div>
                        <input
                          type="text"
                          value={editHashValue}
                          onChange={(e) => setEditHashValue(e.target.value)}
                          placeholder="Enter blockchain tx hash or payment reference..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { setShowEditHashForm(false); setEditHashValue(''); }}
                            className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              updateTxHashMutation.mutate(
                                { id: transactionId, txHash: editHashValue },
                                { onSuccess: () => { setShowEditHashForm(false); setEditHashValue(''); refetch(); } }
                              );
                            }}
                            disabled={updateTxHashMutation.isPending || !editHashValue.trim()}
                            className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {updateTxHashMutation.isPending ? <Refresh size="14" className="animate-spin" /> : <TickCircle size="14" />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : transaction.txHash ? (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Transaction Hash</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-900">
                              {truncateAddress(transaction.txHash, 12)}
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(transaction.txHash!)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Copy size="14" className="text-gray-400" />
                            </button>
                            <a
                              href="#"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Export size="14" className="text-gray-400" />
                            </a>
                          </div>
                        </div>
                        {transaction.blockNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Block Number</span>
                            <span className="text-sm font-medium text-gray-900">
                              {transaction.blockNumber.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {transaction.confirmations !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Confirmations</span>
                            <span className="text-sm font-medium text-gray-900">
                              {transaction.confirmations}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No blockchain hash recorded</div>
                    )}
                  </div>

                  {/* Flag Info */}
                  {transaction.isFlagged && transaction.flagReason && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-orange-700 mb-2">
                        <Warning2 size="16" />
                        <span className="text-sm font-medium">Flagged Transaction</span>
                      </div>
                      <div className="text-sm text-orange-600">{transaction.flagReason}</div>
                      {transaction.flaggedBy && (
                        <div className="text-xs text-orange-500 mt-2">
                          Flagged by {transaction.flaggedBy} on {formatDateTime(transaction.flaggedAt)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {transaction.history && transaction.history.length > 0 ? (
                    transaction.history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            STATUS_COLORS[item.status]?.bg ?? 'bg-gray-100'
                          } ${STATUS_COLORS[item.status]?.text ?? 'text-gray-600'}`}
                        >
                          <Clock size="14" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.action}</div>
                          <div className="text-xs text-gray-500">
                            by {item.performedByName} on {formatDateTime(item.timestamp)}
                          </div>
                          {item.note && (
                            <div className="text-sm text-gray-600 mt-1">{item.note}</div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_COLORS[item.status]?.bg ?? 'bg-gray-100'
                          } ${STATUS_COLORS[item.status]?.text ?? 'text-gray-600'}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No history available</div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Transaction not found
          </div>
        )}
      </DialogContent>

      {/* MFA Verification Modals */}
      <MfaVerificationModal
        open={mfaApprove.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            mfaApprove.closeMfaModal();
            setPendingAction(null);
          }
        }}
        onVerified={handleMfaVerified}
        actionName={mfaApprove.modalConfig.actionName}
        actionDescription={mfaApprove.modalConfig.actionDescription}
      />

      <MfaVerificationModal
        open={mfaReject.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            mfaReject.closeMfaModal();
            setPendingAction(null);
          }
        }}
        onVerified={handleMfaVerified}
        actionName={mfaReject.modalConfig.actionName}
        actionDescription={mfaReject.modalConfig.actionDescription}
      />

      <MfaVerificationModal
        open={mfaRetry.isMfaModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            mfaRetry.closeMfaModal();
          }
        }}
        onVerified={(token) => mfaRetry.handleMfaVerified(token)}
        actionName={mfaRetry.modalConfig.actionName}
        actionDescription={mfaRetry.modalConfig.actionDescription}
      />
    </Dialog>
  );
}

export default TransactionDetailModal;
