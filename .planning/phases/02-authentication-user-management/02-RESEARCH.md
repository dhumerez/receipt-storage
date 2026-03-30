# Phase 2: Authentication & User Management - Research

**Researched:** 2026-03-30
**Domain:** JWT authentication, email invitations (Resend), RBAC, bcrypt, refresh tokens
**Confidence:** HIGH

---

## Summary

Phase 2 implements the complete auth stack for this multi-tenant SaaS: login, JWT access+refresh tokens, email-based invitations via Resend, password reset, super-admin panel, and role-based access control for 5 roles. The foundation (middleware, schema, frontend scaffold) is already built in Phase 1 — this phase wires it all together with real endpoints and UI.

The existing schema has `users`, `companies`, and all role enums but lacks `invite_tokens` and `refresh_tokens` tables. Those need Drizzle schema additions and a new migration. The existing `auth.ts`, `rbac.ts`, and `tenant.ts` middleware are complete and tested — Phase 2 uses them without modification.

The most critical constraint is Resend domain verification: DNS propagation can take up to 72 hours. The sub-task to add SPF/DKIM records must happen at the start of the phase, before any invitation or password-reset emails can be tested end-to-end.

**Primary recommendation:** Use access token (15-minute JWT in Authorization header) + refresh token (7-day opaque token stored hashed in DB, sent as httpOnly cookie). The `apiClient` in Phase 1 already uses `credentials: 'include'` so the cookie pattern works without further frontend changes.

---

## Project Constraints (from CLAUDE.md)

No CLAUDE.md exists in this project. Constraints are sourced from REQUIREMENTS.md and STATE.md active decisions.

### Locked Decisions from STATE.md

- `drizzle-orm` pinned to `0.45.2` — do not upgrade; 0.46.x and 1.x beta have breaking changes
- JWT signed HS256 only; `openssl rand -hex 64` secret; never stored in source code (FR-02.1, NFR-01.4)
- `company_id` always from verified JWT — never from request body or URL params (NFR-01.1)
- React Router v7 imports from `'react-router'` (not `'react-router-dom'`)
- Tailwind v4: no tailwind.config.js; CSS entry is `@import 'tailwindcss'`
- Provider order: `QueryClientProvider > BrowserRouter > App`
- `apiClient` uses `credentials: 'include'` (httpOnly cookie auth)
- Resend `6.9.4` is the pinned email library version (FR-02.7)
- Express 5.2.1 — async errors propagate to error handler automatically; no `asyncHandler` wrapper needed

### Locked Decisions from Requirements

- JWT payload MUST contain: `sub, companyId, role, isSuperAdmin` (FR-02.1)
- 5 roles: `owner`, `collaborator`, `viewer`, `client`, plus `isSuperAdmin` flag (FR-02.2–02.6)
- Invitation flow via Resend; invite token generation + validation (FR-02.7)
- Password reset token expiry: 1 hour (FR-02.8 + phase description)
- Super admin bypasses all company-level role checks (FR-02.6)
- When collaborator is removed: auto-reject all their pending items with reason logged (FR-02.9)
- Role re-validated from DB on sensitive operations — not just JWT claim (NFR-01.5)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-02.1 | JWT authentication with HS256; token contains sub, companyId, role, isSuperAdmin | jsonwebtoken 9.0.3 already in package.json; middleware already built |
| FR-02.2 | Owner role — full control | requireRole('owner') middleware exists; needs owner-only route wiring |
| FR-02.3 | Collaborator role — create transactions/payments pending approval | RBAC middleware exists; collaborator-scoped endpoints in later phases |
| FR-02.4 | Viewer role — read-only | requireRole guard pattern covers this |
| FR-02.5 | Client role — view own debts/payments; clientId in JWT | Client-specific JWT payload extension needed |
| FR-02.6 | Super admin bypasses all company-level checks | isSuperAdmin flag in middleware already handles this |
| FR-02.7 | Email invitations via Resend 6.9.4; invite token flow | Resend SDK pattern documented; invite_tokens table needed |
| FR-02.8 | Password reset via email token | Same token pattern as invites; 1-hour expiry |
| FR-02.9 | Auto-reject orphaned pending items on collaborator removal | DB transaction: update transactions + payments WHERE created_by/recorded_by = userId AND status = 'pending_approval' |
| FR-01.2 | Super admin panel: create/deactivate companies; create owner accounts | Protected /admin routes; isSuperAdmin guard |
| FR-01.4 | Company settings: name, currency code | Companies table already has these fields |
| NFR-01.5 | Role re-validated from DB on sensitive operations | Pattern: fetch user from DB in sensitive handlers, check isActive + role |
</phase_requirements>

