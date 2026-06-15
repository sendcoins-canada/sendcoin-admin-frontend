import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldTick, Refresh, Copy, TickCircle, Warning2, Key } from 'iconsax-react';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface MfaSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupComplete: () => void;
  setupData: {
    secret?: string;
    qrCodeUrl?: string;
    qrCode?: string; // backend returns qrCode (data URL)
    backupCodes?: string[]; // only present after enable step
  } | null;
  onEnableMfa: (code: string) => Promise<void>;
  isEnabling: boolean;
}

type SetupStep = 'scan' | 'verify' | 'backup';

// =============================================================================
// MFA Setup Modal Component
// =============================================================================

export function MfaSetupModal({
  open,
  onOpenChange,
  onSetupComplete,
  setupData,
  onEnableMfa,
  isEnabling,
}: MfaSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('scan');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('scan');
      setCode(['', '', '', '', '', '']);
      setError(null);
      setCopiedSecret(false);
      setCopiedBackupCodes(false);
    }
  }, [open]);

  // Focus first input when entering verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleInputChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);
      setError(null);

      if (pastedData.length < 6) {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const handleCopySecret = async () => {
    const s = setupData?.secret ?? '';
    if (s) {
      await navigator.clipboard.writeText(s);
      setCopiedSecret(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = async () => {
    const codes = setupData?.backupCodes ?? [];
    if (codes.length) {
      const codesText = codes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedBackupCodes(true);
      toast.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedBackupCodes(false), 2000);
    }
  };

  const handleDownloadBackupCodes = () => {
    const codes = setupData?.backupCodes ?? [];
    if (codes.length) {
      const codesText = `SendCoins Admin MFA Backup Codes\n${'='.repeat(40)}\n\nKeep these codes safe. Each code can only be used once.\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nGenerated: ${new Date().toISOString()}`;
      const blob = new Blob([codesText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sendcoins-mfa-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    try {
      await onEnableMfa(fullCode);
      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleComplete = () => {
    onSetupComplete();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (step === 'backup') {
      // If on backup step, they've already enabled MFA, so complete
      handleComplete();
    } else {
      onOpenChange(false);
    }
  };

  if (!setupData) return null;

  const qrCodeSrc = setupData.qrCode ?? setupData.qrCodeUrl ?? '';
  const backupCodesList = setupData.backupCodes ?? [];
  const secret = setupData.secret ?? '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ShieldTick className="text-blue-600"  size="20" color="currentColor" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {step === 'scan' && 'Set Up Two-Factor Authentication'}
              {step === 'verify' && 'Verify Your Authenticator'}
              {step === 'backup' && 'Save Your Backup Codes'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {['scan', 'verify', 'backup'].map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['scan', 'verify', 'backup'].indexOf(step) > i
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {['scan', 'verify', 'backup'].indexOf(step) > i ? (
                  <TickCircle size={16} color="currentColor" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 ${
                    ['scan', 'verify', 'backup'].indexOf(step) > i
                      ? 'bg-green-300'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Scan QR Code */}
        {step === 'scan' && (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                <img
                  src={qrCodeSrc}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Manual Entry */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2 text-center">
                Can't scan? Enter this code manually:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm tracking-wider">
                  {secret}
                </code>
                <button
                  onClick={handleCopySecret}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copy secret"
                >
                  {copiedSecret ? (
                    <TickCircle size={18} color="currentColor" className="text-green-600" />
                  ) : (
                    <Copy size={18} color="currentColor" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-6 text-center">
              Enter the 6-digit code from your authenticator app to verify setup
            </p>

            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isEnabling}
                  className={`w-12 h-14 text-center text-xl font-semibold border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center mb-4">{error}</p>
            )}
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 'backup' && (
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <Warning2 size={20} color="currentColor" className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Save these backup codes</p>
                <p className="text-amber-700 mt-1">
                  If you lose access to your authenticator app, you can use these codes to sign in.
                  Each code can only be used once. Store them securely.
                </p>
              </div>
            </div>

            {/* Backup Codes Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodesList.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg font-mono text-sm"
                >
                  <Key size={14} color="currentColor" className="text-gray-400" />
                  {code}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
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
          </div>
        )}

        <DialogFooter className="flex gap-3 sm:gap-3">
          {step === 'scan' && (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Next: Verify Code
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <button
                type="button"
                onClick={() => setStep('scan')}
                disabled={isEnabling}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isEnabling || code.join('').length !== 6}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isEnabling ? (
                  <>
                    <Refresh className="animate-spin"  size="16" color="currentColor" />
                    Verifying...
                  </>
                ) : (
                  'Enable MFA'
                )}
              </button>
            </>
          )}

          {step === 'backup' && (
            <button
              type="button"
              onClick={handleComplete}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <TickCircle size={18} color="currentColor" />
              I've Saved My Backup Codes
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MfaSetupModal;
