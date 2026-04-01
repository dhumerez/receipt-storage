import type { Request, Response, NextFunction } from 'express';
import { ERRORS } from '../constants/strings/errors.js';

type Role = 'owner' | 'collaborator' | 'viewer' | 'client';

/**
 * Factory: returns middleware that allows only the specified roles.
 * Super admins bypass all role checks.
 *
 * Usage: router.post('/endpoint', authenticate, requireRole('owner', 'collaborator'), handler)
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: ERRORS.unauthenticated });
      return;
    }
    if (req.user.isSuperAdmin) {
      next();
      return;
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({ error: ERRORS.insufficientPermissions });
      return;
    }
    next();
  };
}

/**
 * Guards routes that require super admin access.
 * Super admins have isSuperAdmin=true and companyId=null.
 * NEVER apply requireTenant after this — super admins have no companyId.
 *
 * Usage: app.use('/admin', authenticate, requireSuperAdmin, adminRouter)
 */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: ERRORS.unauthenticated });
    return;
  }
  if (!req.user.isSuperAdmin) {
    res.status(403).json({ error: ERRORS.superAdminRequired });
    return;
  }
  next();
}
