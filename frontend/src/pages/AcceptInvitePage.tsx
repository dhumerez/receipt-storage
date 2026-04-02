import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { apiClient, setAccessToken } from '../api/client.ts';
import { AUTH } from '../constants/strings/auth.ts';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      const data = await apiClient<{ accessToken: string }>('/api/auth/accept-invite', {
        method: 'POST',
        json: { token, password, fullName },
      });
      setAccessToken(data.accessToken);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH.failedToAcceptInvite);
    } finally {
      setSubmitting(false);
    }
  }, [token, fullName, password, passwordConfirm, navigate]);

  // No token in URL — invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{AUTH.invalidLink}</h2>
          <p className="text-gray-500 text-sm">
            {AUTH.inviteLinkMissingToken}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{AUTH.acceptInviteTitle}</h2>
        <p className="text-gray-500 text-sm mb-6">{AUTH.acceptInviteSubtitle}</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              {AUTH.fullNameLabel}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {AUTH.passwordLabel}
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
              {AUTH.confirmPasswordLabel}
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
            {submitting ? AUTH.settingUpAccount : AUTH.createAccount}
          </button>
        </form>
      </div>
    </div>
  );
}
