import type { Request, Response, NextFunction } from 'express';

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
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (req.user.isSuperAdmin) {
      next();
      return;
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