---

## Standard Stack

### Core (already in package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonwebtoken | 9.0.3 | Sign/verify HS256 JWTs | Already installed; widely used; explicit algorithm enforcement |
| bcryptjs | 3.0.3 | Password hashing | Already installed; pure-JS bcrypt; no native build step needed |
| zod | 4.3.6 | Request validation | Already installed; TypeScript-first schema validation |
| resend | 6.9.4 | Transactional email | Project-pinned; simple SDK, no SMTP config needed |

### New Dependencies for Phase 2

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cookie-parser | 1.4.7 | Parse httpOnly refresh token cookie | Required for refresh token endpoint to read `req.cookies` |
| @types/cookie-parser | 1.4.10 | TypeScript types for cookie-parser | Dev dependency |

**Installation:**
```bash
npm install cookie-parser@1.4.7
npm install --save-dev @types/cookie-parser@1.4.10
```

**Version verification (done 2026-03-30):**
- `cookie-parser`: `1.4.7` (npm registry confirmed)
- `@types/cookie-parser`: `1.4.10` (npm registry confirmed)
- `jsonwebtoken`: `9.0.3` (already installed, confirmed)
- `bcryptjs`: `3.0.3` (already installed, confirmed)
- `resend`: `6.9.4` (already installed in project — not in backend/package.json yet, to be added)
- `zod`: `4.3.6` (already installed, confirmed)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsonwebtoken | jose | jose is ESM-native and lighter, but jsonwebtoken is already installed and team-familiar |
| bcryptjs | argon2 | argon2 is stronger but requires native bindings; bcryptjs is pure-JS, no build step |
| cookie-parser | built-in Express cookie parsing | cookie-parser gives typed `req.cookies`; Express 5 doesn't parse cookies natively |

---

## Architecture Patterns

### New Tables Needed (Drizzle Schema + Migration)

The current schema has no `invite_tokens` or `refresh_tokens` tables. Phase 2 must add both via a Drizzle migration.

```
invite_tokens
  id              uuid PK
  token_hash      varchar(255) NOT NULL  -- SHA-256 of raw token
  email           varchar(255) NOT NULL
  company_id      uuid REFERENCES companies(id) ON DELETE CASCADE
  invited_by      uuid REFERENCES users(id)
  role            user_role NOT NULL
  expires_at      timestamptz NOT NULL
  used_at         timestamptz            -- NULL = unused; set on first use
  created_at      timestamptz DEFAULT NOW()

refresh_tokens
  id              uuid PK
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  token_hash      varchar(255) NOT NULL  -- SHA-256 of raw token
  expires_at      timestamptz NOT NULL
  revoked_at      timestamptz            -- NULL = active; set on logout/rotation
  created_at      timestamptz DEFAULT NOW()
  INDEX on (user_id)
  INDEX on (token_hash)  -- frequent lookup by hash
```

**Why hash tokens in DB:** If the DB is compromised, raw tokens are immediately usable by an attacker. SHA-256 hash means the token is useless without the raw value.

### Token Strategy

```
ACCESS TOKEN (short-lived)
  - JWT, HS256, signed with JWT_SECRET
  - Payload: { sub, companyId, role, isSuperAdmin }
  - Expiry: 15 minutes
  - Sent: JSON response body on login / refresh
  - Stored: frontend memory (React context / useState) — NOT localStorage

REFRESH TOKEN (long-lived)
  - Opaque random bytes: crypto.randomBytes(64).toString('hex') → 128 hex chars
  - Stored: SHA-256 hash in refresh_tokens table
  - Sent: httpOnly, secure, sameSite:'strict', path:'/api/auth/refresh' cookie
  - Expiry: 7 days
  - Strategy: rotate on each use (old token revoked, new token issued)
```

