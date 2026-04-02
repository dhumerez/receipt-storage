import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { apiClient } from '../api/client.ts';
import { AUTH } from '../constants/strings/auth.ts';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError(AUTH.passwordsDoNotMatch);
      return;
    }
    if (password.length < 8) {
      setError(AUTH.passwordMinLength);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient('/api/auth/reset-password', {
        method: 'POST',
        json: { token, newPassword: password },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH.failedToResetPassword);
    } finally {
      setSubmitting(false);
    }
  }, [token, password, passwordConfirm]);

  // No token in URL — invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{AUTH.invalidLink}</h2>
          <p className="text-gray-500 text-sm">
            {AUTH.resetLinkMissingToken}
          </p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
            {AUTH.backToLogin}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{AUTH.passwordResetSuccess}</h2>
          <p className="text-gray-600 text-sm mb-4">
            {AUTH.passwordResetSuccessMessage}
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            {AUTH.goToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{AUTH.resetPasswordTitle}</h2>
        <p className="text-gray-500 text-sm mb-6">{AUTH.resetPasswordSubtitle}</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {AUTH.newPasswordLabel}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
              {AUTH.confirmNewPasswordLabel}
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? AUTH.resetting : AUTH.resetPassword}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <a href="/login" className="text-blue-600 hover:underline">
            {AUTH.backToLogin}
          </a>
        </p>
      </div>
    </div>
  );
}
