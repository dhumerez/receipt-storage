# Phase 1: Foundation — Infrastructure & Database - Research

**Researched:** 2026-03-29
**Domain:** Docker Compose / Nginx / PostgreSQL / Drizzle ORM / Express 5 / React 19 / Vite / Tailwind v4
**Confidence:** HIGH (all critical package APIs verified against npm registry and official docs)

---

## Summary

Phase 1 sets the immovable foundation: Docker stack coexisting with the Restaurant app, complete database schema with Drizzle ORM, and skeleton projects for both backend and frontend. Every subsequent phase depends on decisions made here — multi-tenancy enforcement, money storage, reference number format, and audit log immutability cannot be changed cheaply after Phase 2.

The stack is entirely greenfield (project root contains only `.planning/` and `.claude/` — no source code yet). All major packages are at major or near-major versions with recent publish dates (late March 2026). Notably, **drizzle-orm is at 0.45.2 stable** (v1.0.0 is in beta.20 and should NOT be used); **Express is at v5.2.1** with meaningful breaking changes from v4 that must be accounted for in route and error handling patterns; **Tailwind CSS is at v4.2.2** with a completely different configuration model from v3.

**Primary recommendation:** Build the DB schema first (Plan 1.3), then the Docker stack (Plan 1.1), then Nginx (Plan 1.2), then wire up the Express skeleton to the running DB (Plan 1.4), then scaffold the frontend (Plan 1.5). This ordering means the schema is validated before any application code is written against it.

---

## Standard Stack

### Core — Verified Versions (npm registry, 2026-03-29)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | **0.45.2** | ORM + query builder for PostgreSQL | Stable latest; v1.0.0 is still beta.20 — do NOT use beta |
| drizzle-kit | **0.31.10** | Migration generator + CLI | Paired with drizzle-orm 0.45.x; must stay in sync |
| pg | **8.20.0** | node-postgres driver | Official PostgreSQL driver; drizzle uses it via `drizzle-orm/node-postgres` |
| express | **5.2.1** | HTTP framework | v5 is stable since Oct 2024; async errors auto-propagate (no asyncHandler needed) |
| typescript | **6.0.2** | Type system | Current stable |
| tsx | **4.21.0** | TS execution for dev/scripts | No build step for migration runner |
| react | **19.2.4** | UI library | Required by project spec |
| vite | **8.0.3** | Frontend bundler | Required by project spec |
| @vitejs/plugin-react | **6.0.1** | React Fast Refresh | Required alongside vite |
| react-router | **7.13.2** | SPA routing | v7 — import from `react-router`, NOT `react-router-dom` |
| @tanstack/react-query | **5.95.2** | Server state management | v5 is stable; v4 API is significantly different |
| tailwindcss | **4.2.2** | Utility CSS | v4 has NO tailwind.config.js; CSS-first config |
| @tailwindcss/vite | **4.x** | Vite plugin for Tailwind v4 | Required; replaces postcss pipeline |
| jsonwebtoken | **9.0.3** | JWT sign/verify | HS256 only; use `algorithms: ['HS256']` option |
| bcryptjs | **3.0.3** | Password hashing | Pure-JS bcrypt |
| dotenv | **17.3.1** | Env var loading | Standard |
| helmet | **8.1.0** | Express security headers | Standard for Express APIs |
| cors | **2.8.6** | CORS middleware | Standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query-devtools | 5.95.2 | Query inspector in dev | Dev dependency; conditionally loaded |
| @types/express | 5.0.6 | TypeScript types for Express 5 | Dev dep; must match express v5 |
| @types/pg | 8.20.0 | Types for pg driver | Dev dep |
| @types/jsonwebtoken | 9.0.10 | JWT types | Dev dep |
| @types/bcryptjs | 3.0.0 | bcryptjs types | Dev dep |
| @types/node | 25.5.0 | Node.js types | Dev dep |
| @types/cors | 2.x | CORS types | Dev dep |
| zod | **4.3.6** | Runtime validation | Request body validation in handlers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drizzle-orm stable | drizzle-orm beta | Beta has improved RLS API but is unstable; use 0.45.2 |
| node-postgres (pg) | postgres.js | postgres.js is faster but less mature Drizzle adapter |
| react-router v7 declarative | TanStack Router | TanStack Router is excellent but not in the spec |
| Tailwind v4 | Tailwind v3 | v4 is the current release; new config model is simpler |
| Express 5 | Fastify | Express is in spec; Fastify would be faster but not spec |

**Installation — Backend:**
```bash
npm install express drizzle-orm pg jsonwebtoken bcryptjs dotenv helmet cors zod
npm install -D typescript tsx @types/express @types/pg @types/node @types/jsonwebtoken @types/bcryptjs @types/cors drizzle-kit
```

