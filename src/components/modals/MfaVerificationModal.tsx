import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ShieldTick, Refresh } from 'iconsax-react';
import { authService } from '@/services/authService';

// =============================================================================
// Types
// =============================================================================

interface MfaVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (actionToken: string) => void;
  actionName?: string;
  actionDescription?: string;
}

// =============================================================================
// MFA Verification Modal Component
// =============================================================================

export function MfaVerificationModal({
  open,
  onOpenChange,
  onVerified,
  actionName = 'Sensitive Action',
  actionDescription = 'This action requires MFA verification to proceed.',
}: MfaVerificationModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (open) {
      setCode(['', '', '', '', '', '']);
      setError(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
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

      // Focus appropriate input
      if (pastedData.length < 6) {
        inputRefs.current[pastedData.length]?.focus();
      } else {
        // Auto-submit
        handleVerify(pastedData);
      }
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const fullCode = verificationCode || code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.verifyActionMfa(fullCode, actionName);
      if (result.success && result.actionToken) {
        onVerified(result.actionToken);
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid MFA code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCode(['', '', '', '', '', '']);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ShieldTick className="text-amber-600"  size="20" color="currentColor" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              MFA Verification Required
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium text-gray-900">{actionName}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {actionDescription}
          </p>

          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit code from your authenticator app
            </p>

            {/* OTP Input */}
            <div className="flex gap-2 mb-4" onPaste={handlePaste}>
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
                  disabled={isLoading}
                  className={`w-12 h-14 text-center text-xl font-semibold border rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            {/* Backup code hint */}
            <p className="text-xs text-gray-400 text-center">
              You can also use a backup code if you don't have access to your authenticator app
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={isLoading || code.join('').length !== 6}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Refresh className="animate-spin"  size="16" color="currentColor" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MfaVerificationModal;
