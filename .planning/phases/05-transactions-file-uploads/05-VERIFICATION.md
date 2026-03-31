---
phase: 05-transactions-file-uploads
verified: 2026-03-31T18:15:00Z
status: passed
score: 7/7 must-haves verified
gaps: []
human_verification:
  - test: "Create a transaction with file attachments via the UI"
    expected: "Form submits successfully, transaction appears in list, attachments visible on detail page"
    why_human: "Requires running server, database, and browser interaction to verify end-to-end FormData upload"
  - test: "Approve/reject a transaction from the notification panel"
    expected: "Owner clicks bell, sees pending transaction, approves/rejects inline, badge count updates"
    why_human: "Requires two user sessions (owner + collaborator) and real-time UI interaction"
  - test: "Camera capture on mobile device"
    expected: "Take Photo button opens native camera, Choose from Gallery opens file picker"
    why_human: "capture='environment' behavior varies by device/OS, cannot verify without physical device"
  - test: "HEIC file upload from iOS device"
    expected: "HEIC photo is accepted, converted to JPEG server-side, thumbnail generated"
    why_human: "Requires iOS device or HEIC sample file with running sharp pipeline"
---

# Phase 5: Transactions & File Uploads Verification Report

**Phase Goal:** Owners and collaborators can create receipts with line items and attach proof documents; approval workflow functions correctly.
**Verified:** 2026-03-31T18:15:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner creates transaction and it is immediately active with debt auto-created | VERIFIED | `transactions.ts:142` sets status via `userRole === 'owner' ? 'active' : 'pending_approval'`; debt insert at line 176 when `status === 'active' && totalCents > initialPaymentCents` |
| 2 | Collaborator creates transaction and it goes to pending_approval | VERIFIED | Same ternary at line 142; notification to owners at lines 187-209 |
| 3 | Owner can approve pending transaction with SELECT FOR UPDATE race safety | VERIFIED | `transactions.ts:418` uses `.for('update')`, checks `status !== 'pending_approval'`, updates to active, creates debt, notifies submitter |
| 4 | Owner can reject pending transaction with required reason; transaction returns to draft | VERIFIED | `transactions.ts:482-551` validates reason via `RejectSchema`, uses `.for('update')`, sets status to `'draft'` |
| 5 | User can create a transaction with line items, files, and notes in a single form submission | VERIFIED | `NewTransactionPage.tsx` has all form sections (client, date, items, payment, notes, attachments), calls `createTransaction(input, files)` which builds FormData; backend POST handler at line 100 applies `uploadMiddleware` and processes files atomically in `db.transaction` block |
| 6 | File upload pipeline processes images (HEIC, EXIF, resize, thumbnails) and blocks SVG | VERIFIED | `upload.ts` blocks SVG at MIME level; `upload.service.ts` validates magic bytes, runs sharp `.rotate().resize({width:1920}).jpeg()`, generates 200px thumbnails, stores with UUID filenames in per-company dirs |
| 7 | Bell icon with unread count visible on every page; owner can approve/reject inline from panel | VERIFIED | `NotificationBell.tsx` renders for owner/collaborator with `getUnreadCount` query; mounted in `AppLayout.tsx` header; `NotificationPanelItem.tsx` has approve/reject buttons with `invalidateQueries` on success; reject has inline textarea expansion with reason validation |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/routes/transactions.ts` | Transaction CRUD + approval endpoints | VERIFIED | 611 lines, 6 endpoints (POST /, GET /, GET /:id, POST /:id/approve, POST /:id/reject, POST /:id/void), exports `transactionsRouter`, `toCents`, `fromCents` |
| `backend/src/routes/notifications.ts` | Notification list + unread count + mark-read | VERIFIED | 108 lines, 4 endpoints (GET /unread-count, GET /, PATCH /:id/read, POST /mark-all-read) |
| `backend/src/middleware/upload.ts` | Multer middleware with memoryStorage, SVG filter, limits | VERIFIED | 20 lines, 10MB/5 files limits, SVG MIME + extension blocking |
| `backend/src/services/upload.service.ts` | processFile: magic bytes, sharp pipeline, UUID naming | VERIFIED | 85 lines, dynamic `import('file-type')`, EXIF `.rotate()`, resize 1920px, 200px thumbnail, UUID filenames, per-company directories |
| `backend/src/routes/files.ts` | Authenticated file serving | VERIFIED | 65 lines, tenant check, filename regex sanitization, DB lookup, `Content-Disposition`, `X-Content-Type-Options: nosniff` |
| `backend/Dockerfile` | bookworm-slim with libvips + libheif | VERIFIED | Uses `node:22-bookworm-slim`, `libvips-dev` + `libheif-dev` in builder, `libvips42` + `libheif1` in production |
| `frontend/src/api/transactions.ts` | Transaction CRUD API client | VERIFIED | 98 lines, exports `createTransaction` (FormData with `headers: {}`), `getTransactions`, `getTransaction`, `getFileUrl`; does NOT contain notification functions |
| `frontend/src/api/notifications.ts` | Notification and approval API functions | VERIFIED | 48 lines, exports `getNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`, `approveTransaction`, `rejectTransaction`, `NotificationItem` |
| `frontend/src/pages/transactions/NewTransactionPage.tsx` | Full-page transaction creation form | VERIFIED | 237 lines, all form sections, `createTransaction` call, `Discard Changes` + `Save Transaction` buttons, internal notes conditional rendering |
| `frontend/src/components/transactions/LineItemBuilder.tsx` | Row-based line item builder | VERIFIED | 208 lines, `+ Catalog` and `+ Free-form` buttons, desktop grid and mobile stacked layouts, running total, catalog items read-only with `bg-gray-50` |
| `frontend/src/components/transactions/CatalogPickerModal.tsx` | Product search modal | VERIFIED | 3887 bytes, exists with catalog selection |
| `frontend/src/components/transactions/FileAttachmentSection.tsx` | react-dropzone + two-button UX | VERIFIED | 193 lines, `useDropzone`, `capture="environment"` (camera), `Take Photo` + `Choose from Gallery` always visible, thumbnails with remove, `aria-label="Remove file"`, object URL cleanup |
| `frontend/src/components/transactions/TransactionStatusBadge.tsx` | Status badge component | VERIFIED | All 5 states with correct colors |
| `frontend/src/components/layout/NotificationBell.tsx` | Bell icon with unread badge | VERIFIED | Role check for owner/collaborator, `getUnreadCount` with 30s stale time, 60s refetch, `aria-label="Notifications"`, badge with `9+` overflow |
| `frontend/src/components/layout/NotificationPanel.tsx` | Right-side slide-out panel | VERIFIED | 4118 bytes, exists with slide animation |
| `frontend/src/components/layout/NotificationPanelItem.tsx` | Individual item with approve/reject | VERIFIED | 176 lines, approve/reject mutations, inline reject with textarea + `Confirm Reject` + reason validation, `invalidateQueries`, collaborator sees status badges |
| `frontend/src/pages/transactions/TransactionsPage.tsx` | Transaction list with filters | VERIFIED | 6701 bytes, `getTransactions` query, filters present |
| `frontend/src/pages/transactions/TransactionDetailPage.tsx` | Transaction detail with all sections | VERIFIED | 219 lines, 5 sections (header, line items, payment summary, attachments, notes), `getFileUrl` for thumbnails, internal notes conditional, error state |
| `frontend/src/components/transactions/TransactionTable.tsx` | Table component | VERIFIED | 1594 bytes |
| `frontend/src/components/transactions/TransactionTableRow.tsx` | Table row with navigation | VERIFIED | 1633 bytes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `transactions.ts` (backend) | `db/schema.ts` | `db.transaction(async (tx)` + table imports | WIRED | Imports transactions, transactionItems, debts, notifications, companyCounters, auditLogs, documents from schema; uses `db.transaction()` blocks |
| `app.ts` | `transactions.ts` | Router mount | WIRED | `app.use('/api/v1/transactions', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), transactionsRouter)` |
| `app.ts` | `notifications.ts` | Router mount | WIRED | `app.use('/api/v1/notifications', authenticate, requireTenant, notificationsRouter)` |
| `app.ts` | `files.ts` | Router mount | WIRED | `app.use('/api/v1/files', authenticate, filesRouter)` |
| `transactions.ts` (backend) | `upload.ts` | `uploadMiddleware` in POST route | WIRED | Line 100: `transactionsRouter.post('/', uploadMiddleware, async (req, res)` |
| `transactions.ts` (backend) | `upload.service.ts` | `processFile` call in db.transaction | WIRED | Lines 226-247: `processFile()` called for each uploaded file, document rows inserted in same transaction |
| `files.ts` | `db/schema.ts` | documents table lookup | WIRED | Queries documents table for auth check before serving |
| `NewTransactionPage.tsx` | `/api/v1/transactions` | `createTransaction()` FormData POST | WIRED | Imports and calls `createTransaction(input, files)` via useMutation |
| `NotificationBell.tsx` | `/api/v1/notifications/unread-count` | `getUnreadCount` useQuery | WIRED | Imports from `notifications.ts`, uses in useQuery |
| `NotificationPanel.tsx` | `/api/v1/notifications` | `getNotifications` useQuery | WIRED | Connected via API module |
| `AppLayout.tsx` | `NotificationBell.tsx` | header element | WIRED | Imports and renders `<NotificationBell />` in header |
| `App.tsx` | Transaction pages | Route elements | WIRED | All 3 routes registered: `/transactions`, `/transactions/new`, `/transactions/:id` |
| `Sidebar.tsx` | `/transactions` | NavLink | WIRED | Transactions nav link present |
| `BottomTabBar.tsx` | `/transactions` | NavLink | WIRED | Transactions tab present |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `TransactionsPage.tsx` | transactions list | `getTransactions()` -> `GET /api/v1/transactions` | DB query with joins on clients/users, filtered by company_id | FLOWING |
| `TransactionDetailPage.tsx` | transaction detail | `getTransaction(id)` -> `GET /api/v1/transactions/:id` | DB query + items subquery + documents subquery | FLOWING |
| `NotificationBell.tsx` | unread count | `getUnreadCount()` -> `GET /api/v1/notifications/unread-count` | `count()` query on notifications table | FLOWING |
| `NotificationPanel.tsx` | notification list | `getNotifications()` -> `GET /api/v1/notifications` | DB query with joins on transactions/clients/users | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend TypeScript compiles | `cd backend && npx tsc --noEmit` | Clean exit, no errors | PASS |
| Frontend TypeScript compiles | `cd frontend && npx tsc --noEmit` | Clean exit, no errors | PASS |
| Backend tests pass | `cd backend && npm run test -- --run` | 10 passed, 1 skipped (uploads), 158 tests passed, 34 todo | PASS |
| toCents/fromCents unit tests | Part of transactions.test.ts | All money arithmetic tests pass | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FR-05.1 | 05-01, 05-03 | Create transaction with client, items, notes, payment, delivery date | SATISFIED | `CreateTransactionSchema` validates all fields; `NewTransactionPage` renders all sections |
| FR-05.2 | 05-01 | Auto-generated reference number TXN-YYYY-NNNN | SATISFIED | `nextReferenceNumber()` function with companyCounters upsert |
| FR-05.3 | 05-01, 05-03 | Line items snapshot unit price at time of transaction | SATISFIED | `transactionItems` stores `unitPrice` per line item at insertion time |
| FR-05.4 | 05-01 | Transactions always created even if fully paid | SATISFIED | No check preventing zero-debt transactions |
| FR-05.5 | 05-01 | Auto-create debt if initialPayment < total | SATISFIED | Lines 176-184 and 437-447 create debt when `totalCents > initialPaymentCents` |
| FR-05.6 | 05-01 | Owner transactions immediately active | SATISFIED | `userRole === 'owner' ? 'active' : 'pending_approval'` |
| FR-05.7 | 05-01 | Collaborator transactions pending_approval; SELECT FOR UPDATE | SATISFIED | Status ternary + `.for('update')` in approve/reject |
| FR-05.8 | 05-01 | Approve/reject with required reason | SATISFIED | `RejectSchema` requires reason min 1; approve endpoint exists |
| FR-05.9 | 05-01 | Rejected returns to draft | SATISFIED | Line 516: `status: 'draft'` on reject |
| FR-05.10 | 05-05 | Transaction states: draft, pending_approval, active, voided, written_off | SATISFIED | All states handled in backend and `TransactionStatusBadge` |
| FR-05.11 | 05-05 | deliveredAt separate from createdAt | SATISFIED | Schema has both fields; detail page displays deliveredAt |
| FR-05.12 | 05-01, 05-05 | internalNotes never returned for client role | SATISFIED | Backend line 387: `req.user!.role === 'client' ? { ...txn, internalNotes: null }`; frontend conditionally renders |
| FR-06.1 | 05-02 | Attach documents to transactions | SATISFIED | `uploadMiddleware` + `processFile` + document rows in db.transaction |
| FR-06.2 | 05-03 | react-dropzone file selection | SATISFIED | `FileAttachmentSection.tsx` uses `useDropzone` from react-dropzone |
| FR-06.3 | 05-03 | Two-button camera/gallery UX | SATISFIED | `Take Photo` with `capture="environment"` + `Choose from Gallery` always visible |
| FR-06.4 | 05-02 | HEIC converted to JPEG via sharp | SATISFIED | `upload.service.ts` sharp pipeline converts all images to JPEG |
| FR-06.5 | 05-02 | EXIF orientation corrected | SATISFIED | `.rotate()` before `.resize()` in sharp pipeline |
| FR-06.6 | 05-02 | Images resized to max 1920px | SATISFIED | `resize({ width: 1920, withoutEnlargement: true })` |
| FR-06.7 | 05-02 | Magic byte validation via file-type | SATISFIED | Dynamic `import('file-type')` + `fileTypeFromBuffer` check |
| FR-06.8 | 05-02 | UUID-based storage filenames | SATISFIED | `crypto.randomUUID()` for filenames |
| FR-06.9 | 05-02 | Files stored at UPLOAD_DIR/companyId/type/entityId/uuid.ext | SATISFIED | `path.join(UPLOAD_DIR, companyId, entityType, entityId)` |
| FR-06.10 | 05-02 | Max 10MB per file, max 5 files | SATISFIED | `upload.ts` limits: `fileSize: 10 * 1024 * 1024, files: 5` |
| FR-06.11 | 05-02, 05-05 | Authenticated file serving, not public static | SATISFIED | `files.ts` requires authenticate middleware, verifies company ownership, sets security headers |
| FR-06.12 | 05-02 | SVG uploads blocked | SATISFIED | Blocked at MIME filter level in `upload.ts` AND at magic byte level in `upload.service.ts` |
| FR-06.13 | 05-02 | Thumbnails generated at 200px at upload time | SATISFIED | `resize({ width: 200 }).jpeg({ quality: 75 })` in `upload.service.ts` |
| FR-09.1 | 05-01, 05-04 | In-app notification center for pending approvals | SATISFIED | `NotificationPanel.tsx` shows pending transactions for owners |
| FR-09.2 | 05-04 | Unread badge visible on every page | SATISFIED | `NotificationBell.tsx` in `AppLayout.tsx` header |
| FR-09.3 | 05-01, 05-04 | Notification events: submit -> owner, approve/reject -> collaborator | SATISFIED | Backend creates notifications on submit (lines 187-209), approve (line 450), reject (line 524) |
| FR-09.4 | 05-04 | Approve/reject from notification item without navigating | SATISFIED | `NotificationPanelItem.tsx` has inline approve/reject with mutations |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No blocking anti-patterns found |

No TODOs, FIXMEs, placeholders, or stub implementations found in production code. All `it.todo()` blocks are in test files (Wave 0 stubs as designed).

### Human Verification Required

### 1. End-to-End Transaction Creation with File Upload

**Test:** Log in as owner, navigate to /transactions/new, fill all fields, attach an image, submit.
**Expected:** Transaction created with status "active", image processed and visible on detail page as JPEG thumbnail.
**Why human:** Requires running backend, database, and file system interaction; FormData multipart boundary handling.

### 2. Approval Workflow from Notification Panel

**Test:** Log in as collaborator, create a transaction. Log in as owner, click bell icon, approve or reject from panel.
**Expected:** Status changes correctly, badge count updates, collaborator sees status in their panel.
**Why human:** Requires two user sessions and real-time UI interaction with query invalidation.

### 3. Mobile Camera Capture

**Test:** Open /transactions/new on iOS Safari and Android Chrome. Tap "Take Photo" and "Choose from Gallery".
**Expected:** "Take Photo" opens native camera; "Choose from Gallery" opens file picker. Both always visible.
**Why human:** `capture="environment"` behavior varies by device/OS.

### 4. HEIC File Processing

**Test:** Upload a .heic photo from an iOS device.
**Expected:** File accepted, converted to JPEG, EXIF orientation corrected, thumbnail generated at 200px.
**Why human:** Requires HEIC sample file and running sharp with libheif.

### Gaps Summary

No gaps found. All 7 observable truths are verified. All 30 requirement IDs from plan frontmatter are satisfied with concrete implementation evidence. Both TypeScript codebases compile cleanly. All backend tests pass. All artifacts exist, are substantive (not stubs), are wired into the application, and have real data flowing through them.

---

_Verified: 2026-03-31T18:15:00Z_
_Verifier: Claude (gsd-verifier)_
