import { eq, and, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateRawToken, hashToken, issueAccessToken } from '../shared/auth-utils.js';
import { db } from '../db/client.js';
import { refreshTokens } from '../db/schema.js';
import type { JWTPayload } from '../middleware/auth.js';

// ─── Token Generation ─────────────────────────────────────────────────────────
// Re-export for use in routes
export { generateRawToken, hashToken };

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function issueToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return issueAccessToken(payload as Record<string, unknown>, process.env.JWT_SECRET!);
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
  if (updated.length === 0) return null;
  return createRefreshToken(userId);
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

// ─── Password ─────────────────────────────────────────────────────────────────

export { hashPassword, verifyPassword };

// ─── Cookie Options Constant ──────────────────────────────────────────────────

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.CORS_ORIGIN?.startsWith('https') ?? process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: REFRESH_TOKEN_TTL_MS,
};
