# Phase 4: Product Catalog - Research

**Researched:** 2026-03-31
**Domain:** Express CRUD API + React list page with inline editing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Table columns: Name, Unit Price, Unit, Status + Edit icon per row. Description is omitted from the table — visible only in the create/edit modal.

**D-02:** Edit icon (pencil button) per row opens the full create/edit modal for all fields (name, description, unit, price).

**D-03:** Clicking the price cell directly triggers inline editing — the cell becomes an input field; save on Enter or blur. No modal needed for price-only updates.

**D-04:** Deactivate action follows the existing DeactivateConfirmModal pattern (Phase 3).

**D-05:** Unit of measure is a free-text input (varchar 50). No preset dropdown.

**D-06:** Modal fields: Name (required), Unit Price (required, numeric), Unit of Measure (optional, free text), Description (optional, textarea).

### Claude's Discretion

- Inline price edit save behavior (blur vs explicit Save button vs Enter key) — planner decides; Enter + blur both saving is typical
- Deactivate vs Reactivate label on the row action — planner decides
- Empty state when no products exist yet — standard EmptyState component pattern
- Error handling on inline price edit (invalid number, network error) — planner decides

### Deferred Ideas (OUT OF SCOPE)

None raised during discussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FR-04.1 | Owner can create/edit/deactivate products with: name, description, unit price, unit of measure; company_id scoped | Products table already in schema; CRUD route pattern from clients.ts is the direct template |
| FR-04.2 | Product list with search and active/inactive filter | SearchBar + StatusFilterToggle + TanStack Query pattern fully established in ClientsPage.tsx |
| FR-04.3 | Transactions can reference catalog products OR free-form line items, or both — product_id nullable on transaction_items | Schema already has `productId` as nullable FK on `transaction_items`; this phase is catalog-only, no transaction work needed |
</phase_requirements>

---

## Summary

Phase 4 is a straightforward CRUD extension that closely mirrors Phase 3 (Client Management). The `products` table already exists in the schema with the correct columns — no migration is required. The backend pattern is identical to `clients.ts`: Router with Zod validation, `eq(products.companyId, companyId)` tenant scoping on every query, and an `ilike` search. The frontend pattern is identical to ClientsPage: TanStack Query with `queryKey: ['products', { search, status }]`, the three common components (SearchBar, StatusFilterToggle, EmptyState) dropped in unchanged, and a create/edit modal following ClientModal.

The one new interaction in this phase is the inline price edit cell (D-03): clicking the price cell renders a controlled `<input>` in its place, saving on Enter or blur. This is a self-contained stateful cell component — no library needed. The key implementation concern is preventing the `onBlur` save from firing when Enter already triggered the save (a double-save race); the standard pattern is to use a `ref` to track whether the save was already committed.

FR-04.3 ("transactions can reference catalog products") is satisfied structurally by the schema: `transaction_items.productId` is already a nullable FK to `products`. No code work is needed in this phase for that requirement — Phase 5 will write the actual line-item builder. The only verification needed here is confirming the nullable FK exists, which is confirmed.

**Primary recommendation:** Clone the clients route/page/modal/table structure directly; only differences are the field set and the inline price-edit cell.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express Router | (project: Express 5) | Backend routing | Already mounted in app.ts |
| Zod | (project) | Request validation | All routes use it; pattern from clients.ts |
| Drizzle ORM | 0.45.2 (pinned) | DB queries | Project-wide; pinned to avoid 0.46.x breaking changes |
| TanStack Query | (project: v5) | Server state on frontend | All list pages use useQuery + useMutation |
| React Router v7 | (project) | Routing | Import from `'react-router'` not `'react-router-dom'` |
| Tailwind v4 | (project) | Styling | No config file; `@import 'tailwindcss'` via `@tailwindcss/vite` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | (project) | Unit testing | Backend route tests; mock DB pattern established |

### No New Dependencies

This phase requires zero new npm packages. All required libraries are already installed.

---

## Architecture Patterns

### Recommended File Structure