### Token Rotation and Revocation

On each `/api/auth/refresh` call:
1. Read refresh token from cookie
2. Compute SHA-256 hash
3. Look up in `refresh_tokens` WHERE `token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`
4. If not found → 401 (stolen or expired token)
5. Mark old token as revoked (`revoked_at = NOW()`)
6. Issue new refresh token + new access token
7. Set new cookie

On logout:
1. Mark refresh token as revoked
2. Clear cookie with `res.clearCookie('refresh_token', { same options as set })`

### Invite Token Flow

```
1. Owner (or super admin) calls POST /api/v1/users/invite
   → generate: crypto.randomBytes(32).toString('hex') (64 hex chars)
   → store: SHA-256 hash, email, role, companyId, expires_at (48h for invites)
   → send: Resend email with raw token in URL: /accept-invite?token=<raw>

2. Invitee clicks link → GET /accept-invite?token=<raw>
   → frontend shows "set your password" form

3. POST /api/v1/auth/accept-invite
   → hash incoming token, look up in invite_tokens
   → validate: not expired, not used
   → create user record with bcrypt-hashed password
   → mark invite as used (used_at = NOW())
   → issue access + refresh tokens (log user in immediately)
```

### Password Reset Flow

```
1. POST /api/v1/auth/forgot-password  { email }
   → look up user by email
   → if found: generate token, store hash in invite_tokens (or separate password_reset_tokens)
     expires_at = NOW() + 1 hour
   → send Resend email with link: /reset-password?token=<raw>
   → ALWAYS return 200 (don't leak whether email exists)

2. POST /api/v1/auth/reset-password  { token, newPassword }
   → hash token, look up record
   → validate: not expired, not used
   → bcrypt hash new password, update user record
   → mark token as used
   → revoke all active refresh tokens for this user (force re-login)
```

**Note on table reuse:** Invite tokens and password reset tokens share the same pattern. A single `tokens` table with a `type` enum (`invite` | `password_reset`) is cleaner than two separate tables. Research recommendation: use one table.

### Super Admin Guard Pattern

