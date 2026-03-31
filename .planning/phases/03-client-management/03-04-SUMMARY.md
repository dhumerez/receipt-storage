---
phase: "03"
plan: "04"
subsystem: frontend
tags: [client-management, ui, tanstack-query, modal, table, search, filter]
dependency_graph:
  requires: [03-01, 03-02, 03-03]
  provides: [ClientsPage, ClientModal, ClientTable, DeactivateConfirmModal, clients-api-wrappers, SearchBar, StatusFilterToggle, EmptyState, ClientStatusBadge]
  affects: [03-05, 03-06]
tech_stack:
  added: []
  patterns:
    - useQuery with queryKey ['clients', { search, status }] and staleTime 30_000
    - useMutation with queryClient.invalidateQueries on success
    - 300ms debounce via useRef<ReturnType<typeof setTimeout>>
    - Modal focus trap via useEffect + document.addEventListener('keydown')
    - Overlay click-to-close via e.target === e.currentTarget check
key_files:
  created:
    - frontend/src/api/clients.ts
    - frontend/src/components/common/SearchBar.tsx
    - frontend/src/components/common/StatusFilterToggle.tsx
    - frontend/src/components/common/EmptyState.tsx
    - frontend/src/components/clients/ClientStatusBadge.tsx
    - frontend/src/components/clients/ClientTableRow.tsx
    - frontend/src/components/clients/ClientTable.tsx
    - frontend/src/components/clients/ClientModal.tsx
    - frontend/src/components/clients/DeactivateConfirmModal.tsx
  modified:
    - frontend/src/pages/clients/ClientsPage.tsx
decisions:
  - "editClient state typed as Client | null (not ClientListItem) — ClientModal requires full Client object with address/referencesText fields for pre-fill; ClientListItem only has list-view fields"
  - "useRef<ReturnType<typeof setTimeout> | undefined>(undefined) — TypeScript strict mode requires explicit undefined initial value to satisfy noUnusedLocals and strictNullChecks"
  - "DeactivateConfirmModal clientName prop prefixed with _ — prop required by interface for plan 03-05 reuse (detail page redirect), not rendered in list-page variant"
metrics:
  duration: "4m 46s"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 1
---

# Phase 03 Plan 04: Client List Page Summary

**One-liner:** Full client list page with searchable/filterable table, create/edit modal, deactivate confirm dialog, and TanStack Query cache integration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API client wrappers + common UI components | 4140cbf | clients.ts, SearchBar.tsx, StatusFilterToggle.tsx, EmptyState.tsx, ClientStatusBadge.tsx |
| 2 | ClientTable, ClientModal, DeactivateConfirmModal, ClientsPage | 6191e47 | ClientTableRow.tsx, ClientTable.tsx, ClientModal.tsx, DeactivateConfirmModal.tsx, ClientsPage.tsx |

## What Was Built

### Task 1: API Client Wrappers + Common UI Components

**frontend/src/api/clients.ts** — API wrappers for all client endpoints: `getClients` (with search/status query params), `getClient`, `createClient`, `updateClient`, `deactivateClient`, `sendPortalInvite`, `getClientDebts`. Types exported: `ClientListItem`, `Client`, `CreateClientInput`, `UpdateClientInput`, `DebtItem`, `ClientDebtsResponse`.

**SearchBar.tsx** — Search input with magnifying glass SVG icon, `placeholder` prop, and `onChange` callback. Ready for 300ms debounce at usage site.

**StatusFilterToggle.tsx** — Segmented control with All/Active/Inactive options. Active option gets `bg-blue-600 text-white`. Type: `'all' | 'active' | 'inactive'`.

**EmptyState.tsx** — Centered empty state with heading, body text, and optional CTA button. Used for both "No clients yet" and "No inactive clients" states.

**ClientStatusBadge.tsx** — Pill badge with `aria-label="Status: Active/Inactive"`. Active: `bg-green-100 text-green-800`. Inactive: `bg-gray-100 text-gray-600`.

### Task 2: Table, Modals, and Full ClientsPage

**ClientTableRow.tsx** — Table row with `role="button"`, `tabIndex={0}`, keyboard handler (Enter/Space), hover state. Columns: fullName, phone (— fallback), `$X.XX` formatted balance, StatusBadge.

**ClientTable.tsx** — Table wrapper with `border border-gray-200 rounded-lg overflow-hidden`, gray header row, uppercase tracking-wider headers.

