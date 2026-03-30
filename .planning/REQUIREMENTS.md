# Requirements — Receipts Storage Debt Tracker SaaS

**Milestone:** 1.0 — Core SaaS MVP
**Last updated:** 2026-03-29

---

## Functional Requirements

### FR-01: Platform & Multi-Tenancy

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-01.1 | Multiple companies can register and operate in full data isolation | Must | Shared schema, `company_id` on every tenant-scoped table |
| FR-01.2 | Super admin panel to create and manage companies and platform users | Must | Separate authenticated section, `is_super_admin` flag |
| FR-01.3 | All tenant-scoped queries enforced via `company_id` from JWT — never from request body | Must | Security-critical; cross-tenant leak if violated |
| FR-01.4 | Company settings: name, currency code (set once at creation) | Must | Currency defaults to all money rows in company |

### FR-02: Authentication & User Roles

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-02.1 | JWT authentication with HS256 only; secret generated via `openssl rand -hex 64` | Must | Never allow `alg: none`; token contains `sub, companyId, role, isSuperAdmin` |
| FR-02.2 | Role: **Owner** — full control over company data, users, approvals | Must | |
| FR-02.3 | Role: **Collaborator** — create transactions and payments (pending approval) | Must | Submissions go to `pending` state; do not affect balances until approved |
| FR-02.4 | Role: **Viewer** — read-only access to all company records | Must | Cannot create, approve, or reject anything |
| FR-02.5 | Role: **Client** — view own debts and payment history only | Must | Portal access; `clientId` embedded in JWT at login |
| FR-02.6 | Super Admin bypasses all company-level role checks | Must | |
| FR-02.7 | Email invitations via Resend for onboarding owners, collaborators, viewers, clients | Must | Invite token flow; Resend 6.9.4; requires verified domain |
| FR-02.8 | Password reset via email token | Must | |
| FR-02.9 | When a collaborator is removed from a company, auto-reject all their pending items with reason logged | Must | Prevents orphaned pending records |

### FR-03: Client Management

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-03.1 | Create/edit/deactivate client profiles with: full name, email, phone, address, free-text references | Must | No hard delete; deactivate only |
| FR-03.2 | Client list with search by name/email/phone and filter by active status | Must | |
| FR-03.3 | Client detail page showing all debts (open, partial, paid) and total outstanding balance | Must | |
| FR-03.4 | Client portal: client logs in to see their own balance, payment history, and proof documents | Must | Strict query scoping via `clientId` from JWT |
| FR-03.5 | Balance display always shows "as of [date]" timestamp | Must | Prevents perception of stale data |
| FR-03.6 | Client portal shows pending payments separately from confirmed ones ("Awaiting confirmation") | Must | Avoids "I paid but balance didn't change" disputes |
| FR-03.7 | Client portal does NOT expose internal notes, other clients' data, or rejected submissions | Must | Security — enforce in API layer |

### FR-04: Product Catalog

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-04.1 | Owner can create/edit/deactivate products with: name, description, unit price, unit of measure | Must | `company_id` scoped |
| FR-04.2 | Product list with search and active/inactive filter | Must | |
| FR-04.3 | Transactions can reference catalog products OR free-form line items, or both | Must | `product_id` nullable on `transaction_items` |

### FR-05: Transactions & Receipts

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-05.1 | Create a transaction with: client, description, line items (catalog + free-form), initial amount paid, delivery date, client-visible notes, internal notes | Must | |
| FR-05.2 | Auto-generated `reference_number` (e.g., `TXN-2026-0042`) sequential per company | Must | Required for dispute resolution; must exist before any data created |
| FR-05.3 | Line items snapshot: store unit price at time of transaction, not live catalog price | Must | Catalog price changes must not alter historical records |
| FR-05.4 | Transactions always created — even if fully paid upfront (for tracking purposes) | Must | |
| FR-05.5 | If initial payment < total → automatically create a `debt` record (when approved) | Must | |
| FR-05.6 | Owner-created transactions: immediately `active`; debt (if any) immediately created | Must | |
| FR-05.7 | Collaborator-created transactions: `pending_approval`; no debt until owner approves | Must | Approval via `SELECT FOR UPDATE` to prevent race condition |
| FR-05.8 | Owner can approve or reject pending transactions; rejection requires a reason | Must | Reason returned to collaborator; record reverts to `draft` |
| FR-05.9 | Rejected transactions return to `draft` (editable by collaborator); no duplicate records on resubmit | Must | |
| FR-05.10 | Transaction states: `draft → pending_approval → active → voided / written_off` | Must | No hard delete on financial records |
| FR-05.11 | `delivered_at` field separate from `created_at` on transactions | Must | Critical for goods businesses: delivery date ≠ invoice date |
| FR-05.12 | `internal_notes` and `client_notes` are separate fields; `internal_notes` never returned on client-scoped API endpoints | Must | Privacy — do not mix |

