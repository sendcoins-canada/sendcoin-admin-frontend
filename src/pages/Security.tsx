import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShieldTick,
  ShieldCross,
  Refresh,
  Key,
  Copy,
  TickCircle,
  Warning2,
  Trash,
  Lock,
} from 'iconsax-react';
import { toast } from 'sonner';
import { useAuthState, useMfaSetup, useEnableMfa, useDisableMfa } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { MfaSetupModal } from '@/components/modals/MfaSetupModal';
import { MfaVerificationModal } from '@/components/modals/MfaVerificationModal';
import { queryKeys } from '@/lib/queryClient';
import type { MfaSetupResponse } from '@/types/auth';

// =============================================================================
// Security Page Component
// =============================================================================

export default function Security() {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  // MFA Setup state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);

  // MFA Disable state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);

  // Backup codes state
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoadingBackupCodes, setIsLoadingBackupCodes] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  // MFA verification for regenerating backup codes
  const [showMfaForBackupCodes, setShowMfaForBackupCodes] = useState(false);

  // Mutations
  const setupMutation = useMfaSetup();
  const enableMutation = useEnableMfa();
  const disableMutation = useDisableMfa();

  const mfaEnabled = user?.mfaEnabled ?? false;
  console.log({mfaEnabled, user});
  // Start MFA setup
  const handleStartSetup = async () => {
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setShowSetupModal(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start MFA setup');
    }
  };

  // Enable MFA with verification code
  const handleEnableMfa = async (code: string) => {
    await enableMutation.mutateAsync(code);
    toast.success('Two-factor authentication enabled successfully');
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };

  // Complete MFA setup
  const handleSetupComplete = () => {
    setShowSetupModal(false);
    setSetupData(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };

  // Open disable MFA modal
  const handleOpenDisableModal = () => {
    setShowDisableModal(true);
    setDisableCode('');
    setDisableError(null);
  };

  // Disable MFA
  const handleDisableMfa = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Please enter a 6-digit code');
      return;
    }

    try {
      await disableMutation.mutateAsync(disableCode);
      toast.success('Two-factor authentication disabled');
      setShowDisableModal(false);
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    } catch (error) {
      setDisableError(error instanceof Error ? error.message : 'Invalid code');
    }
  };

  // Request backup codes regeneration (needs MFA verification first)
  const handleRequestBackupCodes = () => {
    setShowMfaForBackupCodes(true);
  };

  // Generate new backup codes after MFA verification
  const handleMfaVerifiedForBackupCodes = async () => {
    setShowMfaForBackupCodes(false);
    setIsLoadingBackupCodes(true);

    try {
      const result = await authService.getBackupCodes();
      setBackupCodes(result.backupCodes);
      setShowBackupCodes(true);
      toast.success('New backup codes generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate backup codes');
    } finally {
      setIsLoadingBackupCodes(false);
    }
  };

  // Copy backup codes
  const handleCopyBackupCodes = async () => {
    const codesText = backupCodes.join('\n');
    await navigator.clipboard.writeText(codesText);
    setCopiedBackupCodes(true);
    toast.success('Backup codes copied');
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  // Download backup codes
  const handleDownloadBackupCodes = () => {
    const codesText = `SendCoins Admin MFA Backup Codes\n${'='.repeat(40)}\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sendcoins-mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  return (
    <DashboardLayout title="Security Settings">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Lock size={24} color="currentColor" className="text-gray-600" />
        <p className="text-gray-500 text-sm">
          Manage your account security settings
        </p>
      </div>

      {/* MFA Section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  mfaEnabled ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                {mfaEnabled ? (
                  <ShieldTick size={24} color="currentColor" className="text-green-600" />
                ) : (
                  <ShieldCross size={24} color="currentColor" className="text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Two-Factor Authentication (2FA)
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add an extra layer of security to your account by requiring a verification code
                  in addition to your password.
                </p>
                <div className="mt-3">
                  {mfaEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      <TickCircle size={14} color="currentColor" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                      <Warning2 size={14} color="currentColor" />
                      Not Enabled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div>
              {mfaEnabled ? (
                <button
                  onClick={handleOpenDisableModal}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  onClick={handleStartSetup}
                  disabled={setupMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {setupMutation.isPending ? (
                    <>
                      <Refresh size="16" color="currentColor" className="animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <ShieldTick size={18} color="currentColor" />
                      Enable 2FA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Backup Codes Section (only when MFA is enabled) */}
          {mfaEnabled && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Key size={20} color="currentColor" className="text-gray-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Backup Codes</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Generate new backup codes if you've lost access to your previous ones.
                      This will invalidate all existing backup codes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRequestBackupCodes}
                  disabled={isLoadingBackupCodes}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoadingBackupCodes ? (
                    <>
                      <Refresh size="16" color="currentColor" className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Refresh size={16} color="currentColor" />
                      Regenerate Codes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">Security Recommendations</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <TickCircle size={16} color="currentColor" className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Use a strong, unique password for your account</span>
          </li>
          <li className="flex items-start gap-2">
            <TickCircle size={16} color="currentColor" className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Enable two-factor authentication for enhanced security</span>
          </li>
          <li className="flex items-start gap-2">
            <TickCircle size={16} color="currentColor" className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Store your backup codes in a secure location</span>
          </li>
          <li className="flex items-start gap-2">
            <TickCircle size={16} color="currentColor" className="text-blue-600 flex-shrink-0 mt-0.5" />
            <span>Never share your authentication codes with anyone</span>
          </li>
        </ul>
      </div>

      {/* MFA Setup Modal */}
      <MfaSetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        onSetupComplete={handleSetupComplete}
        setupData={setupData}
        onEnableMfa={handleEnableMfa}
        isEnabling={enableMutation.isPending}
      />

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDisableModal(false)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash size={20} color="currentColor" className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Disable 2FA</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to disable two-factor authentication? This will make your
              account less secure.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your 6-digit authentication code
              </label>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => {
                  setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setDisableError(null);
                }}
                placeholder="000000"
                maxLength={6}
                className={`w-full px-4 py-3 text-center text-xl font-mono tracking-[0.5em] border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  disableError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {disableError && (
                <p className="text-sm text-red-600 mt-2">{disableError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                disabled={disableMutation.isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableMfa}
                disabled={disableMutation.isPending || disableCode.length !== 6}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {disableMutation.isPending ? (
                  <>
                    <Refresh size="16" color="currentColor" className="animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBackupCodes(false)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Key size={20} color="currentColor" className="text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">New Backup Codes</h3>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <Warning2 size={18} color="currentColor" className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Your previous backup codes are now invalid. Save these new codes securely.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm"
                >
                  <Key size={14} color="currentColor" className="text-gray-400" />
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCopyBackupCodes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {copiedBackupCodes ? (
                  <>
                    <TickCircle size={16} color="currentColor" className="text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} color="currentColor" />
                    Copy All
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Download
              </button>
            </div>

            <button
              onClick={() => setShowBackupCodes(false)}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <TickCircle size={18} color="currentColor" />
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}

      {/* MFA Verification for Backup Codes */}
      <MfaVerificationModal
        open={showMfaForBackupCodes}
        onOpenChange={setShowMfaForBackupCodes}
        onVerified={handleMfaVerifiedForBackupCodes}
        actionName="Regenerate Backup Codes"
        actionDescription="This will invalidate all existing backup codes. Enter your MFA code to continue."
      />
    </DashboardLayout>
  );
}