```
backend/src/routes/
└── products.ts          # new — mirrors clients.ts structure

frontend/src/
├── api/
│   └── products.ts      # new — mirrors api/clients.ts
├── pages/products/
│   └── ProductsPage.tsx # new — mirrors ClientsPage.tsx
└── components/products/
    ├── ProductTable.tsx          # new
    ├── ProductTableRow.tsx       # new — contains inline price-edit cell
    ├── ProductModal.tsx          # new — create/edit modal
    └── DeactivateProductModal.tsx # new — mirrors DeactivateConfirmModal
```

Integration points (existing files that need edits):
- `backend/src/app.ts` — mount `productsRouter` at `/api/v1/products`
- `frontend/src/App.tsx` — add `/products` route inside ProtectedRoute > AppLayout

### Pattern 1: Backend CRUD Route

Follow `backend/src/routes/clients.ts` exactly. Key elements:

```typescript
// Source: backend/src/routes/clients.ts (existing)

// 1. Zod schema at module level
const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price'),
  unit: z.string().max(50).optional(),
});

// 2. companyId ALWAYS from req.companyId! (set by requireTenant middleware)
// NEVER from req.body or req.params — NFR-01.1

// 3. Tenant-scoped select with optional search
const conditions: any[] = [eq(products.companyId, companyId)];
if (search?.trim()) {
  conditions.push(ilike(products.name, `%${search.trim()}%`));
}
if (status === 'active')   conditions.push(eq(products.isActive, true));
if (status === 'inactive') conditions.push(eq(products.isActive, false));

// 4. Verify ownership before update (NFR-01.6)
const [existing] = await db.select({ id: products.id })
  .from(products)
  .where(and(eq(products.id, id), eq(products.companyId, companyId)))
  .limit(1);
if (!existing) { res.status(404).json({ error: 'Product not found' }); return; }
```

### Pattern 2: Router Mount in app.ts

```typescript
// Source: backend/src/app.ts (existing pattern)
// Products are owner-only for write; FR-04.2 does not specify read access for
// collaborator/viewer — safest interpretation is owner-only for all operations
// (collaborator/viewer need products only when creating transactions in Phase 5)
app.use(
  '/api/v1/products',
  authenticate,
  requireTenant,
  requireRole('owner'),
  productsRouter,
);
```

> Note for planner: Phase 5 will need collaborator/viewer read access to products for
> the transaction line-item picker. At that point, the role list may need to expand or
> a separate read endpoint added. For Phase 4 (catalog management only), owner-only is correct.

### Pattern 3: Frontend API Module

```typescript
// Source: frontend/src/api/clients.ts (existing pattern to mirror)
import { apiClient } from './client.ts';

export interface ProductListItem {
  id: string;
  name: string;
  unitPrice: string;   // NUMERIC from DB comes back as string — never parseFloat for display
  unit: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Product extends ProductListItem {
  companyId: string;
  description: string | null;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  unitPrice: string;
  unit?: string;
  description?: string;
}

export function getProducts(params: { search?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return apiClient<ProductListItem[]>(`/api/v1/products?${qs.toString()}`);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return apiClient<Product>('/api/v1/products', { method: 'POST', json: input });
}

export function updateProduct(id: string, input: Partial<CreateProductInput>): Promise<Product> {
  return apiClient<Product>(`/api/v1/products/${id}`, { method: 'PATCH', json: input });
}

export function deactivateProduct(id: string): Promise<void> {
  return apiClient<void>(`/api/v1/products/${id}/deactivate`, { method: 'PATCH' });
}
```

### Pattern 4: Inline Price Edit Cell

The price cell needs two modes: display and editing. This is a self-contained component concern:

