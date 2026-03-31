# Phase 3: Client Management — Research

**Researched:** 2026-03-30
**Domain:** Client CRUD API, sidebar navigation shell, client portal with role-based routing, invite-flow extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**App Navigation Shell**
- D-01: Left sidebar navigation for owner-facing pages. Sidebar links: Clients, Products, Transactions, Reports (stubs for future phases ok). Active link highlighted.
- D-02: On mobile, sidebar collapses and a bottom tab bar replaces it (4-5 icons). Not a hamburger overlay.
- D-03: AppLayout.tsx must be updated in this phase to include the sidebar — it currently shows only a bare header.

**Client List**
- D-04: Clients displayed as a table with rows. Columns: Name, Phone, Outstanding Balance, Status (Active/Inactive).
- D-05: Clicking a row navigates to `/clients/:id` (full detail page, not a drawer or inline expand).
- D-06: Create and edit use a modal form (not a separate page). Fields: full name, email, phone, address, references (textarea). Email is optional (not all clients need portal access).

**Portal Invite Flow**
- D-07: Portal access is optional and explicit. Owner clicks a "Send Portal Invite" button on the client detail page. Only clients with an email set can receive invites.
- D-08: Invite flow reuses the existing `accept-invite` token mechanism from Phase 2 (`POST /api/auth/accept-invite`). A new invite endpoint for clients must link the created user back to the `clients.user_id` field.
- D-09: Not all clients need portal access. The `clients.user_id` nullable field supports this — no user record until invite accepted.

**Client Portal Shell**
- D-10: Clients see a minimal portal shell — simple top bar (logo + logout), no sidebar. Content centered. Separate from the owner AppLayout.
- D-11: Client portal routing: `/portal` or role-based redirect on login. The auth context knows `role === 'client'`; redirect to portal on login, not to the owner dashboard.
- D-12: Transaction history on the portal is grouped by debt status: Open debts, Partially Paid, Fully Paid. Each group shows transactions with: reference number, date, total, paid, remaining.
- D-13: Balance summary at top: "Total outstanding as of [date]: $X" + "Pending confirmation: $Y" (separate, per FR-03.6). FR-03.5 "as of [date]" is non-negotiable.

### Claude's Discretion
- Sidebar collapse behavior on desktop (icons-only vs always expanded) — planner decides
- Empty state for client list (no clients yet) — standard empty state pattern
- Deactivate confirmation dialog — standard modal confirm
- Portal empty state when client has no transactions — standard message

### Deferred Ideas (OUT OF SCOPE)
- Google OAuth / social login
- Public self-service SaaS registration
- Demo mode / trial period
- Subscription gate + company join flow after payment
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-03.1 | Create/edit/deactivate client profiles with: full name, email, phone, address, free-text references. No hard delete. | `clients` table exists in schema.ts with all required fields. PATCH deactivate pattern established in users.ts. |
| FR-03.2 | Client list with search by name/email/phone and filter by active status | Drizzle `ilike` + `or` operators handle multi-field search. `isActive` column on clients table. |
| FR-03.3 | Client detail page showing all debts (open, partial, paid) and total outstanding balance | `debtBalances` view computes remaining balance. JOIN on `debts`, `transactions` by `clientId + companyId`. |
| FR-03.4 | Client portal: client logs in to see own balance, payment history, and proof documents | `clientId` in JWT (already implemented in auth.ts login flow). Portal scoped queries via `clientId` from JWT. |
| FR-03.5 | Balance display always shows "as of [date]" timestamp | UI-SPEC specifies `<time dateTime="ISO">` element. Backend returns `balanceAsOf` timestamp (current server time at query). |
| FR-03.6 | Client portal shows pending payments separately from confirmed ones ("Awaiting confirmation") | `debtBalances` view filters `WHERE status = 'confirmed'`. Separate query for `pending_approval` sum. |
| FR-03.7 | Client portal does NOT expose internal notes, other clients' data, or rejected submissions | Portal endpoint selects columns explicitly — never `SELECT *`. `internalNotes` must be omitted from all portal selects. |
| FR-02.7 | Email invitations via Resend for clients | `sendInviteEmail` already implemented. New `POST /api/v1/clients/:id/invite` endpoint needed. |
</phase_requirements>

