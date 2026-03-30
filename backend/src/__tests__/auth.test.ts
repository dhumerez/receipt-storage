import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Set test env before importing modules
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-length-requirement-here';

// Mock db client before importing auth service
vi.mock('../db/client.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
        }),
      }),
    }),
  },
}));

import {
  generateRawToken,
  hashToken,
  issueAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  hashPassword,
  verifyPassword,
  REFRESH_COOKIE_OPTIONS,
} from '../services/auth.service.js';

// ─── generateRawToken ─────────────────────────────────────────────────────────

describe('generateRawToken', () => {
  it('returns a string of exactly 64 hex characters', () => {
    const token = generateRawToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns unique tokens on each call', () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
  });
});

// ─── hashToken ────────────────────────────────────────────────────────────────

describe('hashToken', () => {
  it('returns a 64-char lowercase hex SHA-256 hash', () => {
    const hash = hashToken('abc');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input yields same output', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('differs for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('xyz'));
  });

  it('produces known SHA-256 of empty string', () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(hashToken('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

// ─── issueAccessToken ─────────────────────────────────────────────────────────

describe('issueAccessToken', () => {
  it('returns a string (JWT)', () => {
    const token = issueAccessToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'owner',
      isSuperAdmin: false,
    });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('decoded JWT contains expected payload fields', () => {
    const token = issueAccessToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'owner',
      isSuperAdmin: false,
    });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    expect(decoded.sub).toBe('uid-1');
    expect(decoded.companyId).toBe('cid-1');
    expect(decoded.role).toBe('owner');
    expect(decoded.isSuperAdmin).toBe(false);
  });

  it('uses HS256 algorithm', () => {
    const token = issueAccessToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'owner',
      isSuperAdmin: false,
    });
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString(),
    );
    expect(header.alg).toBe('HS256');
  });

  it('embeds clientId when provided', () => {
    const token = issueAccessToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'client',
      isSuperAdmin: false,
      clientId: 'clid-1',
    });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    expect(decoded.clientId).toBe('clid-1');
  });

  it('expires in approximately 15 minutes', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = issueAccessToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'owner',
      isSuperAdmin: false,
    });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const ttl = decoded.exp - before;
    // Allow 1 second tolerance
    expect(ttl).toBeGreaterThanOrEqual(14 * 60 - 1);
    expect(ttl).toBeLessThanOrEqual(15 * 60 + 1);
  });
});

// ─── hashPassword / verifyPassword ───────────────────────────────────────────

describe('hashPassword', () => {
  it('returns a bcrypt hash string starting with $2a$ or $2b$', async () => {
    const hash = await hashPassword('hunter2');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces different hashes for same password (salted)', async () => {
    const h1 = await hashPassword('hunter2');
    const h2 = await hashPassword('hunter2');
    expect(h1).not.toBe(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('hunter2', hash)).toBe(true);
  });

  it('returns false for non-matching password', async () => {
    const hash = await hashPassword('hunter2');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

// ─── createRefreshToken ───────────────────────────────────────────────────────

describe('createRefreshToken', () => {
  it('returns a 64-char hex token', async () => {
    const token = await createRefreshToken('user-id-1');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('inserts a row with hashed token into refresh_tokens table', async () => {
    const { db } = await import('../db/client.js');
    const mockValues = vi.fn().mockResolvedValue([]);
    (db.insert as any).mockReturnValue({ values: mockValues });

    const token = await createRefreshToken('user-id-1');
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id-1',
        tokenHash: hashToken(token),
      }),
    );
  });
});

// ─── REFRESH_COOKIE_OPTIONS ───────────────────────────────────────────────────

describe('REFRESH_COOKIE_OPTIONS', () => {
  it('has httpOnly: true', () => {
    expect(REFRESH_COOKIE_OPTIONS.httpOnly).toBe(true);
  });

  it('has path /api/auth/refresh', () => {
    expect(REFRESH_COOKIE_OPTIONS.path).toBe('/api/auth/refresh');
  });

  it('has sameSite: strict', () => {
    expect(REFRESH_COOKIE_OPTIONS.sameSite).toBe('strict');
  });
});
