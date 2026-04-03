# Super Admin Panel — Design Spec

## Goal

Give the super admin a frontend UI to create and manage companies and their owner accounts. The backend API already exists (`/admin/*` routes); this spec covers the missing frontend.

## Decisions

- **Scope:** Admin panel only — no access to company data (clients, products, transactions)
- **Layout:** List + detail pages (matches existing ClientsPage/ClientDetailPage pattern)
- **Language:** Spanish (all strings via constants file)
- **Backend:** No changes needed — all 4 endpoints exist and are verified

## Pages

### 1. Admin Companies List (`/admin`)

- Table columns: company name, currency code, status badge (Activa/Inactiva), created date, owner email (or "Sin propietario")
- "Crear Empresa" button → opens modal with fields: name (required, 1-255 chars), currency code (required, 3-char ISO e.g. "BOB", "USD")
- Search bar with 300ms debounce to filter companies by name
- Click row → navigates to `/admin/companies/:id`
- Loading state: "Cargando..." text
- Empty state: "No hay empresas registradas" with CTA to create first company

### 2. Admin Company Detail (`/admin/companies/:id`)

- Back button → `/admin`
- **Company info card:** name, currency code, status, created date. Edit button opens inline edit or modal for name/currency.
- **Owner section:**
  - If owner exists: show email, full name, role badge
  - If no owner: "Sin propietario" message with "Crear Propietario" button
  - Create owner form (modal): email (required), full name (required), password (required, min 8 chars)
  - Success: show toast/banner, refetch company data
  - Error 409: "Este email ya está en uso"
- **Deactivate/Activate company:** toggle button with confirmation modal. Calls `PATCH /admin/companies/:id` with `{ isActive: false/true }`.

## New Files

| File | Purpose |
|------|---------|
| `frontend/src/api/admin.ts` | API module: `getCompanies()`, `createCompany(data)`, `getCompany(id)`, `updateCompany(id, data)`, `createOwner(companyId, data)` |
| `frontend/src/pages/AdminCompaniesPage.tsx` | Companies list page with table, search, create modal |
| `frontend/src/pages/AdminCompanyDetailPage.tsx` | Company detail with info card, owner section, edit/deactivate |
| `frontend/src/constants/strings/admin.ts` | Spanish strings for admin panel |
| `frontend/src/components/AdminLayout.tsx` | Simple layout: header bar with "Panel de Administración" title + logout button, main content area. No sidebar. |
| `frontend/src/components/AdminRoute.tsx` | Route guard: checks `user.isSuperAdmin === true`, redirects to `/` if not |

## Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add `/admin` and `/admin/companies/:id` routes wrapped in `AdminRoute` + `AdminLayout` |
| `frontend/src/pages/LoginPage.tsx` | After login, if `user.isSuperAdmin`, redirect to `/admin` instead of `/` |

## Routing

```
/admin                → AdminRoute → AdminLayout → AdminCompaniesPage
/admin/companies/:id  → AdminRoute → AdminLayout → AdminCompanyDetailPage
```

## Auth Flow

1. Super admin logs in via existing `/login` page (no changes to login form)
2. `LoginPage` checks `user.isSuperAdmin` after successful login → redirects to `/admin`
3. `AdminRoute` component wraps admin pages: if `!user` → `/login`, if `!user.isSuperAdmin` → `/`
4. `AdminLayout` provides a minimal header (no sidebar — admin only has one section)

## API Module (`frontend/src/api/admin.ts`)

```typescript
// Types
interface Company {
  id: string;
  name: string;
  currencyCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyWithOwner extends Company {
  owner?: { id: string; email: string; fullName: string; role: string } | null;
}

interface CreateCompanyData { name: string; currencyCode: string; }
interface UpdateCompanyData { name?: string; currencyCode?: string; isActive?: boolean; }
interface CreateOwnerData { email: string; password: string; fullName: string; }

// Functions
getCompanies(): Promise<Company[]>
  → GET /admin/companies

createCompany(data: CreateCompanyData): Promise<Company>
  → POST /admin/companies

updateCompany(id: string, data: UpdateCompanyData): Promise<Company>
  → PATCH /admin/companies/:id

createOwner(companyId: string, data: CreateOwnerData): Promise<{ id: string; email: string; role: string }>
  → POST /admin/companies/:id/owner
```

Note: The `GET /admin/companies` endpoint currently returns companies without owner info. The detail page will need to show owner data — either the backend adds an owner field to the company response, or the frontend fetches it separately. Since we said no backend changes, the detail page will call `GET /admin/companies` and filter by ID, then display owner info if available in the response. If the backend doesn't include owner data, we add a minimal backend change: include `owner` (email, fullName) in the company GET response.

**Backend consideration:** Check if `GET /admin/companies` returns owner info. If not, add a `GET /admin/companies/:id` endpoint or modify the existing GET to include owner. This is the one potential backend change.

## UI Patterns (matching existing app)

- Tailwind CSS, no external UI library
- Modals: `fixed inset-0 bg-black/50 z-50` overlay, `bg-white rounded-lg shadow-xl max-w-lg p-6`
- Buttons: `bg-blue-600 text-white rounded-md hover:bg-blue-700` (primary), gray for secondary
- Tables: `thead` with uppercase labels, `tbody` with `divide-y`, `hover:bg-gray-50`
- Error banners: `bg-red-50 border border-red-200 text-red-700 p-3 rounded`
- Loading: "Cargando..." text
- Status badges: green for active, gray for inactive

## Spanish Strings (`admin.ts`)

Key strings needed:
- `pageTitle`: "Empresas"
- `createCompany`: "Crear Empresa"
- `companyName`: "Nombre de la Empresa"
- `currencyCode`: "Código de Moneda"
- `owner`: "Propietario"
- `noOwner`: "Sin propietario"
- `createOwner`: "Crear Propietario"
- `email`: "Correo electrónico"
- `fullName`: "Nombre completo"
- `password`: "Contraseña"
- `active`: "Activa"
- `inactive`: "Inactiva"
- `deactivate`: "Desactivar"
- `activate`: "Activar"
- `confirmDeactivate`: "¿Estás seguro de que deseas desactivar esta empresa?"
- `emailInUse`: "Este email ya está en uso"
- `loading`: "Cargando..."
- `noCompanies`: "No hay empresas registradas"
- `back`: "Volver"
- `save`: "Guardar"
- `cancel`: "Cancelar"
- `adminPanel`: "Panel de Administración"