### FR-06: File Uploads (Proof Documents)

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-06.1 | Attach proof documents to transactions and to individual payments | Must | |
| FR-06.2 | File selection via drag-and-drop or file picker (react-dropzone 15.0.0) | Must | |
| FR-06.3 | Camera capture: TWO separate UI buttons — "Take Photo" (opens camera) and "Choose from Gallery" | Must | Using `capture` attribute alone blocks gallery on Android 14+; two inputs required |
| FR-06.4 | Accepted formats: JPEG, PNG, WebP, PDF, HEIC; HEIC converted to JPEG server-side via sharp | Must | HEIC = iOS default camera format |
| FR-06.5 | EXIF orientation corrected server-side on all images before storage | Must | Without this, portrait photos appear rotated |
| FR-06.6 | Images resized and compressed to max 1920px wide, ≤2 MB after compression (sharp) | Must | Field photos from phones are 8–15 MB; disk and bandwidth concern |
| FR-06.7 | Magic byte validation after upload (beyond MIME header check) via `file-type` | Must | MIME header is user-controlled; magic bytes verify actual content |
| FR-06.8 | UUID-based storage filenames (never user-supplied filename on disk) | Must | Prevents path traversal |
| FR-06.9 | Files stored at `{UPLOAD_DIR}/{companyId}/{transactions|payments}/{entityId}/{uuid}.ext` | Must | Tenant-namespaced path; simplifies per-tenant deletion |
| FR-06.10 | Max 10 MB per file, max 5 files per upload request | Must | Nginx `client_max_body_size 12m` to match |
| FR-06.11 | All file access served through authenticated Express endpoint (NOT public static serving) | Must | Prevents IDOR; `Content-Disposition: attachment; X-Content-Type-Options: nosniff` |
| FR-06.12 | SVG uploads blocked entirely | Must | SVG can contain `<script>` tags → stored XSS risk |
| FR-06.13 | Thumbnail generated at upload time (200px, sharp) for list view performance | Should | Defer to Phase 2 if blocking |

### FR-07: Debt Tracking

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-07.1 | Debt auto-created when approved transaction has `initial_payment < total_amount` | Must | |
| FR-07.2 | Debt states: `open → partially_paid → fully_paid / written_off` | Must | |
| FR-07.3 | Remaining balance always computed from `total_amount - SUM(approved payments)` — never stored as a column | Must | Prevents divergence; use DB view |
| FR-07.4 | All monetary values stored as `NUMERIC(12,2)` in PostgreSQL; arithmetic uses integer cents in application layer | Must | Prevents floating-point rounding errors |
| FR-07.5 | Debt view shows: original amount, total paid, remaining balance, all payments (confirmed + pending), and all documents | Must | |
| FR-07.6 | Owner can mark a debt as `written_off` (uncollectible) with reason | Should | |

### FR-08: Payments

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-08.1 | Record partial payments against a debt; multiple payments per debt | Must | |
| FR-08.2 | Payment fields: amount, `paid_at` (when payment occurred — may differ from entry date), payment method (free text), reference number (e.g., bank transfer ref), notes | Must | `paid_at` ≠ `created_at` — two separate fields |
| FR-08.3 | Payment method and reference shown on payment history ("transfer · Ref TRF-88821") | Must | Trust signal for client portal |
| FR-08.4 | Owner-recorded payments: immediately `confirmed`; debt balance updates | Must | |
| FR-08.5 | Collaborator-recorded payments: `pending_approval`; debt balance unchanged until approved | Must | Approval via `SELECT FOR UPDATE` |
| FR-08.6 | Payment validation: sum of pending + confirmed payments cannot exceed debt total | Must | Prevents accidental overpayment data entry |
| FR-08.7 | Debt balance locked during payment approval (SELECT FOR UPDATE on debt row) | Must | Prevents concurrent payment double-spend |

### FR-09: Approval Workflow & Notifications

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-09.1 | In-app notification center: owner sees all pending approvals in one place | Must | |
| FR-09.2 | Unread notification badge visible on every page (not just notification center) | Must | Owner must see it immediately on login |
| FR-09.3 | Notification events: collaborator submits → owner notified; owner approves/rejects → collaborator notified | Must | |
| FR-09.4 | Owner can approve/reject directly from notification item without navigating away | Should | |

### FR-10: Reports

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-10.1 | Company report: all clients with outstanding balance, filterable by date range | Must | Shows who owes what in a period |
| FR-10.2 | Per-client report: full transaction and payment history over a date range | Must | |
| FR-10.3 | PDF export of company report and per-client report (PDFKit 0.18.0 server-side) | Must | Stream-based; no Puppeteer (too heavy for shared VPS) |
| FR-10.4 | Client portal: personal summary showing total owed, total paid, and recent payment history | Must | |