---

## Summary

Phase 3 is primarily an integration and extension phase — the schema, auth infrastructure, invite mechanism, and API patterns are all already in place. The work is: (1) building a new `clientsRouter` using the established admin/users pattern; (2) extending the accept-invite flow to link a new user back to `clients.user_id`; (3) adding a portal API router scoped strictly to `role === 'client'` and `clientId` from JWT; and (4) replacing the bare `AppLayout` header with a real sidebar + bottom-tab-bar navigation shell, then building all four frontend pages (client list, client detail, portal).

The most non-trivial design decision is the accept-invite linkage: when a client accepts their portal invite, the `accept-invite` handler currently creates a user but does not link it back to the `clients` table. The new client invite endpoint must store the `clientId` in the token row so that `accept-invite` can perform `UPDATE clients SET user_id = $newUserId WHERE id = $clientId` atomically in the same transaction.

The second area requiring care is the portal API. All queries must be scoped to `clientId` from JWT (never from request body or URL params), and all response shapes must have `internalNotes` column excluded. The `debtBalances` view is the correct source for confirmed balance; a separate aggregation is needed for pending-sum display.

**Primary recommendation:** Treat the `clientsRouter` as a near-copy of `adminRouter` structure (Zod validate → company_id from JWT → Drizzle query → return) and the portal router as a new locked-down surface with its own strict query helpers.

---

## Standard Stack

### Core (already installed — verified from package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 (pinned) | ORM + query builder | Project decision; 0.46.x has breaking changes |
| express | 5.2.1 | HTTP server | Project stack |
| zod | 4.3.6 | Request validation | Established pattern on all routes |
| resend | 6.9.4 | Transactional email (portal invites) | FR-02.7; already wired in email.service.ts |
| react | 19.2.4 | Frontend framework | Project stack |
| react-router | 7.13.2 | Routing (import from 'react-router' NOT 'react-router-dom') | Project decision — STATE.md 01-05 |
| @tanstack/react-query | 5.95.2 | Server state, caching, loading states | Project stack |
| tailwindcss | 4.2.2 | CSS — Tailwind v4 (no config file, @import 'tailwindcss' via @tailwindcss/vite) | Project stack; UI-SPEC confirmed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.0.0 (installed as 4.1.2) | Unit testing | Backend route + middleware tests |
| bcryptjs | 3.0.3 | Password hashing | Client invite accept creates a user |
| jsonwebtoken | 9.0.3 | JWT sign/verify | Already via auth middleware |

### No New Dependencies Required

Phase 3 introduces no new npm packages. All required libraries are already installed. Do not add shadcn, Radix, or any component library — Tailwind-only per UI-SPEC.

---

## Architecture Patterns

### Recommended Project Structure (additions for this phase)

```
backend/src/
├── routes/
│   ├── clients.ts          # Owner-side CRUD + invite — NEW
│   └── portal.ts           # Client portal read-only — NEW
frontend/src/
├── api/
│   ├── clients.ts          # apiClient wrappers for /api/v1/clients — NEW
│   └── portal.ts           # apiClient wrappers for /api/v1/portal — NEW
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   # REPLACE: add sidebar + bottom tab bar
│   │   ├── Sidebar.tsx     # NEW: left nav 240px, 4 links
│   │   ├── BottomTabBar.tsx # NEW: mobile 4-tab bar
│   │   └── PortalLayout.tsx # NEW: minimal top bar, centered
│   ├── clients/            # NEW directory
│   │   ├── ClientTable.tsx
│   │   ├── ClientTableRow.tsx
│   │   ├── ClientModal.tsx
│   │   ├── ClientStatusBadge.tsx
│   │   ├── DeactivateConfirmModal.tsx
│   │   ├── BalanceSummary.tsx
│   │   ├── ClientDetailHeader.tsx
│   │   ├── DebtGroupList.tsx
│   │   └── DebtCard.tsx
│   ├── portal/             # NEW directory
│   │   ├── PortalBalanceSummary.tsx
│   │   ├── PortalDebtGroup.tsx
│   │   └── PortalTransactionRow.tsx
│   └── common/
│       ├── SearchBar.tsx   # NEW
│       ├── StatusFilterToggle.tsx # NEW
│       └── EmptyState.tsx  # NEW
├── pages/
│   ├── clients/
│   │   ├── ClientsPage.tsx # /clients — NEW
│   │   └── ClientDetailPage.tsx # /clients/:id — NEW
│   └── portal/
│       └── PortalPage.tsx  # /portal — NEW
```

