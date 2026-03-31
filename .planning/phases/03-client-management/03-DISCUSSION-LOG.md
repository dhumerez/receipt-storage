# Phase 3: Client Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-client-management
**Areas discussed:** App navigation shell, Client list layout, Portal invite flow, Client portal shell

---

## App Navigation Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar | Persistent sidebar, collapses on mobile | ✓ |
| Top nav tabs | Horizontal tabs below header | |
| No nav yet | Stub routes, add nav later | |

**Mobile behavior:**

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger menu | Sidebar toggles via hamburger icon | |
| Bottom tab bar | Persistent bottom bar with icons | ✓ |
| Same sidebar scrollable | Sidebar stays visible on mobile | |

**Notes:** Left sidebar on desktop, bottom tab bar on mobile.

---

## Client List Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Table with rows | Columns: Name, Phone, Balance, Status | ✓ |
| Cards grid | Each client as a card with stats | |
| List with summary row | Compact rows, expandable | |

**Click behavior:**

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to detail page | Full page /clients/:id | ✓ |
| Slide-out drawer | Panel slides in from right | |
| Expand inline | Row expands in place | |

**Create/edit:**

| Option | Description | Selected |
|--------|-------------|----------|
| Modal form | Dialog over current page | ✓ |
| Dedicated page | /clients/new and /clients/:id/edit | |
| Inline on detail | Edit fields on detail page | |

---

## Portal Invite Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit 'Send Portal Invite' button | Owner manually triggers invite from detail page | ✓ |
| Invite on creation | Email required, invite sent immediately | |
| No invite in Phase 3 | Defer portal login entirely | |

**User note:** User mentioned wanting Google OAuth and self-service SaaS registration (sign up → demo → pay → join company). This was scoped out of Phase 3 and parked as deferred backlog ideas. Phase 3 invite flow confirmed as invite-only email/password using existing accept-invite mechanism.

---

## Client Portal Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal portal shell | Simple top bar, no sidebar, centered content | ✓ |
| Same AppLayout as owners | Reuse owner shell, sidebar with portal items | |
| Card-based summary only | Single page, no nav | |

**Transaction display:**

| Option | Description | Selected |
|--------|-------------|----------|
| Simple list with amounts/dates | Reference, date, total, paid, remaining | |
| Debt-grouped view | Group by Open/Partial/Paid debt status | ✓ |
| You decide | Defer to planner | |

---

## Claude's Discretion

- Sidebar collapse behavior on desktop
- Empty states (client list, portal)
- Deactivate confirmation dialog
