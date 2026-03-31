---
phase: "03"
plan: "03"
subsystem: frontend
tags: [navigation, routing, layout, role-based-routing, sidebar, portal]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [AppLayout-with-sidebar, ClientRoute-guard, portal-routing, role-based-login-redirect]
  affects: [03-04, 03-05, 03-06]
tech_stack:
  added: []
  patterns:
    - NavLink className function for active state
    - ClientRoute guard mirroring ProtectedRoute pattern
    - AuthContext.login() returning AuthUser for role-based redirect
    - Sidebar desktop-only (hidden md:flex) + BottomTabBar mobile-only (md:hidden)
key_files:
  created:
    - frontend/src/components/layout/Sidebar.tsx
    - frontend/src/components/layout/BottomTabBar.tsx
    - frontend/src/components/layout/PortalLayout.tsx
    - frontend/src/components/ClientRoute.tsx
    - frontend/src/pages/clients/ClientsPage.tsx
    - frontend/src/pages/clients/ClientDetailPage.tsx
    - frontend/src/pages/portal/PortalPage.tsx
  modified:
    - frontend/src/components/layout/AppLayout.tsx
    - frontend/src/App.tsx
    - frontend/src/pages/LoginPage.tsx
    - frontend/src/contexts/AuthContext.tsx
decisions:
  - "AuthContext.login() updated to return AuthUser — enables role-based redirect without calling apiLogin twice or reading stale React state"
  - "Stub pages (ClientsPage, ClientDetailPage, PortalPage) created so App.tsx compiles — plan truths require /clients and /portal routes active"
  - "ClientRoute guards entire portal subtree — unauthenticated redirect to /login, non-client redirect to /"
metrics:
  duration: "3m 13s"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 4
---

# Phase 03 Plan 03: Navigation Shell and Role-Based Routing Summary

**One-liner:** Sidebar (240px desktop) + BottomTabBar (56px mobile) navigation shell with ClientRoute guard routing client logins to /portal and non-clients back to /.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Sidebar, BottomTabBar, PortalLayout components | 81c1369 | Sidebar.tsx, BottomTabBar.tsx, PortalLayout.tsx |
| 2 | AppLayout update, ClientRoute guard, App.tsx routes, LoginPage role redirect | 4af0152 | AppLayout.tsx, ClientRoute.tsx, App.tsx, LoginPage.tsx, AuthContext.tsx, stub pages |

## What Was Built

### Task 1: Navigation Layout Components

**Sidebar.tsx** — 240px fixed left nav using React Router NavLink with className function for active state. Desktop-only via `hidden md:flex`. Active state: `border-l-4 border-blue-600 bg-blue-50 text-blue-600 font-medium`. Touch targets: `min-h-[44px]` per UI-SPEC. Accessible: `aria-label="Main navigation"` wrapping `<ul>/<li>` structure.

**BottomTabBar.tsx** — Mobile 4-tab bar fixed at bottom (`md:hidden`). Height 56px (`min-h-[56px]`) for mobile ergonomics. Active tab: `text-blue-600`; inactive: `text-gray-500`. Each tab has `aria-label={label}` since text is small on mobile.

**PortalLayout.tsx** — Minimal portal shell: top bar (logo + Logout button), `max-w-2xl mx-auto px-4` centered content area, `bg-gray-50` background. Outlet renders portal page content.

### Task 2: Routing, Guards, and Login Logic

**AppLayout.tsx** — Replaced bare header with `<Sidebar /> + <main> + <BottomTabBar />` flex layout. Main has `pb-16 md:pb-0` to clear fixed BottomTabBar on mobile.

**ClientRoute.tsx** — Route guard mirroring ProtectedRoute pattern. Checks: (1) isLoading → spinner, (2) !user → /login, (3) user.role !== 'client' → /, (4) pass → `<Outlet />`.

**App.tsx** — Routes restructured:
- `/clients` and `/clients/:id` added under `ProtectedRoute > AppLayout`
- `/portal` added under `ClientRoute > PortalLayout`
- Stub page imports added for plans 03-04 through 03-06

**LoginPage.tsx** — `handleSubmit` now captures return value of `login()` and branches: `role === 'client'` → `navigate('/portal')`, otherwise → `navigate('/')`.

**AuthContext.tsx** — `login()` signature updated from `Promise<void>` to `Promise<AuthUser>` — returns the user object so LoginPage can read role without stale React state issues.

## Decisions Made

1. **AuthContext.login() returns AuthUser** — The cleanest approach to role-based redirect. After `login()` resolves, React state (`user`) may not have updated in the same render cycle. Returning `user` directly from the API response is synchronous and reliable. Alternative (calling apiLogin twice or using useEffect) would be more complex.

2. **Stub pages created immediately** — `ClientsPage`, `ClientDetailPage`, and `PortalPage` are stub files (h1 + "Loading..." paragraph) so App.tsx compiles and routes are active for plans 03-04 through 03-06 to fill in. These are intentional stubs per the plan.

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| frontend/src/pages/clients/ClientsPage.tsx | Returns `<h1>Clients</h1><p>Loading...</p>` | Plan 03-04 will implement full client list UI |
| frontend/src/pages/clients/ClientDetailPage.tsx | Returns `<h1>Client Detail</h1><p>Loading...</p>` | Plan 03-05 will implement client detail UI |
| frontend/src/pages/portal/PortalPage.tsx | Returns `<h1>My Account</h1><p>Loading...</p>` | Plan 03-06 will implement portal UI |

These stubs are intentional — their routes are active and route guards are working. The stubs will be replaced in Plans 03-04, 03-05, and 03-06.

## Deviations from Plan

None — plan executed exactly as written.

The one clarification: Task 2 specified updating `AuthContext.login()` to return `AuthUser` with instructions embedded in the action block. This was implemented as specified.

## Verification

```
TypeScript: 0 errors (npx tsc --noEmit)
navigate('/portal' in LoginPage.tsx: line 32
Sidebar + BottomTabBar in AppLayout.tsx: lines 2, 3, 12, 16
role !== 'client' in ClientRoute.tsx: line 23
/portal route in App.tsx: present (line 34)
ClientRoute in App.tsx: present (line 33)
react-router-dom imports: 0 (all use 'react-router')
```

## Self-Check

### Files Exist

- [x] frontend/src/components/layout/Sidebar.tsx
- [x] frontend/src/components/layout/BottomTabBar.tsx
- [x] frontend/src/components/layout/PortalLayout.tsx
- [x] frontend/src/components/ClientRoute.tsx
- [x] frontend/src/pages/clients/ClientsPage.tsx
- [x] frontend/src/pages/clients/ClientDetailPage.tsx
- [x] frontend/src/pages/portal/PortalPage.tsx

### Commits Exist

- [x] 81c1369 — feat(03-03): add Sidebar, BottomTabBar, and PortalLayout components
- [x] 4af0152 — feat(03-03): update AppLayout, add ClientRoute guard, add routes, role-based login redirect
