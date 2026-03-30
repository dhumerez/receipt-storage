# Architecture Patterns

**Project:** Receipts Storage — Multi-tenant Debt Tracker SaaS
**Researched:** 2026-03-29
**Confidence:** MEDIUM-HIGH (core patterns well-established; some specifics from community sources)

---

## Recommended Architecture

```
Internet
    │
    ▼
[ Nginx on VPS host ] ← shared with Restaurant app
    │                    listens on 80 / 443
    ├─ receipts.yourdomain.com  → proxy_pass http://127.0.0.1:4000  (API)
    │                             location /uploads → serve from shared volume
    │
    └─ restaurant.yourdomain.com → proxy_pass http://127.0.0.1:3000  (existing)

[ Docker Compose Stack: receipts-app ]
    ├─ receipts-api      (Node.js/Express)  → port 4000 internal, 127.0.0.1:4000 on host
    ├─ receipts-frontend (React/Vite)       → port 4001 internal, 127.0.0.1:4001 on host
    └─ receipts-db       (PostgreSQL 16)    → port 5433 internal (NOT exposed to host)

[ Named Volume: receipts_uploads ]
    → mounted at /app/uploads in receipts-api
    → mounted at /app/uploads in Nginx (read-only) for direct static serving
```

---

## 1. VPS Port Allocation and Nginx Routing

### Port Assignments

| Service | Internal Container Port | Host Binding | Purpose |
|---|---|---|---|
| Existing restaurant-api | 3000 | 127.0.0.1:3000 | Existing (do not change) |
| Existing restaurant-frontend | 5173 | 127.0.0.1:5173 | Existing (do not change) |
| receipts-api | 4000 | 127.0.0.1:4000 | New Express API |
| receipts-frontend | 4001 | 127.0.0.1:4001 | New React/Vite SPA |
| receipts-db | 5432 (container) | NOT exposed | PostgreSQL (internal only) |

Bind all host ports to `127.0.0.1`, not `0.0.0.0`. This prevents direct public access and forces all traffic through Nginx.

### Nginx Server Blocks

Add two new server blocks to the existing Nginx configuration (typically `/etc/nginx/conf.d/receipts.conf` or a new file in `sites-available`):

```nginx
# receipts-app — API
server {
    listen 80;
    server_name receipts.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name receipts.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/receipts.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/receipts.yourdomain.com/privkey.pem;

    # Uploaded files served directly by Nginx (no Express hop)
    location /uploads/ {
        alias /var/receipts/uploads/;
        add_header X-Content-Type-Options nosniff;
        add_header Cache-Control "public, max-age=31536000, immutable";

        # Restrict to known file types only
        location ~* \.(jpg|jpeg|png|gif|webp|pdf)$ {
            try_files $uri =404;
        }
        return 403;
    }

    # API routes
    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # File upload size limit
        client_max_body_size 10m;
    }

    # Frontend SPA (React)
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**Why this structure:**
- `/uploads/` is served directly by Nginx without passing through Node.js — avoids memory overhead, enables OS-level file caching, and allows `Cache-Control: immutable` on hashed filenames.
- `/api/` prefix cleanly separates API from SPA routes.
- `client_max_body_size 10m` covers images and PDF receipts; raise to 20m if needed.

---

## 2. Docker Compose Configuration

### `docker-compose.yml` for receipts-app

```yaml
version: "3.9"

services:
  receipts-api:
    build: ./backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://receipts_user:password@receipts-db:5432/receipts
      JWT_SECRET: ${JWT_SECRET}
      UPLOAD_DIR: /app/uploads
    volumes:
      - receipts_uploads:/app/uploads
    depends_on:
      receipts-db:
        condition: service_healthy
    networks:
      - receipts_internal

  receipts-frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:4001:4001"
    networks:
      - receipts_internal

  receipts-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: receipts
      POSTGRES_USER: receipts_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - receipts_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U receipts_user -d receipts"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - receipts_internal
    # IMPORTANT: No host port binding — internal only

volumes:
  receipts_uploads:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/receipts/uploads  # real host path for Nginx to also read

  receipts_db_data:

networks:
  receipts_internal:
    driver: bridge
```

**Key decisions:**
- `receipts-db` has no `ports:` entry — it is unreachable from outside Docker. The restaurant app's PostgreSQL on the host is completely separate.
- The uploads volume uses a bind mount to `/var/receipts/uploads` so Nginx on the host can read files directly at the same path (`alias /var/receipts/uploads/` in Nginx config).
- Both apps are isolated by separate Docker networks. No cross-stack communication needed.

---

## 3. Database Schema

### Design Principles

- Every tenant-scoped table carries a `company_id UUID NOT NULL` foreign key.
- `companies` is the tenant root — its `id` is the tenant identifier throughout.
- `users` belong to exactly one company (with one role within that company). Platform super-admins use a separate `is_super_admin` flag rather than a separate role enum value.
- `clients` are company-scoped entities, not platform users.
- Financial integrity: `debts.remaining_balance` is always computed from `debts.total_amount - SUM(payments.amount)`, never stored redundantly. Use a view or a trigger if a cached column is needed for performance later.

### Core Tables

```sql
-- ============================================================
-- PLATFORM LEVEL
-- ============================================================

CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS & ROLES
-- ============================================================

-- Platform-wide users. A user belongs to exactly one company.
-- Super admins: is_super_admin = true, company_id may be NULL.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer', 'client')),
    is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    invited_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- CLIENTS (company contacts, not platform users)
-- ============================================================

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),  -- populated if client has a portal login
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    references_text TEXT,  -- free-form reference notes
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_company_id ON clients(company_id);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    unit_price      NUMERIC(12, 2) NOT NULL,
    unit            VARCHAR(50),  -- "unit", "kg", "box", etc.
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_company_id ON products(company_id);

-- ============================================================
-- TRANSACTIONS & LINE ITEMS
-- ============================================================

-- A transaction = one delivery/service event for a client
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES clients(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),  -- NULL if owner-created or not yet approved
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    description     TEXT,
    total_amount    NUMERIC(12, 2) NOT NULL,
    amount_paid     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes           TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Line items within a transaction (catalog product or free-form)
CREATE TABLE transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),  -- NULL for free-form items
    description     VARCHAR(255) NOT NULL,
    quantity        NUMERIC(10, 3) NOT NULL,
    unit_price      NUMERIC(12, 2) NOT NULL,
    line_total      NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- DEBTS
-- ============================================================

-- One debt record per transaction where amount_paid < total_amount.
-- Created automatically when a transaction is approved.
CREATE TABLE debts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES clients(id),
    total_amount    NUMERIC(12, 2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'partial', 'paid')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_company_id ON debts(company_id);
CREATE INDEX idx_debts_client_id ON debts(client_id);
CREATE INDEX idx_debts_status ON debts(status);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    debt_id         UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    recorded_by     UUID NOT NULL REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
    amount          NUMERIC(12, 2) NOT NULL,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_debt_id ON payments(debt_id);

-- ============================================================
-- DOCUMENTS (file attachments)
-- ============================================================

-- Polymorphic attachment table — documents attach to transactions OR payments
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    entity_type     VARCHAR(20) NOT NULL CHECK (entity_type IN ('transaction', 'payment')),
    entity_id       UUID NOT NULL,
    file_path       VARCHAR(500) NOT NULL,  -- relative path under /uploads/
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);

-- ============================================================
-- NOTIFICATIONS (in-app approval center)
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES users(id),
    entity_type     VARCHAR(20) NOT NULL CHECK (entity_type IN ('transaction', 'payment')),
    entity_id       UUID NOT NULL,
    action          VARCHAR(30) NOT NULL,  -- 'pending_approval', 'approved', 'rejected'
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
```

### Entity Relationship Summary

```
companies
  └── users (role: owner | collaborator | viewer | client)
  └── clients
        └── [optionally linked to a user record for portal login]
  └── products
  └── transactions
        ├── transaction_items (→ products or free-form)
        ├── documents
        └── debts
              ├── payments
              │     └── documents
              └── [remaining_balance = total_amount - SUM(approved payments)]
  └── notifications
