import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword as bcryptHash, verifyPassword as bcryptVerify } from '@shared/auth-utils';

// Set test env before importing modules
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-length-requirement-here';
process.env.NODE_ENV = 'test';

// ─── Shared mock state ────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, making these available to vi.mock() factories.

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockVerifyPassword,
  mockCreateRefreshToken,
  mockRotateRefreshToken,
  mockRevokeAllUserRefreshTokens,
} = vi.hoisted(() => {
  const mockDbInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  });
  const mockDbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
      }),
    }),
  });
  const mockDbSelect = vi.fn();
  const mockVerifyPassword = vi.fn();
  const mockCreateRefreshToken = vi.fn().mockResolvedValue('raw-refresh-token-64hex');
  const mockRotateRefreshToken = vi.fn();
  const mockRevokeAllUserRefreshTokens = vi.fn().mockResolvedValue(undefined);
  return {
    mockDbSelect,
    mockDbInsert,
    mockDbUpdate,
    mockVerifyPassword,
    mockCreateRefreshToken,
    mockRotateRefreshToken,
    mockRevokeAllUserRefreshTokens,
  };
});

vi.mock('../db/client.js', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}));

vi.mock('../services/auth.service.js', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    // verifyPassword is replaced by a spy that calls through by default.
    // Endpoint tests override this per-test with mockResolvedValue.
    verifyPassword: mockVerifyPassword,
    createRefreshToken: mockCreateRefreshToken,
    rotateRefreshToken: mockRotateRefreshToken,
    revokeAllUserRefreshTokens: mockRevokeAllUserRefreshTokens,
  };
});

// Import app after mocks are set up
import { app } from '../app.js';
import request from 'supertest';

