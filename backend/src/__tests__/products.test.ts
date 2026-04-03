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
  return {
    mockDbSelect,
    mockDbInsert,
    mockDbUpdate,
  };
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

// ─── POST /api/v1/products ────────────────────────────────────────────────────

describe('POST /api/v1/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).post('/api/v1/products').send({
      name: 'AA Battery',
      unitPrice: '12.50',
    });
    expect(res.status).toBe(401);
  });

  it('returns 201 with created product on valid body', async () => {
    const createdProduct = {
      id: 'product-uuid-1',
      companyId: 'company-uuid',
      name: 'AA Battery',
      description: null,
      unitPrice: '12.50',
      unit: 'box',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    mockDbInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdProduct]),
      }),
    });

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ name: 'AA Battery', unitPrice: '12.50', unit: 'box' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'product-uuid-1',
      name: 'AA Battery',
      unitPrice: '12.50',
    });
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ unitPrice: '12.50' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET /api/v1/products ─────────────────────────────────────────────────────

describe('GET /api/v1/products', () => {
  const productList = [
    {
      id: 'product-1',
      name: 'AA Battery',
      unitPrice: '12.50',
      unit: 'box',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'product-2',
      name: 'C Battery',
      unitPrice: '8.00',
      unit: 'box',
      isActive: true,
      createdAt: new Date('2026-01-02'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array of products scoped to company', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(productList),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ id: 'product-1', name: 'AA Battery' });
  });

  it('returns 200 with filtered results when ?search=battery', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([productList[0]]),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/products?search=battery')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 with filtered results when ?status=inactive', async () => {
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const res = await request(app)
      .get('/api/v1/products?status=inactive')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── PATCH /api/v1/products/:id ──────────────────────────────────────────────

describe('PATCH /api/v1/products/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .patch('/api/v1/products/product-uuid-1')
      .send({ name: 'Updated Battery' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with updated product on success', async () => {
    const existingProduct = { id: 'product-uuid-1' };
    const updatedProduct = {
      id: 'product-uuid-1',
      companyId: 'company-uuid',
      name: 'Updated Battery',
      description: null,
      unitPrice: '12.50',
      unit: 'box',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };

    setupSelectMock([[existingProduct]]);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedProduct]),
        }),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/products/product-uuid-1')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ name: 'Updated Battery' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'product-uuid-1', name: 'Updated Battery' });
  });

  it('returns 404 when product not found in company (cross-tenant guard)', async () => {
    setupSelectMock([[]]); // empty = product not in this company

    const res = await request(app)
      .patch('/api/v1/products/other-company-product')
      .set('Authorization', `Bearer ${makeOwnerToken()}`)
      .send({ name: 'Updated Battery' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Producto no encontrado' });
  });
});

// ─── PATCH /api/v1/products/:id/deactivate ───────────────────────────────────

describe('PATCH /api/v1/products/:id/deactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 on success', async () => {
    const existingProduct = { id: 'product-uuid-1' };
    setupSelectMock([[existingProduct]]);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/products/product-uuid-1/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    setupSelectMock([[]]);

    const res = await request(app)
      .patch('/api/v1/products/nonexistent-product/deactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/v1/products/:id/reactivate ───────────────────────────────────

describe('PATCH /api/v1/products/:id/reactivate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 on success', async () => {
    const existingProduct = { id: 'product-uuid-1' };
    setupSelectMock([[existingProduct]]);

    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const res = await request(app)
      .patch('/api/v1/products/product-uuid-1/reactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    setupSelectMock([[]]);

    const res = await request(app)
      .patch('/api/v1/products/nonexistent-product/reactivate')
      .set('Authorization', `Bearer ${makeOwnerToken()}`);

    expect(res.status).toBe(404);
  });
});