**Installation — Frontend:**
```bash
npm install react react-dom react-router @tanstack/react-query tailwindcss @tailwindcss/vite
npm install -D vite @vitejs/plugin-react @tanstack/react-query-devtools typescript @types/react @types/react-dom
```

**Version verification:** All versions above verified against npm registry on 2026-03-29.

---

## Architecture Patterns

### Recommended Project Structure

```
receipts-storage/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts          # All Drizzle table + view definitions
│   │   │   ├── client.ts          # DB connection pool (singleton)
│   │   │   ├── migrations/        # Generated SQL from drizzle-kit generate
│   │   │   └── query-helpers.ts   # forCompany() tenant helper
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT verification → req.user
│   │   │   ├── tenant.ts          # requireTenant → req.companyId
│   │   │   └── rbac.ts            # requireRole() factory
│   │   ├── routes/
│   │   │   └── health.ts          # GET /health
│   │   ├── app.ts                 # Express app setup (no listen)
│   │   └── server.ts              # listen() entry point
│   ├── drizzle.config.ts
│   ├── healthcheck.js             # Node.js healthcheck for Docker
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Fetch wrapper / axios instance
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── AppLayout.tsx  # Base layout shell
│   │   ├── pages/                 # Route-level components (empty stubs)
│   │   ├── App.tsx                # QueryClientProvider + BrowserRouter + routes
│   │   ├── main.tsx               # ReactDOM.createRoot
│   │   └── index.css              # @import "tailwindcss"
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

### Pattern 1: Drizzle ORM pgTable Schema Definition

**Syntax confirmed against official docs (orm.drizzle.team, 2026-03-29).**

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
// Source: https://orm.drizzle.team/docs/indexes-constraints
// Source: https://orm.drizzle.team/docs/generated-columns
import { SQL, sql } from 'drizzle-orm';
import {
  pgTable, pgEnum, uuid, varchar, text, boolean,
  numeric, integer, date, timestamp, char, check,
  index, unique,
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['owner', 'collaborator', 'viewer', 'client']);
export const txStatusEnum = pgEnum('tx_status', ['draft', 'pending_approval', 'active', 'voided', 'written_off']);
export const debtStatusEnum = pgEnum('debt_status', ['open', 'partially_paid', 'fully_paid', 'written_off']);
export const paymentStatusEnum = pgEnum('payment_status', ['confirmed', 'pending_approval', 'rejected']);

// Table with check constraint, indexes, and generated column
export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    // GENERATED ALWAYS AS STORED — uses callback form to reference sibling columns
    lineTotal: numeric('line_total', { precision: 12, scale: 2 })
      .generatedAlwaysAs((): SQL => sql`${transactionItems.quantity} * ${transactionItems.unitPrice}`),
  },
  // Third argument: table builder callback for constraints/indexes
  (table) => [
    index('idx_transaction_items_transaction_id').on(table.transactionId),
  ]
);
```

**Key Drizzle column syntax notes (verified):**
- `uuid('col').defaultRandom()` → `DEFAULT gen_random_uuid()`
- `numeric('col', { precision: 12, scale: 2 })` → `NUMERIC(12,2)`
- `timestamp('col', { withTimezone: true }).defaultNow()` → `TIMESTAMPTZ DEFAULT NOW()`
- `boolean('col').notNull().default(true)` → `BOOLEAN NOT NULL DEFAULT TRUE`
- `varchar('col', { length: 255 })` → `VARCHAR(255)`
- Indexes and check constraints go in the **third argument** as an array
- `check('constraint_name', sql`${table.age} > 0`)` for CHECK constraints

---

### Pattern 2: pgEnum — Preferred Over VARCHAR + CHECK

The schema in ARCHITECTURE.md uses raw `CHECK (status IN (...))` on VARCHAR columns. In Drizzle, use `pgEnum` instead — it creates a proper PostgreSQL ENUM type and provides TypeScript union type inference:

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
export const txStatusEnum = pgEnum('tx_status', [
  'draft', 'pending_approval', 'active', 'voided', 'written_off'
]);