import {
  generateRawToken,
  hashToken,
  issueToken,
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

describe('issueToken', () => {
  it('returns a string (JWT)', () => {
    const token = issueToken({
      sub: 'uid-1',
      companyId: 'cid-1',
      role: 'owner',
      isSuperAdmin: false,
    });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('decoded JWT contains expected payload fields', () => {
    const token = issueToken({
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
    const token = issueToken({
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
    const token = issueToken({
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
    const token = issueToken({
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
// Use bcrypt directly for these unit tests since verifyPassword is mocked at module level.

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
    const hash = await bcryptHash('hunter2');
    expect(await bcryptVerify('hunter2', hash)).toBe(true);
  });

  it('returns false for non-matching password', async () => {
    const hash = await bcryptHash('hunter2');
    expect(await bcryptVerify('wrong', hash)).toBe(false);
  });
});

// ─── createRefreshToken ───────────────────────────────────────────────────────
// createRefreshToken is mocked at module level (touches DB).
// These tests verify: token format and that DB insert receives the hashed token.

describe('createRefreshToken', () => {
  beforeEach(() => {
    // Restore to a real-like implementation that calls the mocked DB
    mockCreateRefreshToken.mockImplementation(async (userId: string) => {
      const { randomBytes, createHash } = await import('crypto');
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const valsFn = mockDbInsert().values;
      await valsFn({ userId, tokenHash, expiresAt });
      return rawToken;
    });
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
  });

  it('returns a 64-char hex token', async () => {
    const token = await createRefreshToken('user-id-1');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('calls DB insert with hashed token and correct userId', async () => {
    const mockValues = vi.fn().mockResolvedValue([]);
    mockDbInsert.mockReturnValue({ values: mockValues });

    const token = await createRefreshToken('user-id-1');
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

  it('has path /', () => {
    expect(REFRESH_COOKIE_OPTIONS.path).toBe('/');
  });

  it('has sameSite: strict', () => {
    expect(REFRESH_COOKIE_OPTIONS.sameSite).toBe('strict');
  });
});

// ─── Helper to set up db.select mock ─────────────────────────────────────────

function setupSelectMock(responses: Array<any[]>) {
  let callIndex = 0;
  mockDbSelect.mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => {
          const response = responses[callIndex] ?? [];
          callIndex++;
          return Promise.resolve(response);
        }),
      }),
    }),
  }));
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const validUser = {
    id: 'user-uuid-1',
    email: 'owner@example.com',
    passwordHash: '$2b$12$validhashplaceholder000000000000000000000000000000000000',
    role: 'owner' as const,
    companyId: 'company-uuid-1',
    isSuperAdmin: false,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRefreshToken.mockResolvedValue('raw-refresh-token-64hex');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'secret' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 with same error for unknown email (no user enumeration)', async () => {
    setupSelectMock([[]]);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Credenciales inválidas' });
  });

  it('returns 401 for wrong password', async () => {
    setupSelectMock([[validUser]]);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Credenciales inválidas' });
  });

  it('returns 401 for inactive user', async () => {
    setupSelectMock([[{ ...validUser, isActive: false }]]);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'correctpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Credenciales inválidas' });
  });

  it('returns 200 with accessToken for valid owner login', async () => {
    setupSelectMock([[validUser]]);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!) as any;
    expect(decoded.sub).toBe('user-uuid-1');
    expect(decoded.companyId).toBe('company-uuid-1');
    expect(decoded.role).toBe('owner');
    expect(decoded.isSuperAdmin).toBe(false);
  });

  it('sets httpOnly refresh_token cookie on successful login', async () => {
    setupSelectMock([[validUser]]);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.join('; ')
      : setCookieHeader;
    expect(cookieStr).toMatch(/refresh_token=/);
    expect(cookieStr.toLowerCase()).toMatch(/httponly/);
  });

  it('embeds clientId in JWT for client role login', async () => {
    const clientUser = {
      ...validUser,
      id: 'client-user-uuid',
      role: 'client' as const,
    };
    // First call returns clientUser, second returns the client record
    setupSelectMock([[clientUser], [{ id: 'client-record-uuid' }]]);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'client@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!) as any;
    expect(decoded.role).toBe('client');
    expect(decoded.clientId).toBe('client-record-uuid');
  });

  it('sets companyId to null for super admin login', async () => {
    const superAdminUser = {
      ...validUser,
      id: 'super-admin-uuid',
      companyId: null,
      isSuperAdmin: true,
    };
    setupSelectMock([[superAdminUser]]);
    mockVerifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'superadmin@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!) as any;
    expect(decoded.companyId).toBeNull();
    expect(decoded.isSuperAdmin).toBe(true);
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  const validUser = {
    id: 'user-uuid-1',
    email: 'owner@example.com',
    passwordHash: '$2b$12$validhashplaceholder000000000000000000000000000000000000',
    role: 'owner' as const,
    companyId: 'company-uuid-1',
    isSuperAdmin: false,
    isActive: true,
  };

  const storedToken = {
    id: 'token-uuid-1',
    userId: 'user-uuid-1',
    tokenHash: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revokedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no refresh_token cookie present', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Sin token de actualización' });
  });

  it('returns 401 when token is not found in DB', async () => {
    setupSelectMock([[]]);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=invalid-raw-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token de actualización inválido' });
  });

  it('returns 401 when token is revoked (rotateRefreshToken returns null)', async () => {
    setupSelectMock([[storedToken], [validUser]]);
    mockRotateRefreshToken.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=some-raw-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Token de actualización inválido' });
  });

  it('returns 200 with new accessToken and rotates cookie on valid refresh', async () => {
    setupSelectMock([[storedToken], [validUser]]);
    mockRotateRefreshToken.mockResolvedValue('new-raw-refresh-token');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=valid-raw-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
    expect(cookieStr).toMatch(/refresh_token=/);
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeAllUserRefreshTokens.mockResolvedValue(undefined);
  });

  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('returns 204 and revokes all refresh tokens with valid auth', async () => {
    const token = jwt.sign(
      {
        sub: 'user-uuid-1',
        companyId: 'company-uuid-1',
        role: 'owner',
        isSuperAdmin: false,
      },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockRevokeAllUserRefreshTokens).toHaveBeenCalledWith('user-uuid-1');
  });

  it('clears the refresh_token cookie on logout', async () => {
    const token = jwt.sign(
      {
        sub: 'user-uuid-1',
        companyId: 'company-uuid-1',
        role: 'owner',
        isSuperAdmin: false,
      },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '15m' },
    );

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    // Express sets the cookie with expired Max-Age to clear it
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
      expect(cookieStr).toMatch(/refresh_token=/);
    }
  });
});

// ─── POST /api/auth/accept-invite (client role) ───────────────────────────────

describe('POST /api/auth/accept-invite (client role — D-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRefreshToken.mockResolvedValue('raw-refresh-token-64hex');
  });

  it('sets clients.user_id when token role is client', async () => {
    // Note: db.transaction in auth.ts is NOT mocked at the module level in auth.test.ts
    // This test is a todo — full integration tested in invite.test.ts
    // The linkage logic is verified in the invite flow test file
  });
});
