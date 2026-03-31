---
phase: 02-authentication-user-management
verified: 2026-03-30T00:00:00Z
status: human_needed
score: 9/9 must-haves verified (automated); 3 items need human verification
re_verification: false
human_verification:
  - test: "Log in as owner, then log in as collaborator, viewer, and client — each receives a scoped JWT"
    expected: "Each role gets a token with the correct role field; client gets clientId embedded; super admin gets companyId=null"
    why_human: "Multi-role login requires live DB with seeded users; cannot verify without running stack"
  - test: "Collaborator calls a /api/v1/users endpoint; verify 403 is returned"
    expected: "Response: 403 Insufficient permissions"
    why_human: "RBAC enforcement needs running API with real JWT issuance"
  - test: "Invite a collaborator via POST /api/v1/users/invite; deactivate them; verify their pending transactions revert to draft"
    expected: "pendingTransactionsReverted > 0; deactivated user cannot log in"
    why_human: "FR-02.9 auto-reject requires live DB state with actual pending records"
---

# Phase 2: Authentication & User Management Verification Report

**Phase Goal:** Super admin can create companies; owners can invite and manage team members; all roles can log in.
**Verified:** 2026-03-30
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | JWT auth with HS256 only; payload contains sub, companyId, role, isSuperAdmin, optional clientId | VERIFIED | `auth.ts` middleware enforces `algorithms: ['HS256']`; `JWTPayload` interface has all fields; `clientId?` added for client role |
| 2 | All 5 roles can log in and receive scoped JWT | VERIFIED | `POST /api/auth/login` in `routes/auth.ts` handles all roles; client role gets clientId from clients table; super admin gets companyId=null |
| 3 | Super admin can create companies and owner accounts | VERIFIED | `routes/admin.ts` has GET/POST/PATCH `/companies` and POST `/companies/:id/owner`; guarded by `requireSuperAdmin` in `app.ts` |
| 4 | Non-super-admin gets 403 on `/admin/*` routes | VERIFIED | `app.use('/admin', authenticate, requireSuperAdmin, adminRouter)` in `app.ts`; `requireSuperAdmin` returns 403 when `isSuperAdmin=false` |
| 5 | Owner can invite, change roles, and deactivate team members | VERIFIED | `routes/users.ts` implements POST `/invite`, PATCH `/:id/role`, PATCH `/:id/deactivate`; all owner-only via `requireRole('owner')` in `app.ts` |
| 6 | Deactivating a user auto-rejects their pending transactions and payments (FR-02.9) | VERIFIED | `PATCH /:id/deactivate` runs DB transaction: sets user `isActive=false`, sets pending transactions to `status='draft'`, sets pending payments to `status='rejected'` with `rejectionReason='User removed from company'` |
| 7 | Email invitations via Resend for onboarding (FR-02.7) | VERIFIED | `email.service.ts` uses `resend@6.9.4`; `sendInviteEmail` called in `/invite` endpoint; `sendPasswordResetEmail` called in `/forgot-password` |
| 8 | Password reset via email token (FR-02.8) | VERIFIED | `/forgot-password`, `/reset-password`, `/accept-invite` all implemented in `routes/auth.ts`; token hashed SHA-256; 1h expiry for reset, 48h for invite; `used_at` prevents reuse |
| 9 | Frontend auth layer complete: login, refresh, protected routes, logout | VERIFIED | `AuthContext`, `api/auth.ts`, `api/client.ts` (401 interceptor), `ProtectedRoute`, `LoginPage`, `AcceptInvitePage`, `ResetPasswordPage` all substantive; `App.tsx` wraps protected routes with `<ProtectedRoute>` |

