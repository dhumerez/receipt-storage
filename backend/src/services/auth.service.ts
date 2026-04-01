import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { refreshTokens } from '../db/schema.js';
import type { JWTPayload } from '../middleware/auth.js';

// ─── Token Generation ─────────────────────────────────────────────────────────

export function generateRawToken(): string {
  return randomBytes(32).toString('hex'); // 64 hex chars, CSPRNG
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function issueAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createRefreshToken(userId: string): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  return rawToken;
}

export async function rotateRefreshToken(
  oldTokenHash: string,
  userId: string,
): Promise<string | null> {
  // Revoke old token
  const updated = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenHash, oldTokenHash),
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .returning();
  if (updated.length === 0) return null; // Already revoked or not found
  return createRefreshToken(userId);
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

// ─── Password ─────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12; // 2026 hardware baseline — ~2-3 hashes/sec

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash); // timing-safe comparison built in
}

// ─── Cookie Options Constant ──────────────────────────────────────────────────
// Exported so logout handler uses identical options (path must match exactly)

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.CORS_ORIGIN?.startsWith('https') ?? process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth/refresh',
  maxAge: REFRESH_TOKEN_TTL_MS,
};
