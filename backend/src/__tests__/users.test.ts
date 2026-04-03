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
  const mockDbTransaction = vi.fn();
  const mockSendInviteEmail = vi.fn().mockResolvedValue(undefined);
  return {
    mockDbSelect,
    mockDbInsert,
    mockDbUpdate,
    mockDbTransaction,
    mockSendInviteEmail,
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

function makeCollaboratorToken(sub = 'collab-uuid', companyId = 'company-uuid') {
  return jwt.sign(
    { sub, companyId, role: 'collaborator', isSuperAdmin: false },
    process.env.JWT_SECRET!,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

/**
 * Set up db.select mock to return sequential responses per call.
 * Each element in `responses` is the array returned for that call.
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

// ─── GET /api/v1/users ────────────────────────────────────────────────────────

describe('GET /api/v1/users', () => {
  const ownerCallerRow = {
    role: 'owner',
    isActive: true,
    companyId: 'company-uuid',
  };

  const teamUsers = [
    {
      id: 'user-1',
      email: 'alice@example.com',
      fullName: 'Alice',
      role: 'owner',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'user-2',
      email: 'bob@example.com',
      fullName: 'Bob',
      role: 'collaborator',
      isActive: true,
      createdAt: new Date('2026-01-02'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner role', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeCollaboratorToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with array of users scoped to caller company', async () => {
    setupSelectMock([teamUsers]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: 'user-1',
      email: 'alice@example.com',
      fullName: 'Alice',
      role: 'owner',
      isActive: true,
    });
  });

  it('does NOT return passwordHash field', async () => {
    setupSelectMock([teamUsers]);

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    for (const user of res.body) {
      expect(user).not.toHaveProperty('passwordHash');
    }
  });
});

// ─── POST /api/v1/users/invite ────────────────────────────────────────────────

describe('POST /api/v1/users/invite', () => {
  const ownerCallerRow = {
    role: 'owner',
    isActive: true,
    companyId: 'company-uuid',
  };

  const companyRow = { name: 'Acme Corp' };
  const callerRow = { fullName: 'Alice Owner' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendInviteEmail.mockResolvedValue(undefined);
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).post('/api/v1/users/invite').send({
      email: 'newmember@example.com',
      role: 'collaborator',
      fullName: 'New Member',
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner role', async () => {
    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeCollaboratorToken()}`)
      .send({ email: 'newmember@example.com', role: 'collaborator', fullName: 'New Member' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid role (client not allowed)', async () => {
    // NFR-01.5: re-validate caller from DB
    setupSelectMock([[ownerCallerRow]]);

    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);
    // missing body
    expect(res.status).toBe(400);
  });

  it('returns 400 when role is "client"', async () => {
    // NFR-01.5: re-validate caller from DB
    setupSelectMock([[ownerCallerRow]]);

    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'client@example.com', role: 'client', fullName: 'Client Name' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when caller is no longer owner in DB (NFR-01.5)', async () => {
    // Simulate caller was demoted since last login
    setupSelectMock([[{ role: 'collaborator', isActive: true, companyId: 'company-uuid' }]]);

    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'newmember@example.com', role: 'collaborator', fullName: 'New Member' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Permisos insuficientes' });
  });

  it('returns 201 and inserts token row on valid invite', async () => {
    // NFR-01.5 check, company lookup, caller name lookup
    setupSelectMock([[ownerCallerRow], [companyRow], [callerRow]]);

    const mockValues = vi.fn().mockResolvedValue([]);
    mockDbInsert.mockReturnValue({ values: mockValues });

    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'newmember@example.com', role: 'collaborator', fullName: 'New Member' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Invitación enviada' });

    // Verify token was inserted with correct fields
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invite',
        email: 'newmember@example.com',
        companyId: 'company-uuid',
        invitedBy: 'owner-uuid',
        role: 'collaborator',
      }),
    );
  });

  it('fires sendInviteEmail with rawToken on valid invite', async () => {
    setupSelectMock([[ownerCallerRow], [companyRow], [callerRow]]);
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

    await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'newmember@example.com', role: 'collaborator', fullName: 'New Member' });

    // Wait a tick for fire-and-forget
    await new Promise((r) => setTimeout(r, 10));

    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newmember@example.com',
        role: 'collaborator',
        invitedByName: 'Alice Owner',
        companyName: 'Acme Corp',
        rawToken: expect.any(String),
      }),
    );
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/users/invite')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ email: 'invalid-email' });

    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/v1/users/:id/role ─────────────────────────────────────────────

describe('PATCH /api/v1/users/:id/role', () => {
  const ownerCallerRow = {
    role: 'owner',
    isActive: true,
    companyId: 'company-uuid',
  };

  const updatedUserRow = {
    id: 'target-uuid',
    email: 'target@example.com',
    role: 'viewer',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .patch('/api/v1/users/target-uuid/role')
      .send({ role: 'viewer' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner role', async () => {
    const res = await request(app)
      .patch('/api/v1/users/target-uuid/role')
      .set('Authorization', `Bearer ${makeCollaboratorToken()}`)
      .send({ role: 'viewer' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when changing own role', async () => {
    const res = await request(app)
      .patch('/api/v1/users/owner-uuid/role')
      .set('Authorization', `Bearer ${makeOwnerToken('owner-uuid')}`);
    // self-target — response 400 before body validation in our impl
    expect([400, 400]).toContain(res.status);
  });

  it('returns 403 when caller is no longer owner in DB (NFR-01.5)', async () => {
    setupSelectMock([[{ role: 'collaborator', isActive: true, companyId: 'company-uuid' }]]);

    const res = await request(app)
      .patch('/api/v1/users/target-uuid/role')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid role value in body', async () => {
    setupSelectMock([[ownerCallerRow]]);

    const res = await request(app)
      .patch('/api/v1/users/target-uuid/role')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ role: 'superuser' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when target user is in a different company', async () => {
    // NFR-01.5 passes, but DB update returns empty (cross-company)
    setupSelectMock([[ownerCallerRow]]);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]), // no rows = not found
        }),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/users/other-company-user-uuid/role')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Usuario no encontrado' });
  });

  it('returns 200 with updated user on success', async () => {
    setupSelectMock([[ownerCallerRow]]);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedUserRow]),
        }),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/users/target-uuid/role')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ role: 'viewer' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'target-uuid',
      email: 'target@example.com',
      role: 'viewer',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });
});

// ─── PATCH /api/v1/users/:id/deactivate ──────────────────────────────────────

describe('PATCH /api/v1/users/:id/deactivate', () => {
  const ownerCallerRow = {
    role: 'owner',
    isActive: true,
    companyId: 'company-uuid',
  };

  const targetUserRow = { id: 'target-uuid' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).patch('/api/v1/users/target-uuid/deactivate');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-owner role', async () => {
    const res = await request(app)
      .patch('/api/v1/users/target-uuid/deactivate')
      .set('Authorization', `Bearer ${makeCollaboratorToken()}`);
    expect(res.status).toBe(403);
  });

  it('returns 400 when deactivating self', async () => {
    const res = await request(app)
      .patch('/api/v1/users/owner-uuid/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken('owner-uuid')}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No puedes desactivarte a ti mismo' });
  });

  it('returns 403 when caller is no longer owner in DB (NFR-01.5)', async () => {
    setupSelectMock([[{ role: 'collaborator', isActive: true, companyId: 'company-uuid' }]]);

    const res = await request(app)
      .patch('/api/v1/users/target-uuid/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 when target user is in a different company', async () => {
    // NFR-01.5 select passes, then target lookup returns nothing
    setupSelectMock([[ownerCallerRow], []]);

    const res = await request(app)
      .patch('/api/v1/users/other-company-user/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Usuario no encontrado' });
  });

  it('returns 200 with counts when deactivation succeeds (FR-02.9)', async () => {
    setupSelectMock([[ownerCallerRow], [targetUserRow]]);

    // Transaction mock: calls the callback with tx object
    mockDbTransaction.mockImplementation(async (cb: Function) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }]),
            }),
          }),
        }),
      };
      await cb(tx);
    });

    const res = await request(app)
      .patch('/api/v1/users/target-uuid/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'Usuario desactivado',
      pendingTransactionsReverted: expect.any(Number),
      pendingPaymentsRejected: expect.any(Number),
    });
  });

  it('wraps deactivation in a DB transaction (FR-02.9 atomicity)', async () => {
    setupSelectMock([[ownerCallerRow], [targetUserRow]]);

    mockDbTransaction.mockImplementation(async (cb: Function) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      await cb(tx);
    });

    await request(app)
      .patch('/api/v1/users/target-uuid/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(mockDbTransaction).toHaveBeenCalled();
  });
});
