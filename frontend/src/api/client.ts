const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// In-memory access token — NOT localStorage (XSS protection)
let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

interface ApiOptions extends RequestInit {
  json?: unknown;
  _isRetry?: boolean; // internal flag — prevents infinite retry loop
}

/**
 * Thin fetch wrapper.
 * - Injects Authorization: Bearer <accessToken> when token is in memory
 * - Always sends credentials (httpOnly refresh cookie)
 * - On 401: silently refreshes once, then retries the original request
 * - Throws an Error with the response body on non-2xx responses (after retry)
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { json, headers, _isRetry = false, ...rest } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  // 401 handling: silently refresh and retry once
  if (response.status === 401 && !_isRetry) {
    try {
      // Guard against concurrent refresh calls — share in-flight promise
      if (!_refreshPromise) {
        _refreshPromise = fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
          .then(async (r) => {
            if (!r.ok) return null;
            const data = await r.json();
            return data.accessToken as string;
          })
          .finally(() => {
            _refreshPromise = null;
          });
      }
      const newToken = await _refreshPromise;
      if (newToken) {
        setAccessToken(newToken);
        // Retry original request with new token
        return apiClient<T>(path, { ...options, _isRetry: true });
      }
    } catch {
      // Refresh failed — fall through to throw
    }
    // Clear stale token
    setAccessToken(null);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      error: response.statusText,
    }));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`,
    );
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