### Pattern 1: Company-Scoped CRUD Router (established pattern from admin.ts + users.ts)

**What:** Zod validation at entry; `req.companyId` from `requireTenant` middleware (never from body); DB query with `where(eq(table.companyId, companyId))`; `.returning()` for mutations.

**When to use:** All owner-side client endpoints.

```typescript
// Source: backend/src/routes/users.ts + admin.ts
// Mount in app.ts:
app.use('/api/v1/clients', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), clientsRouter);

// Inside clientsRouter:
clientsRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  // search via ilike — multi-field
  // filter by isActive
});

clientsRouter.post('/', async (req, res) => {
  // Zod validate
  // INSERT with companyId from req.companyId — NEVER from body
  // Return created record
});

clientsRouter.patch('/:id', async (req, res) => {
  const companyId = req.companyId!;
  // Verify client belongs to company before update
  // db.update(clients).set(...).where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
});

clientsRouter.patch('/:id/deactivate', async (req, res) => {
  // Same tenant guard pattern as users.ts /:id/deactivate
  // No DB transaction needed (no cascading operations on deactivate)
  // Set isActive = false; preserve all records
});
```

### Pattern 2: Portal Router (new — client-scoped, not company-scoped)

**What:** Separate router, separate middleware stack. Uses `clientId` from JWT (not `companyId`). Never accepts clientId from request. All queries filtered by BOTH `clientId` AND `companyId` from JWT.

**When to use:** All `/api/v1/portal/*` endpoints.

```typescript
// Source: auth.ts login flow — clientId embedded in JWT at login for role='client'
// Mount in app.ts:
app.use('/api/v1/portal', authenticate, requireRole('client'), portalRouter);

// Inside portalRouter:
portalRouter.get('/summary', async (req, res) => {
  const clientId = req.user!.clientId!;   // from JWT — never from body/params
  const companyId = req.user!.companyId!;

  // Query debtBalances view for confirmed balance
  // Separate SUM query for pending_approval payments
  // Return: { confirmedBalance, pendingBalance, asOf: new Date().toISOString() }
  // NEVER include internalNotes in any portal response
});
```

### Pattern 3: Client Portal Invite (extend accept-invite)

**What:** `POST /api/v1/clients/:id/invite` creates an invite token with `clientId` embedded in `metadata` (or a dedicated column). The existing `accept-invite` handler must be extended to read `clientId` from the token and atomically link `users.id → clients.user_id`.

**The critical constraint:** `accept-invite` currently inserts a user but does NOT update `clients.user_id`. This must be fixed in a targeted extension — only for tokens with `role === 'client'`.

```typescript
// In clients.ts invite endpoint:
// 1. Verify client exists + belongs to company
// 2. Verify client.email is set (D-07)
// 3. Insert token with role='client', companyId, AND store clientId (metadata or new column)
// 4. Send invite email via sendInviteEmail()

// In auth.ts accept-invite extension:
// After creating the new user (inside the transaction):
if (tokenRow.role === 'client' && tokenRow.clientId) {
  await tx.update(clients)
    .set({ userId: newUser.id, updatedAt: now })
    .where(eq(clients.id, tokenRow.clientId));
}
```

**Options for storing clientId in token:**
- Option A: Add `clientId` column to `tokens` table (requires a Drizzle migration)
- Option B: Serialize into `metadata` (text column, JSON-encode `{ clientId }`) — no migration needed if `metadata` exists

The `tokens` table does NOT currently have a `clientId` column or a `metadata` column. A migration adding `clientId uuid references clients(id)` to the `tokens` table is the cleanest approach (same pattern as `companyId` and `invitedBy` already on that table).

### Pattern 4: AppLayout Sidebar + Bottom Tab Bar

**What:** AppLayout.tsx currently renders a bare header + `<Outlet />`. This phase replaces it with a two-column layout: fixed 240px sidebar on desktop (`md:block hidden`) + `<Outlet />` in the main area. On mobile, sidebar is hidden and `BottomTabBar` is rendered via `md:hidden` at the bottom.

