// Base URL: empty string in dev (Vite proxy handles /api → localhost:4000)
//            full URL in production via VITE_API_URL env var
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface ApiOptions extends RequestInit {
  json?: unknown;
}

/**
 * Thin fetch wrapper.
 * - Always sends credentials (httpOnly cookie for auth token in Phase 2)
 * - Sets Content-Type: application/json when json option provided
 * - Throws an Error with the response body on non-2xx responses
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { json, headers, ...rest } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({
      error: response.statusText,
    }));
    throw new Error(
      (errorBody as { error?: string }).error ?? `HTTP ${response.status}`,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