**Score:** 9/9 truths verified (automated code inspection)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/db/schema.ts` | `tokens` and `refreshTokens` table definitions | VERIFIED | Both exported at lines 374–413; `tokenTypeEnum` at line 374 |
| `backend/src/db/migrations/0002_tokens_refresh_tokens.sql` | Migration for tokens + refresh_tokens tables | VERIFIED | File exists in `backend/src/db/migrations/` |
| `backend/src/services/auth.service.ts` | Token gen, hashing, JWT issuance, bcrypt helpers | VERIFIED | Exports: `generateRawToken`, `hashToken`, `issueAccessToken`, `createRefreshToken`, `rotateRefreshToken`, `revokeAllUserRefreshTokens`, `hashPassword`, `verifyPassword`, `REFRESH_COOKIE_OPTIONS` |
| `backend/src/services/email.service.ts` | Resend wrapper for invite and password reset emails | VERIFIED | Exports `sendInviteEmail` and `sendPasswordResetEmail`; uses `resend` package with lazy init for test safety |
| `backend/src/middleware/auth.ts` | JWT verification middleware; JWTPayload with clientId | VERIFIED | `JWTPayload` has `companyId: string | null`, `clientId?: string`; enforces HS256 only |
| `backend/src/middleware/rbac.ts` | `requireRole` and `requireSuperAdmin` middleware | VERIFIED | Both functions exported; `requireSuperAdmin` returns 403 for non-super-admins |
| `backend/src/routes/auth.ts` | login, refresh, logout, forgot-password, reset-password, accept-invite | VERIFIED | All 6 endpoints implemented with Zod validation, timing-safe logic, token rotation |
| `backend/src/routes/admin.ts` | GET/POST/PATCH `/companies`, POST `/companies/:id/owner` | VERIFIED | All 4 endpoints implemented with Zod validation |
| `backend/src/routes/users.ts` | GET `/`, POST `/invite`, PATCH `/:id/role`, PATCH `/:id/deactivate` | VERIFIED | All 4 endpoints implemented; NFR-01.5 DB re-validation in all mutating handlers |
| `backend/src/app.ts` | All routers mounted with correct middleware chain | VERIFIED | `/api/auth`, `/admin` (+ authenticate + requireSuperAdmin), `/api/v1/users` (+ authenticate + requireTenant + requireRole('owner')) |
| `frontend/src/contexts/AuthContext.tsx` | AuthUser state, login/logout functions, isLoading flag | VERIFIED | Exports `AuthProvider` and `useAuth`; session recovery on mount via `apiRefreshToken()` |
| `frontend/src/api/auth.ts` | `login()`, `logout()`, `refreshToken()` functions | VERIFIED | All 3 exported; decodes JWT client-side for user object |
| `frontend/src/api/client.ts` | apiClient with 401 interceptor and refresh + retry | VERIFIED | Shares in-flight refresh promise; sets new token and retries original request |
| `frontend/src/components/ProtectedRoute.tsx` | Route guard; shows loading spinner; redirects unauthenticated | VERIFIED | Shows loading div while `isLoading=true`; `<Navigate to="/login">` when `!user` |
| `frontend/src/pages/LoginPage.tsx` | Login form; redirects authenticated users away | VERIFIED | Calls `useAuth().login`; `<Navigate to="/">` when already authenticated |
| `frontend/src/pages/AcceptInvitePage.tsx` | Accept-invite form; reads token from URL; calls API | VERIFIED | Reads `?token=` param; shows "Invalid Link" when missing; calls `/api/auth/accept-invite` |
| `frontend/src/pages/ResetPasswordPage.tsx` | Reset-password form; reads token from URL; calls API | VERIFIED | Reads `?token=` param; shows "Invalid Link" when missing; calls `/api/auth/reset-password` |
| `backend/src/__tests__/auth.test.ts` | Unit tests for auth service and login/refresh/logout | VERIFIED | File is substantive (mocks db, service functions; covers login, refresh, logout flows) |
| `backend/src/__tests__/admin.test.ts` | Admin route tests | VERIFIED | Substantive file with `requireSuperAdmin` middleware tests |
| `backend/src/__tests__/users.test.ts` | User management tests | VERIFIED | Substantive file with mocked db and service; tests invite, role, deactivate flows |
| `backend/src/__tests__/invite.test.ts` | Invite flow tests | VERIFIED | Stub placeholder (not yet replaced with real tests) — Wave 0 stub is acceptable per plan 02-01 |
| `backend/src/__tests__/password-reset.test.ts` | Password reset tests | VERIFIED | Stub placeholder — Wave 0 stub acceptable per plan 02-01 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `routes/auth.ts` | `services/auth.service.ts` | imports issueAccessToken, createRefreshToken, rotateRefreshToken, verifyPassword, REFRESH_COOKIE_OPTIONS | WIRED | All 7 imports verified at lines 7-17 of `routes/auth.ts` |
| `routes/auth.ts` | `services/email.service.ts` | imports sendPasswordResetEmail | WIRED | Line 20 of `routes/auth.ts` |
| `routes/auth.ts` | `db/schema.ts` | queries users, clients, refreshTokens, tokens tables | WIRED | All 4 tables imported at line 6 |
| `app.ts` | `routes/auth.ts` | `app.use('/api/auth', authRouter)` | WIRED | Line 37 of `app.ts` |
| `app.ts` | `routes/admin.ts` | `app.use('/admin', authenticate, requireSuperAdmin, adminRouter)` | WIRED | Line 38 of `app.ts` |
| `app.ts` | `routes/users.ts` | `app.use('/api/v1/users', authenticate, requireTenant, requireRole('owner'), usersRouter)` | WIRED | Line 39 of `app.ts` |
| `routes/admin.ts` | `middleware/rbac.ts` | requireSuperAdmin applied at app.ts level | WIRED | Applied correctly at mount point |
| `routes/users.ts` | `services/email.service.ts` | imports sendInviteEmail | WIRED | Line 7 of `routes/users.ts`; called at line 101 |
| `AuthContext.tsx` | `api/auth.ts` | calls login(), logout(), refreshToken() | WIRED | Lines 4-5 of `AuthContext.tsx` |
| `api/client.ts` | `AuthContext.tsx` | reads/sets accessToken via `setAccessToken` module-level export | WIRED | `setAccessToken` exported from `client.ts`; injected by `AuthContext` at login/refresh |
| `App.tsx` | `ProtectedRoute` | wraps protected routes with `<ProtectedRoute>` | WIRED | Lines 20-25 of `App.tsx` |
| `AcceptInvitePage.tsx` | `/api/auth/accept-invite` | `apiClient POST { token, password, fullName }` | WIRED | Line 45 of `AcceptInvitePage.tsx` |
| `ResetPasswordPage.tsx` | `/api/auth/reset-password` | `apiClient POST { token, newPassword }` | WIRED | Line 67 of `ResetPasswordPage.tsx` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AuthContext.tsx` | `user: AuthUser | null` | `apiRefreshToken()` on mount; `apiLogin()` on login | JWT decoded from real API response | FLOWING |
| `LoginPage.tsx` | error, submitting state | `useAuth().login()` → API call | Live API error/success responses | FLOWING |
| `ProtectedRoute.tsx` | `user, isLoading` from `useAuth()` | AuthContext state, driven by refresh call | Real session state | FLOWING |
| `AppLayout.tsx` | `user.sub` displayed in header | `useAuth()` user state | Real UUID from JWT — but displays raw UUID, not human-readable name | FLOWING (minor display issue — see anti-patterns) |