**Key implementation facts (from UI-SPEC):**
- Desktop sidebar: always expanded, 240px fixed, no icon-only collapse
- Active link: `border-l-4 border-blue-600 bg-blue-50 text-blue-600 font-medium`
- Bottom tab bar: `fixed bottom-0 left-0 right-0`, 56px tall, `md:hidden`
- Main content area gets `pb-16` on mobile to avoid overlap with tab bar
- Sidebar links use React Router `<NavLink>` — `isActive` prop for active state

```tsx
// Source: UI-SPEC.md — Sidebar Behavior section
// AppLayout structure:
<div className="min-h-screen bg-gray-50 flex">
  <Sidebar />          {/* hidden on mobile via hidden md:flex */}
  <main className="flex-1 overflow-auto pb-16 md:pb-0">
    <Outlet />
  </main>
  <BottomTabBar />     {/* hidden on desktop via md:hidden */}
</div>
```

### Pattern 5: ClientRoute Guard (portal routing)

**What:** New `ClientRoute` component mirroring `ProtectedRoute` but additionally checks `user.role === 'client'`. Owner trying to access `/portal` gets redirected to `/`. Client trying to access owner routes gets redirected to `/portal`.

```tsx
// Source: AuthContext — user.role is available
// LoginPage must redirect based on role after login:
// role === 'client' → navigate('/portal')
// other roles → navigate('/')
```

### Pattern 6: Multi-Field Search (Drizzle)

**What:** Drizzle's `or()` + `ilike()` for case-insensitive search across name, email, phone.

```typescript
// Source: Drizzle ORM documentation pattern
import { or, ilike, and, eq } from 'drizzle-orm';

const conditions = [];
if (search) {
  conditions.push(or(
    ilike(clients.fullName, `%${search}%`),
    ilike(clients.email, `%${search}%`),
    ilike(clients.phone, `%${search}%`),
  ));
}
if (status !== 'all') {
  conditions.push(eq(clients.isActive, status === 'active'));
}
// Apply: .where(conditions.length ? and(...conditions) : undefined)
```

### Anti-Patterns to Avoid

- **`SELECT *` on portal endpoints:** Always enumerate columns explicitly. `internalNotes` must never appear in portal responses. A future column added to `transactions` or `debts` must not accidentally leak.
- **clientId from request body/params on portal routes:** `clientId` must always come from `req.user!.clientId` (JWT). A client passing someone else's `clientId` in the URL must return their own data, not the requested client's.
- **Company-id from URL params on client CRUD:** Must always use `req.companyId` from `requireTenant`.
- **Forgetting the accept-invite → clients.user_id link:** If this atomic update is missed, the client logs in but the app has no `clientId` in their JWT (no record links user to client), breaking all portal queries.
- **Running `invite` endpoint for clients through the `/api/v1/users/invite` route:** That route explicitly rejects `role === 'client'` in its Zod schema. The client invite must go through a dedicated `POST /api/v1/clients/:id/invite` endpoint.
- **Sidebar nav using `href` instead of React Router `<NavLink>`:** Full page reload on each nav click. Use `<NavLink to="...">` from `react-router`.
- **Tailwind v4 pitfall:** No `tailwind.config.js`. No `@tailwind base/components/utilities` directives. CSS entry uses `@import 'tailwindcss'`. Responsive prefix is `md:` (768px breakpoint).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmed-only balance | Custom SQL aggregation in route handler | `debtBalances` view (already in schema.ts) | View already handles `FILTER (WHERE status = 'confirmed')` correctly and is used consistently |
| Token generation / hashing | Custom token functions | `generateRawToken()` + `hashToken()` from `auth.service.ts` | Already implemented with Node crypto; consistent with existing tokens table |
| Email delivery | Direct SMTP | `sendInviteEmail()` from `email.service.ts` | Already implemented with Resend; fire-and-forget pattern established |
| Role checking middleware | Inline `req.user.role === 'owner'` checks | `requireRole('owner', ...)` from `middleware/rbac.ts` | Handles super admin bypass automatically |
| Tenant scoping | Inline `req.user.companyId` in each handler | `requireTenant` middleware → `req.companyId` | Centralizes NFR-01.1 enforcement |
| 401 auto-refresh | Manual fetch retry logic | `apiClient()` from `frontend/src/api/client.ts` | Already implements deduped refresh + single retry |
| Debounced search | `setTimeout` in component | Standard React pattern: `useState` + `useEffect` with `clearTimeout` | Simple enough to hand-roll; 300ms per UI-SPEC |
| DB-level re-validation | Skip it | `validateCallerOwner()` pattern from users.ts | NFR-01.5 requirement for sensitive ops |

