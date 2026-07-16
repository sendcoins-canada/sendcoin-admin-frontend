import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useMfaProtectedAction } from '@/hooks/useMfaProtectedAction';
import { MfaVerificationModal } from '@/components/modals/MfaVerificationModal';
import { campaignBonusService } from '@/services/campaignBonusService';

const DEFAULT_CAMPAIGN = 'welcome-5usdt-2026-07';

interface CreditBonusModalProps {
  emails: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCredited?: () => void;
}

/**
 * Bulk "credit campaign bonus" modal, opened from the Users page after
 * selecting rows. Auto-previews who is eligible vs already-credited, then
 * credits with MFA confirmation. Reuses the admin/campaigns/bonus endpoints.
 */
export function CreditBonusModal({
  emails,
  open,
  onOpenChange,
  onCredited,
}: CreditBonusModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number>(5);

  const preview = useQuery({
    queryKey: ['campaign-bonus', 'preview', emails],
    queryFn: () => campaignBonusService.preview({ emails }),
    enabled: open && emails.length > 0,
  });

  const mfa = useMfaProtectedAction<void>({
    actionName: 'Credit Campaign Bonus',
    actionDescription:
      'Crediting a campaign bonus moves platform funds and requires MFA verification.',
  });

  const creditMutation = useMutation({
    mutationFn: () =>
      campaignBonusService.credit({ emails, amount, campaign: DEFAULT_CAMPAIGN }),
    onSuccess: (res) => {
      toast.success(
        `Credited ${res.credited} user${res.credited !== 1 ? 's' : ''} · ${res.credited * res.amount} USDT`,
      );
      if (res.notFoundCount > 0)
        toast.warning(`${res.notFoundCount} not matched to an account`);
      queryClient.invalidateQueries({ queryKey: ['campaign-bonus'] });
      onCredited?.();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to credit bonus'),
  });

  const handleConfirm = () =>
    void mfa
      .executeWithMfa(async () => {
        await creditMutation.mutateAsync();
      })
      .catch(() => {});

  const p = preview.data;
  const willCredit = p?.willCreditCount ?? emails.length;
  const busy = creditMutation.isPending || mfa.isLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Credit campaign bonus</DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-4">
            <p className="text-sm text-gray-600">
              {emails.length} user{emails.length !== 1 ? 's' : ''} selected.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USDT) each
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>

            {/* Preview summary */}
            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
              {preview.isLoading ? (
                <span className="text-gray-400">Checking recipients…</span>
              ) : p ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-green-700 font-medium">
                    {p.willCreditCount} will be credited
                  </span>
                  {p.alreadyCreditedCount > 0 && (
                    <span className="text-gray-500">
                      {p.alreadyCreditedCount} already credited
                    </span>
                  )}
                  {p.notFoundCount > 0 && (
                    <span className="text-amber-600">
                      {p.notFoundCount} not found
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">
                  {emails.length} recipient{emails.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {willCredit} × {amount} = {(willCredit * amount).toFixed(2)} USDT.
              Already-credited users are skipped. Unverified users can't withdraw
              until they complete KYC.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || amount <= 0 || willCredit === 0}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Crediting…' : `Credit ${willCredit} user${willCredit !== 1 ? 's' : ''}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MfaVerificationModal
        open={mfa.isMfaModalOpen}
        onOpenChange={(o) => !o && mfa.closeMfaModal()}
        onVerified={mfa.handleMfaVerified}
        actionName={mfa.modalConfig.actionName}
        actionDescription={mfa.modalConfig.actionDescription}
      />
    </>
  );
}

export default CreditBonusModal;
