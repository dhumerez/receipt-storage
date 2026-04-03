import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// ─── Mock DB before importing routes ─────────────────────────────────────────
vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../services/auth.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}));

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockNext(): NextFunction {
  return vi.fn();
}

// ── requireSuperAdmin ─────────────────────────────────────────────────────────

describe('requireSuperAdmin', () => {
  let requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const module = await import('../middleware/rbac.js');
    requireSuperAdmin = module.requireSuperAdmin;
  });

  it('returns 401 when req.user is missing', () => {
    const req = {} as Request;
    const res = mockRes();
    const next = mockNext();
    requireSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user.isSuperAdmin is false', () => {
    const req = {
      user: { sub: 'u1', companyId: 'c1', role: 'owner', isSuperAdmin: false },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Se requiere acceso de super administrador' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when req.user.isSuperAdmin is true', () => {
    const req = {
      user: { sub: 'u1', companyId: null, role: 'owner', isSuperAdmin: true },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for super admin with any role value (isSuperAdmin=true overrides role)', () => {
    const req = {
      user: { sub: 'u1', companyId: null, role: 'viewer', isSuperAdmin: true },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ── admin router routes ───────────────────────────────────────────────────────

describe('GET /admin/companies', () => {
  it('returns array of all companies', async () => {
    const { db } = await import('../db/client.js');
    const mockCompanies = [
      { id: 'c1', name: 'Acme', currencyCode: 'USD', isActive: true },
    ];
    const mockOwners = [{ companyId: 'c1', email: 'owner@acme.com' }];

    // First call: db.select().from(companies).orderBy(...)
    const orderByMock = vi.fn().mockResolvedValue(mockCompanies);
    const companiesFromMock = vi.fn().mockReturnValue({ orderBy: orderByMock });

    // Second call: db.select({...}).from(users).where(...)
    const whereMock = vi.fn().mockResolvedValue(mockOwners);
    const usersFromMock = vi.fn().mockReturnValue({ where: whereMock });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: companiesFromMock } as any)
      .mockReturnValueOnce({ from: usersFromMock } as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = { user: { isSuperAdmin: true }, body: {}, params: {} } as any;
    const res = mockRes();
    const next = mockNext();

    // Invoke the route handler directly
    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies' && l.route?.methods?.get,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith([
      { id: 'c1', name: 'Acme', currencyCode: 'USD', isActive: true, ownerEmail: 'owner@acme.com' },
    ]);
  });
});

describe('POST /admin/companies', () => {
  it('returns 400 for invalid body', async () => {
    const { adminRouter } = await import('../routes/admin.js');

    const req = { body: { name: '' } } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies' && l.route?.methods?.post,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates company and returns 201 with id, name, currencyCode', async () => {
    const { db } = await import('../db/client.js');
    const newCompany = { id: 'c2', name: 'Beta Corp', currencyCode: 'EUR' };

    const returningMock = vi.fn().mockResolvedValue([newCompany]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
    vi.mocked(db.insert).mockImplementation(insertMock as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = { body: { name: 'Beta Corp', currencyCode: 'EUR' } } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies' && l.route?.methods?.post,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newCompany);
  });
});

describe('PATCH /admin/companies/:id', () => {
  it('returns 404 when company not found', async () => {
    const { db } = await import('../db/client.js');

    const returningMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });
    vi.mocked(db.update).mockImplementation(updateMock as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = { body: { name: 'New Name' }, params: { id: 'nonexistent-id' } } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies/:id' && l.route?.methods?.patch,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Empresa no encontrada' });
  });

  it('updates company name and returns updated record', async () => {
    const { db } = await import('../db/client.js');
    const updated = { id: 'c1', name: 'New Name', currencyCode: 'USD', isActive: true };

    const returningMock = vi.fn().mockResolvedValue([updated]);
    const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });
    vi.mocked(db.update).mockImplementation(updateMock as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = { body: { name: 'New Name' }, params: { id: 'c1' } } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies/:id' && l.route?.methods?.patch,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

describe('POST /admin/companies/:id/owner', () => {
  it('returns 400 for invalid owner body', async () => {
    const { adminRouter } = await import('../routes/admin.js');

    const req = { body: { email: 'not-an-email' }, params: { id: 'c1' } } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies/:id/owner' && l.route?.methods?.post,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 409 when email already in use', async () => {
    const { db } = await import('../db/client.js');

    // company exists check
    const companyLimitMock = vi.fn().mockResolvedValue([{ id: 'c1' }]);
    const companyWhereMock = vi.fn().mockReturnValue({ limit: companyLimitMock });
    const companyFromMock = vi.fn().mockReturnValue({ where: companyWhereMock });

    // existing user check
    const userLimitMock = vi.fn().mockResolvedValue([{ id: 'u-existing' }]);
    const userWhereMock = vi.fn().mockReturnValue({ limit: userLimitMock });
    const userFromMock = vi.fn().mockReturnValue({ where: userWhereMock });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: companyFromMock } as any)
      .mockReturnValueOnce({ from: userFromMock } as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = {
      body: { email: 'existing@example.com', password: 'password123', fullName: 'John Owner' },
      params: { id: 'c1' },
    } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies/:id/owner' && l.route?.methods?.post,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'El correo ya está en uso' });
  });

  it('creates owner user and returns 201', async () => {
    const { db } = await import('../db/client.js');
    const newOwner = { id: 'u-new', email: 'owner@example.com', role: 'owner' };

    // company exists
    const companyLimitMock = vi.fn().mockResolvedValue([{ id: 'c1' }]);
    const companyWhereMock = vi.fn().mockReturnValue({ limit: companyLimitMock });
    const companyFromMock = vi.fn().mockReturnValue({ where: companyWhereMock });

    // no existing user
    const userLimitMock = vi.fn().mockResolvedValue([]);
    const userWhereMock = vi.fn().mockReturnValue({ limit: userLimitMock });
    const userFromMock = vi.fn().mockReturnValue({ where: userWhereMock });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: companyFromMock } as any)
      .mockReturnValueOnce({ from: userFromMock } as any);

    // insert user
    const returningMock = vi.fn().mockResolvedValue([newOwner]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.mocked(db.insert).mockReturnValue({ values: valuesMock } as any);

    const { adminRouter } = await import('../routes/admin.js');

    const req = {
      body: { email: 'owner@example.com', password: 'password123', fullName: 'John Owner' },
      params: { id: 'c1' },
    } as any;
    const res = mockRes();
    const next = mockNext();

    const handler = (adminRouter as any).stack.find(
      (l: any) => l.route?.path === '/companies/:id/owner' && l.route?.methods?.post,
    )?.route?.stack[0]?.handle;
    await handler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newOwner);
  });
});
