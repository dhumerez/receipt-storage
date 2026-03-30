import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

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
  // Dynamically import after module is written
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
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthenticated' });
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
    expect(res.json).toHaveBeenCalledWith({ error: 'Super admin access required' });
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
