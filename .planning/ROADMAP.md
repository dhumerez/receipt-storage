# Roadmap — Receipts Storage Debt Tracker SaaS

**Milestone:** 1.0 — Core SaaS MVP
**Target:** Full-featured debt tracking web app deployed on Hetzner
**Last updated:** 2026-03-31

---

## Phase Map

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4
Foundation   Auth &       Client       Product
             Users        Mgmt         Catalog

                 ↓            ↓
             Phase 5  →  Phase 6  →  Phase 7
             Transactions  Debt &      Reports
             & Files       Payments    & PDF
```

---

## Phase 1: Foundation — Infrastructure & Database

**Goal:** Running Docker stack on Hetzner with complete database schema and working API skeleton.

**Why first:** Every subsequent phase builds on this. Schema decisions (multi-tenancy, money types, audit log) cannot be changed later without migrations. Get them right here.

### Plans

**Plans:** 4/5 plans executed

| # | Plan | Deliverable |
|---|------|-------------|
| 1.1 | Docker Compose stack | `docker-compose.yml` with `receipts-api` (4000), `receipts-frontend` (4001), `receipts-db` (no host port), named volumes, `receipts_internal` network |
| 1.2 | Nginx configuration | `receipts.conf` added to host Nginx; HTTPS via Let's Encrypt; proxy to API and frontend; `client_max_body_size 12m`; does NOT touch restaurant.conf |
| 1.3 | Complete database schema | All 12 tables with indexes, `debt_balances` view, audit log with INSERT-only DB permission; Drizzle ORM schema + initial migration |
| 1.4 | Backend project structure | Express + TypeScript + Drizzle; `forCompany(id)` tenant query helper; JWT auth middleware; RBAC middleware; tenant middleware; health check endpoint |
| 1.5 | Frontend project structure | React 19 + Vite + TanStack Query + React Router + Tailwind; base layout with routing scaffolding; API client setup |

Plans:
- [x] 01-01-PLAN.md — Docker Compose stack with Dockerfiles (wave 1)
- [x] 01-02-PLAN.md — Nginx receipts.conf with HTTPS and proxy routing (wave 1)
- [x] 01-03-PLAN.md — Complete Drizzle ORM schema, 12 tables + debt_balances view (wave 2)
- [ ] 01-04-PLAN.md — Express 5 backend skeleton with auth/tenant/RBAC middleware (wave 3)
- [x] 01-05-PLAN.md — React 19 + Vite + Tailwind v4 frontend scaffold (wave 3)

**Verification:** `docker compose up` starts all services; health check returns 200; migration runs clean; `company_id` filter enforced by helper.

**Research focus:** Docker Compose coexistence with Restaurant app; PostgreSQL named volumes; Drizzle migration setup.

---

## Phase 2: Authentication & User Management

**Goal:** Super admin can create companies; owners can invite and manage team members; all roles can log in.

**Why second:** Auth gates everything. No other phase can be tested without working login and role enforcement.

### Plans

**Plans:** 6/7 plans executed

| # | Plan | Deliverable |
|---|------|-------------|
| 2.1 | Schema + auth service | tokens + refresh_tokens schema; auth.service.ts (JWT, bcrypt, token gen/hash); Wave 0 test stubs |
| 2.2 | Login & session | POST /api/auth/login, /refresh, /logout; httpOnly refresh cookie; token rotation |
| 2.3 | Super admin panel | requireSuperAdmin middleware; GET/POST/PATCH /admin/companies; POST /admin/companies/:id/owner |
| 2.4 | Invite + password reset API | POST /api/auth/forgot-password, /reset-password, /accept-invite; email.service.ts + Resend 6.9.4 |
| 2.5 | User management API | GET/POST /api/v1/users/invite; PATCH /api/v1/users/:id/role + deactivate; auto-reject on removal (FR-02.9) |
| 2.6 | Frontend auth layer | AuthContext, ProtectedRoute, LoginPage form, apiClient 401 interceptor + refresh |
| 2.7 | Frontend invite/reset pages | AcceptInvitePage, ResetPasswordPage with token-from-URL + form |

Plans:
- [x] 02-01-PLAN.md — Schema tokens/refresh_tokens + auth.service.ts + Wave 0 test stubs (wave 1)
- [x] 02-02-PLAN.md — Login/refresh/logout API endpoints (wave 2)
- [x] 02-03-PLAN.md — Super admin company management panel (wave 2)
- [x] 02-04-PLAN.md — Forgot-password, reset-password, accept-invite endpoints + email service (wave 3)
- [x] 02-05-PLAN.md — Owner user management: invite, role change, deactivate + auto-reject (wave 3)
- [x] 02-06-PLAN.md — Frontend auth: AuthContext, ProtectedRoute, LoginPage, apiClient interceptor (wave 4)
- [x] 02-07-PLAN.md — Frontend: AcceptInvitePage + ResetPasswordPage (wave 5)

**Verification:** All 5 roles can log in and receive appropriately scoped data; collaborator cannot access owner-only endpoints; cross-tenant access returns 403/404.

**Research focus:** Resend domain verification (SPF/DKIM); invite token best practices.

---

## Phase 3: Client Management

**Goal:** Owners can manage clients; clients can log into their portal.

**Why third:** Transactions depend on clients existing. Client portal is a key differentiator — establish it before building the data it displays.

### Plans

**Plans:** 6/6 plans complete

| # | Plan | Deliverable |
|---|------|-------------|
| 3.1 | Backend CRUD + Wave 0 tests | DB migration (clientId on tokens), clients CRUD router, client invite endpoint, accept-invite extension |
| 3.2 | Portal API + router mounts | Portal summary + debts endpoints, client detail debts, mount clientsRouter + portalRouter in app.ts |
| 3.3 | Frontend navigation shell | AppLayout sidebar + BottomTabBar, PortalLayout, ClientRoute guard, App.tsx routes, LoginPage role redirect |
| 3.4 | Client list UI | Searchable/filterable client table, ClientModal create/edit, DeactivateConfirmModal, common UI components |
| 3.5 | Client detail UI | ClientDetailPage, ClientDetailHeader, BalanceSummary ("as of [date]"), DebtGroupList, DebtCard |
| 3.6 | Client portal UI | PortalPage, PortalBalanceSummary (confirmed + pending), PortalDebtGroup, PortalTransactionRow |

Plans:
- [x] 03-01-PLAN.md — Backend CRUD + Wave 0 test stubs + DB migration (wave 1)
- [x] 03-02-PLAN.md — Portal API + debts endpoint + app.ts mounts (wave 2)
- [x] 03-03-PLAN.md — Frontend navigation shell + routing restructure (wave 3, parallel track)
- [x] 03-04-PLAN.md — Client list UI with search, filter, table, modal (wave 4)
- [x] 03-05-PLAN.md — Client detail page with balance summary and debt groups (wave 4)
- [x] 03-06-PLAN.md — Client portal UI with balance summary and debt groups (wave 5)

**Verification:** Client A cannot see Client B's data; `internal_notes` absent from all client-scoped API responses; portal balance matches confirmed payments only.

---

## Phase 4: Product Catalog

**Goal:** Company maintains reusable products with prices; transactions can reference them.

**Why separate phase:** Clean separation from transactions. Catalog must exist before transactions can reference it.

### Plans

| # | Plan | Deliverable |
|---|------|-------------|
| 4.1 | Product CRUD API | Create/update/deactivate products; name, description, unit price, unit of measure; company-scoped |
| 4.2 | Product list UI | Searchable list; active/inactive toggle; quick-edit inline price |

**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Backend CRUD API with Wave 0 tests, products router, app.ts mount (wave 1)
- [ ] 04-02-PLAN.md — Frontend UI: API module, ProductsPage, table with inline price edit, modals (wave 2)

**Verification:** Product prices can change without affecting existing transaction line items (snapshot confirmed).

---

## Phase 5: Transactions & File Uploads

**Goal:** Owners and collaborators can create receipts with line items and attach proof documents; approval workflow functions correctly.

**Why fifth:** Depends on clients (Phase 3) and products (Phase 4). This is the core value loop.

### Plans

| # | Plan | Deliverable |
|---|------|-------------|
| 5.1 | Transaction creation API | Full transaction model: client, reference_number, description, line items (catalog + free-form), initial payment, `delivered_at`, `internal_notes`, `client_notes`; owner → `active`; collaborator → `pending_approval`; approval with `SELECT FOR UPDATE` |
| 5.2 | File upload middleware | multer 2.1.1 + sharp 0.34.5 + file-type; HEIC→JPEG conversion; EXIF orientation fix; UUID filenames; per-company directory; authenticated streaming endpoint; SVG blocked; magic byte validation |
| 5.3 | Transaction UI | Create transaction form with line item builder (add from catalog or free-form); document upload (react-dropzone + two-button camera/gallery); preview attachments |
| 5.4 | Approval workflow UI | Notification center (owner); unread badge on all pages; approve/reject with reason; collaborator sees submission status |
| 5.5 | Transaction list & detail | Filterable list (by client, status, date); detail view with line items, documents, debt status |

**Verification:** Collaborator submission does not create debt until owner approves; two concurrent approvals produce one debt (race condition test); HEIC file uploads and converts correctly; `capture` attribute two-button UX works on iOS and Android.

**Research focus:** multer 2.1.1 memoryStorage + sharp pipeline; HEIC libvips Docker setup; Android 14 camera input behavior.

---

## Phase 6: Debt & Payment Tracking

**Goal:** Full debt lifecycle from creation through multiple partial payments to closure.

**Why sixth:** Depends on transactions (Phase 5). This is the financial heart of the product.

### Plans

| # | Plan | Deliverable |
|---|------|-------------|
| 6.1 | Debt lifecycle API | Auto-create debt on transaction approval; `debt_balances` view; debt status transitions; `written_off` with reason; owner-only debt status changes |
| 6.2 | Payment recording API | Create payment with `paid_at`, method, reference, notes; owner → `confirmed`; collaborator → `pending_approval`; `SELECT FOR UPDATE` on debt row; overpayment prevention; approval flow mirrors transactions |
| 6.3 | Debt & payment UI | Debt dashboard per client; remaining balance (via view); payment list with confirmed/pending separation; payment form with document upload |
| 6.4 | Client portal debt view | Client sees own debts, confirmed balance, pending payments ("Awaiting confirmation"), payment proof documents |

**Verification:** 10 × $10 payments on $100 debt reaches exactly $0.00 remaining (no float drift); concurrent payment approval test; client cannot see other clients' debts; pending payments do not affect displayed balance.

---

## Phase 7: Reports & PDF Export

**Goal:** Owners can generate company-wide and per-client reports; PDF export available.

**Why last:** Reporting is a read layer on top of fully working data. All upstream data must be correct before reports are meaningful.

### Plans

| # | Plan | Deliverable |
|---|------|-------------|
| 7.1 | Report API | Company report: clients with outstanding balance in date range; per-client report: transactions + payment history; data only (no PDF yet) |
| 7.2 | Report UI | Date range picker; company report table sortable by outstanding amount; per-client breakdown; print/screen layout |
| 7.3 | PDF export | PDFKit 0.18.0 server-side; company report PDF; per-client report PDF; receipt PDF for individual transaction; stream directly to HTTP response |

**Verification:** Company report totals match sum of open debts; PDF renders correctly for multi-page report; report respects `company_id` scoping; client-scoped PDF contains only that client's data.

---

## Milestone Completion Criteria

The 1.0 milestone is complete when:

- [ ] All 7 phases verified
- [ ] End-to-end flow: create client → create transaction → auto-create debt → record payments → close debt → generate report
- [ ] Client logs in and sees accurate balance with payment history
- [ ] File uploads work on iOS and Android (camera + gallery)
- [ ] PDF export produces correct documents
- [ ] Deployed on Hetzner behind HTTPS alongside Restaurant app without conflicts
- [ ] Audit log captures all required events
- [ ] Cross-tenant isolation verified via integration tests

---

## Phase Sequencing Notes

- **Phases 1–2** must be done sequentially; every other phase depends on both
- **Phases 3 and 4** can be done in parallel after Phase 2
- **Phase 5** requires Phase 3 (clients) and Phase 4 (products) to be complete
- **Phase 6** requires Phase 5
- **Phase 7** requires Phase 6

---

## Key Decisions Carried into Phases

| Decision | Affects |
|----------|---------|
| NUMERIC(12,2) in DB; integer cents in application arithmetic layer | Phase 1 (schema), Phase 6 (payment logic) |
| `forCompany()` query helper | Phase 1 (build it), all subsequent phases (use it) |
| `reference_number` auto-sequence per company | Phase 1 (schema), Phase 5 (transaction creation) |
| `internal_notes` + `client_notes` as separate columns | Phase 1 (schema), Phase 3 (portal), Phase 5 (UI) |
| Two-button camera/gallery (not single `capture`) | Phase 5 (upload UI) |
| HEIC server-side conversion | Phase 5 (upload middleware) |
| multer 2.1.1 (security release, not ^1.x) | Phase 5 |
| PDFKit (not Puppeteer) | Phase 7 |
| Named Docker volume for PostgreSQL | Phase 1 |
| Bind mount for uploads (Nginx + Express share path) | Phase 1 |
| Separate Nginx conf file (receipts.conf) | Phase 1 |
