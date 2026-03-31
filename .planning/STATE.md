---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 5
current_plan: Not started
status: In progress
last_updated: "2026-03-31T21:55:20.677Z"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 25
  completed_plans: 22
---

# Project State

**Last updated:** 2026-03-31
**Current milestone:** 1.0 — Core SaaS MVP
**Current phase:** 5
**Current plan:** Not started
**Last session stopped at:** Completed 05-01-PLAN.md

## Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | Complete | All 5 plans executed |
| Phase 2: Auth & Users | Complete | All 7 plans executed |
| Phase 3: Client Management | Complete | All 6 plans executed |
| Phase 4: Product Catalog | In progress | Plans 01-02 complete |
| Phase 5: Transactions & Files | Not started | |
| Phase 6: Debt & Payments | Not started | |
| Phase 7: Reports & PDF | Not started | |

## Active Decisions

- **01-02 (Nginx):** No /uploads/ static location block — all file access via authenticated Express endpoint (FR-06.11, SVG XSS prevention)
- **01-02 (Nginx):** client_max_body_size 12m on HTTPS vhost level (not inside location blocks) so it applies globally to receipts subdomain
- **01-02 (Nginx):** Placeholder domain receipts.yourdomain.com used; must be replaced with actual subdomain before deployment
- **01-03 (Schema):** drizzle-orm pinned to 0.45.2 — 0.46.x and 1.x beta have breaking changes
- **01-03 (Schema):** All money columns use NUMERIC(12,2) — no FLOAT, no INTEGER cents — immutable after initial migration
- **01-03 (Schema):** debt_balances view computes balance from confirmed payments only — pending payments don't reduce displayed balance
- **01-03 (Schema):** audit_logs immutability enforced at DB level with REVOKE UPDATE, DELETE (FR-11.2) — application layer alone is insufficient
- **01-05 (Frontend):** React Router v7 imports from 'react-router' (not 'react-router-dom') — v7 unified the package; standardized across all files
- **01-05 (Frontend):** Tailwind v4: no tailwind.config.js, no postcss — CSS entry is @import 'tailwindcss' via @tailwindcss/vite plugin
- **01-05 (Frontend):** Provider order: QueryClientProvider > BrowserRouter > App — query cache is outermost for availability across all route-aware components
- **01-05 (Frontend):** apiClient uses credentials:include for httpOnly cookie auth to be established in Phase 2

- **02-01 (Auth):** JWTPayload.companyId is string | null (null for super admin) — changed from string to support super admin role correctly
- **02-01 (Auth):** JWTPayload.clientId added as optional string for FR-02.5 client portal role
- **02-01 (Auth):** hashToken uses Node built-in crypto (no 3rd-party SHA-256 library) — zero additional dependencies
- **02-01 (Auth):** SALT_ROUNDS=12 for bcrypt — 2026 hardware baseline, ~2-3 hashes/sec
- **02-01 (Auth):** REFRESH_COOKIE_OPTIONS exported constant ensures consistent cookie config (path, sameSite, httpOnly) across all auth route handlers

- **02-03 (Admin):** requireSuperAdmin is standalone middleware (not a factory) — simpler API since there are no variations
- **02-03 (Admin):** Admin routes mounted without requireTenant — super admins have companyId=null and must never hit tenant middleware
- **02-03 (Admin):** Duplicate email check normalizes to lowercase before DB lookup to prevent case-collision accounts

- **02-05 (Users):** validateCallerOwner fetches role + isActive + companyId from DB before sensitive ops — prevents stale JWT privilege escalation (NFR-01.5)
- **02-05 (Users):** PATCH /:id/deactivate wraps user + transactions + payments in single db.transaction — atomicity ensures no orphaned pending records (FR-02.9)
- **02-05 (Users):** email.service.ts created in this plan (not 02-04) as a blocking dependency; 02-04 may overwrite with extended implementation

