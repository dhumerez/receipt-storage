# Phase 5: Transactions & File Uploads - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers the core value loop:
1. **Transaction creation** — full-page form with line item builder (catalog + free-form), file attachments, approval workflow for collaborators
2. **File upload middleware** — multer + sharp + HEIC→JPEG, authenticated serving, magic byte validation
3. **Approval workflow UI** — bell icon + slide-out panel, inline approve/reject for owner
4. **Transaction list & detail** — filterable list (all roles see all transactions), single-scroll detail page

New capabilities NOT in this phase: payment recording, debt lifecycle management, PDF export, per-transaction editing after approval (Phase 6 handles debt).

</domain>

<decisions>
## Implementation Decisions

### Transaction Creation Form

- **D-01:** Transaction creation uses a **full page at `/transactions/new`** — NOT a modal. Form is too complex (client picker, line items, date, notes, files) for a modal.
- **D-02:** Form sections top-to-bottom: client selector, delivery date, description, line items builder, initial payment amount, client notes, internal notes, attachments.
- **D-03:** Single "Save Transaction" submit — files are uploaded atomically with the transaction. No two-step save-then-attach flow.
- **D-04:** Cancel button reads "Discard Changes" (consistent with Phase 4 pattern).

### Line Item Builder

- **D-05:** Two explicit buttons at the bottom of the line items section: **`[+ Catalog]`** and **`[+ Free-form]`**.
- **D-06:** `[+ Catalog]` opens a **mini picker modal** — searchable product list (name search), each row shows name + unit price + unit. Clicking a product adds a new line item row pre-filled with name, unit price, and unit from the catalog snapshot. Unit price is editable after selection (FR-05.3 snapshot, but user can override for this transaction).
- **D-07:** `[+ Free-form]` adds a **blank row** with empty name, qty, and unit price fields. No catalog link.
- **D-08:** Line item row columns: Name (read-only for catalog items, editable for free-form), Qty (number input), Unit Price (number input), Line Total (computed, read-only), [×] remove button.

### File Upload UX

- **D-09:** Attachments section is **inline at the bottom of /transactions/new** — react-dropzone 15.0.0 drop zone + two separate buttons: "Take Photo" (camera input) and "Choose from Gallery" (file input without capture attribute). Per FR-06.3.
- **D-10:** Files are staged locally (thumbnail preview shown) and submitted with the form in a single multipart request. No pre-upload to a temp endpoint.
- **D-11:** File previews shown as thumbnails (images) or file icon + name (PDFs) with a remove [×] per file.

### Approval Notification Center

- **D-12:** **Bell icon `🔔`** in the AppLayout header (top bar) with an unread count badge. Visible on every owner/collaborator page (FR-09.2).
- **D-13:** Clicking the bell opens a **right-side slide-out panel** (not a separate page). Panel shows pending transactions with: reference number, client name, total amount, submitter name.
- **D-14:** Each pending item in the panel has **`[Approve]` and `[Reject]` buttons inline** — owner can act without navigating away (FR-09.4).
- **D-15:** Reject requires a reason — inline text input appears when Reject is clicked, with a "Confirm Reject" button.
- **D-16:** Collaborator sees the bell icon too, but their panel shows their own submissions and their current status (pending / approved / rejected + reason).

### Transaction List Page

- **D-17:** `/transactions` follows the **same table + filter pattern** as clients and products. All roles (owner, collaborator, viewer) see all company transactions.
- **D-18:** Table columns: Reference #, Client, Total, Initial Payment, Status (badge), Delivered At, Submitted By.
- **D-19:** Filters: client (dropdown/search), status (All / Pending / Active / Voided), date range (delivered_at).
- **D-20:** Clicking a row navigates to `/transactions/:id`.

### Transaction Detail Page

