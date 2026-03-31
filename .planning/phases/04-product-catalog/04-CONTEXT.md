# Phase 4: Product Catalog - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers a per-company product catalog: owner can create, edit, deactivate, and search products (name, description, unit price, unit of measure). Products are referenced by `product_id` in transaction line items (Phase 5 consumes this). No transaction UI in this phase.

New capabilities NOT in this phase: transaction creation, line item builder, pricing history, bulk import, inventory levels.

</domain>

<decisions>
## Implementation Decisions

### Product List UI

- **D-01:** Table columns: **Name, Unit Price, Unit, Status** + Edit icon per row. Description is omitted from the table — visible only in the create/edit modal.
- **D-02:** Edit icon (pencil button) per row opens the **full create/edit modal** for all fields (name, description, unit, price).
- **D-03:** Clicking the **price cell** directly triggers **inline editing** — the cell becomes an input field; save on Enter or blur. No modal needed for price-only updates.
- **D-04:** Deactivate action follows the existing DeactivateConfirmModal pattern (Phase 3).

### Create/Edit Modal

- **D-05:** Unit of measure is a **free-text input** (varchar 50). No preset dropdown. Primary use case is batteries where the unit is a simple count — the owner knows their own units.
- **D-06:** Modal fields: Name (required), Unit Price (required, numeric), Unit of Measure (optional, free text), Description (optional, textarea).

### Claude's Discretion

- Inline price edit save behavior (blur vs explicit Save button vs Enter key) — planner decides; Enter + blur both saving is typical
- Deactivate vs Reactivate label on the row action — planner decides
- Empty state when no products exist yet — standard EmptyState component pattern
- Error handling on inline price edit (invalid number, network error) — planner decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §FR-04 — Product catalog requirements (FR-04.1 through FR-04.3)
- `.planning/REQUIREMENTS.md` §NFR-01 — Security requirements: company_id always from JWT, all IDs validated to tenant

### Existing Code (patterns to follow)
- `backend/src/routes/clients.ts` — CRUD route pattern (Zod validation, requireRole, ilike search, eq(table.companyId, companyId))
- `frontend/src/pages/clients/ClientsPage.tsx` — List page pattern (TanStack Query, SearchBar, StatusFilterToggle, EmptyState, modal open/close state)
- `frontend/src/components/clients/ClientModal.tsx` — Create/edit modal pattern
- `frontend/src/components/clients/DeactivateConfirmModal.tsx` — Deactivate confirmation pattern
- `frontend/src/components/common/SearchBar.tsx` — Reuse directly
- `frontend/src/components/common/StatusFilterToggle.tsx` — Reuse directly
- `frontend/src/components/common/EmptyState.tsx` — Reuse directly

### Schema
- `backend/src/db/schema.ts` — `products` table (already defined: id, companyId, name, description, unitPrice NUMERIC(12,2), unit varchar(50), isActive, createdAt, updatedAt)

### Project constraints
- `.planning/PROJECT.md` — Stack, responsive requirement, single currency per company

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SearchBar` + `StatusFilterToggle` + `EmptyState` — drop-in reuse, no changes needed
- `DeactivateConfirmModal` — reuse pattern; create `DeactivateProductModal` following the same structure
- `apiClient` — all API calls go through `frontend/src/api/client.ts`
- `ProtectedRoute` — products routes are owner-only (and collaborator/viewer for read access per FR-04.2 which says "owner can create/edit/deactivate")

### Established Patterns
- Backend: `Router()` → Zod schema → `db.select/insert/update` with `eq(table.companyId, companyId)` from `req.companyId!`
- Frontend: `useQuery` with `queryKey: ['products', { search, status }]`, `useMutation` for create/edit/deactivate
- Money: `NUMERIC(12,2)` in DB; frontend receives as string, displays formatted; no float arithmetic
- React Router v7: import from `'react-router'` not `'react-router-dom'`
- Tailwind v4: no config file; `@import 'tailwindcss'` via `@tailwindcss/vite`

### Integration Points
- `App.tsx` — add `/products` route inside the owner-protected section
- `AppLayout.tsx` sidebar — "Products" link already present as a stub; route it to `/products`
- `backend/src/index.ts` (or main router) — mount `productsRouter` at `/api/v1/products` with `authenticate + requireTenant`
- `backend/src/db/schema.ts` — `products` table already exists; **no new migration needed for this phase**

</code_context>

<specifics>
## Specific Ideas

- Inline price edit (click cell → input) is the primary quick-interaction pattern. Full modal via Edit icon handles all other fields.
- Unit of measure is free-text — the owner types their own units. No dropdown.
- Description is optional and stays out of the table; only in the modal.
- Primary use case: battery distributor where "unit" = a count of batteries. Unit field will typically just be a number or simple word.

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion.

</deferred>

---

*Phase: 04-product-catalog*
*Context gathered: 2026-03-31*
