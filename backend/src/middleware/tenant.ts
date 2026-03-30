import type { Request, Response, NextFunction } from 'express';

export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user?.companyId) {
    res.status(401).json({ error: 'No tenant context' });
    return;
  }
  // NFR-01.1: companyId comes ONLY from verified JWT — never from req.body or req.params
  req.companyId = req.user.companyId;
  next();
}
