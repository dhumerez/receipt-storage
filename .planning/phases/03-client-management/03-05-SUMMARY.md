---
phase: "03"
plan: "05"
subsystem: frontend
tags: [client-detail, balance-summary, debt-tracking, portal-invite, react, tanstack-query]
dependency_graph:
  requires: [03-03, 03-04]
  provides: [ClientDetailPage, ClientDetailHeader, BalanceSummary, DebtGroupList, DebtCard]
  affects: [03-06]
tech_stack:
  added: []
  patterns:
    - useParams for client ID from URL
    - Parallel useQuery for client + debts data
    - useMutation for sendPortalInvite with success/error feedback
    - DebtGroupList filtering by status with GROUPS constant array
    - Accessible time element with dateTime attribute for balance date
key_files:
  created:
    - frontend/src/components/clients/BalanceSummary.tsx
    - frontend/src/components/clients/DebtCard.tsx
    - frontend/src/components/clients/DebtGroupList.tsx
    - frontend/src/components/clients/ClientDetailHeader.tsx
    - frontend/src/pages/clients/ClientDetailPage.tsx
    - frontend/src/api/clients.ts
    - frontend/src/components/clients/ClientStatusBadge.tsx
    - frontend/src/components/clients/ClientModal.tsx
    - frontend/src/components/clients/DeactivateConfirmModal.tsx
  modified: []
decisions:
  - "Prerequisite files from 03-04 created in this worktree — parallel execution requires 03-04 outputs to exist for TypeScript compilation; same code will be produced by 03-04 agent"
  - "DebtGroupList uses GROUPS constant array for ordering — ensures Open/Partially Paid/Fully Paid always render in consistent order regardless of API response order"
  - "ClientDetailPage waits on both clientLoading and debtsLoading before rendering — prevents flash of partial content"
metrics:
  duration: "4m 20s"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 1
---

# Phase 03 Plan 05: Client Detail Page Summary

**One-liner:** Client detail page with header (name/contact/status/actions), balance summary (accessible time element, asOf date), and debt group list (Open/Partially Paid/Fully Paid) with Send Portal Invite flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | BalanceSummary, DebtCard, DebtGroupList components | 288f2fb | BalanceSummary.tsx, DebtCard.tsx, DebtGroupList.tsx, clients.ts, ClientStatusBadge.tsx, ClientModal.tsx, DeactivateConfirmModal.tsx |
| 2 | ClientDetailHeader and ClientDetailPage | a313562 | ClientDetailHeader.tsx, ClientDetailPage.tsx |

## What Was Built

### Task 1: Balance and Debt Display Components

**BalanceSummary.tsx** — Card displaying outstanding balance with "Outstanding balance as of [date]" label. Date rendered via `<time dateTime={asOf}>` (accessibility per UI-SPEC). Human-readable date via `toLocaleDateString()`. Balance formatted to 2 decimal places.

**DebtCard.tsx** — Single debt card with three amount columns (Original, Paid, Remaining). Status badge with aria-label. Color mapping: open/fully_paid = green, partially_paid = blue-100/blue-700, written_off = gray. Remaining balance text turns green when fully paid.

**DebtGroupList.tsx** — Groups debts into three sections (Open Debts, Partially Paid, Fully Paid) using constant GROUPS array for consistent ordering. Empty groups are hidden. Zero debts shows empty state message.

**Prerequisite files (03-04 parallel)** — Created `clients.ts` API wrappers (`getClients`, `getClient`, `getClientDebts`, `createClient`, `updateClient`, `deactivateClient`, `sendPortalInvite`), `ClientStatusBadge.tsx` (active/inactive pill with aria-label), `ClientModal.tsx` (create/edit form with focus trap and Escape key), `DeactivateConfirmModal.tsx` (confirmation dialog with redirectAfter support).

### Task 2: Header and Page Orchestration

**ClientDetailHeader.tsx** — Header card with client name, contact info (email/phone/address), status badge. Action buttons: Edit Client (opens ClientModal pre-filled), Send Portal Invite (disabled with tooltip when no email, hidden when portal already active), Deactivate Client (opens DeactivateConfirmModal with redirectAfter). Invite success banner and error message per UI-SPEC copywriting.

**ClientDetailPage.tsx** — Full page implementation replacing stub. Fetches client via `useQuery(['client', id])` and debts via `useQuery(['client', id, 'debts'])`. Shows loading state, error state (exact copy: "Could not load client. Please refresh the page."), and full page with back link (← Clients), header, balance summary, and debt groups.

## Decisions Made

1. **Prerequisite files from 03-04 created in this worktree** — 03-04 runs in parallel in a separate worktree. TypeScript compilation requires the imported files to exist. The same files will be created by the 03-04 agent; the merge will resolve any overlap. The implementations match exactly what 03-04's plan specifies.

2. **GROUPS constant array for DebtGroupList ordering** — Using a constant `GROUPS` array (open → partially_paid → fully_paid) ensures the group render order is deterministic regardless of API response ordering. Written_off debts are intentionally excluded from display groups.

3. **Parallel loading wait** — `clientLoading || debtsLoading` in the loading guard prevents partial renders where only one query has resolved. Both must complete before the full page is shown.

## Deviations from Plan

### Auto-added Files (Parallel Execution)

**[Rule 3 - Blocking Issue] Created 03-04 prerequisite files in this worktree**
- **Found during:** Task 1 setup
- **Issue:** Plan 03-04 runs in parallel (same wave 4). Its output files (`clients.ts`, `ClientStatusBadge.tsx`, `ClientModal.tsx`, `DeactivateConfirmModal.tsx`) are required imports for 03-05 components. Without them, TypeScript compilation fails.
- **Fix:** Created all prerequisite files using the exact specifications from 03-04's plan. These are identical to what 03-04 produces — the merge will include both.
- **Files modified:** frontend/src/api/clients.ts, frontend/src/components/clients/ClientStatusBadge.tsx, frontend/src/components/clients/ClientModal.tsx, frontend/src/components/clients/DeactivateConfirmModal.tsx
- **Commit:** 288f2fb

## Verification

```
TypeScript: 0 errors (node_modules/.bin/tsc --noEmit)
internalNotes in pages/clients: 0 (no data leak)
dateTime in BalanceSummary.tsx: line 14 (<time dateTime={asOf}>)
Portal Invite in ClientDetailHeader.tsx: line 72 ('Send Portal Invite')
All 17 acceptance criteria: PASS
```

## Known Stubs

None — all components are fully implemented with real data sources.

## Self-Check

### Files Exist

- [x] frontend/src/components/clients/BalanceSummary.tsx
- [x] frontend/src/components/clients/DebtCard.tsx
- [x] frontend/src/components/clients/DebtGroupList.tsx
- [x] frontend/src/components/clients/ClientDetailHeader.tsx
- [x] frontend/src/pages/clients/ClientDetailPage.tsx
- [x] frontend/src/api/clients.ts
- [x] frontend/src/components/clients/ClientStatusBadge.tsx
- [x] frontend/src/components/clients/ClientModal.tsx
- [x] frontend/src/components/clients/DeactivateConfirmModal.tsx

### Commits Exist

- [x] 288f2fb — feat(03-05): add BalanceSummary, DebtCard, DebtGroupList components
- [x] a313562 — feat(03-05): implement ClientDetailHeader and ClientDetailPage