export const transactions = pgTable('transactions', {
  // ...
  status: txStatusEnum('status').notNull().default('draft'),
});
// TypeScript type inferred: 'draft' | 'pending_approval' | 'active' | 'voided' | 'written_off'
```

**Decision:** Use `pgEnum` for all status columns (tx_status, debt_status, payment_status, user_role, entity_type). This matches the ARCHITECTURE.md schema intent while using idiomatic Drizzle instead of raw CHECK constraints on VARCHAR.

---

### Pattern 3: pgView for debt_balances

Complex aggregation with COALESCE and FILTER must use raw SQL (query builder can't express `SUM(...) FILTER (WHERE ...)`). Columns must be explicitly declared when using `sql`:

```typescript
// Source: https://orm.drizzle.team/docs/views
import { pgView, uuid, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const debtBalances = pgView('debt_balances', {
  id: uuid('id').notNull(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull(),
  remainingBalance: numeric('remaining_balance', { precision: 12, scale: 2 }).notNull(),
  status: debtStatusEnum('status').notNull(),
}).as(sql`
  SELECT
    d.id,
    d.company_id,
    d.client_id,
    d.total_amount,
    COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS amount_paid,
    d.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'confirmed'), 0) AS remaining_balance,
    d.status
  FROM debts d
  LEFT JOIN payments p ON p.debt_id = d.id
  GROUP BY d.id, d.company_id, d.client_id, d.total_amount, d.status
`);
```

**Usage:** `await db.select().from(debtBalances).where(eq(debtBalances.companyId, companyId))`

---

### Pattern 4: forCompany() Tenant Query Helper

**This is the most security-critical pattern in the entire codebase.** Never query a tenant-scoped table without going through this helper.

```typescript
// Source: https://orm.drizzle.team/docs/select (confirmed .and() and eq() patterns)
// Pattern: typed wrapper class approach (from drizzle-team/drizzle-orm discussions/1539)
import { and, eq, SQL } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';

// Tables that have a companyId column — TypeScript constrains at call site
type TenantScopedTable = {
  companyId: PgColumn;
};

/**
 * Returns scoped query helpers for a given companyId.
 * companyId MUST come from verified JWT (req.user.companyId) — never request body.
 *
 * Usage: const { clients } = forCompany(req.user.companyId);
 *        const all = await clients.findAll();
 */
export function forCompany(companyId: string) {
  function scopedSelect<T extends PgTable & TenantScopedTable>(
    table: T,
    extraWhere?: SQL
  ) {
    const baseWhere = eq((table as any).companyId, companyId);
    return db
      .select()
      .from(table)
      .where(extraWhere ? and(baseWhere, extraWhere) : baseWhere);
  }

  return {
    clients: {
      findAll: () => scopedSelect(schema.clients),
      findById: (id: string) =>
        scopedSelect(schema.clients, eq(schema.clients.id, id)).limit(1),
    },
    transactions: {
      findAll: () => scopedSelect(schema.transactions),
      findById: (id: string) =>
        scopedSelect(schema.transactions, eq(schema.transactions.id, id)).limit(1),
    },
    debts: {
      findAll: () => scopedSelect(schema.debts),
      findById: (id: string) =>
        scopedSelect(schema.debts, eq(schema.debts.id, id)).limit(1),
    },
    // extend as more entities are added in later phases
  };
}
```

---

### Pattern 5: Drizzle-Kit Migration Workflow

```typescript
// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',   // SQL files committed to git
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Commands:**
```bash
# Development: generate SQL migration files from schema changes
npx drizzle-kit generate --name=init

# Apply migrations (production — runs against live DB)
npx drizzle-kit migrate

# DEV ONLY: push schema directly without SQL files (never use in prod)
npx drizzle-kit push
```

**Production strategy:** Generate + commit SQL files → run `drizzle-kit migrate` at container startup via a startup script. Never use `push` in production (it can silently drop columns).

**Programmatic migration at startup (recommended for Docker):**
```typescript
// src/db/migrate.ts — run before app.listen()
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle({ client: pool });
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await pool.end();
  console.log('Migrations complete');
}

runMigrations().catch((e) => { console.error(e); process.exit(1); });
```

---

### Pattern 6: Express 5 Project Setup

**Express 5 is the current stable.** Key differences from v4 that affect this phase:

1. **Async errors auto-propagate** — no `asyncHandler` wrapper needed
2. **Wildcard routes changed** — `/*` must be `/*splat` or `/{*splat}`
3. **`res.json(body, status)` removed** — use `res.status(201).json(body)`
4. **`req.body` is `undefined`** (not `{}`) when no body parser is present
5. **`express.urlencoded()` default `extended` changed** to `false`

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'dotenv/config';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // v5 default; be explicit

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Protected routes added in later phases ---

// Global error handler — Express 5 async errors arrive here automatically
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

```typescript
// src/server.ts
import 'dotenv/config';
import { app } from './app';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.listen(PORT, '0.0.0.0', (error?: Error) => {
  if (error) throw error;
  console.log(`API listening on port ${PORT}`);
});
```

---

### Pattern 7: Express 5 Middleware Stack (auth + tenant + RBAC)

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  sub: string;
  companyId: string;
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isSuperAdmin: boolean;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      companyId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token' });
  }
  try {
    const payload = jwt.verify(
      auth.slice(7),
      process.env.JWT_SECRET!,
      { algorithms: ['HS256'] }   // NEVER allow 'none'
    ) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// src/middleware/tenant.ts
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.companyId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  req.companyId = req.user.companyId; // from verified JWT only
  next();
}

// src/middleware/rbac.ts
type Role = 'owner' | 'collaborator' | 'viewer' | 'client';
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (req.user.isSuperAdmin) return next();
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

---

### Pattern 8: Docker Compose Stack

```yaml
# docker-compose.yml
services:
  receipts-api:
    build: ./backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:4000:4000"      # bind to loopback — not publicly exposed
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://receipts_user:${DB_PASSWORD}@receipts-db:5432/receipts
      JWT_SECRET: ${JWT_SECRET}
      UPLOAD_DIR: /var/receipts/uploads
      PORT: 4000
    volumes:
      - /var/receipts/uploads:/var/receipts/uploads  # bind mount — Nginx reads same path
    depends_on:
      receipts-db:
        condition: service_healthy       # wait for DB healthcheck BEFORE starting API
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
      - receipts_db_data:/var/lib/postgresql/data  # named volume — Docker manages ownership
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U receipts_user -d receipts"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s              # give PG time to initialize on first boot
    networks:
      - receipts_internal
    # CRITICAL: no 'ports:' entry — receipts-db is NOT reachable from outside Docker

volumes:
  receipts_db_data:                  # named volume — no bind mount for DB

networks:
  receipts_internal:
    driver: bridge
```

---

### Pattern 9: Docker Healthcheck for API Container

The `postgres:16-alpine` image includes `pg_isready`. The `node:XX-alpine` image does NOT include `curl` — use Node.js itself for the API healthcheck:

```javascript
// backend/healthcheck.js (CommonJS — no build step)
const http = require('node:http');
const options = {
  hostname: 'localhost',
  port: parseInt(process.env.PORT ?? '4000', 10),
  path: '/health',
  method: 'GET',
  timeout: 5000,
};
const req = http.request(options, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
req.end();
```

```dockerfile
# backend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY healthcheck.js ./

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD ["node", "healthcheck.js"]

CMD ["node", "dist/server.js"]
```

In docker-compose.yml, add `condition: service_healthy` to anything that depends on the API being ready.

---

### Pattern 10: Nginx receipts.conf

**Never touch restaurant.conf.** Create a new file at `/etc/nginx/conf.d/receipts.conf`:

```nginx
# /etc/nginx/conf.d/receipts.conf
# HTTP — redirect to HTTPS
server {
    listen 80;
    server_name receipts.yourdomain.com;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl;
    server_name receipts.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/receipts.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/receipts.yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # File upload size — matches multer limit (10MB) + overhead
    client_max_body_size 12m;

    # API routes
    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # SPA — all non-API routes go to React frontend
    location / {
        proxy_pass         http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
    }
}
```

**Let's Encrypt acquisition (non-disruptive — existing Nginx keeps running):**

```bash
# Step 1: Add HTTP-only server block to receipts.conf FIRST (no SSL yet)
# Deploy the HTTP block above (without the 443 block)
sudo nginx -t && sudo nginx -s reload

# Step 2: DNS must resolve receipts.yourdomain.com to this server
# Step 3: Use certbot with --nginx plugin (auto-discovers the server_name)
sudo certbot --nginx -d receipts.yourdomain.com

# certbot will:
# - Obtain the certificate from Let's Encrypt
# - Modify receipts.conf to add SSL directives
# - Reload Nginx automatically
# Does NOT touch restaurant.conf

# Step 4: Verify auto-renewal
sudo certbot renew --dry-run
```

**Alternative (--nginx plugin not available):**
```bash
# webroot method — requires Nginx serving /.well-known/acme-challenge/
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d receipts.yourdomain.com
# Then manually add ssl_certificate directives to receipts.conf
```

---

### Pattern 11: React 19 + Vite + Tailwind v4 + TanStack Query v5 + React Router v7

**Vite config (Tailwind v4 plugin replaces postcss entirely):**
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),    // NEW in v4 — replaces postcss/tailwind config
  ],
  server: {
    port: 4001,
    proxy: {
      '/api': 'http://localhost:4000',  // dev proxy
    },
  },
});
```

**index.css — Tailwind v4 import:**
```css
/* src/index.css — replaces @tailwind base/components/utilities */
@import "tailwindcss";
```

**main.tsx — QueryClientProvider + Router:**
```typescript
// Source: https://tanstack.com/query/v5/docs/react/quick-start
// Source: https://reactrouter.com/start/modes (Declarative mode)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';           // NOTE: react-router, not react-router-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 min
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**App.tsx — Route scaffolding:**
```typescript
import { Routes, Route } from 'react-router';   // react-router, not react-router-dom
import AppLayout from './components/layout/AppLayout';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<div>Dashboard (Phase 3+)</div>} />
        <Route path="/login" element={<div>Login (Phase 2)</div>} />
      </Route>
    </Routes>
  );
}
```