- **D-21:** `/transactions/:id` is a **single-scroll page** with stacked sections:
  1. Header: reference #, client name (link to /clients/:id), delivery date, status badge, submitted by
  2. Line Items: table (name, qty, unit price, line total), total row
  3. Payment Summary: initial payment paid, amount owed (if debt exists)
  4. Attachments: thumbnail grid; clicking a thumbnail downloads/opens the file via authenticated endpoint
  5. Notes: client notes (visible), internal notes (owner/collaborator only — hidden from viewer and portal)

### Claude's Discretion

- Transaction list empty state — standard EmptyState component pattern
- Loading skeletons on list and detail pages — planner decides
- Toast/success notification after transaction saved — planner decides
- Bell icon position in header (left vs right of user menu) — planner decides
- Slide-out panel animation style — planner decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §FR-05 — Transaction requirements (FR-05.1 through FR-05.12)
- `.planning/REQUIREMENTS.md` §FR-06 — File upload requirements (FR-06.1 through FR-06.13)
- `.planning/REQUIREMENTS.md` §FR-09 — Approval workflow & notifications (FR-09.1 through FR-09.4)

### Schema (integration points)
- `backend/src/db/schema.ts` — `transactions`, `transaction_items`, `transaction_documents` tables; `reference_number` auto-sequence; `delivered_at` field

### Backend patterns to follow
- `backend/src/routes/products.ts` — CRUD route pattern (Zod, requireRole, companyId scoping)
- `backend/src/routes/clients.ts` — search + filter pattern

### Frontend patterns to follow
- `frontend/src/pages/products/ProductsPage.tsx` — list page pattern (TanStack Query, filters, table)
- `frontend/src/components/products/ProductModal.tsx` — modal pattern (reuse for catalog picker)
- `frontend/src/components/layout/AppLayout.tsx` — must receive bell icon in header
- `frontend/src/App.tsx` — add `/transactions`, `/transactions/new`, `/transactions/:id` routes

### Project constraints
- `.planning/PROJECT.md` — Stack, responsive requirement, NUMERIC(12,2) money, no component library
- `.planning/ROADMAP.md` Key Decisions — two-button camera/gallery, HEIC server-side conversion, multer 2.1.1, react-dropzone 15.0.0

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SearchBar` + `StatusFilterToggle` + `EmptyState` — drop-in reuse for transaction list
- `apiClient` — all API calls; handles 401 refresh automatically
- `ProtectedRoute` + `ClientRoute` — routing guards already set up
- `AppLayout.tsx` — add bell icon to header; sidebar already has Transactions stub link

### Established Patterns
- Backend: `Router()` → Zod validation → `db.select/insert` with `eq(table.companyId, req.companyId!)`
- Frontend: `useQuery(['transactions', filters])` + `useMutation` for create/approve/reject
- Money: NUMERIC(12,2) in DB; frontend receives as string; display formatted; no float arithmetic
- React Router v7: import from `'react-router'`; `/transactions/new` must come BEFORE `/transactions/:id` in route order
- Tailwind v4: no config file; `@import 'tailwindcss'` via `@tailwindss/vite`

### Integration Points
- `App.tsx` — add owner-protected routes: `/transactions`, `/transactions/new`, `/transactions/:id`
- `AppLayout.tsx` header — add bell icon component with badge count
- Backend `app.ts` — mount `transactionsRouter` at `/api/v1/transactions` and `uploadsRouter` (or integrate multer middleware into transactions router)
- File serving: authenticated `GET /api/v1/files/:companyId/:type/:entityId/:filename` endpoint (no public static)

</code_context>

<specifics>
## Specific Ideas

- Two-button file UX is non-negotiable per FR-06.3 — "Take Photo" uses `capture="environment"`, "Choose from Gallery" uses standard file input. Both are always shown.
- Line item unit price is snapshotted at transaction creation — catalog price changes do NOT affect existing transactions (FR-05.3)
- Collaborator submissions go to `pending_approval` status. Owner-created go directly to `active`. This is enforced server-side based on `req.user.role`, never trusted from the client.
- Reject reason is required (not optional) — enforced at API level.

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

</deferred>

---

*Phase: 05-transactions-file-uploads*
*Context gathered: 2026-03-31*
