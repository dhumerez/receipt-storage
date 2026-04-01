import type { Request, Response, NextFunction } from 'express';
import { ERRORS } from '../constants/strings/errors.js';

export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user?.companyId) {
    res.status(401).json({ error: ERRORS.noTenantContext });
    return;
  }
  // NFR-01.1: companyId comes ONLY from verified JWT — never from req.body or req.params
  req.companyId = req.user.companyId;
  next();
}