---

### Pattern 12: Audit Log DB-Level Immutability

After running migrations, execute this SQL with a privileged user (NOT the application user):

```sql
-- Create a separate app user that cannot mutate audit_logs
-- Run once after initial migration, NOT in migration files
REVOKE UPDATE, DELETE ON audit_logs FROM receipts_user;
-- receipts_user can still INSERT and SELECT
```

This is a one-time DBA operation. The application user `receipts_user` (used in DATABASE_URL) retains INSERT and SELECT on `audit_logs` but loses UPDATE and DELETE. Application bugs cannot corrupt the audit trail.

**Include this SQL in a `db/setup/permissions.sql` file** committed to git, with a comment noting it must be run as a superuser after initial migration.

---

### Pattern 13: reference_number Generation (TXN-YYYY-NNNN)

Per-company sequential reference numbers cannot use a single PostgreSQL sequence (sequences are global, not per-company). Use an application-level counter table with `SELECT FOR UPDATE`:

```sql
-- Add to schema: company_counters table
CREATE TABLE company_counters (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  counter_key VARCHAR(20) NOT NULL,   -- 'TXN', 'PAY', etc.
  year        SMALLINT NOT NULL,
  last_value  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, counter_key, year)
);
```

```typescript
// In the transaction creation handler (inside a db.transaction()):
const year = new Date().getFullYear();

// Lock this company's counter row
const [counter] = await tx
  .select()
  .from(schema.companyCounters)
  .where(
    and(
      eq(schema.companyCounters.companyId, companyId),
      eq(schema.companyCounters.counterKey, 'TXN'),
      eq(schema.companyCounters.year, year)
    )
  )
  .for('update');

let nextValue: number;
if (!counter) {
  // First transaction of the year for this company
  await tx.insert(schema.companyCounters).values({
    companyId, counterKey: 'TXN', year, lastValue: 1,
  });
  nextValue = 1;
} else {
  nextValue = counter.lastValue + 1;
  await tx.update(schema.companyCounters)
    .set({ lastValue: nextValue })
    .where(/* same where conditions */);
}

const referenceNumber = `TXN-${year}-${String(nextValue).padStart(4, '0')}`;
// e.g., "TXN-2026-0001"
```