### FR-11: Audit Log

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-11.1 | Append-only `audit_logs` table: logs every financial mutation with actor, action, entity, old/new value | Must | Never UPDATE or DELETE audit records |
| FR-11.2 | DB-level immutability: revoke UPDATE/DELETE on `audit_logs` table from application DB user | Must | App bugs cannot corrupt audit trail |
| FR-11.3 | Logged events: transaction CRUD/approve/reject/void, debt status changes, payment CRUD/approve/reject, document upload/delete, client CRUD, user invite/role-change, logins | Must | See FEATURES.md for full event table |

---

## Non-Functional Requirements

### NFR-01: Security

| ID | Requirement |
|----|-------------|
| NFR-01.1 | `company_id` always sourced from verified JWT — never from request body or URL params |
| NFR-01.2 | Every resource query includes `company_id` filter; use `forCompany(id)` query helper pattern |
| NFR-01.3 | File serving is authenticated — every file endpoint verifies `company_id` match before streaming |
| NFR-01.4 | JWT signed HS256 only; `openssl rand -hex 64` secret; never stored in source code |
| NFR-01.5 | Role re-validated from DB on sensitive operations (not just JWT claim) |
| NFR-01.6 | All referenced IDs (clientId, debtId, productId) validated to belong to the tenant before use |
| NFR-01.7 | No hard delete on financial records (transactions, debts, payments) — void/write-off only |

### NFR-02: Performance & Reliability

| ID | Requirement |
|----|-------------|
| NFR-02.1 | All tenant-scoped tables indexed on `company_id` |
| NFR-02.2 | Additional indexes: `clients(company_id)`, `transactions(company_id, client_id, status)`, `debts(company_id, client_id, status)`, `payments(company_id, debt_id)`, `notifications(recipient_id, is_read)` |
| NFR-02.3 | Remaining debt balance computed via DB view — not a stored column |
| NFR-02.4 | Images compressed to ≤2 MB server-side to reduce storage and bandwidth on VPS |

### NFR-03: Deployment

| ID | Requirement |
|----|-------------|
| NFR-03.1 | Docker Compose stack: `receipts-api` (port 4000), `receipts-frontend` (port 4001), `receipts-db` (no host port) |
| NFR-03.2 | PostgreSQL uses named Docker volume (not bind mount) — avoids permission failures |
| NFR-03.3 | Upload files use bind-mount volume to `/var/receipts/uploads` — accessible to both Express and Nginx |
| NFR-03.4 | Nginx: new `receipts.conf` file in `/etc/nginx/conf.d/` — do not modify existing restaurant config |
| NFR-03.5 | HTTPS only; Let's Encrypt cert for receipts subdomain |
| NFR-03.6 | `client_max_body_size 12m` in Nginx receipts config (file uploads) |

### NFR-04: Usability

| ID | Requirement |
|----|-------------|
| NFR-04.1 | Fully responsive — works on desktop and mobile browsers |
| NFR-04.2 | Camera capture works on iOS Safari and Android Chrome (two-button approach) |
| NFR-04.3 | Reference numbers on every financial record (client-facing communication) |

---

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| Multi-currency | Not needed for current use case; currency_code column reserved for future |
| Payment processor integration | Manual tracking only; no Stripe/PayPal |
| Automated SMS/email payment reminders to clients | Added complexity; in-app notification sufficient for v1 |
| Mobile native app | Responsive web covers mobile use cases |
| PostgreSQL RLS | Application-layer `company_id` filtering is sufficient at this scale; RLS is a v2 hardening option |
| Per-company storage quotas | Low risk at small scale; add in v2 if needed |
| EXIF GPS data stripping from photos | Privacy nice-to-have; add in v2 |

---

## Data Model Quick Reference

See `.planning/research/ARCHITECTURE.md` for the full annotated schema.

Core tables: `companies`, `users`, `clients`, `products`, `transactions`, `transaction_items`, `debts`, `payments`, `documents`, `notifications`, `audit_logs`

Key patterns:
- All money stored as `NUMERIC(12,2)`; integer cents used in application arithmetic
- `remaining_balance` always computed via `debt_balances` view, never stored
- `internal_notes` / `client_notes` are always separate columns
- `paid_at` on payments is user-supplied date; `created_at` is system timestamp
- `reference_number` auto-sequenced per company: `TXN-YYYY-NNNN`

---

## Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Node.js + Express + TypeScript + Drizzle ORM | Latest |
| Database | PostgreSQL | 16-alpine |
| Frontend | React + Vite + TanStack Query + React Router + Tailwind CSS | 19 |
| File upload | multer + sharp | 2.1.1 / 0.34.5 |
| File type validation | file-type | Latest |
| Client file UI | react-dropzone | 15.0.0 |
| PDF generation | pdfkit | 0.18.0 |
| Email | resend | 6.9.4 |
| Deployment | Docker Compose + Nginx on Hetzner VPS | — |
