import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import healthRouter from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { usersRouter } from './routes/users.js';
import { clientsRouter } from './routes/clients.js';
import { productsRouter } from './routes/products.js';
import { transactionsRouter } from './routes/transactions.js';
import { notificationsRouter } from './routes/notifications.js';
import { filesRouter } from './routes/files.js';
import { portalRouter } from './routes/portal.js';
import { authenticate } from './middleware/auth.js';
import { requireSuperAdmin, requireRole } from './middleware/rbac.js';
import { requireTenant } from './middleware/tenant.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS — origin from env; never wildcard in production
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Body parsers (Express 5: urlencoded default is extended=false, be explicit)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Trust proxy — required when behind Nginx (for req.ip, req.secure, cookies)
app.set('trust proxy', 1);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/admin', authenticate, requireSuperAdmin, adminRouter);
app.use('/api/v1/users', authenticate, requireTenant, requireRole('owner'), usersRouter);
app.use('/api/v1/clients', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), clientsRouter);
app.use(
  '/api/v1/products',
  authenticate,
  requireTenant,
  requireRole('owner'),
  productsRouter,
);
app.use('/api/v1/transactions', authenticate, requireTenant, requireRole('owner', 'collaborator', 'viewer'), transactionsRouter);
app.use('/api/v1/notifications', authenticate, requireTenant, notificationsRouter);
app.use('/api/v1/files', authenticate, filesRouter);
app.use('/api/v1/portal', authenticate, requireRole('client'), portalRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express 5: async errors propagate here automatically — no asyncHandler needed.
// All 4 parameters required for Express to recognize this as an error handler.

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