This pattern is needed in Phase 5 but the `company_counters` table must be in the Phase 1 schema.

---

### Anti-Patterns to Avoid

- **Using `drizzle-kit push` in production:** It can silently alter or drop columns. Always use `generate` + `migrate`.
- **Importing `react-router-dom`:** Package renamed to `react-router` in v7. `react-router-dom` no longer exists as a separate package.
- **Using `tailwind.config.js`:** Not supported in Tailwind v4. Use `@theme {}` in CSS or accept v4 defaults.
- **Using `/*` wildcard in Express 5 routes:** Must be `/*splat` — the old syntax throws a TypeError from path-to-regexp.
- **`res.json(data, status)` in Express 5:** Removed. Use `res.status(status).json(data)`.
- **Exposing `receipts-db` port on host:** No `ports:` entry on the DB service — internal only.
- **Bind mount for PostgreSQL data:** Use named Docker volume (`receipts_db_data`). Bind mounts get created as root, causing `Permission denied` on PostgreSQL startup.
- **Using `req.body.companyId` for tenant scoping:** Always use `req.user.companyId` from the verified JWT.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT sign/verify | Custom HMAC | jsonwebtoken 9.0.3 | Edge cases in algorithm negotiation (alg:none attack) |
| Password hashing | Custom bcrypt | bcryptjs 3.0.3 | Timing-safe comparison, salt rounds handled correctly |
| Query tenant scoping | per-query WHERE clauses | `forCompany()` helper | One missed clause = data breach |
| DB migration tracking | Custom migration table | drizzle-kit migrate | Already handles `__drizzle_migrations` tracking, ordering, idempotency |
| Express async error wrapping | `asyncHandler()` wrapper | Express 5 native | Express 5 auto-propagates async errors — no wrapper needed |
| Container health polling | `sleep` + retry script | Docker `healthcheck` + `condition: service_healthy` | Native Docker feature; handles timing correctly |
| Wildcard cert or SSL termination | Custom TLS | Nginx + certbot | Let's Encrypt integration is battle-tested |

