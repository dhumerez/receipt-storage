---
phase: 03-client-management
plan: "06"
subsystem: frontend
tags: [portal, react, tanstack-query, tailwind, jwt-scoped, security]

requires:
  - phase: 03-02
    provides: portal API endpoints (GET /api/v1/portal/summary + GET /api/v1/portal/debts)
  - phase: 03-03
    provides: PortalLayout shell + ClientRoute guard + stub PortalPage
  - phase: 03-04
    provides: EmptyState component, common portal patterns
  - phase: 03-05
    provides: DebtGroupList pattern (mirrored in PortalDebtGroup)

provides:
  - portal UI: PortalPage wired to real API data
  - PortalBalanceSummary: confirmed + pending balance split
  - PortalDebtGroup: three status sections (open/partially_paid/fully_paid)
  - PortalTransactionRow: individual debt display
  - portal.ts: API wrappers with no clientId in requests

affects: [03-07-if-exists, phase-04-and-beyond]

tech-stack:
  added: []
  patterns:
    - JWT-scoped portal queries (clientId from JWT, never from frontend)
    - PortalDebt type (distinct from DebtItem — no internalNotes structurally)
    - Parallel TanStack Query for summary + debts with shared staleTime
    - Accessible date display via <time dateTime="ISO"> element

key-files:
  created:
    - frontend/src/api/portal.ts
    - frontend/src/components/portal/PortalBalanceSummary.tsx
    - frontend/src/components/portal/PortalTransactionRow.tsx
    - frontend/src/components/portal/PortalDebtGroup.tsx
  modified:
    - frontend/src/pages/portal/PortalPage.tsx

key-decisions:
  - "PortalDebt type is structurally distinct from DebtItem (no internalNotes field) — internalNotes exclusion is structural, not filtered"
  - "portal.ts sends no clientId — backend reads it from JWT (FR-03.4, RESEARCH Pitfall 2)"
  - "PortalBalanceSummary uses <time dateTime={summary.asOf}> for FR-03.5 + accessibility"

patterns-established:
  - "Portal API: clientId never in query params or request body — JWT-only scoping"
  - "Balance split: confirmedBalance separate from pendingBalance per FR-03.6"

requirements-completed: [FR-03.4, FR-03.5, FR-03.6, FR-03.7, NFR-04.1]

duration: 3min
completed: 2026-03-31
---

# Phase 3 Plan 06: Client Portal UI Summary

**Client portal page with JWT-scoped balance/debts queries, FR-03.6 confirmed/pending split, accessible date element, and internalNotes exclusion via structural typing.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T04:35:33Z
- **Completed:** 2026-03-31T04:38:08Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Portal API wrappers (`getPortalSummary`, `getPortalDebts`) with no clientId in requests
- `PortalBalanceSummary` with confirmed balance, "Awaiting confirmation" pending section, and `<time>` element for accessibility
- `PortalDebtGroup` with three status groups (Open / Partially Paid / Fully Paid) matching UI-SPEC badge colors
- `PortalPage` stub replaced with full implementation: both queries, error handling, empty state
- TypeScript compilation clean — 0 errors

## Task Commits

1. **Task 1: Portal API wrappers, PortalBalanceSummary, PortalTransactionRow** - `3acb07a` (feat)
2. **Task 2: PortalDebtGroup and PortalPage** - `43882bf` (feat)

## Files Created/Modified

- `frontend/src/api/portal.ts` — `getPortalSummary` + `getPortalDebts`, no clientId in requests
- `frontend/src/components/portal/PortalBalanceSummary.tsx` — balance display with confirmed/pending split + `<time>` element
- `frontend/src/components/portal/PortalTransactionRow.tsx` — individual debt row (original/paid/remaining)
- `frontend/src/components/portal/PortalDebtGroup.tsx` — three status groups with badge colors per UI-SPEC
- `frontend/src/pages/portal/PortalPage.tsx` — full portal page replacing stub; wires summary + debts queries

## Decisions Made

1. **PortalDebt type is structurally distinct from DebtItem** — `PortalDebt` has no `internalNotes` field by design. The frontend cannot accidentally render internal notes because the type never carries them. This mirrors the backend's structural guard (no transactions join in portal queries).

2. **portal.ts sends no clientId** — `getPortalSummary()` and `getPortalDebts()` call `/api/v1/portal/summary` and `/api/v1/portal/debts` with no parameters. The backend reads `clientId` from the JWT, making it impossible for the frontend to accidentally scope to the wrong client.

3. **`<time dateTime={summary.asOf}>` for accessibility** — FR-03.5 "as of [date]" rendered via `<time>` element per UI-SPEC accessibility contract. The `dateTime` attribute carries the ISO string; display text uses `toLocaleDateString()`.

## Deviations from Plan

None — plan executed exactly as written.

One minor deviation in execution process: the worktree's `frontend/node_modules/` was absent (worktree shares git history but not node_modules). Ran `npm install` to restore them before TypeScript checks — this is a worktree setup step, not a code change.

## Issues Encountered

None — all components typed cleanly on first pass.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — all plan goals achieved. PortalPage stub from 03-03 replaced with full implementation. All API calls wired to real endpoints.

## Next Phase Readiness

- Phase 3 Client Management frontend is complete: clients list (03-04), client detail (03-05), and portal (03-06) all implemented
- Phase 4 (Product Catalog) can begin; no portal dependencies block it
- Phase 3 validation requires a deployed backend with client data — portal shows "No transactions yet" until Phase 5-6 create real debts/payments

---
*Phase: 03-client-management*
*Completed: 2026-03-31*
