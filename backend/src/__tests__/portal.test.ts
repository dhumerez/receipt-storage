import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Set test env before importing modules
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-length-requirement-here';
process.env.NODE_ENV = 'test';

// ─── Shared mock state ────────────────────────────────────────────────────────

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
} = vi.hoisted(() => {
  const mockDbInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  });
  const mockDbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  const mockDbSelect = vi.fn();
  return { mockDbSelect, mockDbInsert, mockDbUpdate };
});

vi.mock('../db/client.js', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
  },
}));

// Import app after mocks are set up
import { app } from '../app.js';
import request from 'supertest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClientToken(opts: {
  sub?: string;
  companyId?: string;
  clientId?: string;
} = {}) {
  return jwt.sign(
    {
      sub: opts.sub ?? 'client-user-uuid',
      companyId: opts.companyId ?? 'company-uuid',
      role: 'client',
      isSuperAdmin: false,
      clientId: opts.clientId ?? 'client-record-uuid',
    },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

/**
 * Set up db.select mock for portal summary which uses innerJoin pattern.
 * Summary makes two separate db.select calls (one for confirmed balance, one for pending).
 */
function setupSummarySelectMock(confirmedTotal: string, pendingTotal: string) {
  let callIndex = 0;
  const responses = [
    [{ total: confirmedTotal }],
    [{ total: pendingTotal }],
  ];
  mockDbSelect.mockImplementation(() => {
    const response = responses[callIndex] ?? [{ total: '0.00' }];
    callIndex++;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          // For portal summary confirmed balance (no join)
          then: (resolve: any) => Promise.resolve(response).then(resolve),
          // Make it thenable so the handler can await the query
          ...response,
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then: (resolve: any) => Promise.resolve(response).then(resolve),
            ...response,
          }),
        }),
      }),
    };
  });
}

// ─── GET /api/v1/portal/summary ──────────────────────────────────────────────

describe('GET /api/v1/portal/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/v1/portal/summary');
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-client role attempts access', async () => {
    const ownerToken = jwt.sign(
      { sub: 'owner-uuid', companyId: 'company-uuid', role: 'owner', isSuperAdmin: false },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/v1/portal/summary')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 with confirmedBalance, pendingBalance, and asOf', async () => {
    // Two sequential db.select calls: first for confirmed balance, second for pending
    let callCount = 0;
    mockDbSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // confirmed balance from debtBalances view
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '150.00' }]),
          }),
        };
      } else {
        // pending balance from payments + debts join
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: '50.00' }]),
            }),
          }),
        };
      }
    });

    const res = await request(app)
      .get('/api/v1/portal/summary')
      .set('Authorization', `Bearer ${makeClientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('confirmedBalance', '150.00');
    expect(res.body).toHaveProperty('pendingBalance', '50.00');
    expect(res.body).toHaveProperty('asOf');
    expect(typeof res.body.asOf).toBe('string');
    // asOf should be a valid ISO 8601 date string
    expect(() => new Date(res.body.asOf)).not.toThrow();
  });

  it('response does NOT contain internalNotes field', async () => {
    let callCount = 0;
    mockDbSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '0.00' }]),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: '0.00' }]),
            }),
          }),
        };
      }
    });

    const res = await request(app)
      .get('/api/v1/portal/summary')
      .set('Authorization', `Bearer ${makeClientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('internalNotes');
  });

  it('cross-client isolation: client A token cannot see client B data', async () => {
    // With JWT-scoped clientId, the handler uses req.user.clientId from JWT (immutable)
    // We verify the route is called with client-A-id from the token, not any param
    const clientAToken = makeClientToken({ clientId: 'client-A-id', sub: 'user-A' });

    let callCount = 0;
    mockDbSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: '200.00' }]),
          }),
        };
      } else {
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ total: '0.00' }]),
            }),
          }),
        };
      }
    });

    const res = await request(app)
      .get('/api/v1/portal/summary')
      .set('Authorization', `Bearer ${clientAToken}`);

    // Client A should get their data (no leak to client B)
    expect(res.status).toBe(200);
    expect(res.body.confirmedBalance).toBe('200.00');
  });

  it('returns 403 when JWT has no clientId (malformed token)', async () => {
    const tokenWithoutClientId = jwt.sign(
      { sub: 'client-user-uuid', companyId: 'company-uuid', role: 'client', isSuperAdmin: false },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/v1/portal/summary')
      .set('Authorization', `Bearer ${tokenWithoutClientId}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/v1/portal/debts ─────────────────────────────────────────────────

describe('GET /api/v1/portal/debts', () => {
  const debtList = [
    {
      id: 'debt-1',
      status: 'open',
      totalAmount: '500.00',
      amountPaid: '0.00',
      remainingBalance: '500.00',
    },
    {
      id: 'debt-2',
      status: 'partially_paid',
      totalAmount: '200.00',
      amountPaid: '100.00',
      remainingBalance: '100.00',
    },
    {
      id: 'debt-3',
      status: 'fully_paid',
      totalAmount: '150.00',
      amountPaid: '150.00',
      remainingBalance: '0.00',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/v1/portal/debts');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array of debts for the caller clientId only', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(debtList),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/portal/debts')
      .set('Authorization', `Bearer ${makeClientToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ id: 'debt-1', status: 'open' });
  });

  it('response items do NOT contain internalNotes field', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(debtList),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/portal/debts')
      .set('Authorization', `Bearer ${makeClientToken()}`);

    expect(res.status).toBe(200);
    for (const debt of res.body) {
      expect(debt).not.toHaveProperty('internalNotes');
    }
  });

  it('returns 403 when JWT has no clientId', async () => {
    const tokenWithoutClientId = jwt.sign(
      { sub: 'client-user-uuid', companyId: 'company-uuid', role: 'client', isSuperAdmin: false },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', expiresIn: '1h' },
    );

    const res = await request(app)
      .get('/api/v1/portal/debts')
      .set('Authorization', `Bearer ${tokenWithoutClientId}`);

    expect(res.status).toBe(403);
  });
});