```

**Computed balance:**
```sql
-- Use a view for remaining_balance, never store it
CREATE VIEW debt_balances AS
SELECT
    d.id,
    d.company_id,
    d.client_id,
    d.total_amount,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'approved'), 0) AS amount_paid,
    d.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'approved'), 0) AS remaining_balance,
    d.status
FROM debts d
LEFT JOIN payments p ON p.debt_id = d.id
GROUP BY d.id;
```

---

## 4. Multi-Tenancy: Row-Level Isolation with `company_id`

### Strategy Decision: Application-Level Enforcement (Primary) + DB Constraints (Secondary)

For this project, **application-level `company_id` filtering is the primary isolation mechanism**, not PostgreSQL RLS. This is the right tradeoff because:

- No PgBouncer is used (direct pool via `pg`/Drizzle) — RLS `SET LOCAL` complexity is unnecessary
- The codebase is small and the team can enforce the pattern consistently
- RLS adds significant debugging and migration complexity for minimal gain at this scale
- PostgreSQL RLS is recommended only when you need protection against direct DB access bypassing the app layer (e.g., multiple apps sharing one DB with different trust levels)

If RLS is added later, it should be `SET LOCAL` + transaction-scoped only — never `SET SESSION` — to avoid session state leaking across connection pool reuse.

### Drizzle ORM Pattern: Scoped Query Helpers

**Do not** export raw Drizzle table objects and call `.where(eq(table.companyId, ...))` at each call site. One missed clause is a data breach.

**Instead:** Create a `withCompany(companyId)` factory pattern:

```typescript
// src/db/query-helpers.ts
import { eq, and } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema';

/**
 * Returns a scoped query builder for a given company.
 * All queries through this object automatically include company_id filter.
 * NEVER export raw `db` directly — always go through this helper.
 */
export function forCompany(companyId: string) {
  return {
    clients: {
      findAll: () =>
        db.select().from(schema.clients)
          .where(eq(schema.clients.companyId, companyId)),

      findById: (id: string) =>
        db.select().from(schema.clients)
          .where(and(
            eq(schema.clients.companyId, companyId),
            eq(schema.clients.id, id)
          ))
          .limit(1),
    },
    // ... other entities
  };
}
```

**Tenant validation in middleware (belt-and-suspenders):**

```typescript
// src/middleware/tenant.ts
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // req.user is set by the auth middleware (JWT decoded)
  if (!req.user?.companyId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  // Attach to req for use in route handlers
  req.companyId = req.user.companyId;
  next();
}
```

Apply `requireTenant` after JWT auth middleware on every protected route group. Never trust a `company_id` sent in request body or params — always use the one from the verified JWT.

### JWT Payload Shape

```typescript
interface JWTPayload {
  sub: string;          // user.id
  companyId: string;    // user.company_id
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isSuperAdmin: boolean;
  iat: number;
  exp: number;
}
```

The `companyId` comes from the database at login time and is embedded in the signed JWT. Any request claiming a different `companyId` is rejected — the JWT signature ensures tamper-proofing.

---

## 5. RBAC: Role-Based Access Control

### Role Capabilities Matrix

| Capability | super_admin | owner | collaborator | viewer | client |
|---|---|---|---|---|---|
| Manage companies (CRUD) | YES | — | — | — | — |
| Invite/manage users | YES | own company | — | — | — |
| View all company data | YES | own company | own company | own company | own data only |
| Create transactions | YES | YES | YES (→ pending) | — | — |
| Approve transactions | YES | YES | — | — | — |
| Create payments | YES | YES | YES (→ pending) | — | — |
| Approve payments | YES | YES | — | — | — |
| View client debt | YES | YES | YES | YES | own debts only |
| Upload documents | YES | YES | YES | — | — |
| View documents | YES | YES | YES | YES | own debts only |

### Express RBAC Middleware Pattern

```typescript
// src/middleware/rbac.ts
type Role = 'owner' | 'collaborator' | 'viewer' | 'client';

