import { Router } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import cookieParser from 'cookie-parser';
import { db } from '../db/client.js';
import { users, clients, refreshTokens, tokens } from '../db/schema.js';
import {
  issueAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  verifyPassword,
  hashToken,
  generateRawToken,
  hashPassword,
  REFRESH_COOKIE_OPTIONS,
} from '../services/auth.service.js';
import { authenticate } from '../middleware/auth.js';
import type { JWTPayload } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { AUTH } from '../constants/strings/auth.js';

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
    res.status(400).json({ error: AUTH.validationError, details: parsed.error.flatten() });
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
    res.status(401).json({ error: AUTH.invalidCredentials });
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
    res.status(401).json({ error: AUTH.noRefreshToken });
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
    res.status(401).json({ error: AUTH.invalidRefreshToken });
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
    res.status(401).json({ error: AUTH.invalidRefreshToken });
    return;
  }

  const newRawToken = await rotateRefreshToken(tokenHash, user.id);
  if (!newRawToken) {
    res.clearCookie('refresh_token', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
    res.status(401).json({ error: AUTH.invalidRefreshToken });
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

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// FR-02.8: Always returns 200 — never reveals if email exists (prevents user enumeration)

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

authRouter.post('/forgot-password', async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: AUTH.validationError, details: parsed.error.flatten() });
    return;
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  // ALWAYS return 200 — never reveal if email exists (prevents user enumeration)
  if (user) {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(tokens).values({
      tokenHash,
      type: 'password_reset',
      email: user.email,
      expiresAt,
    });

    // Fire-and-forget — do not await (avoids timing leak on email send latency)
    sendPasswordResetEmail({ to: user.email, rawToken }).catch(console.error);
  }

  res.json({ message: AUTH.resetLinkSent });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// FR-02.8: Validate token, update password, revoke all refresh tokens

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.post('/reset-password', async (req, res) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: AUTH.validationError, details: parsed.error.flatten() });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(tokens)
    .where(
      and(
        eq(tokens.tokenHash, tokenHash),
        eq(tokens.type, 'password_reset'),
      ),
    )
    .limit(1);

  const now = new Date();
  if (!tokenRow || tokenRow.usedAt !== null || tokenRow.expiresAt < now) {
    res.status(400).json({ error: AUTH.tokenInvalidOrExpired });
    return;
  }

  // Look up user by email stored in token
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, tokenRow.email))
    .limit(1);

  if (!user) {
    res.status(400).json({ error: AUTH.tokenInvalidOrExpired });
    return;
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);

  // Atomic update: mark token used + update password
  await db.transaction(async (tx) => {
    await tx
      .update(tokens)
      .set({ usedAt: now })
      .where(eq(tokens.id, tokenRow.id));

    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: now })
      .where(eq(users.id, user.id));
  });

  // Revoke all refresh tokens — account may have been compromised
  await revokeAllUserRefreshTokens(user.id);

  res.json({ message: AUTH.passwordResetSuccessful });
});

// ── POST /api/auth/accept-invite ──────────────────────────────────────────────
// FR-02.7: Validate invite token, create user, mark token used, auto-login

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
});

authRouter.post('/accept-invite', async (req, res) => {
  const parsed = AcceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: AUTH.validationError, details: parsed.error.flatten() });
    return;
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(tokens)
    .where(
      and(
        eq(tokens.tokenHash, tokenHash),
        eq(tokens.type, 'invite'),
      ),
    )
    .limit(1);

  const now = new Date();
  if (!tokenRow || tokenRow.usedAt !== null || tokenRow.expiresAt < now) {
    res.status(400).json({ error: AUTH.tokenInvalidOrExpired });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Create user + mark token used in one transaction
  let newUser: { id: string; role: string; companyId: string | null; isSuperAdmin: boolean } | undefined;
  await db.transaction(async (tx) => {
    await tx
      .update(tokens)
      .set({ usedAt: now })
      .where(eq(tokens.id, tokenRow.id));

    const [inserted] = await tx
      .insert(users)
      .values({
        companyId: tokenRow.companyId,
        email: tokenRow.email.toLowerCase(),
        passwordHash,
        fullName: parsed.data.fullName,
        role: tokenRow.role!,
        isSuperAdmin: false,
        invitedBy: tokenRow.invitedBy,
      })
      .returning({
        id: users.id,
        role: users.role,
        companyId: users.companyId,
        isSuperAdmin: users.isSuperAdmin,
      });
    newUser = inserted;

    // D-08: Link portal user back to client record (Phase 3)
    // When a client accepts their invite, update clients.user_id to link the new account
    if (tokenRow.role === 'client' && tokenRow.clientId) {
      await tx
        .update(clients)
        .set({ userId: newUser.id, updatedAt: now })
        .where(eq(clients.id, tokenRow.clientId));
    }
  });

  if (!newUser) {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  // Log user in immediately (FR-02.7: accept-invite → auto-login)
  // D-08: embed clientId in JWT for client role (same pattern as login handler)
  let clientIdForJwt: string | undefined;
  if (newUser.role === 'client' && tokenRow.clientId) {
    clientIdForJwt = tokenRow.clientId;
  }

  const accessToken = issueAccessToken({
    sub: newUser.id,
    companyId: newUser.companyId,
    role: newUser.role as JWTPayload['role'],
    isSuperAdmin: newUser.isSuperAdmin,
    ...(clientIdForJwt ? { clientId: clientIdForJwt } : {}),
  });
  const rawRefreshToken = await createRefreshToken(newUser.id);
  res.cookie('refresh_token', rawRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(201).json({ accessToken });
});