**Key insight:** The biggest hand-roll risk is per-query tenant filtering. One developer forgetting `AND company_id = ?` on any query is a cross-tenant data leak. The `forCompany()` helper pattern makes the correct way the only way.

---

## Common Pitfalls

### Pitfall 1: drizzle-orm v1 Beta
**What goes wrong:** Developer installs `drizzle-orm@beta` expecting "latest stable v1" and gets unstable API.
**Why it happens:** The `beta` dist-tag points to `1.0.0-beta.20`; `latest` points to `0.45.2`.
**How to avoid:** Always install `drizzle-orm@0.45.2` (pin exact version in package.json). Do not use `@latest` or `@beta` in lock files.
**Warning signs:** `drizzle-orm@1.0.0-beta.*` in package.json or node_modules.

### Pitfall 2: Named Volume vs Bind Mount for PostgreSQL
**What goes wrong:** Using `./postgres-data:/var/lib/postgresql/data` (bind mount). Docker creates the directory as root; PostgreSQL runs as UID 999 and fails to start with `Permission denied`.
**How to avoid:** Use named Docker volume `receipts_db_data:` — Docker manages ownership correctly.
**Warning signs:** `initdb: error: could not create directory "/var/lib/postgresql/data"` in DB logs.

### Pitfall 3: Upload Volume Needs to Be Bind Mount (Not Named Volume)
**What goes wrong:** Using a named Docker volume for `/var/receipts/uploads`. Host Nginx cannot read from Docker-managed volumes without special configuration.
**How to avoid:** Use a bind mount to a real host path (`/var/receipts/uploads:/var/receipts/uploads`) so Nginx can `alias /var/receipts/uploads/` in the location block.
**Action needed:** `sudo mkdir -p /var/receipts/uploads && sudo chown 1000:1000 /var/receipts/uploads` on the host before first `docker compose up`.

### Pitfall 4: Express 5 Wildcard Route Syntax
**What goes wrong:** `app.get('/*', handler)` throws a TypeError at startup: "Missing parameter name at position 1".
**Why it happens:** Express 5 upgraded path-to-regexp from 0.x to 8.x. Wildcards must be named.
**How to avoid:** Use `app.get('/*splat', handler)` or `app.get('/{*splat}', handler)`.
**Warning signs:** TypeError in server log before first request.

### Pitfall 5: Tailwind v4 — No tailwind.config.js
**What goes wrong:** Developer creates `tailwind.config.js` (familiar from v3) and wonders why custom theme config is ignored silently.
**Why it happens:** Tailwind v4 uses CSS-first configuration. `tailwind.config.js` is not loaded at all.
**How to avoid:** Use `@theme { --color-brand: ... }` in `index.css`. No JS config file needed.

### Pitfall 6: React Router v7 Import Path
**What goes wrong:** `import { BrowserRouter } from 'react-router-dom'` throws `Module not found`.
**Why it happens:** `react-router-dom` no longer exists as a separate package in v7.
**How to avoid:** `import { BrowserRouter } from 'react-router'`. All hooks/components come from `react-router`.

### Pitfall 7: Missing `start_period` on DB Healthcheck
**What goes wrong:** `receipts-api` starts, tries to connect to DB before initdb completes, fails, exits. Docker marks the container unhealthy and does not restart it.
**Why it happens:** First-ever Docker volume initialization (initdb) can take 20-30 seconds on a Hetzner VPS. Default `start_period` is 0.
**How to avoid:** Set `start_period: 30s` on the `receipts-db` healthcheck.

### Pitfall 8: Drizzle-Kit generate vs migrate vs push
**What goes wrong:** Developer uses `drizzle-kit push` in production, which diffs the schema and may DROP columns with unrecognized data.
**How to avoid:** Only use `push` in local dev. Production workflow: `generate` (creates SQL) → review SQL → `migrate` (applies SQL). Never `push` in production.

---

## Code Examples

### DB Client Singleton

```typescript
// src/db/client.ts
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 10,                     // connection pool size
  idleTimeoutMillis: 30_000,
});

export const db = drizzle({ client: pool, schema });
// Export schema-aware db for relational queries if needed later
```

### TypeScript tsconfig.json (Backend)

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**Note:** `verbatimModuleSyntax` requires explicit `import type` for type-only imports. Set this from the start to avoid refactoring later.

### Drizzle SELECT FOR UPDATE (Approval Workflow — Phase 5)

Listed here because the pattern must be understood when building the DB schema to ensure status columns support it:

```typescript
// Source: https://github.com/drizzle-team/drizzle-orm/discussions/1337
await db.transaction(async (tx) => {
  const [item] = await tx
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.id, txId))
    .for('update');           // Drizzle syntax for SELECT FOR UPDATE

  if (!item || item.status !== 'pending_approval') {
    throw new Error('Item is no longer pending');
  }
  // ... update status, create debt
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` separate package | Everything from `react-router` | React Router v7 (Nov 2024) | Must update all imports |
| `tailwind.config.js` + postcss | `@tailwindcss/vite` plugin + `@import "tailwindcss"` in CSS | Tailwind v4 (Jan 2025) | No JS config file |
| `asyncHandler()` wrapper | Express 5 native async propagation | Express 5 (Oct 2024) | Cleaner route handlers |
| `drizzle-kit migrate --config` only | Programmatic migrator via `drizzle-orm/node-postgres/migrator` | drizzle-orm 0.28+ | Run migrations at app startup |
| `CREATE TYPE` for enums manually | `pgEnum()` in Drizzle schema | drizzle-orm 0.20+ | Type-safe status columns |
| `app.use('/uploads', express.static(...))` | Authenticated streaming endpoint | Security best practice | Prevents IDOR |
| `version: "3.9"` in docker-compose.yml | `version:` key is ignored/deprecated in Compose v2+ | Docker Compose v2 (2022) | Omit or leave — has no effect |

**Deprecated/outdated:**
- `react-router-dom`: Replaced by `react-router` in v7
- `tailwind.config.js`: Replaced by CSS `@theme` in v4
- `express.static()` for private uploads: Wrong — use authenticated stream endpoint
- `drizzle-kit push` in production: Unsafe — use generate + migrate

---

## Open Questions

1. **Uploads bind-mount directory — host permissions**
   - What we know: `/var/receipts/uploads` must exist on the Hetzner host with write permissions for the Node.js container user (UID 1000 in standard node:XX-alpine).
   - What's unclear: Is the Hetzner VPS running as root or as a non-root deploy user? This affects whether `sudo mkdir` is needed.
   - Recommendation: Add a `deploy/setup.sh` script that creates the directory with correct ownership; document in the plan.

2. **TXN reference number format — year reset**
   - What we know: Format is `TXN-YYYY-NNNN`; the `company_counters` table resets per year via the `year` column.
   - What's unclear: If a company's first transaction of a new year is number 0001, but they had 9999 transactions last year — this is by design (the ROADMAP confirms sequential per company).
   - Recommendation: The `company_counters` approach described above handles this correctly.

3. **Drizzle-kit version pinning**
   - What we know: `drizzle-kit` and `drizzle-orm` must be version-compatible. 0.45.2 + 0.31.10 is the current verified pairing.
   - What's unclear: Whether patch updates to either break compatibility.
   - Recommendation: Pin both in package.json with exact versions (`"drizzle-orm": "0.45.2"`) until Phase 1 is complete.

---

## Environment Availability

This phase runs on a Hetzner VPS with an existing Docker + Nginx deployment. The plan must include steps for operations that require the VPS, not just local development.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker + Compose v2 | Plans 1.1, 1.4, 1.5 | Expected (existing stack runs it) | ≥ 2.0 | Upgrade if not available |
| Nginx (host) | Plan 1.2 | Expected (Restaurant app uses it) | ≥ 1.18 | Install nginx package |
| certbot | Plan 1.2 | Likely present; verify with `certbot --version` | Any | `sudo snap install certbot` or `sudo apt install certbot python3-certbot-nginx` |
| PostgreSQL client tools | Plan 1.3 (permissions SQL) | Available inside `postgres:16-alpine` container | 16 | Use `docker exec receipts-db psql` |
| Node.js (dev machine) | Running migration scripts locally | Assumed | ≥ 18 | Required |

**Pre-deploy host commands (must be in plan):**
```bash
# On Hetzner VPS before first docker compose up:
sudo mkdir -p /var/receipts/uploads
sudo chown 1000:1000 /var/receipts/uploads
sudo chmod 755 /var/receipts/uploads
```

---

## Validation Architecture

nyquist_validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework

No test infrastructure exists yet (greenfield project). Phase 1 establishes foundation — a minimal test setup should be created in Wave 0.

| Property | Value |
|----------|-------|
| Framework | Vitest (backend + frontend) — works with Node.js, TypeScript, and Vite without separate config |
| Config file | `vitest.config.ts` — Wave 0 creates this |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