/**
 * Factory that returns middleware allowing only the specified roles.
 * Usage: router.post('/transactions', auth, requireRole('owner', 'collaborator'), handler)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (req.user.isSuperAdmin) {
      return next(); // super admin bypasses role checks
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Collaborator Approval Workflow

Collaborators create transactions/payments in `status: 'pending'`. A notification is inserted for the company owner(s). The owner approves or rejects via a dedicated endpoint.

```
POST /api/transactions
  → if role === 'owner': status = 'approved', debt auto-created
  → if role === 'collaborator': status = 'pending', notification inserted

PATCH /api/transactions/:id/approve   (requireRole('owner'))
  → status = 'approved', debt auto-created if total > paid

PATCH /api/transactions/:id/reject    (requireRole('owner'))
  → status = 'rejected'
```

State machine for both transactions and payments:
```
pending → approved → (debt/balance updated)
pending → rejected → (no effect on balances)
```

Only `approved` transactions generate debts. Only `approved` payments reduce a debt balance. This ensures collaborator work never silently affects financial state.

### Client Portal Isolation

The `client` role is the strictest. Apply a `requireClientScope` middleware that limits all queries to the single `client_id` linked to that user's record:

```typescript
export function requireClientScope(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'client') return next();

  // For client-role users, find the linked clients.id
  // This is resolved at login and stored in the JWT as clientId
  if (!req.user.clientId) {
    return res.status(403).json({ error: 'No client profile linked' });
  }
  req.clientScope = req.user.clientId;
  next();
}
```

---

## 6. File Upload Architecture

### Storage Layout

```
/var/receipts/uploads/            ← host bind mount
  {companyId}/                    ← tenant namespace
    transactions/
      {transactionId}/
        {uuid}-{originalname}
    payments/
      {paymentId}/
        {uuid}-{originalname}
```

Namespacing by `companyId` in the directory path prevents filename collisions across tenants and makes per-tenant data deletion straightforward.

### Multer Configuration

Use Multer 2.0.2+ (the May 2025 security release fixing CVE-2025-47935 and CVE-2025-47944):

```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/app/uploads';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.companyId; // set by tenant middleware
    const entityType = req.params.entityType; // 'transactions' | 'payments'
    const entityId = req.params.entityId;

    const dest = path.join(UPLOAD_DIR, companyId, entityType, entityId);
    // mkdirSync with recursive: true before calling cb
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});
```

### Serving Files

Files are served by Nginx directly via the `location /uploads/` block defined above — not by Express. The Express API provides a URL in the document record; the browser fetches it from Nginx.

The stored `file_path` in the `documents` table is relative to `UPLOAD_DIR`, e.g. `{companyId}/transactions/{txId}/{uuid}.jpg`. The API constructs the full public URL as `/uploads/{file_path}`.

**Never expose the raw filesystem path in the API response.** Construct the URL from the stored relative path only.

---

## 7. Component Boundaries

| Component | Responsibility | Communicates With |
|---|---|---|
| Nginx (host) | TLS termination, routing by subdomain, static file serving for /uploads | Express API, React SPA, filesystem |
| receipts-api (Express) | Auth, RBAC, business logic, file upload handling, DB queries | receipts-db, filesystem (uploads) |
| receipts-frontend (React) | SPA UI, TanStack Query for data fetching | receipts-api via /api/ |
| receipts-db (PostgreSQL) | Persistent data, ACID guarantees | receipts-api only |
| Named volume (uploads) | File persistence across container restarts | receipts-api (write), Nginx (read) |

---

## 8. Data Flow: Transaction → Debt Creation

```
1. POST /api/transactions
   → Collaborator or Owner submits transaction data

2. Auth middleware validates JWT → req.user populated
3. Tenant middleware validates companyId → req.companyId set
4. RBAC middleware checks role ∈ ['owner', 'collaborator']

5. Handler inserts transaction (status based on role):
   - owner   → status: 'approved'
   - collaborator → status: 'pending' + insert notification

6. If status === 'approved' AND transaction.total_amount > transaction.amount_paid:
   → INSERT INTO debts (company_id, transaction_id, client_id, total_amount, status='open')

7. Document upload (optional, same request or separate):
   → Multer writes file to /app/uploads/{companyId}/transactions/{txId}/
   → INSERT INTO documents (entity_type='transaction', entity_id=txId, ...)

8. Response: transaction record + debt record (if created)
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Missing `company_id` in a Query
**What goes wrong:** A query returns data from another tenant.
**Why it happens:** Developer writes `db.select().from(clients).where(eq(clients.id, id))` — no `company_id` check.
**Consequences:** Cross-tenant data leak — potentially a GDPR/legal incident.
**Prevention:** Use the `forCompany()` scoped helper exclusively. Enforce with code review. Consider an ESLint rule checking for direct table queries without `companyId`.

### Anti-Pattern 2: Trusting `company_id` from Request Body
**What goes wrong:** A client sends a forged `company_id` in the request body and accesses another tenant's data.
**Prevention:** Always derive `company_id` from the decoded JWT (`req.user.companyId`), never from `req.body` or `req.params`.

### Anti-Pattern 3: Exposing receipts-db Port to Host
**What goes wrong:** Port 5432 on host is occupied or exposed publicly, creating a security surface.
**Prevention:** Remove all `ports:` from the `receipts-db` service in docker-compose. Only `receipts-api` needs to reach it via Docker DNS (`receipts-db:5432`).

### Anti-Pattern 4: Storing Files Outside the Namespaced Path
**What goes wrong:** Files from different tenants mix in the same directory. A path traversal bug could serve another tenant's documents.
**Prevention:** Always prefix the upload destination with `req.companyId`. Validate that the resolved path still starts with `UPLOAD_DIR/{companyId}` before writing.

### Anti-Pattern 5: Approving Collaborator Records in the Same Transaction as Insert
**What goes wrong:** Race condition where an owner approves before the record is fully written.
**Prevention:** Insert with `status: 'pending'` first (committed), then a separate PATCH endpoint changes status. Never combine insert + approval in one request.

### Anti-Pattern 6: Storing `remaining_balance` as a Column
**What goes wrong:** Balance gets out of sync when payments are approved/rejected, requiring complex triggers.
**Prevention:** Always compute balance from `SUM(approved payments)` via the `debt_balances` view. Cache only if query performance requires it (add at Phase 3+, not Phase 1).

---

## Scalability Considerations

| Concern | At current scale (1–5 tenants) | At 50 tenants | At 500+ tenants |
|---|---|---|---|
| DB query performance | Indexes on `company_id` sufficient | Same | Consider partitioning by `company_id` |
| File storage | Local disk on VPS | Monitor disk usage, add volume | Migrate to S3-compatible (MinIO or Cloudflare R2) |
| Connection pooling | Direct Drizzle pool (default 10) | Add `pg-pool` with explicit limits | Consider PgBouncer (but must use SET LOCAL with RLS) |
| Multi-tenancy isolation | App-level `company_id` | Same | Consider schema-per-tenant migration |

---

## Sources

- [Drizzle ORM RLS Documentation](https://orm.drizzle.team/docs/rls)
- [GitHub Discussion: Enforce tenant_id in Drizzle queries #1539](https://github.com/drizzle-team/drizzle-orm/discussions/1539)
- [pgvpd: Virtual Private Database for PostgreSQL](https://github.com/solidcitizen/pgvpd)
- [PostgreSQL RLS Pitfalls — Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide)
- [Multi-Tenant Data Isolation with PostgreSQL RLS — AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Shipping multi-tenant SaaS using Postgres RLS — Nile](https://www.thenile.dev/blog/multi-tenant-rls)
- [Docker Compose Networking — Official Docs](https://docs.docker.com/compose/how-tos/networking/)
- [Nginx Reverse Proxy with Multiple Docker Apps — Linux Handbook](https://linuxhandbook.com/nginx-reverse-proxy-docker/)
- [PgBouncer and RLS — SET LOCAL requirement](https://imfeld.dev/notes/postgresql_row_level_security)
- [Multer 2.0 Security Release — Express.js](https://expressjs.com/2025/05/19/security-releases.html)
- [Docker + Multer Volume Configuration Best Practices](https://copyprogramming.com/howto/upload-files-from-express-js-and-multer-to-persistent-docker-volume)
- [Designing PostgreSQL for Multi-tenancy — Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)
