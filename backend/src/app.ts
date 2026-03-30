import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import healthRouter from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { authenticate } from './middleware/auth.js';
import { requireSuperAdmin } from './middleware/rbac.js';

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

// Protected routes added in later phases:
// app.use('/api/v1', authenticate, requireTenant, apiRouter);

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