**Key insight:** The Phase 2 infrastructure covers authentication, token generation, email delivery, role middleware, and tenant scoping. Phase 3 is almost entirely about applying these patterns to a new resource domain (clients), not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Missing clients.user_id linkage on invite acceptance

**What goes wrong:** The invite is sent, the client clicks the link, creates a password, and logs in successfully. But their JWT has no `clientId` because `clients.user_id` was never set. Every portal query returns empty or 403.

**Why it happens:** `accept-invite` in auth.ts creates a user row but has no knowledge of the associated client record — that context is only in the invite token. The current tokens table has no `clientId` column.

**How to avoid:** Wave 0 / Plan 3.1 must add a `clientId` column (uuid, nullable, FK to clients.id) to the `tokens` table via Drizzle migration. The clients invite endpoint sets `tokenRow.clientId`. The accept-invite handler reads it and does `UPDATE clients SET user_id = $newUserId` inside the same transaction.

**Warning signs:** Portal page loads but shows no data; JWT decode shows `clientId: undefined`.

### Pitfall 2: internalNotes leaking from portal endpoints

**What goes wrong:** Portal response includes `internalNotes` field from transactions or debts. Client can read owner's internal comments.

**Why it happens:** Using `db.select().from(transactions)` without an explicit column list, or spreading the whole row into the response.

**How to avoid:** All portal query selects must enumerate columns explicitly. Establish a rule: portal endpoint files never reference `internalNotes` column. Code review must check this for every portal endpoint.

**Warning signs:** Phase verification test "internalNotes absent from all client-scoped API responses" fails.

### Pitfall 3: Cross-client data leak on portal

**What goes wrong:** Client A can query `/api/v1/portal/summary?clientId=<client-B-id>` and see Client B's balance.

**Why it happens:** Portal handler reads `clientId` from `req.query` or `req.params` instead of `req.user.clientId`.

**How to avoid:** Portal router pattern must explicitly forbid clientId from request. Use `const clientId = req.user!.clientId!;` — never from params or body.

**Warning signs:** Phase verification test "Client A cannot see Client B's data" fails.

### Pitfall 4: requireTenant rejects client role (portal router)

**What goes wrong:** Mounting portal router with `requireTenant` causes 401 for clients because `requireTenant` checks `req.user.companyId` and clients do have a companyId, so this should work — but the concern is if companyId is null for some reason.

**Why it happens:** In practice, client users DO have a `companyId` in their JWT (they belong to a company). So `requireTenant` technically passes. But the portal router should NOT use `requireTenant` because its scoping is by `clientId`, not `companyId`. Using `requireTenant` would make portal routes look like they're company-scoped when they're actually client-scoped, creating a false sense of security.

**How to avoid:** Mount portal router with `authenticate, requireRole('client')` only. Inside portal handlers, extract BOTH `clientId` AND `companyId` from `req.user` directly for double-scoped queries.

### Pitfall 5: LoginPage not redirecting clients to /portal

**What goes wrong:** Client logs in, lands on `/` (dashboard/owner view), sees nothing relevant or sees owner data they shouldn't.

**Why it happens:** `LoginPage` after successful login navigates to `/` unconditionally.

**How to avoid:** Post-login navigate logic must check `user.role === 'client'` and redirect to `/portal`. Implement in `LoginPage.tsx` after `login()` resolves and user is set.

### Pitfall 6: Balance "as of" date missing or wrong timezone

**What goes wrong:** Balance shows without a date, or shows a UTC date that confuses users in non-UTC timezones.

**Why it happens:** Forgetting to return `asOf` from the API, or rendering a raw ISO string without formatting.