```typescript
// Sketch — not a copy-paste target, just the essential logic
function PriceCell({ product, onSaved }: { product: ProductListItem; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(product.unitPrice);
  const savedRef = useRef(false);  // prevents double-save on Enter+blur sequence
  const mutation = useMutation({ mutationFn: ... });

  const commit = () => {
    if (savedRef.current) return;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { setValue(product.unitPrice); setEditing(false); return; }
    savedRef.current = true;
    mutation.mutate({ unitPrice: num.toFixed(2) }, {
      onSettled: () => { savedRef.current = false; setEditing(false); onSaved(); }
    });
  };

  if (!editing) {
    return <td onClick={() => setEditing(true)} className="cursor-pointer ...">
      ${parseFloat(product.unitPrice).toFixed(2)}
    </td>;
  }
  return <td>
    <input
      autoFocus
      value={value}
      type="number"
      min="0"
      step="0.01"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setValue(product.unitPrice); } }}
      onBlur={commit}
    />
  </td>;
}
```

### Pattern 5: TanStack Query in ProductsPage

```typescript
// Source: frontend/src/pages/clients/ClientsPage.tsx (existing pattern)
const { data: products = [], isLoading, error } = useQuery({
  queryKey: ['products', { search, status }],
  queryFn: () => getProducts({ search, status }),
  staleTime: 30_000,
});

// After inline price save or modal save:
queryClient.invalidateQueries({ queryKey: ['products'] });
```

### Pattern 6: Reactivate Support

The deactivate modal (D-04) uses the existing pattern. For reactivate (currently `isActive: false` rows), the simplest approach is a PATCH endpoint that sets `isActive: true`. The row action label switches based on `product.isActive`:
- Active product: show "Deactivate" (opens DeactivateProductModal)
- Inactive product: show "Reactivate" (calls `PATCH /api/v1/products/:id/reactivate` directly or via confirmation)

### Anti-Patterns to Avoid

- **Using `req.body.companyId`**: companyId must come from `req.companyId!` (set by `requireTenant`). See NFR-01.1.
- **Float arithmetic on unitPrice**: DB returns `NUMERIC(12,2)` as a string. Parse with `parseFloat()` only for display formatting. Store and transmit as string or via `toFixed(2)`.
- **Importing from `react-router-dom`**: Always import from `'react-router'` — v7 unified the package.
- **Tailwind config file**: No `tailwind.config.js` exists. Tailwind v4 runs purely via the Vite plugin.
- **Using drizzle-orm 0.46.x or 1.x**: Pinned to 0.45.2 — do not upgrade.
- **Skipping ownership verification before update**: Always fetch the existing record with `and(eq(products.id, id), eq(products.companyId, companyId))` before writing. See NFR-01.6.
- **Inline price save without double-save guard**: `onBlur` fires after `onKeyDown` for Enter. Without a guard, both handlers call the mutation simultaneously.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search debounce | Custom setTimeout logic | Copy the 300ms debounce pattern from ClientsPage.tsx verbatim | Already proven; consistent UX |
| Modal backdrop + Escape close | New implementation | Copy the pattern from ClientModal.tsx | Event listener cleanup, focus management already solved |
| Query cache invalidation | Direct state mutation | `queryClient.invalidateQueries({ queryKey: ['products'] })` | TanStack Query's standard invalidation pattern keeps all derived caches consistent |
| Money display formatting | Custom formatter | `parseFloat(unitPrice).toFixed(2)` with currency prefix from company settings (future) | NUMERIC(12,2) string → display is a one-liner |

**Key insight:** Every non-trivial UI problem in this phase was already solved in Phase 3. The implementation is translation, not invention.

---

## Common Pitfalls

### Pitfall 1: unitPrice Zod Validation

**What goes wrong:** `z.number()` will fail for the string `"12.50"` that comes from a JSON body when the frontend sends it as a string. Alternatively, if using `z.number()` and the frontend sends a number, precision can be lost for large values.

**Why it happens:** PostgreSQL NUMERIC columns return as strings from the driver; frontend inputs are strings. The pattern of keeping money as strings throughout is intentional (see Active Decisions in STATE.md).

**How to avoid:** Use `z.string().regex(/^\d+(\.\d{1,2})?$/)` on the backend to validate the price. Store directly as the string value. The DB column is `NUMERIC(12,2)` and accepts numeric strings.