Super admins have `companyId = NULL` in the DB (they don't belong to a company). The JWT for super admins should have `isSuperAdmin: true` and `companyId: null`. The `requireTenant` middleware must NOT be applied to admin routes.

```typescript
// Admin routes: authenticate but NOT requireTenant
router.use('/admin', authenticate, requireSuperAdmin, adminRouter);

function requireSuperAdmin(req, res, next) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}
```

### Route Structure

```
POST /api/auth/login                    — public
POST /api/auth/refresh                  — public (cookie only)
POST /api/auth/logout                   — authenticated
POST /api/auth/forgot-password          — public
POST /api/auth/reset-password           — public (token in body)
POST /api/auth/accept-invite            — public (token in body)

GET  /api/v1/users                      — authenticate + requireTenant + requireRole('owner')
POST /api/v1/users/invite               — authenticate + requireTenant + requireRole('owner')
PATCH /api/v1/users/:id/role            — authenticate + requireTenant + requireRole('owner')
PATCH /api/v1/users/:id/deactivate      — authenticate + requireTenant + requireRole('owner')

GET  /admin/companies                   — authenticate + requireSuperAdmin
POST /admin/companies                   — authenticate + requireSuperAdmin
PATCH /admin/companies/:id              — authenticate + requireSuperAdmin
POST /admin/companies/:id/owner         — authenticate + requireSuperAdmin
```

### Frontend Auth Context Pattern

```tsx
// src/contexts/AuthContext.tsx
interface AuthUser {
  sub: string;
  companyId: string | null;
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isSuperAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
```

**Access token storage in frontend:** Store in React state (memory only). On page refresh, call `/api/auth/refresh` (the httpOnly cookie is sent automatically) to recover the session. Show loading state until this check completes.

### Protected Route Pattern (React Router v7)

```tsx
// Source: React Router v7 docs + robinwieruch.de verified pattern
const ProtectedRoute = ({ redirectPath = '/login' }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to={redirectPath} replace />;
  return <Outlet />;
};

// Usage in App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/accept-invite" element={<AcceptInvitePage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<DashboardPage />} />
      {/* other protected routes */}
    </Route>
  </Route>
  <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin" />}>
    {/* admin routes */}
  </Route>
</Routes>
```

### Recommended Project Structure (Phase 2 additions)

```
backend/src/
├── routes/
│   ├── auth.ts            # login, refresh, logout, forgot-password, reset-password, accept-invite
│   ├── users.ts           # CRUD for users within a company (owner-only)
│   └── admin.ts           # super-admin company management
├── middleware/
│   ├── auth.ts            # EXISTS — no changes needed
│   ├── rbac.ts            # EXISTS — no changes needed
│   └── tenant.ts          # EXISTS — no changes needed
├── services/
│   ├── auth.service.ts    # token generation, hashing, validation logic
│   ├── email.service.ts   # Resend wrapper: sendInviteEmail, sendPasswordResetEmail
│   └── user.service.ts    # user lookup, role changes, deactivation
└── db/
    └── schema.ts          # ADD: tokens table (invite + password_reset)
                           # ADD: refresh_tokens table

frontend/src/
├── contexts/
│   └── AuthContext.tsx    # AuthUser state, login/logout, loading
├── pages/
│   ├── LoginPage.tsx      # EXISTS (stub) — implement form
│   ├── AcceptInvitePage.tsx
│   └── ResetPasswordPage.tsx
├── components/
│   ├── ProtectedRoute.tsx
│   └── layout/
│       └── AppLayout.tsx  # EXISTS — add nav bar with user info + logout
└── api/
    ├── client.ts          # EXISTS — add auth interceptor for 401 handling
    └── auth.ts            # login(), logout(), refreshToken(), etc.
```

### Anti-Patterns to Avoid

- **Storing access tokens in localStorage:** XSS can steal them. Use React state only.
- **Not hashing tokens in DB:** Store SHA-256(token), not raw token.
- **Using request body for companyId:** Always from JWT (NFR-01.1). Never `req.body.companyId`.
- **Applying `requireTenant` to auth routes:** `/api/auth/*` routes must NOT require a tenant — user may not be logged in yet.
- **Applying `requireTenant` to super admin routes:** Super admins have no `companyId`.
- **Single-use invite tokens not being invalidated:** Always set `used_at` before responding.
- **Returning 404 when email not found in forgot-password:** Return 200 always to prevent user enumeration.
- **Setting refresh token cookie without `path: '/api/auth/refresh'`:** Broad path sends it on every request (unnecessary exposure).
- **Not revoking all refresh tokens on password reset:** Password reset means a possible account compromise — force re-login everywhere.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `bcryptjs.hash()` / `bcryptjs.compare()` | Timing-safe comparison, adaptive cost, salt included |
| JWT signing/verification | Manual HMAC | `jsonwebtoken.sign()` / `jsonwebtoken.verify()` | Handles expiry, algorithm enforcement, all edge cases |
| Email delivery | Raw SMTP | `resend.emails.send()` | DNS, deliverability, retry, SPF/DKIM all managed |
| Token randomness | `Math.random()` | `crypto.randomBytes(32).toString('hex')` | CSPRNG required; `Math.random()` is predictable |
| SHA-256 hashing | 3rd-party library | Node.js built-in `crypto.createHash('sha256')` | No extra dependency needed |
| Request validation | Manual type-checking | `zod.parse()` (already installed) | Catches malformed payloads before business logic |

**Key insight:** The only custom code in auth is the business flow (what tokens to create, when). All cryptographic primitives come from proven libraries.

---

## Common Pitfalls

### Pitfall 1: Resend Domain Verification Must Happen First

**What goes wrong:** You implement the invite flow before adding DNS records. Testing is blocked for 24-72 hours while DNS propagates.

**Why it happens:** Domain verification is async DNS propagation — you can't rush it.

**How to avoid:** Plan 2.2 (Invitation flow) must have its first task as "Add SPF/DKIM records to DNS." All email-dependent testing must come after verification is confirmed in Resend dashboard.

**Warning signs:** Resend dashboard shows domain status as "pending" or "failed" after 72 hours.

### Pitfall 2: Super Admin Has No companyId

**What goes wrong:** `requireTenant` middleware returns 401 for super admin because `req.user.companyId` is null.

**Why it happens:** Super admins don't belong to a company. The tenant middleware checks for `companyId`.

**How to avoid:** Admin routes use `authenticate + requireSuperAdmin` only. Never add `requireTenant` to `/admin/*` routes.

**Warning signs:** Super admin gets "No tenant context" 401 errors.

### Pitfall 3: Access Token Expiry Not Handled on Frontend

**What goes wrong:** After 15 minutes, all API calls fail with 401. Users see errors instead of transparent re-auth.

**Why it happens:** The frontend stores the access token in memory but doesn't intercept 401s to silently refresh.

**How to avoid:** In `apiClient`, catch 401 responses, call the refresh endpoint once, then retry the original request. Implement a "refresh in flight" guard to prevent multiple concurrent refresh calls.

**Warning signs:** After 15 minutes of inactivity, all API calls fail.

### Pitfall 4: Cookie Not Cleared on Logout (With Same Options)

**What goes wrong:** `res.clearCookie('refresh_token')` does nothing because the cookie was set with `path: '/api/auth/refresh'` but cleared with default path.

**Why it happens:** Cookies are matched by name + path + domain. Clear must use identical options.

**How to avoid:** Define cookie options as a constant and reuse it for both `res.cookie()` and `res.clearCookie()`.

### Pitfall 5: bcrypt Cost Factor

**What goes wrong:** Using saltRounds = 10 in 2026 — hardware can now crack this faster.

**Why it happens:** 10 was the "standard" recommendation years ago.

**How to avoid:** Use saltRounds = 12. With 2026 hardware, rounds=12 gives ~2-3 hashes/sec (secure); rounds=10 is ~10 hashes/sec (weaker).

**Warning signs:** Login endpoint responds too quickly (sub-100ms), indicating cost is too low.

### Pitfall 6: Collaborator Removal — Transaction Isolation

**What goes wrong:** Deactivating a collaborator and auto-rejecting their pending items are two separate updates. A crash between them leaves orphaned pending records.

**Why it happens:** Non-transactional updates.

**How to avoid:** Wrap the deactivation + rejection updates in a single Drizzle transaction (`db.transaction(async (tx) => { ... })`).

### Pitfall 7: invite_tokens / tokens Table Not in Schema Migration

**What goes wrong:** Schema added to `schema.ts` but `drizzle-kit generate` not run, so the table doesn't exist in the DB.

**Why it happens:** Forgetting to run `npm run db:generate && npm run db:migrate` after schema changes.

**How to avoid:** Every schema change in Phase 2 must be followed by generate + migrate. Treat migration files as artifacts to commit.

---

## Code Examples

### Resend Email Send

```typescript
// Source: https://resend.com/docs/send-with-nodejs (verified 2026-03-30)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// SDK does not throw — always check error
const { data, error } = await resend.emails.send({
  from: 'Receipts Tracker <noreply@yourdomain.com>',
  to: [recipientEmail],
  subject: 'You have been invited',
  html: `<p>Click <a href="${inviteUrl}">here</a> to accept your invitation.</p>`,
});

if (error) {
  // Log and throw — let Express 5 error handler catch it
  throw new Error(`Email send failed: ${error.message}`);
}
```

### Secure Token Generation

```typescript
// Source: Node.js crypto built-in — no library needed
import { randomBytes, createHash } from 'crypto';

export function generateRawToken(): string {
  return randomBytes(32).toString('hex'); // 64-char hex string
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
```

### JWT Issue Pattern

```typescript
// Source: jsonwebtoken 9.0.3 docs + NFR-01.4 requirements
import jwt from 'jsonwebtoken';

export function issueAccessToken(payload: {
  sub: string;
  companyId: string | null;
  role: string;
  isSuperAdmin: boolean;
}): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}
```

### Refresh Token Cookie Set

```typescript
// Source: cookie-parser docs + security best practices
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

res.cookie('refresh_token', rawRefreshToken, REFRESH_COOKIE_OPTIONS);

// On logout — use same options, maxAge: 0
res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
```

### bcrypt Password Operations

```typescript
// Source: bcryptjs 3.0.3 — saltRounds=12 for 2026 hardware baseline
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash); // timing-safe comparison built in
}
```

### Drizzle Transaction for Collaborator Removal + Auto-Reject

```typescript
// Source: Drizzle ORM 0.45.2 transaction pattern
import { db } from '../db/client.js';
import { users, transactions, payments } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

await db.transaction(async (tx) => {
  // 1. Deactivate user
  await tx
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // 2. Auto-reject pending transactions
  await tx
    .update(transactions)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(
      and(
        eq(transactions.createdBy, userId),
        eq(transactions.status, 'pending_approval'),
        eq(transactions.companyId, companyId),
      ),
    );

  // 3. Auto-reject pending payments
  await tx
    .update(payments)
    .set({
      status: 'rejected',
      rejectionReason: 'User removed from company',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.recordedBy, userId),
        eq(payments.status, 'pending_approval'),
        eq(payments.companyId, companyId),
      ),
    );
});
```

### Zod Validation for Login Request

```typescript
// Source: zod 4.3.6 — validates before business logic
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'collaborator', 'viewer', 'client']),
  fullName: z.string().min(1),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  fullName: z.string().min(1),
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage for JWT | React state (memory) + httpOnly cookie for refresh | 2020–2022 | XSS cannot steal tokens |
| bcrypt saltRounds=10 | saltRounds=12 | 2024–2025 (GPU advances) | Stronger against offline brute force |
| Rolling session cookies | Rotating refresh tokens | Industry standard post-2020 | Replay attack detection possible |
| Separate invite + reset token tables | Single `tokens` table with type enum | Common refactor | Less schema duplication |
| `alg: 'none'` in JWT | Never allowed; explicit `algorithms: ['HS256']` | Security CVE 2015 | Required; already implemented in Phase 1 |

**Deprecated/outdated:**
- `passport.js`: Heavy, session-based by default, unnecessary complexity for a simple email/password + JWT flow. Don't use.
- PBKDF2 for passwords: bcrypt/argon2 are preferred for password hashing specifically.

---

## Open Questions

1. **Should `tokens` table be shared between invites and password resets, or separate tables?**
   - What we know: Both patterns are structurally identical (hash, email, expiry, used_at)
   - What's unclear: Separate tables are more explicit; shared table is more DRY
   - Recommendation: Use one `tokens` table with `type: 'invite' | 'password_reset'`. Add `companyId` and `role` as nullable columns (used for invites only).

2. **Refresh token table cleanup — expired tokens accumulate**
   - What we know: `refresh_tokens` table will grow over time with expired/revoked records
   - What's unclear: Phase 2 scope for cleanup
   - Recommendation: Out of scope for Phase 2. A periodic cleanup job (DELETE WHERE expires_at < NOW()) can be a simple cron in Phase 7 or deferred.

3. **Client role JWT — should clientId be embedded?**
   - What we know: FR-02.5 says `clientId` must be embedded in JWT for client role. The `clients` table has a nullable `userId` FK.
   - What's unclear: The JWT payload type in auth.ts only has `sub, companyId, role, isSuperAdmin`
   - Recommendation: Extend `JWTPayload` interface with optional `clientId?: string`. Populate it at login time for `role: 'client'` users by querying `clients WHERE user_id = userId`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | In Docker image | — |
| PostgreSQL | DB | ✓ | 16-alpine (Phase 1) | — |
| Resend API key | Email sending | Needs setup | — | Use Resend test mode (`onboarding@resend.dev`) for dev |
| Verified domain in Resend | Production emails | Needs setup | — | Resend test domain for development |
| DNS access to add SPF/DKIM | Domain verification | Needs operator action | — | No fallback — must be done manually |

**Missing dependencies with no fallback:**
- DNS records for domain verification: A human must add SPF/DKIM records to the DNS provider. This is a manual step with no automation path. Must happen at start of Plan 2.2 and verification confirmed before email flows can be tested end-to-end.

**Missing dependencies with fallback:**
- Verified sending domain: During development, use `onboarding@resend.dev` as the `from` address (Resend test mode). Switch to verified domain before production.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `backend/vitest.config.ts` (exists) |
| Quick run command | `cd backend && npm test` |
| Full suite command | `cd backend && npm test` |
| Frontend test command | `cd frontend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-02.1 | HS256 JWT issued correctly; alg:none rejected | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.1 | JWT payload contains sub, companyId, role, isSuperAdmin | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.6 | Super admin bypasses requireRole | unit | `cd backend && npm test -- middleware` | ✅ (exists in middleware.test.ts) |
| FR-02.7 | Invite token created, hashed, validated | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.7 | Expired invite token rejected | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.7 | Already-used invite token rejected | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.8 | Password reset token expires after 1 hour | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| FR-02.9 | Collaborator removal auto-rejects pending items | integration | `cd backend && npm test -- users` | ❌ Wave 0 |
| NFR-01.1 | company_id from JWT, not request body | unit | `cd backend && npm test -- middleware` | ✅ (requireTenant test) |
| Login | Correct password returns access + refresh token | integration | `cd backend && npm test -- auth` | ❌ Wave 0 |
| Login | Wrong password returns 401 | unit | `cd backend && npm test -- auth` | ❌ Wave 0 |
| Cross-tenant | Collaborator cannot access owner-only endpoints | integration | `cd backend && npm test -- rbac` | ❌ Wave 0 |
| Cross-tenant | Cross-tenant resource access returns 403/404 | integration | `cd backend && npm test -- rbac` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && npm test`
- **Per wave merge:** `cd backend && npm test && cd ../frontend && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/__tests__/auth.test.ts` — covers JWT issuance, token hashing, invite/reset flow unit tests
- [ ] `backend/src/__tests__/auth.integration.test.ts` — covers login endpoint, refresh endpoint, logout (requires test DB or mocked DB)
- [ ] `backend/src/__tests__/users.test.ts` — covers collaborator removal + auto-reject transaction
- [ ] `backend/src/__tests__/rbac.integration.test.ts` — covers cross-tenant 403, role enforcement on endpoints

**Note on integration tests:** Auth integration tests that hit the DB require either a test PostgreSQL instance or mocking of `db` client. Given the Docker setup, using a separate test DB schema (or mocking at the service layer) is the recommended approach for Phase 2. The existing `middleware.test.ts` uses pure unit tests with mocked req/res — use the same pattern for unit coverage; defer true integration tests to end-of-phase verification.

---

## Sources

### Primary (HIGH confidence)

- Resend official docs: https://resend.com/docs/send-with-nodejs — SDK usage, response shape
- Resend domains docs: https://resend.com/docs/dashboard/domains/introduction — DNS verification requirements
- Node.js crypto built-in: `crypto.randomBytes`, `crypto.createHash` — no external source needed
- jsonwebtoken 9.0.3: Already installed; API verified against existing middleware code
- bcryptjs 3.0.3: Already installed; API verified against existing code
- cookie-parser 1.4.7: npm registry version confirmed 2026-03-30
- Drizzle ORM 0.45.2: Pinned; transaction API verified against existing query-helpers.ts patterns

### Secondary (MEDIUM confidence)

- React Router v7 protected routes: https://www.robinwieruch.de/react-router-private-routes/ — Navigate + Outlet pattern verified against React Router v7 source
- JWT refresh token pattern: Multiple sources (freecodecamp, geeksforgeeks, dev.to) consistently describe same httpOnly cookie + rotation pattern
- Refresh token DB storage with hash: Multiple 2025 sources agree on SHA-256 hash storage

### Tertiary (LOW confidence)

- bcrypt saltRounds=12 recommendation for 2026: Based on hardware extrapolation from mojoauth.com article; this is a reasonable baseline but exact threshold depends on deployment hardware

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in package.json or verified in npm registry
- Architecture (token pattern): HIGH — httpOnly cookie + rotation is industry consensus, documented from multiple authoritative sources
- Resend integration: HIGH — official docs confirmed
- Pitfalls: HIGH — most are structural (super admin companyId null, cookie path matching) verified from code examination
- Test infrastructure: HIGH — vitest config exists, test pattern established from Phase 1

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (stable libraries; Resend API could change but SDK is pinned at 6.9.4)