**How to avoid:** Backend response always includes `asOf: new Date().toISOString()`. Frontend renders it via `<time dateTime={asOf}>` (UI-SPEC accessibility requirement). Format as local date using `new Date(asOf).toLocaleDateString()`.

### Pitfall 7: Drizzle `ilike` undefined on null email/phone

**What goes wrong:** Search crashes or returns wrong results when a client has `null` email or `null` phone and `ilike` is applied to them.

**Why it happens:** PostgreSQL `ILIKE` on NULL returns NULL (not false), which Drizzle passes through. If the query uses `or(ilike(clients.email, ...))` and email is null, the row is excluded.

**How to avoid:** This is actually correct behavior — a null email means the client doesn't match an email search term. Verify search tests cover clients with null email/phone to confirm they still appear on name-only matches.

---

## Code Examples

### Backend: clients router — GET list with search + filter

```typescript
// Source: established pattern from admin.ts + Drizzle ORM docs
import { or, ilike, and, eq } from 'drizzle-orm';

clientsRouter.get('/', async (req, res) => {
  const companyId = req.companyId!;
  const { search, status } = req.query as { search?: string; status?: string };

  const conditions: SQL[] = [eq(clients.companyId, companyId)];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.fullName, term),
        ilike(clients.email, term),
        ilike(clients.phone, term),
      )!,
    );
  }

  if (status === 'active') conditions.push(eq(clients.isActive, true));
  if (status === 'inactive') conditions.push(eq(clients.isActive, false));

  const result = await db
    .select({
      id: clients.id,
      fullName: clients.fullName,
      email: clients.email,
      phone: clients.phone,
      isActive: clients.isActive,
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(clients.fullName);

  res.json(result);
});
```

### Backend: Portal summary endpoint

```typescript
// Source: schema.ts debtBalances view + payments table
portalRouter.get('/summary', async (req, res) => {
  const clientId = req.user!.clientId!;  // NEVER from params
  const companyId = req.user!.companyId!;

  // Confirmed balance from view
  const balances = await db
    .select({
      totalRemaining: sql<string>`SUM(${debtBalances.remainingBalance})`,
    })
    .from(debtBalances)
    .where(
      and(
        eq(debtBalances.clientId, clientId),
        eq(debtBalances.companyId, companyId),
      ),
    );

  // Pending payments sum (separate from confirmed)
  const pending = await db
    .select({ total: sql<string>`SUM(${payments.amount})` })
    .from(payments)
    .innerJoin(debts, eq(payments.debtId, debts.id))
    .where(
      and(
        eq(debts.clientId, clientId),
        eq(debts.companyId, companyId),
        eq(payments.status, 'pending_approval'),
      ),
    );

  res.json({
    confirmedBalance: balances[0]?.totalRemaining ?? '0.00',
    pendingBalance: pending[0]?.total ?? '0.00',
    asOf: new Date().toISOString(),
  });
});
```

### Backend: Token table migration for clientId column

```typescript
// New migration file: backend/src/db/migrations/0003_client_invite_token.sql
ALTER TABLE tokens ADD COLUMN client_id UUID REFERENCES clients(id);

// Update schema.ts tokens table:
clientId: uuid('client_id').references(() => clients.id),
```

### Backend: accept-invite extension for client linkage

```typescript
// In auth.ts accept-invite, inside the db.transaction:
const [inserted] = await tx.insert(users).values({ ... }).returning({ ... });
newUser = inserted;

// NEW: link user back to client record when role is 'client'
if (tokenRow.role === 'client' && tokenRow.clientId) {
  await tx
    .update(clients)
    .set({ userId: newUser.id, updatedAt: now })
    .where(eq(clients.id, tokenRow.clientId));
}
```

### Frontend: React Router NavLink for sidebar active state

```tsx
// Source: react-router v7 docs; import from 'react-router' (not react-router-dom)
import { NavLink } from 'react-router';

<NavLink
  to="/clients"
  className={({ isActive }) =>
    isActive
      ? 'flex items-center gap-3 px-4 py-2 min-h-[44px] border-l-4 border-blue-600 bg-blue-50 text-blue-600 font-medium text-sm'
      : 'flex items-center gap-3 px-4 py-2 min-h-[44px] border-l-4 border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm'
  }
>
  Clients
</NavLink>
```