**Warning signs:** `NaN` appearing in the DB, or Zod rejecting valid price inputs.

### Pitfall 2: Inline Edit onBlur + Enter Double-Save

**What goes wrong:** User presses Enter to save. The `onKeyDown` handler fires and calls `mutation.mutate()`. Then immediately `onBlur` fires (because focus left the input after Enter) and calls `mutation.mutate()` again — two PATCH requests for one action.

**Why it happens:** Enter key does not prevent blur in a table input. Both events fire in sequence.

**How to avoid:** Use a `savedRef = useRef(false)` flag. Set it to `true` before the first mutation call; check it at the top of the save handler; reset it in `onSettled`.

**Warning signs:** Two identical PATCH requests visible in the network tab on Enter.

### Pitfall 3: Route Order in app.ts

**What goes wrong:** Mounting `productsRouter` without `requireTenant` causes `req.companyId` to be undefined, resulting in runtime errors when the handler tries `req.companyId!`.

**Why it happens:** `requireTenant` sets `req.companyId` from the JWT. It is required for every tenant-scoped router.

**How to avoid:** Follow the exact mount pattern: `authenticate, requireTenant, requireRole('owner'), productsRouter`.

### Pitfall 4: Reactivate Missing from Backend

**What goes wrong:** The frontend Reactivate button calls an endpoint that was never added. The PATCH /:id/deactivate endpoint only sets `isActive: false`. There is no symmetrical endpoint for reactivation.

**Why it happens:** Deactivate was the primary UX focus; reactivate is easy to forget.

**How to avoid:** Add `PATCH /api/v1/products/:id/reactivate` that sets `isActive: true`, or make the deactivate endpoint toggle based on a body flag. The simpler approach (separate endpoint) mirrors clients.ts more cleanly.

### Pitfall 5: App.tsx Route Not Added

**What goes wrong:** ProductsPage is created but the `/products` route is never added to App.tsx, so navigation works (Sidebar already has the link) but renders nothing.

**Why it happens:** Integration step is easy to miss when focused on building the feature components.

**How to avoid:** Add the route in App.tsx as the first task of Plan 4.2, not the last.

---

## Code Examples

### Verified: products table schema (existing)

```typescript
// Source: backend/src/db/schema.ts
export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_products_company_id').on(table.companyId)],
);
```

No migration is needed. The table and index already exist.

### Verified: app.ts router mount pattern

```typescript
// Source: backend/src/app.ts
app.use('/api/v1/clients', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), clientsRouter);
// Products: owner-only for Phase 4
app.use('/api/v1/products', authenticate, requireTenant, requireRole('owner'), productsRouter);
```

### Verified: ClientModal pattern for modal fields

```typescript
// Source: frontend/src/components/clients/ClientModal.tsx
// Key patterns to replicate:
// 1. useRef for first input focus on open
// 2. useEffect to pre-fill form on editData change
// 3. Escape key handler (addEventListener / removeEventListener cleanup)
// 4. Backdrop onClick close: if (e.target === e.currentTarget) onClose()
// 5. useMutation with onSuccess: queryClient.invalidateQueries + onClose()
// 6. mutation.isPending disables submit button
```

### Verified: DeactivateConfirmModal pattern