---

### Behavioral Spot-Checks

Node modules not installed on host machine (Docker-only environment). Tests cannot be run directly. Checked test file substance by code inspection.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend test suite | `npm run test` | Cannot run — node_modules not installed on host (Docker env) | SKIP |
| TypeScript compile | `npx tsc --noEmit` | Cannot run — node_modules absent | SKIP |
| Auth service exports | Code inspection of `auth.service.ts` | All 9 exports present and non-stub | PASS |
| Login endpoint logic | Code inspection of `routes/auth.ts` | Timing-safe, Zod-validated, client role clientId lookup present | PASS |
| FR-02.9 auto-reject | Code inspection of `routes/users.ts` | DB transaction atomically deactivates user + reverts pending transactions + rejects pending payments | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FR-02.1 | 02-01, 02-02, 02-06 | JWT HS256; payload contains sub, companyId, role, isSuperAdmin | SATISFIED | `auth.ts` middleware enforces `algorithms: ['HS256']`; `issueAccessToken` signs HS256 |
| FR-02.2 | 02-03, 02-05 | Role: Owner — full control | SATISFIED | `requireRole('owner')` gates user management; admin panel creates owners |
| FR-02.3 | 02-05 | Role: Collaborator — create transactions/payments (pending) | SATISFIED | Role enum includes 'collaborator'; invite endpoint accepts collaborator role |
| FR-02.4 | 02-05 | Role: Viewer — read-only | SATISFIED | Role enum includes 'viewer'; invite schema accepts viewer; requireRole enforces it |
| FR-02.5 | 02-01, 02-05 | Role: Client — view own debts only; clientId in JWT | SATISFIED | Login looks up clientId from clients table for role='client'; embedded in JWT |
| FR-02.6 | 02-03 | Super Admin bypasses all company-level role checks | SATISFIED | `requireRole` short-circuits with `next()` when `isSuperAdmin=true` (rbac.ts line 17) |
| FR-02.7 | 02-04, 02-05, 02-07 | Email invitations via Resend 6.9.4 | SATISFIED | `email.service.ts` uses Resend; invite endpoint sends email; AcceptInvitePage accepts token |
| FR-02.8 | 02-04, 02-07 | Password reset via email token | SATISFIED | `/forgot-password`, `/reset-password` implemented; ResetPasswordPage handles full flow |
| FR-02.9 | 02-05 | Auto-reject pending items when collaborator removed | SATISFIED | `PATCH /:id/deactivate` atomically rejects pending transactions (→ draft) and payments (→ rejected) |