### Frontend: TanStack Query pattern for client list

```tsx
// Source: @tanstack/react-query v5 docs + existing apiClient pattern
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.ts';

function useClients(search: string, status: string) {
  return useQuery({
    queryKey: ['clients', { search, status }],
    queryFn: () =>
      apiClient<Client[]>(`/api/v1/clients?search=${encodeURIComponent(search)}&status=${status}`),
    staleTime: 30_000,
  });
}
```

### Frontend: Post-login redirect by role

```tsx
// In LoginPage.tsx — after login() resolves:
const { login } = useAuth();
const navigate = useNavigate();

const handleSubmit = async () => {
  const { user } = await login(email, password);
  if (user.role === 'client') {
    navigate('/portal', { replace: true });
  } else {
    navigate('/', { replace: true });
  }
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Router `react-router-dom` | `react-router` (unified package) | v7 | Import from `react-router`; `react-router-dom` still works but is an alias |
| Tailwind config file | `@import 'tailwindcss'` in CSS, no config | v4 | No `tailwind.config.js`, no postcss.config.js — already in place |
| `asyncHandler` wrapper for Express | Native Express 5 async propagation | Express 5 | No `asyncHandler` needed — async errors propagate to error handler automatically |
| `drizzle-orm` v0.46+ | 0.45.2 (pinned) | — | Breaking changes in 0.46.x — DO NOT upgrade |
| TanStack Query v4 (`useQuery` options as second arg) | v5 (single options object) | v5 | `queryKey` and `queryFn` both inside the options object |

---

## Open Questions

1. **Token table: clientId column or metadata field?**
   - What we know: `tokens` table has no `clientId` or `metadata` column; adding a FK column is clean and type-safe; using metadata (text/JSON) requires no migration to schema definition but loses FK integrity
   - What's unclear: Whether a migration is acceptable overhead vs. quick metadata hack
   - Recommendation: Add `clientId uuid references clients(id)` column via migration. It matches the existing `invitedBy` and `companyId` FK pattern on the same table and is the only approach that allows DB-level referential integrity.

2. **Outstanding balance on client list table (D-04)**
   - What we know: `debtBalances` view is per-debt, not per-client. A per-client balance requires `SUM(remainingBalance)` grouped by `clientId`.
   - What's unclear: Whether the list endpoint should compute this inline (join to view) or via a separate aggregation CTE
   - Recommendation: Use a subquery or CTE on `debtBalances` view grouped by `clientId` — joinable in the clients list query. Do not store the balance as a column.

3. **Resend invite if client already has user_id set**
   - What we know: D-07 mentions "Resend Invite" button. If a client already has a `user_id`, they already have portal access. Sending another invite would create a second user.
   - What's unclear: What "resend" means in this context — a new token for the same flow? Or just resending the existing link?
   - Recommendation: If `client.userId` is null → send new invite token. If `client.userId` is set → show "Portal access already active" and disable the invite button. "Resend Invite" in copywriting should be interpreted as resending an unaccepted invite (token exists but `usedAt` is null).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | Yes | v24.14.0 | — |
| npm | Package management | Yes | 11.9.0 | — |
| PostgreSQL | Database | Yes (Docker) | 16-alpine | — |
| Resend API | Portal invite email | Configured in env | — (env var; not tested here) | Invite email silently fails (fire-and-forget); portal invite flow degrades gracefully — client just doesn't receive email |
| vitest | Test runner | Yes | 4.1.2 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Resend API key (env var) — email delivery fails silently per established fire-and-forget pattern; does not block server startup or route execution.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `backend/vitest.config.ts` (or inline in package.json) |
| Quick run command | `cd backend && npm test -- --reporter=verbose` |
| Full suite command | `cd backend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-03.1 | POST /api/v1/clients creates client scoped to company | unit | `cd backend && npm test -- clients` | Wave 0 |
| FR-03.1 | PATCH /api/v1/clients/:id/deactivate sets isActive=false | unit | `cd backend && npm test -- clients` | Wave 0 |
| FR-03.2 | GET /api/v1/clients?search=X returns matching clients | unit | `cd backend && npm test -- clients` | Wave 0 |
| FR-03.3 | GET /api/v1/clients/:id/debts returns debts grouped by status | unit | `cd backend && npm test -- clients` | Wave 0 |
| FR-03.4 | GET /api/v1/portal/summary returns clientId-scoped data | unit | `cd backend && npm test -- portal` | Wave 0 |
| FR-03.5 | Portal summary response includes `asOf` ISO timestamp | unit | `cd backend && npm test -- portal` | Wave 0 |
| FR-03.6 | Portal summary separates confirmedBalance from pendingBalance | unit | `cd backend && npm test -- portal` | Wave 0 |
| FR-03.7 | Portal endpoints never return internalNotes field | unit | `cd backend && npm test -- portal` | Wave 0 |
| FR-03.7 | Client A JWT cannot retrieve Client B data via portal | unit | `cd backend && npm test -- portal` | Wave 0 |
| FR-02.7 | POST /api/v1/clients/:id/invite sends token and links clientId | unit | `cd backend && npm test -- clients` | Wave 0 |
| D-08 | accept-invite with client token sets clients.user_id | unit | `cd backend && npm test -- auth` | Extend existing |