**Why Vitest over Jest:** Same config as Vite, no babel transform needed, ESM-native, faster cold start. Works identically for both backend (Node.js) and frontend.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NFR-03.1 | Docker stack starts with correct ports | smoke | `docker compose up -d && curl -f http://localhost:4000/health` | ❌ Wave 0 |
| NFR-03.2 | PostgreSQL uses named volume (not bind mount) | manual | `docker volume inspect receipts_db_data` | N/A |
| NFR-03.3 | Uploads use bind mount to /var/receipts/uploads | manual | `docker inspect receipts-api` | N/A |
| FR-01.3 | companyId always from JWT, never from body | unit | `npx vitest run tests/middleware/tenant.test.ts` | ❌ Wave 0 |
| FR-01.3 | forCompany() enforces companyId on all queries | unit | `npx vitest run tests/db/query-helpers.test.ts` | ❌ Wave 0 |
| FR-07.4 | NUMERIC(12,2) used for all monetary columns | unit | `npx vitest run tests/db/schema.test.ts` | ❌ Wave 0 |
| FR-11.2 | audit_logs REVOKE UPDATE/DELETE applied | manual | `psql -c "UPDATE audit_logs SET ..."` → expect error | N/A |
| FR-02.1 | JWT only accepts HS256 algorithm | unit | `npx vitest run tests/middleware/auth.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `docker compose up --build -d && curl -f http://localhost:4000/health`
- **Per wave merge:** `npx vitest run` (all unit tests)
- **Phase gate:** Full suite green + manual smoke tests documented before `/gsd:verify-work`

### Wave 0 Gaps (test infrastructure to create before implementing)

- [ ] `backend/tests/middleware/auth.test.ts` — covers FR-02.1 (JWT HS256 enforcement)
- [ ] `backend/tests/middleware/tenant.test.ts` — covers FR-01.3 (companyId from JWT)
- [ ] `backend/tests/db/schema.test.ts` — covers FR-07.4 (NUMERIC columns)
- [ ] `backend/tests/db/query-helpers.test.ts` — covers FR-01.3 (forCompany scoping)
- [ ] `backend/vitest.config.ts` — framework setup
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8` in backend

---

## Sources

### Primary (HIGH confidence)

- npm registry (2026-03-29) — all package versions verified via `npm view [package] version`
- [Drizzle ORM — Generated Columns](https://orm.drizzle.team/docs/generated-columns) — `.generatedAlwaysAs()` syntax
- [Drizzle ORM — PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) — numeric, uuid, pgEnum syntax
- [Drizzle ORM — Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) — check, index, unique syntax
- [Drizzle ORM — Views](https://orm.drizzle.team/docs/views) — pgView with raw SQL
- [Drizzle ORM — Get Started PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new) — drizzle.config.ts + Pool setup + migration commands
- [Drizzle ORM — drizzle-kit migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate) — generate/migrate/push workflow
- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5.html) — all breaking changes from v4
- [Tailwind CSS v4 official docs](https://tailwindcss.com/docs) — `@import "tailwindcss"`, `@tailwindcss/vite` plugin
- [React Router v7 — Upgrading from v6](https://reactrouter.com/upgrading/v6) — import changes, package rename
- [React Router v7 — Modes](https://reactrouter.com/start/modes) — declarative/SPA mode setup

### Secondary (MEDIUM confidence)

- [drizzle-team/drizzle-orm discussions/1539](https://github.com/drizzle-team/drizzle-orm/discussions/1539) — tenant enforcement patterns
- [mattknight.io — Docker healthchecks in distroless Node.js](https://www.mattknight.io/blog/docker-healthchecks-in-distroless-node-js) — Node.js healthcheck.js pattern
- [certbot official](https://certbot.eff.org/instructions?ws=nginx&os=snap) — `--nginx` plugin workflow
- [TanStack Query v5 quick start](https://tanstack.com/query/v5/docs/react/quick-start) — QueryClient setup

### Tertiary (LOW confidence — for general awareness)

- Various DEV.to and Medium articles on Express 5 patterns — cross-checked against official migration guide

---

## Metadata

**Confidence breakdown:**
- Standard stack (package versions): HIGH — verified directly from npm registry
- Drizzle ORM syntax: HIGH — verified against official docs (column types, views, constraints, generated columns)
- Express 5 breaking changes: HIGH — verified against official migration guide
- Tailwind v4 setup: HIGH — verified against official docs
- React Router v7 changes: HIGH — verified against official upgrade guide
- Docker healthcheck patterns: HIGH — confirmed that node:alpine lacks curl; node healthcheck.js is the correct approach
- Certbot --nginx workflow: MEDIUM — official docs confirm it works but actual command flags may vary by OS
- reference_number counter table pattern: MEDIUM — standard PostgreSQL pattern; not Drizzle-specific docs

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (stable libraries; re-verify before Phase 2 if > 30 days elapse)