```typescript
// Source: frontend/src/components/clients/DeactivateConfirmModal.tsx
// Key patterns to replicate:
// 1. Two props: entityId (string) + entityName (string)
// 2. useMutation calls deactivate API function
// 3. onSuccess: invalidateQueries(['products']) + onClose()
// 4. No redirectAfter needed for products (stays on list page)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-router-dom | react-router (unified) | v7 | Import path changed — never use `react-router-dom` in this project |
| tailwind.config.js | No config file, CSS `@import 'tailwindcss'` | Tailwind v4 | No PostCSS needed; vite plugin handles it |
| drizzle-orm latest | Pinned to 0.45.2 | 2025 | 0.46.x has breaking changes; do not change package.json |

---

## Open Questions

1. **Products route access for collaborators/viewers in Phase 5**
   - What we know: FR-04.1 says "owner can create/edit/deactivate" — write is owner-only
   - What's unclear: When Phase 5 builds the transaction line-item picker, collaborators will need to read products. The current Phase 4 plan mounts with `requireRole('owner')` only.
   - Recommendation: Mount with owner-only in Phase 4. Add a separate `GET /api/v1/products` that allows `requireRole('owner', 'collaborator', 'viewer')` OR expand the existing mount in Phase 5. Flag this in the Phase 4 plan as a known integration point.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is pure code/config changes on an already-running stack; products table already migrated).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, environment: 'node') |
| Config file | `backend/vitest.config.ts` |
| Quick run command | `cd backend && npx vitest run src/__tests__/products.test.ts` |
| Full suite command | `cd backend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FR-04.1 | POST /api/v1/products creates product; returns 201 with id | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | Wave 0 |
| FR-04.1 | PATCH /api/v1/products/:id updates fields; 404 on cross-tenant id | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | Wave 0 |
| FR-04.1 | PATCH /api/v1/products/:id/deactivate sets isActive=false | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | Wave 0 |
| FR-04.2 | GET /api/v1/products returns filtered list by search and status | unit | `cd backend && npx vitest run src/__tests__/products.test.ts` | Wave 0 |
| FR-04.3 | transaction_items.productId is nullable FK (schema-level) | manual | Verified by reading schema.ts — no runtime test needed | — |

### Sampling Rate

- **Per task commit:** `cd backend && npx vitest run src/__tests__/products.test.ts`
- **Per wave merge:** `cd backend && npx vitest run`
- **Phase gate:** Full backend suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/src/__tests__/products.test.ts` — covers FR-04.1 and FR-04.2; does not exist yet; follow the mock pattern in `clients.test.ts` exactly

*(Frontend unit tests are not part of this project's test infrastructure — UI verification uses manual/browser testing per project pattern.)*

---

## Sources

### Primary (HIGH confidence)

- `backend/src/routes/clients.ts` — canonical route pattern; read directly
- `backend/src/db/schema.ts` — products table definition; confirmed no migration needed
- `backend/src/app.ts` — router mount pattern; confirmed middleware chain
- `backend/src/middleware/rbac.ts` — requireRole factory; confirmed usage
- `backend/src/middleware/tenant.ts` — requireTenant; confirmed req.companyId assignment
- `frontend/src/pages/clients/ClientsPage.tsx` — list page pattern; debounce, query key, modal state
- `frontend/src/components/clients/ClientModal.tsx` — create/edit modal pattern; focus, escape, pre-fill
- `frontend/src/components/clients/DeactivateConfirmModal.tsx` — deactivate modal pattern
- `frontend/src/components/clients/ClientTable.tsx` — table structure pattern
- `frontend/src/components/clients/ClientTableRow.tsx` — row component pattern
- `frontend/src/api/clients.ts` — API module pattern; interface shapes
- `frontend/src/api/client.ts` — apiClient wrapper; json option, 204 handling
- `frontend/src/App.tsx` — route registration pattern
- `frontend/src/components/layout/Sidebar.tsx` — confirmed /products link already present
- `.planning/phases/04-product-catalog/04-CONTEXT.md` — user decisions D-01 through D-06
- `.planning/REQUIREMENTS.md` — FR-04.1, FR-04.2, FR-04.3
- `.planning/STATE.md` — active decisions (drizzle pin, NUMERIC money, react-router v7, Tailwind v4)

### Secondary (MEDIUM confidence)

- None required — all findings verified directly from source code.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified from package.json dependencies and existing source files
- Architecture: HIGH — direct pattern transfer from Phase 3 code; no speculation
- Pitfalls: HIGH — derived from reading the actual code patterns and known edge cases in inline editing
- Schema: HIGH — products table confirmed present in schema.ts; no migration needed

**Research date:** 2026-03-31
**Valid until:** Stable (project-internal patterns don't expire)
