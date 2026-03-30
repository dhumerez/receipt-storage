import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Set test secret before importing middleware
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-length-requirement-here';

import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireRole } from '../middleware/rbac.js';

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

// ── authenticate ──────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = mockNext();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', () => {
    const req = { headers: { authorization: 'Bearer not.a.real.token' } } as Request;
    const res = mockRes();
    const next = mockNext();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('sets req.user and calls next for a valid HS256 token', () => {
    const payload = {
      sub: 'user-uuid',
      companyId: 'company-uuid',
      role: 'owner' as const,
      isSuperAdmin: false,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = mockRes();
    const next = mockNext();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user?.companyId).toBe('company-uuid');
    expect((req as any).user?.role).toBe('owner');
  });
});

// ── requireTenant ─────────────────────────────────────────────────────────────

describe('requireTenant', () => {
  it('returns 401 when req.user has no companyId', () => {
    const req = { user: { sub: 'u1', isSuperAdmin: false, role: 'owner' } } as any;
    const res = mockRes();
    const next = mockNext();
    requireTenant(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tenant context' });
  });

  it('sets req.companyId from JWT and calls next', () => {
    const req = {
      user: { sub: 'u1', companyId: 'cid-123', isSuperAdmin: false, role: 'owner' },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireTenant(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.companyId).toBe('cid-123');
  });
});

// ── requireRole ───────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('returns 401 when req.user is missing', () => {
    const req = {} as Request;
    const res = mockRes();
    const next = mockNext();
    requireRole('owner')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 403 when role is not in the allowed list', () => {
    const req = {
      user: { role: 'collaborator', isSuperAdmin: false },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireRole('owner')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
  });

  it('calls next when role is in the allowed list', () => {
    const req = {
      user: { role: 'collaborator', isSuperAdmin: false },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireRole('owner', 'collaborator')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next for isSuperAdmin regardless of role', () => {
    const req = {
      user: { role: 'viewer', isSuperAdmin: true },
    } as any;
    const res = mockRes();
    const next = mockNext();
    requireRole('owner')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
