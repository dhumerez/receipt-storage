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

// Mock auth service
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
import { issueAccessToken, createRefreshToken } from '../services/auth.service.js';

const mockDb = db as any;
const mockIssueAccessToken = issueAccessToken as ReturnType<typeof vi.fn>;
const mockCreateRefreshToken = createRefreshToken as ReturnType<typeof vi.fn>;

function makeSelectChain(result: any[]) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

describe('invite flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /api/auth/accept-invite ────────────────────────────────────────────

  describe('POST /api/auth/accept-invite', () => {
    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'some-token', password: 'short', fullName: 'Test User' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when fullName is missing', async () => {
      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'some-token', password: 'validpassword123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when token not found', async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'bad-token', password: 'validpassword123', fullName: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('returns 400 when token is expired', async () => {
      const expiredToken = {
        id: 'tok-1',
        type: 'invite',
        email: 'newuser@example.com',
        companyId: 'company-abc',
        role: 'collaborator',
        invitedBy: 'owner-123',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expired
      };
      mockDb.select.mockReturnValueOnce(makeSelectChain([expiredToken]));

      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'some-token', password: 'validpassword123', fullName: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('returns 400 when token is already used', async () => {
      const usedToken = {
        id: 'tok-1',
        type: 'invite',
        email: 'newuser@example.com',
        companyId: 'company-abc',
        role: 'collaborator',
        invitedBy: 'owner-123',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() + 172800000),
      };
      mockDb.select.mockReturnValueOnce(makeSelectChain([usedToken]));

      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'some-token', password: 'validpassword123', fullName: 'Test User' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalid or expired');
    });

    it('creates user and returns 201 with accessToken for valid token', async () => {
      const validToken = {
        id: 'tok-1',
        type: 'invite',
        email: 'newuser@example.com',
        companyId: 'company-abc',
        role: 'collaborator',
        invitedBy: 'owner-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 172800000),
      };
      const newUser = {
        id: 'new-user-id',
        role: 'collaborator',
        companyId: 'company-abc',
        isSuperAdmin: false,
      };

      mockDb.select.mockReturnValueOnce(makeSelectChain([validToken]));

      // Mock transaction: calls callback with tx that has update + insert
      mockDb.transaction.mockImplementation(async (fn: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([newUser]),
            }),
          }),
        };
        await fn(tx);
      });

      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'valid-token', password: 'validpassword123', fullName: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBe('mock.access.token');
    });

    it('sets refresh cookie after successful invite acceptance', async () => {
      const validToken = {
        id: 'tok-1',
        type: 'invite',
        email: 'newuser@example.com',
        companyId: 'company-abc',
        role: 'owner',
        invitedBy: 'owner-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 172800000),
      };
      const newUser = {
        id: 'new-user-id',
        role: 'owner',
        companyId: 'company-abc',
        isSuperAdmin: false,
      };

      mockDb.select.mockReturnValueOnce(makeSelectChain([validToken]));
      mockDb.transaction.mockImplementation(async (fn: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([newUser]),
            }),
          }),
        };
        await fn(tx);
      });

      const res = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'valid-token', password: 'validpassword123', fullName: 'New User' });

      expect(res.status).toBe(201);
      expect(mockCreateRefreshToken).toHaveBeenCalledWith('new-user-id');
      // Cookie should be set — check Set-Cookie header exists
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('calls issueAccessToken with correct payload', async () => {
      const validToken = {
        id: 'tok-1',
        type: 'invite',
        email: 'newuser@example.com',
        companyId: 'company-abc',
        role: 'viewer',
        invitedBy: 'owner-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 172800000),
      };
      const newUser = {
        id: 'new-user-id',
        role: 'viewer',
        companyId: 'company-abc',
        isSuperAdmin: false,
      };

      mockDb.select.mockReturnValueOnce(makeSelectChain([validToken]));
      mockDb.transaction.mockImplementation(async (fn: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([newUser]),
            }),
          }),
        };
        await fn(tx);
      });

      await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: 'valid-token', password: 'validpassword123', fullName: 'New User' });

      expect(mockIssueAccessToken).toHaveBeenCalledWith({
        sub: 'new-user-id',
        companyId: 'company-abc',
        role: 'viewer',
        isSuperAdmin: false,
      });
    });
  });
});
