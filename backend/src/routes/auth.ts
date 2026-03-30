import { Router } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { db } from '../db/client.js';
import { users, clients, refreshTokens } from '../db/schema.js';
import {
  issueAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  verifyPassword,
  hashToken,
  REFRESH_COOKIE_OPTIONS,
} from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

// Apply cookie-parser only on auth routes (refresh needs it)
authRouter.use(cookieParser());

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
// FR-02.1: Login with email + password, returns JWT + refresh cookie
// Security: constant-time path to avoid timing oracle on user existence

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  // Look up user — always lowercase email for case-insensitive comparison
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Always run bcrypt compare (even on dummy hash) to avoid timing oracle
  // Dummy hash: a valid bcrypt hash that will never match any real password
  const DUMMY_HASH =
    '$2b$12$invalidhashpadding0000000000000000000000000000000000000000000';
  const passwordHash = user?.passwordHash ?? DUMMY_HASH;
  const passwordValid = await verifyPassword(password, passwordHash);

  if (!user || !user.isActive || !passwordValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // For client role: embed clientId in JWT (FR-02.5)
  let clientId: string | undefined;
  if (user.role === 'client') {
    const [clientRecord] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .limit(1);
    clientId = clientRecord?.id;
  }

  const accessToken = issueAccessToken({
    sub: user.id,
    companyId: user.companyId ?? null, // null for super admin
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    ...(clientId ? { clientId } : {}),
  });

  const rawRefreshToken = await createRefreshToken(user.id);
  res.cookie('refresh_token', rawRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({ accessToken });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
// Rotates the refresh token on every call (single-use tokens)

authRouter.post('/refresh', async (req, res) => {
  const rawToken: string | undefined = req.cookies?.refresh_token;
  if (!rawToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  // Look up token by its hash
  const tokenHash = hashToken(rawToken);
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!stored || stored.expiresAt < new Date()) {
    // Clear the stale cookie
    res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Fetch user to build JWT payload
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1);

  if (!user || !user.isActive) {
    res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  const newRawToken = await rotateRefreshToken(tokenHash, user.id);
  if (!newRawToken) {
    res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    res.status(401).json({ error: 'Invalid refresh token' });
    return;
  }

  // Re-embed clientId for client role (FR-02.5)
  let clientId: string | undefined;
  if (user.role === 'client') {
    const [clientRecord] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .limit(1);
    clientId = clientRecord?.id;
  }

  const accessToken = issueAccessToken({
    sub: user.id,
    companyId: user.companyId ?? null,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    ...(clientId ? { clientId } : {}),
  });

  res.cookie('refresh_token', newRawToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Revokes ALL refresh tokens for user (force re-login on all devices)
// Requires valid Bearer token; clears cookie with same path as set

authRouter.post('/logout', authenticate, async (req, res) => {
  await revokeAllUserRefreshTokens(req.user!.sub);
  // Must use identical options object (path must match exactly for browser to clear)
  res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
  res.status(204).send();
});