### Sampling Rate
- **Per task commit:** `cd backend && npm test -- --reporter=dot`
- **Per wave merge:** `cd backend && npm test`
- **Phase gate:** Full backend suite green + manual browser verification of portal isolation before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/__tests__/clients.test.ts` — covers FR-03.1, FR-03.2, FR-03.3, FR-02.7 (client invite)
- [ ] `backend/src/__tests__/portal.test.ts` — covers FR-03.4, FR-03.5, FR-03.6, FR-03.7, cross-client isolation
- [ ] Extend `backend/src/__tests__/auth.test.ts` — add test case for accept-invite with `role='client'` that verifies `clients.user_id` is updated

---

## Project Constraints (from CLAUDE.md)

No CLAUDE.md file was found in the working directory. No project-specific directives to enforce beyond what is documented in STATE.md, CONTEXT.md, and REQUIREMENTS.md.

Effective constraints derived from STATE.md active decisions:
- `drizzle-orm` pinned to 0.45.2 — do not upgrade
- All money columns use `NUMERIC(12,2)` — do not use FLOAT or INTEGER cents
- React Router v7: import from `react-router` (not `react-router-dom`)
- Tailwind v4: no `tailwind.config.js`, no postcss — `@import 'tailwindcss'` via `@tailwindcss/vite`
- `company_id` always from JWT via `requireTenant`, never from request body
- No component library — Tailwind only, hand-rolled components
- Express 5: no `asyncHandler` wrapper needed

---

## Sources

### Primary (HIGH confidence)
- `backend/src/db/schema.ts` — clients table definition, tokens table structure, debtBalances view logic, all FK relationships
- `backend/src/routes/auth.ts` — accept-invite flow, client JWT payload, login clientId embedding
- `backend/src/routes/users.ts` — CRUD router pattern, validateCallerOwner, company-scoped queries, invite token creation
- `backend/src/routes/admin.ts` — Zod validation pattern, returning() usage
- `backend/src/middleware/auth.ts`, `rbac.ts`, `tenant.ts` — middleware stack, JWTPayload shape
- `backend/src/services/email.service.ts` — sendInviteEmail signature and fire-and-forget pattern
- `frontend/src/api/client.ts` — apiClient usage, 401 auto-refresh
- `frontend/src/contexts/AuthContext.tsx` — user state shape, AuthUser interface
- `frontend/src/App.tsx` — current route structure
- `frontend/src/components/ProtectedRoute.tsx` — auth guard pattern to extend for ClientRoute
- `.planning/phases/03-client-management/03-UI-SPEC.md` — complete component inventory, layout specs, modal spec, interaction states, color/typography/spacing system, copywriting contract, accessibility requirements

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` §FR-03 — functional requirements cross-referenced against schema and auth code
- `.planning/STATE.md` — active decisions verified against source files

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified from package.json
- Architecture patterns: HIGH — all patterns extracted directly from existing source files
- Pitfalls: HIGH — derived from reading actual code paths, not speculation
- Test requirements: HIGH — vitest confirmed installed and working; test pattern extracted from existing __tests__ files

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (stable stack; no fast-moving dependencies)