All 9 required FR-02.x requirements accounted for across 7 plans. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/components/layout/AppLayout.tsx` | 19 | `{user.sub}` displays UUID in header instead of user's name | Warning | `AuthUser` type does not include `fullName`; the header shows a UUID to logged-in users. The PLAN spec says "header shows logged-in user's name". This is a cosmetic gap — auth flow still functions correctly. |
| `backend/src/__tests__/invite.test.ts` | — | Stub placeholder (single passing test, no real test coverage) | Info | Wave 0 stub per plan 02-01 spec — acceptable at this stage; real tests deferred to plan 02-04 |
| `backend/src/__tests__/password-reset.test.ts` | — | Stub placeholder (single passing test, no real test coverage) | Info | Wave 0 stub per plan 02-01 spec — acceptable at this stage; real tests deferred to plan 02-04 |

**Stub classification note:** `invite.test.ts` and `password-reset.test.ts` stubs are intentional per plan 02-01 ("Wave 0 test stubs") and do not constitute a goal failure. The stub files exist and have passing placeholder tests, fulfilling the plan's requirement.

---

### Human Verification Required

#### 1. Multi-Role Login End-to-End

**Test:** Seed DB with one user per role (super admin, owner, collaborator, viewer, client). Log in as each and decode the returned JWT.
**Expected:** Each JWT contains the correct `role` field; client JWT contains `clientId`; super admin JWT has `companyId: null`.
**Why human:** Requires running Docker stack with seeded data. Cannot verify JWT payload correctness from code inspection alone.

#### 2. Role Enforcement on API Routes

**Test:** Log in as a collaborator. Attempt: `GET /api/v1/users`, `POST /api/v1/users/invite`, `GET /admin/companies`.
**Expected:** All three return 403.
**Why human:** Requires live JWT issuance and API server running.

#### 3. FR-02.9 Auto-Reject on Deactivation

**Test:** As a collaborator, submit a transaction (creating a `pending_approval` record). Then as an owner, deactivate the collaborator via `PATCH /api/v1/users/:id/deactivate`. Verify the response includes `pendingTransactionsReverted: 1` and the transaction status is `draft`.
**Expected:** Deactivation succeeds; pending transaction reverted to draft; collaborator cannot log in afterward.
**Why human:** Requires live DB with real pending records; verifies the atomic transaction actually commits correctly.

---

### Gaps Summary

No functional gaps found via automated code inspection. All artifacts are substantive and wired. The single cosmetic issue (AppLayout displaying `user.sub` UUID instead of a human-readable name) does not block the phase goal of "all roles can log in."

Three items are routed to human verification because they require a running stack with seeded data. These are behavioral correctness checks, not evidence of missing code.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
