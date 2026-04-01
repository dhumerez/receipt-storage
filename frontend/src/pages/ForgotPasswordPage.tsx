import { useState, useCallback } from 'react';
import { apiClient } from '../api/client.ts';
import { AUTH } from '../constants/strings/auth.ts';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient('/api/auth/forgot-password', {
        method: 'POST',
        json: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH.somethingWentWrong);
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{AUTH.checkYourEmail}</h2>
          <p className="text-gray-500 text-sm">
            {AUTH.resetLinkSent(email)}
          </p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
            {AUTH.backToLogin}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{AUTH.forgotPasswordTitle}</h2>
        <p className="text-gray-500 text-sm mb-6">
          {AUTH.forgotPasswordSubtitle}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {AUTH.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? AUTH.sending : AUTH.sendResetLink}
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