**ClientModal.tsx** — Create/edit form modal. Edit mode auto-fills from `editData` prop. Features: Escape close, overlay click close, `setTimeout(focus, 50)` on open, `useMutation` with cache invalidation on success, error banner on failure. Copywriting: "Add Client" / "Edit Client" header; "Create Client" / "Save Changes" submit button.

**DeactivateConfirmModal.tsx** — Confirmation dialog. "Deactivate client?" heading, preservation message body, "Keep Client" cancel, "Deactivate Client" destructive button. `redirectAfter` prop enables post-deactivation navigation for plan 03-05 (detail page).

**ClientsPage.tsx** — Full page replacing stub. Features:
- 300ms debounce on search input via `useRef` + `useEffect`
- `useQuery(['clients', { search, status }])` with `staleTime: 30_000`
- Active filter default (`status === 'active'`)
- Empty state with filter-aware copy and conditional CTA
- Navigate to `/clients/:id` on row click
- Create/Edit modal orchestration (`editClient: Client | null` state)
- Deactivate modal orchestration (`deactivateTarget: ClientListItem | null` state)

## Decisions Made

1. **editClient typed as `Client | null`** — `ClientModal` requires full `Client` object (address, referencesText fields) for pre-fill. `ClientListItem` only carries list-view fields. Since editing from the list page would need a separate fetch anyway, the state holds `Client | null` and edit from the list is wired for future use.

2. **`useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`** — TypeScript strict mode (`noUnusedLocals: true`) and `noImplicitAny` require explicit typing and initialization. The `| undefined` union with explicit `undefined` initial value satisfies strictNullChecks.

3. **`clientName` prop prefixed `_clientName` in DeactivateConfirmModal** — The prop is part of the public interface (plan 03-05 will display the client name in the confirmation text on the detail page), but in the list-page context it's unused. Prefix avoids TypeScript `noUnusedParameters` error while keeping the interface stable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode type mismatches**

- **Found during:** Task 2 (TypeScript verification)
- **Issue 1:** `useRef<ReturnType<typeof setTimeout>>()` — TypeScript 5.x strict mode requires `undefined` initial value for refs with no default
- **Issue 2:** `editClient` typed as `ClientListItem | null` but `ClientModal.editData` expects `Client | null` — `ClientListItem` missing `address`, `referencesText`, `updatedAt`, `userId`, `companyId` fields
- **Fix:** Changed `useRef` to `useRef<... | undefined>(undefined)`; changed `editClient` state type to `Client | null` and added `Client` to imports
- **Files modified:** `frontend/src/pages/clients/ClientsPage.tsx`
- **Commit:** included in 6191e47

## Known Stubs

None. All stubs from plan 03-03 that belong to this plan have been replaced:

| File | Previous Stub | Status |
|------|---------------|--------|
| frontend/src/pages/clients/ClientsPage.tsx | `<h1>Clients</h1><p>Loading...</p>` | Fully implemented |

Remaining stubs from 03-03 (out of scope for this plan):
- `frontend/src/pages/clients/ClientDetailPage.tsx` — Plan 03-05 will implement
- `frontend/src/pages/portal/PortalPage.tsx` — Plan 03-06 will implement

## Verification

```
TypeScript: 0 errors (node_modules/.bin/tsc --noEmit)
companyId in frontend/src/api/clients.ts: only in Client response interface (received, not sent)
internalNotes in frontend/src/pages/clients/: 0 matches
react-router-dom in frontend/src/: 0 actual imports (grep matches only in comments)
tailwind.config in frontend/src/: 0 matches
```

## Self-Check

### Files Exist

- [x] frontend/src/api/clients.ts
- [x] frontend/src/components/common/SearchBar.tsx
- [x] frontend/src/components/common/StatusFilterToggle.tsx
- [x] frontend/src/components/common/EmptyState.tsx
- [x] frontend/src/components/clients/ClientStatusBadge.tsx
- [x] frontend/src/components/clients/ClientTableRow.tsx
- [x] frontend/src/components/clients/ClientTable.tsx
- [x] frontend/src/components/clients/ClientModal.tsx
- [x] frontend/src/components/clients/DeactivateConfirmModal.tsx
- [x] frontend/src/pages/clients/ClientsPage.tsx (stub replaced)

### Commits Exist

- [x] 4140cbf — feat(03-04): add API client wrappers and common UI components
- [x] 6191e47 — feat(03-04): add ClientTable, ClientModal, DeactivateConfirmModal, ClientsPage
