import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Set test env before importing modules
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-length-requirement-here';
process.env.NODE_ENV = 'test';

// ─── Shared mock state ────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, making these available to vi.mock() factories.

const {
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbTransaction,
  mockSendInviteEmail,
  mockGenerateRawToken,
  mockHashToken,
} = vi.hoisted(() => {
  const mockDbInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    }),
  });
  const mockDbUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  const mockDbSelect = vi.fn();
  const mockDbTransaction = vi.fn();
  const mockSendInviteEmail = vi.fn().mockResolvedValue(undefined);
  const mockGenerateRawToken = vi.fn().mockReturnValue('raw-token-hex');
  const mockHashToken = vi.fn().mockReturnValue('hashed-token');
  return {
    mockDbSelect,
    mockDbInsert,
    mockDbUpdate,
    mockDbTransaction,
    mockSendInviteEmail,
    mockGenerateRawToken,
    mockHashToken,
  };
});

vi.mock('../db/client.js', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    transaction: mockDbTransaction,
  },
}));

vi.mock('../services/email.service.js', () => ({
  sendInviteEmail: mockSendInviteEmail,
}));

vi.mock('../services/auth.service.js', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    generateRawToken: mockGenerateRawToken,
    hashToken: mockHashToken,
  };
});

// Import app after mocks are set up
import { app } from '../app.js';
import request from 'supertest';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOwnerToken(sub = 'owner-uuid', companyId = 'company-uuid') {
  return jwt.sign(
    { sub, companyId, role: 'owner', isSuperAdmin: false },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

/**
 * Set up db.select mock to return sequential responses per call.
 */
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
        orderBy: vi.fn().mockImplementation(() => {
          const response = responses[callIndex] ?? [];
          callIndex++;
          return Promise.resolve(response);
        }),
      }),
    }),
  }));
}

// ─── POST /api/v1/clients ─────────────────────────────────────────────────────

describe('POST /api/v1/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).post('/api/v1/clients').send({
      fullName: 'Test Client',
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 with created client on valid body', async () => {
    const createdClient = {
      id: 'client-uuid-1',
      companyId: 'company-uuid',
      fullName: 'Test Client',
      email: 'client@example.com',
      phone: null,
      address: null,
      referencesText: null,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdClient]),
      }),
    });

    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ fullName: 'Test Client', email: 'client@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'client-uuid-1',
      fullName: 'Test Client',
      email: 'client@example.com',
    });
  });

  it('returns 400 when fullName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'client@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /api/v1/clients ──────────────────────────────────────────────────────

describe('GET /api/v1/clients', () => {
  const clientList = [
    {
      id: 'client-1',
      fullName: 'Alice Client',
      email: 'alice@example.com',
      phone: '555-1234',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      outstandingBalance: '100.00',
    },
    {
      id: 'client-2',
      fullName: 'Bob Client',
      email: null,
      phone: null,
      isActive: true,
      createdAt: new Date('2026-01-02'),
      outstandingBalance: '0.00',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/v1/clients');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array of clients scoped to company', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(clientList),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: 'client-1', fullName: 'Alice Client' });
  });

  it('returns 200 with filtered results when search query is provided', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([clientList[0]]),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/clients?search=Alice')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── PATCH /api/v1/clients/:id ────────────────────────────────────────────────

describe('PATCH /api/v1/clients/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .patch('/api/v1/clients/client-uuid-1')
      .send({ fullName: 'Updated Name' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with updated client on success', async () => {
    const existingClient = { id: 'client-uuid-1' };
    const updatedClient = {
      id: 'client-uuid-1',
      companyId: 'company-uuid',
      fullName: 'Updated Name',
      email: 'client@example.com',
      phone: null,
      address: null,
      referencesText: null,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };

    setupSelectMock([[existingClient]]);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedClient]),
        }),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/clients/client-uuid-1')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'client-uuid-1', fullName: 'Updated Name' });
  });

  it('returns 404 when client not found in company', async () => {
    setupSelectMock([[]]); // empty = client not in this company

    const res = await request(app)
      .patch('/api/v1/clients/other-company-client')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Client not found' });
  });
});

// ─── PATCH /api/v1/clients/:id/deactivate ────────────────────────────────────

describe('PATCH /api/v1/clients/:id/deactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .patch('/api/v1/clients/client-uuid-1/deactivate');
    expect(res.status).toBe(401);
  });

  it('returns 204 on successful deactivation', async () => {
    const existingClient = { id: 'client-uuid-1' };
    setupSelectMock([[existingClient]]);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/clients/client-uuid-1/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when client not found', async () => {
    setupSelectMock([[]]);

    const res = await request(app)
      .patch('/api/v1/clients/nonexistent-client/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/v1/clients/:id/invite ─────────────────────────────────────────

describe('POST /api/v1/clients/:id/invite', () => {
  const clientWithEmail = {
    id: 'client-uuid-1',
    email: 'client@example.com',
    fullName: 'Test Client',
    userId: null,
  };

  const clientWithoutEmail = {
    id: 'client-uuid-2',
    email: null,
    fullName: 'No Email Client',
    userId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .post('/api/v1/clients/client-uuid-1/invite');
    expect(res.status).toBe(401);
  });

  it('returns 201 and sends invite when client has email', async () => {
    // client lookup, company lookup, inviter lookup
    setupSelectMock([[clientWithEmail], [{ name: 'Acme Corp' }], [{ fullName: 'Owner Name' }]]);

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    });

    const res = await request(app)
      .post('/api/v1/clients/client-uuid-1/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Invite sent' });
  });

  it('returns 400 when client has no email address', async () => {
    setupSelectMock([[clientWithoutEmail]]);

    const res = await request(app)
      .post('/api/v1/clients/client-uuid-2/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when client not found', async () => {
    setupSelectMock([[]]);

    const res = await request(app)
      .post('/api/v1/clients/nonexistent-client/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(404);
  });
});
