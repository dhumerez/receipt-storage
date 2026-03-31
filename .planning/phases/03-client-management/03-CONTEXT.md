# Phase 3: Client Management - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers two surfaces:
1. **Owner-side client management** — CRUD (create/edit/deactivate), searchable list, client detail page with debt history
2. **Client portal** — invite-only; client logs in to see their own balance, pending payments, and transaction history grouped by debt status

New capabilities NOT in this phase: Google OAuth, public self-service SaaS signup, demo mode, subscription/billing gate. Those are parked for a future milestone.

</domain>

<decisions>
## Implementation Decisions

### App Navigation Shell
- **D-01:** Left sidebar navigation for owner-facing pages. Sidebar links: Clients, Products, Transactions, Reports (stubs for future phases ok). Active link highlighted.
- **D-02:** On mobile, sidebar collapses and a **bottom tab bar** replaces it (4-5 icons). Not a hamburger overlay.
- **D-03:** AppLayout.tsx must be updated in this phase to include the sidebar — it currently shows only a bare header.

### Client List
- **D-04:** Clients displayed as a **table with rows**. Columns: Name, Phone, Outstanding Balance, Status (Active/Inactive).
- **D-05:** Clicking a row navigates to `/clients/:id` (full detail page, not a drawer or inline expand).
- **D-06:** Create and edit use a **modal form** (not a separate page). Fields: full name, email, phone, address, references (textarea). Email is optional (not all clients need portal access).

### Portal Invite Flow
- **D-07:** Portal access is **optional and explicit**. Owner clicks a "Send Portal Invite" button on the client detail page. Only clients with an email set can receive invites.
- **D-08:** Invite flow reuses the existing `accept-invite` token mechanism from Phase 2 (`POST /api/auth/accept-invite`). A new invite endpoint for clients must link the created user back to the `clients.user_id` field.
- **D-09:** Not all clients need portal access. The `clients.user_id` nullable field supports this — no user record until invite accepted.

### Client Portal Shell
- **D-10:** Clients see a **minimal portal shell** — simple top bar (logo + logout), no sidebar. Content centered. Separate from the owner AppLayout.
- **D-11:** Client portal routing: `/portal` or role-based redirect on login. The auth context knows `role === 'client'`; redirect to portal on login, not to the owner dashboard.
- **D-12:** Transaction history on the portal is **grouped by debt status**: Open debts, Partially Paid, Fully Paid. Each group shows transactions with: reference number, date, total, paid, remaining.
- **D-13:** Balance summary at top: "Total outstanding as of [date]: $X" + "Pending confirmation: $Y" (separate, per FR-03.6). FR-03.5 "as of [date]" is non-negotiable.

### Claude's Discretion
- Sidebar collapse behavior on desktop (icons-only vs always expanded) — planner decides
- Empty state for client list (no clients yet) — standard empty state pattern
- Deactivate confirmation dialog — standard modal confirm
- Portal empty state when client has no transactions — standard message

### Deferred to Backlog
- Google OAuth / social login
- Public self-service SaaS registration
- Demo mode / trial period
- Subscription gate + company join flow after payment

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §FR-03 — Full client management requirements (FR-03.1 through FR-03.7)
- `.planning/REQUIREMENTS.md` §FR-02.7 — Invite token flow (reused for client portal invites)

### Existing Code (integration points)
- `backend/src/routes/auth.ts` — accept-invite endpoint; client invite will extend this
- `backend/src/routes/admin.ts` — pattern for company-scoped CRUD
- `backend/src/db/schema.ts` — `clients` table (has `user_id` nullable, `company_id`, full profile fields)
- `frontend/src/components/layout/AppLayout.tsx` — must be extended with sidebar in this phase
- `frontend/src/contexts/AuthContext.tsx` — `user.role` used for portal redirect logic
- `frontend/src/App.tsx` — routes; portal routes and owner routes must be separated

### Project constraints
- `.planning/PROJECT.md` — Stack, responsive requirement, single currency per company

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthContext` + `useAuth()` hook — role available as `user.role`; use for portal vs owner routing
- `apiClient` with 401 auto-refresh — all API calls should go through this
- `ProtectedRoute` component — extend or create a `ClientRoute` variant for portal
- Login page form pattern — modal forms should follow the same Tailwind card style

### Established Patterns
- All API calls: `apiClient<T>(path, { method, json })` from `frontend/src/api/client.ts`
- Backend routes: Zod validation at entry, `requireRole` middleware, company_id from JWT never from body
- No component library — Tailwind only; build table, modal, sidebar from scratch
- React Router v7 — import from `react-router`, not `react-router-dom`

### Integration Points
- `AppLayout.tsx` needs sidebar added; all owner pages render inside `<Outlet />` of AppLayout
- Client portal needs its own layout component (e.g., `PortalLayout.tsx`)
- `App.tsx` needs `/clients`, `/clients/:id`, and `/portal/*` routes added
- Backend: new router `clientsRouter` mounted at `/api/v1/clients` with `authenticate + requireRole('owner', 'collaborator', 'viewer')` for owner-side; separate `/api/v1/portal/*` scoped to `role === 'client'`

</code_context>

<specifics>
## Specific Ideas

- Balance display must always show "as of [date]" — non-negotiable per FR-03.5
- Portal groups transactions by debt status (Open / Partially Paid / Fully Paid) — user's explicit choice
- Bottom tab bar on mobile (not hamburger) — user's explicit choice

</specifics>

<deferred>
## Deferred Ideas

- **Google OAuth / social login** — User wants this for SaaS public signup flow. Belongs in a future milestone (growth/onboarding phase). Note: would require significant auth system changes.
- **Public self-service registration** — Users sign up, get a demo, then pay to join a company account. Full SaaS growth funnel. Future milestone.
- **Subscription/billing gate** — Payment integration before company access. Future milestone.

</deferred>

---

*Phase: 03-client-management*
*Context gathered: 2026-03-31*