- **02-06 (Frontend Auth):** Access token stored in memory only (not localStorage) — httpOnly cookie carries refresh token for XSS protection
- **02-06 (Frontend Auth):** Concurrent refresh calls deduplicated via shared _refreshPromise in apiClient — prevents duplicate /api/auth/refresh on simultaneous 401s
- **02-06 (Frontend Auth):** AuthProvider placed inside BrowserRouter so useNavigate is available in child components
- **02-06 (Frontend Auth):** ForgotPasswordPage added proactively — LoginPage links to /forgot-password so route was needed to avoid blank screen

- **02-07 (Invite/Reset Pages):** AcceptInvitePage stores accessToken via setAccessToken after invite acceptance (in-memory, consistent with 02-06 auth pattern)
- **02-07 (Invite/Reset Pages):** ResetPasswordPage uses local success state instead of navigate-with-state for post-reset confirmation

- **03-02 (Portal):** Portal mount uses no requireTenant — clientId-scoped from JWT (RESEARCH.md Pitfall 4); companyId from JWT still used in all queries for double-scoping
- **03-02 (Clients):** GET /api/v1/clients allows owner+collaborator+viewer — all non-client roles need client data access
- **03-02 (Portal):** internalNotes protection via no transactions table join (structural guard, not column exclusion) — cannot accidentally leak even if columns are added
- **03-02 (Portal/Auth):** accept-invite for client role embeds clientId in JWT immediately + links clients.user_id in same transaction (D-08)

- **03-03 (Nav Shell):** AuthContext.login() returns AuthUser — enables role-based redirect after login without stale React state issues (role read from API response, not from React state)
- **03-03 (Nav Shell):** Sidebar desktop-only (hidden md:flex) + BottomTabBar mobile-only (md:hidden) — two separate components, not one responsive component
- **03-03 (Nav Shell):** Stub pages (ClientsPage, ClientDetailPage, PortalPage) created now so routes are active for plans 03-04 through 03-06

- **03-05 (Client Detail):** Prerequisite files from 03-04 created in parallel worktree — same code produced by 03-04 agent, merge resolves overlap
- **03-05 (Client Detail):** GROUPS constant array in DebtGroupList ensures consistent Open/Partially Paid/Fully Paid render order
- **03-05 (Client Detail):** ClientDetailPage waits on both clientLoading and debtsLoading before rendering — prevents flash of partial content

- **03-06 (Portal UI):** PortalDebt type structurally excludes internalNotes — frontend cannot accidentally render internal notes (type-level guard mirrors backend structural guard)
- **03-06 (Portal UI):** portal.ts sends no clientId — JWT-scoped on backend; frontend cannot accidentally scope to wrong client (FR-03.4, RESEARCH Pitfall 2)

- **04-01 (Products):** Products API is owner-only at mount; collaborator/viewer GET access deferred to Phase 5 when transaction line-item picker is built
- **04-01 (Products):** unitPrice validated as string regex /^\d+(\.\d{1,2})?$/ throughout — consistent with Drizzle NUMERIC column return type (strings, not floats)

- **04-02 (Products UI):** description added to ProductListItem — backend GET /api/v1/products returns all columns including description; avoids extra GET /products/:id call on edit icon click
- **04-02 (Products UI):** Reactivate mutation at page level (ProductsPage) — keeps query cache management in one place; reactivate is reversible so no confirmation modal needed

- **05-04 (Notifications):** notifications.ts is fully self-contained — no imports from transactions.ts to avoid cross-plan dependency
- **05-04 (Notifications):** Collaborator status badges inlined directly (not importing TransactionStatusBadge) for plan isolation
- **05-04 (Notifications):** Sidebar and BottomTabBar enhanced with Heroicons outline SVG icons for all nav items (not just Transactions)

## Blockers

None.

## Notes

- Hetzner VPS already running Restaurant app; new Docker stack must use ports 4000/4001
- Resend requires domain verification (SPF/DKIM) before email invitations work — do this in Phase 2
- libvips with HEIC support must be installed in Docker image (Phase 5) — `apt-get install libvips-dev libheif-dev`
