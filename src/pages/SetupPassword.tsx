import React, { useState, useMemo, useEffect } from 'react';
import { Eye, EyeSlash, TickCircle } from 'iconsax-react';
import { Link, useLocation } from 'wouter';
import { authService } from '@/services/authService';
import { AppLogo } from '@/components/ui/AppLogo';

export default function SetupPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValidated, setTokenValidated] = useState<boolean | null>(null);

  const [pathname] = useLocation();
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') ?? '';
  }, [pathname]);

  const isTokenFlow = pathname === '/set-password' || pathname === '/reset-password';
  const isSetPasswordFlow = isTokenFlow || Boolean(token);
  const hasToken = Boolean(token);

  // Validate token on mount when we have one
  useEffect(() => {
    if (!hasToken) {
      setTokenValidated(false);
      return;
    }
    let cancelled = false;
    authService
      .validatePasswordToken(token)
      .then((res) => {
        if (!cancelled) setTokenValidated(res.valid);
      })
      .catch(() => {
        if (!cancelled) setTokenValidated(false);
      });
    return () => { cancelled = true; };
  }, [hasToken, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!hasToken) {
      setError('Invalid or expired link. Please use the link from your invite email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.setPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } } };
      const msg = ax?.response?.data?.message;
      const message = Array.isArray(msg) ? msg[0] : msg || (err instanceof Error ? err.message : 'Failed to set password. Link may be expired.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="mb-12 flex items-center gap-2">
          <AppLogo height={24} width={140} />
        </div>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password set successfully</h1>
          <p className="text-gray-500 mb-6">You can now sign in with your email and password.</p>
          <Link href="/login">
            <button type="button" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full">
              Go to login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if ((pathname === '/set-password' || pathname === '/reset-password') && !hasToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="mb-12 flex items-center gap-2">
          <AppLogo height={24} width={140} />
        </div>
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-500 mb-6">This link is invalid or has expired. Please request a new invite or password reset link.</p>
          <Link href="/login">
            <button type="button" className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-full">
              Back to login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (hasToken && tokenValidated === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="mb-12 flex items-center gap-2">
          <AppLogo height={24} width={140} />
        </div>
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-500 mb-6">This link is invalid or has expired. Please request a new invite or password reset link.</p>
          <Link href="/login">
            <button type="button" className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-full">
              Back to login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (hasToken && tokenValidated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="mb-12 flex items-center gap-2">
          <AppLogo height={24} width={140} />
        </div>
        <div className="w-full max-w-md text-center">
          <p className="text-gray-500">Validating link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="mb-12 flex items-center gap-2">
        <AppLogo height={24} width={140} />
      </div>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-3xl">🔐</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set your password</h1>
          <p className="text-gray-500">Create a strong password so only you can access your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-lg">⌨</div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="New password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeSlash size="20" color="currentColor" /> : <Eye size="20" color="currentColor" />}
            </button>
          </div>

          {isSetPasswordFlow && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-lg">⌨</div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Confirm password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeSlash size="20" color="currentColor" /> : <Eye size="20" color="currentColor" />}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {[
              'Must be at least 8 characters',
              'A mix of uppercase and lowercase letters',
              'At least one number',
              'A symbol (like ! or @)',
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center">
                  <TickCircle size="12" color="currentColor" variant="Bold" className="text-purple-600" />
                </div>
                <span>{req}</span>
              </div>
            ))}
          </div>

          {isSetPasswordFlow ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {loading ? 'Setting password...' : 'Create password'}
            </button>
          ) : (
            <Link href="/confirm-password">
              <button type="button" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                Create password
              </button>
            </Link>
          )}
        </form>
      </div>
    </div>
  );
}
