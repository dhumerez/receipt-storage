import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

// Mock the database client
vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock auth service (avoid real bcrypt/JWT in unit tests)
vi.mock('../services/auth.service.js', () => ({
  generateRawToken: vi.fn(() => 'rawtoken123'),
  hashToken: vi.fn((t: string) => `hash_${t}`),
  hashPassword: vi.fn(async (p: string) => `hashed_${p}`),
  revokeAllUserRefreshTokens: vi.fn(async () => undefined),
  issueAccessToken: vi.fn(() => 'mock.access.token'),
  createRefreshToken: vi.fn(async () => 'mock_refresh_raw'),
  verifyPassword: vi.fn(async () => true),
  rotateRefreshToken: vi.fn(async () => 'mock_refresh_raw'),
  REFRESH_COOKIE_OPTIONS: {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 604800000,
  },
}));

// Mock email service
vi.mock('../services/email.service.js', () => ({
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendInviteEmail: vi.fn(async () => undefined),
}));

import { db } from '../db/client.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { generateRawToken, hashToken, revokeAllUserRefreshTokens } from '../services/auth.service.js';

const mockDb = db as any;
const mockSendPasswordResetEmail = sendPasswordResetEmail as ReturnType<typeof vi.fn>;
const mockGenerateRawToken = generateRawToken as ReturnType<typeof vi.fn>;
const mockHashToken = hashToken as ReturnType<typeof vi.fn>;
const mockRevokeAllUserRefreshTokens = revokeAllUserRefreshTokens as ReturnType<typeof vi.fn>;

function makeSelectChain(result: any[]) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeInsertChain() {
  const chain: any = {
    values: vi.fn().mockResolvedValue([]),
  };
  return chain;
}

describe('password reset flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /api/auth/forgot-password ──────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('returns 400 on invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 200 even when email not found (prevents user enumeration)', async () => {
      // No user found
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'notfound@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If that email');
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('returns 200 for existing user and inserts a password_reset token row', async () => {
      const user = { id: 'user-123', email: 'user@example.com' };
      mockDb.select.mockReturnValueOnce(makeSelectChain([user]));
      mockDb.insert.mockReturnValueOnce(makeInsertChain());

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If that email');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('calls sendPasswordResetEmail for existing user', async () => {
      const user = { id: 'user-123', email: 'user@example.com' };
      mockDb.select.mockReturnValueOnce(makeSelectChain([user]));
      mockDb.insert.mockReturnValueOnce(makeInsertChain());

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@example.com' });

      // Fire-and-forget — allow event loop to resolve
      await new Promise((r) => setTimeout(r, 50));
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
        to: user.email,
        rawToken: 'rawtoken123',
      });
    });
  });

  // ── POST /api/auth/reset-password ───────────────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token', newPassword: 'short' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when token not found', async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('returns 400 when token is expired', async () => {
      const expiredToken = {
        id: 'tok-1',
        tokenHash: 'hash_invalid-token',
        type: 'password_reset',
        email: 'user@example.com',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      mockDb.select.mockReturnValueOnce(makeSelectChain([expiredToken]));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('returns 400 when token is already used', async () => {
      const usedToken = {
        id: 'tok-1',
        tokenHash: 'hash_some-token',
        type: 'password_reset',
        email: 'user@example.com',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() + 3600000),
      };
      mockDb.select.mockReturnValueOnce(makeSelectChain([usedToken]));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'some-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('resets password and returns 200 for valid token', async () => {
      const validToken = {
        id: 'tok-1',
        tokenHash: 'hash_good-token',
        type: 'password_reset',
        email: 'user@example.com',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      };
      const user = { id: 'user-123' };

      mockDb.select
        .mockReturnValueOnce(makeSelectChain([validToken])) // token lookup
        .mockReturnValueOnce(makeSelectChain([user]));       // user lookup

      // Mock transaction
      mockDb.transaction.mockImplementation(async (fn: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        await fn(tx);
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'good-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successful');
    });

    it('revokes all refresh tokens after successful reset', async () => {
      const validToken = {
        id: 'tok-1',
        tokenHash: 'hash_good-token',
        type: 'password_reset',
        email: 'user@example.com',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      };
      const user = { id: 'user-abc' };

      mockDb.select
        .mockReturnValueOnce(makeSelectChain([validToken]))
        .mockReturnValueOnce(makeSelectChain([user]));

      mockDb.transaction.mockImplementation(async (fn: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        await fn(tx);
      });

      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'good-token', newPassword: 'newpassword123' });

      expect(mockRevokeAllUserRefreshTokens).toHaveBeenCalledWith('user-abc');
    });
  });
});
