---
phase: 02-authentication-user-management
plan: 04
subsystem: auth
tags: [resend, email, password-reset, invite, tokens, jwt, bcrypt, zod]

# Dependency graph
requires:
  - phase: 02-01
    provides: tokens table schema, hashToken, generateRawToken, hashPassword, revokeAllUserRefreshTokens, issueAccessToken, createRefreshToken, REFRESH_COOKIE_OPTIONS
  - phase: 02-02
    provides: authRouter with login/refresh/logout endpoints
provides:
  - forgot-password endpoint (anti-enumeration, inserts password_reset token, fires Resend email)
  - reset-password endpoint (validates token, DB transaction, revokes all refresh tokens)
  - accept-invite endpoint (validates invite token, creates user, auto-login)
  - email.service.ts wrapping Resend SDK 6.9.4 (sendInviteEmail, sendPasswordResetEmail)
affects:
  - 02-05 (user management — invite creation will call sendInviteEmail)
  - frontend (accept-invite and reset-password pages consume these endpoints)
  - deployment (RESEND_API_KEY, EMAIL_FROM, APP_URL env vars required)

# Tech tracking
tech-stack:
  added:
    - resend 6.9.4 (Resend email SDK)
  patterns:
    - Fire-and-forget email dispatch (sendPasswordResetEmail.catch(console.error) — avoids timing leak)
    - DB transaction for atomic token-mark-used + record-update (reset-password, accept-invite)
    - Anti-enumeration: forgot-password always returns 200 regardless of user existence
    - Lazy Resend client initialization (getResend() factory — tests run without RESEND_API_KEY)

key-files:
  created:
    - backend/src/services/email.service.ts
  modified:
    - backend/src/routes/auth.ts
    - backend/src/__tests__/invite.test.ts
    - backend/src/__tests__/password-reset.test.ts
    - backend/package.json

key-decisions:
  - "email.service.ts uses lazy Resend client init (getResend()) so tests run without RESEND_API_KEY set"
  - "forgot-password fires email fire-and-forget (.catch) to avoid timing oracle on email send latency"
  - "accept-invite auto-logs user in immediately (201 + accessToken + refresh cookie) per FR-02.7"
  - "reset-password uses DB transaction for atomic usedAt + passwordHash update"

patterns-established:
  - "Fire-and-forget email: sendEmailFn(...).catch(console.error) — never await in request path"
  - "Token validation pattern: check !tokenRow || usedAt !== null || expiresAt < now → 400"
  - "DB transaction for atomic multi-table updates (tokens + users)"

requirements-completed: [FR-02.7, FR-02.8]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 02 Plan 04: Password Reset and Invite Acceptance Summary

**Password reset flow with anti-enumeration 200-always response, invite acceptance with immediate auto-login, and Resend 6.9.4 email service wrapper**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T23:18:00Z
- **Completed:** 2026-03-30T23:33:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Email service wrapper for Resend SDK with sendInviteEmail and sendPasswordResetEmail
- Three new auth endpoints: forgot-password (anti-enumeration), reset-password (transactional + refresh revocation), accept-invite (user creation + auto-login)
- Full test coverage: 18 new tests across invite.test.ts and password-reset.test.ts; full suite 76/76 green
- DB transactions ensure atomic token invalidation + record updates in both reset-password and accept-invite

## Task Commits

Each task was committed atomically:

1. **Task 1: Install resend, create email service** - `99ed91f` (feat)
2. **Task 2: Implement forgot-password, reset-password, accept-invite endpoints** - `6453061` (feat, TDD GREEN)

**Plan metadata:** (this commit)

_Note: Task 2 used TDD — tests written first (RED), then implementation (GREEN), combined into single commit._

## Files Created/Modified

- `backend/src/services/email.service.ts` - Resend SDK wrapper with sendInviteEmail and sendPasswordResetEmail, lazy client init
- `backend/src/routes/auth.ts` - Appended forgot-password, reset-password, accept-invite handlers; added tokens import, generateRawToken, hashPassword, sendPasswordResetEmail, JWTPayload type
- `backend/src/__tests__/invite.test.ts` - 8 real tests for accept-invite (expired, used, valid, 400s, auto-login, cookie, JWT payload)
- `backend/src/__tests__/password-reset.test.ts` - 10 real tests for forgot-password and reset-password (anti-enumeration, token states, revoke, transaction)
- `backend/package.json` - Added resend 6.9.4 to dependencies

## Decisions Made

- **Lazy Resend client init:** `getResend()` factory function returns `new Resend(process.env.RESEND_API_KEY)` — allows test suite to run without a real API key set
- **Fire-and-forget email:** `sendPasswordResetEmail(...).catch(console.error)` — not awaited in request path to prevent timing oracle on email send latency
- **accept-invite auto-login:** Returns 201 + accessToken + sets refresh cookie immediately per FR-02.7 requirement
- **DB transaction for atomicity:** Both reset-password (tokens.usedAt + users.passwordHash) and accept-invite (tokens.usedAt + users INSERT) use db.transaction()

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `backend/src/db/query-helpers.ts` (unrelated to this plan's changes — confirmed pre-existing via git stash). Logged as out-of-scope per deviation rules. Does not affect test execution or runtime.

## User Setup Required

The following environment variables must be added before the email flows work in production:

- `RESEND_API_KEY` — API key from Resend dashboard (https://resend.com/api-keys)
- `EMAIL_FROM` — Verified sender address, e.g. `Receipts Tracker <noreply@yourdomain.com>` (domain must be verified in Resend)
- `APP_URL` — Full frontend URL, e.g. `https://receipts.yourdomain.com` (used to construct reset/invite links)

Note: Resend requires SPF/DKIM domain verification before emails will be delivered. See STATE.md notes.

## Next Phase Readiness

- Password reset and invite acceptance flows are complete and tested
- Plan 02-05 (user management) can now call `sendInviteEmail` when creating invite tokens
- Frontend will need `/accept-invite` and `/reset-password` pages that POST to these endpoints
- No blockers

---
*Phase: 02-authentication-user-management*
*Completed: 2026-03-30*
