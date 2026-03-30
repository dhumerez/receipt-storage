import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface JWTPayload {
  sub: string;
  companyId: string;
  role: 'owner' | 'collaborator' | 'viewer' | 'client';
  isSuperAdmin: boolean;
  iat: number;
  exp: number;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token' });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!, {
      algorithms: ['HS256'], // NEVER allow 'none' — prevents alg:none attack
    }) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
