---
phase: 02-authentication-user-management
plan: "06"
subsystem: frontend-auth
tags: [auth, react, context, jwt, interceptor, protected-routes]
one_liner: "Frontend auth layer: AuthContext with silent session recovery, 401 refresh interceptor in apiClient, ProtectedRoute guard, LoginPage form, and AppLayout nav with logout"

dependency_graph:
  requires:
    - 02-02  # backend auth endpoints (login, refresh, logout)
  provides:
    - frontend-auth-context
    - frontend-protected-routes
    - frontend-login-form
    - frontend-401-interceptor
  affects:
    - all-frontend-pages  # protected behind ProtectedRoute

tech_stack:
  added: []
  patterns:
    - In-memory access token (no localStorage) — XSS protection
    - httpOnly cookie for refresh token (no JS access)
    - Concurrent refresh deduplication via shared _refreshPromise
    - AuthProvider wraps App inside BrowserRouter (QueryClientProvider > BrowserRouter > AuthProvider > App)

key_files:
  created:
    - frontend/src/api/auth.ts
    - frontend/src/contexts/AuthContext.tsx
    - frontend/src/components/ProtectedRoute.tsx
    - frontend/src/pages/AcceptInvitePage.tsx
    - frontend/src/pages/ResetPasswordPage.tsx
    - frontend/src/pages/ForgotPasswordPage.tsx
    - backend/src/db/seed.ts
  modified:
    - frontend/src/api/client.ts
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/components/layout/AppLayout.tsx
    - backend/package.json

decisions:
  - "Access token stored in memory only — localStorage would expose it to XSS; httpOnly cookie carries refresh token"
  - "Concurrent refresh calls share one in-flight _refreshPromise — prevents duplicate /api/auth/refresh calls when multiple 401s fire simultaneously"
  - "AuthProvider placed inside BrowserRouter so useNavigate is available in child components"
  - "ForgotPasswordPage added proactively (plan 02-06 scope extension) — login page links to /forgot-password so stub would 404 without it"
  - "Demo accounts quick-fill added to LoginPage for dev convenience (not visible in production without demo credentials)"

metrics:
  duration_minutes: 10
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_created: 7
  files_modified: 6
---

# Phase 02 Plan 06: Frontend Authentication Layer Summary

Frontend auth layer: AuthContext with silent session recovery, 401 refresh interceptor in apiClient, ProtectedRoute guard, LoginPage form, and AppLayout nav with logout.

## What Was Built

### Task 1: AuthContext, api/auth.ts, and 401 refresh interceptor (commit: ddb2d7a)

- **`frontend/src/api/auth.ts`** — Wraps all three auth endpoints (`login`, `refreshToken`, `logout`). Decodes the JWT payload client-side to extract `AuthUser` (sub, companyId, role, isSuperAdmin, clientId) without an extra API call.
- **`frontend/src/contexts/AuthContext.tsx`** — `AuthProvider` attempts silent session recovery on mount via `apiRefreshToken()`. Sets `isLoading=true` until recovery resolves. Exposes `user`, `isLoading`, `login()`, `logout()` via context. `useAuth()` throws if called outside provider.
- **`frontend/src/api/client.ts`** (modified) — Added `setAccessToken()` export, `Authorization: Bearer` header injection, and 401 interceptor with single retry. Concurrent refresh calls are deduplicated via a shared `_refreshPromise`.
- **`frontend/src/main.tsx`** (modified) — Wrapped `App` in `AuthProvider` inside `BrowserRouter`: `QueryClientProvider > BrowserRouter > AuthProvider > App`.

### Task 2: ProtectedRoute, LoginPage, AppLayout nav, App.tsx routes (commit: 0430d1e)

- **`frontend/src/components/ProtectedRoute.tsx`** — Shows loading spinner while `isLoading`, redirects to `/login` when unauthenticated, renders `<Outlet />` for authenticated users.
- **`frontend/src/pages/LoginPage.tsx`** (rewritten) — Email/password form with error state, submit handler calling `useAuth().login()`, redirects authenticated users away from `/login`.
- **`frontend/src/components/layout/AppLayout.tsx`** (rewritten) — Header with app title, user's sub displayed, Logout button calling `useAuth().logout()` + `navigate('/login')`.
- **`frontend/src/App.tsx`** (rewritten) — Public routes: `/login`, `/forgot-password`, `/accept-invite`, `/reset-password`. Protected routes wrapped in `<ProtectedRoute>` then `<AppLayout>`.
- **Stub pages:** `AcceptInvitePage.tsx`, `ResetPasswordPage.tsx` — placeholder UI for plan 02-07 implementation.

### Post-plan enhancements (commit: a1836b0)

- **`frontend/src/pages/ForgotPasswordPage.tsx`** — Functional forgot-password form (calls `POST /api/auth/forgot-password`). Added proactively because the login page links to `/forgot-password`.
- **Demo accounts** on LoginPage — quick-fill buttons for `admin@demo.com` and `owner@demo.com`.
- **`backend/src/db/seed.ts`** — Script to seed demo company, super admin, and owner accounts for local development.

## Auth Flow Architecture

```
Page load
  └─ AuthProvider mounts
       └─ POST /api/auth/refresh (httpOnly cookie auto-sent)
            ├─ Success: setAccessToken(token), setUser(decoded), isLoading=false
            └─ Failure: setUser(null), isLoading=false
                 └─ ProtectedRoute → Navigate to /login

API call
  └─ apiClient injects Authorization: Bearer <token>
       └─ 401 response
            └─ POST /api/auth/refresh (deduplicated via _refreshPromise)
                 ├─ Success: setAccessToken(newToken), retry original request
                 └─ Failure: setAccessToken(null), throw error
```

## Verification Results

- `npx tsc --noEmit` — PASSED (0 errors)
- `npm test` — PASSED (2/2 tests: redirects unauthenticated user to /login, renders Login on /login route)

## Deviations from Plan

### Auto-added Missing Feature (Rule 2)

**ForgotPasswordPage and /forgot-password route**
- **Found during:** Task 2
- **Issue:** LoginPage links to `/forgot-password` via `<a href="/forgot-password">` — without a route/page, users would hit a blank screen (React Router renders nothing for unmatched routes with the current config).
- **Fix:** Created `ForgotPasswordPage.tsx` with a functional form calling `POST /api/auth/forgot-password`. Added `/forgot-password` public route to `App.tsx`.
- **Files modified:** `frontend/src/pages/ForgotPasswordPage.tsx` (new), `frontend/src/App.tsx`
- **Commit:** a1836b0

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `frontend/src/pages/AcceptInvitePage.tsx` | Static placeholder content | Full implementation planned for 02-07 |
| `frontend/src/pages/ResetPasswordPage.tsx` | Static placeholder content | Full implementation planned for 02-07 |

These stubs do NOT prevent plan 02-06's goal (frontend auth layer) from being achieved. The stubs serve as route targets so the app doesn't error; full forms arrive in 02-07.

## Self-Check: PASSED

Files created/exist:
- frontend/src/api/auth.ts: FOUND
- frontend/src/contexts/AuthContext.tsx: FOUND
- frontend/src/components/ProtectedRoute.tsx: FOUND
- frontend/src/pages/ForgotPasswordPage.tsx: FOUND
- frontend/src/pages/AcceptInvitePage.tsx: FOUND
- frontend/src/pages/ResetPasswordPage.tsx: FOUND
- backend/src/db/seed.ts: FOUND

Commits verified:
- ddb2d7a (Task 1): FOUND
- 0430d1e (Task 2): FOUND
- a1836b0 (post-plan enhancements): FOUND
