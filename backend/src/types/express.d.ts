import type { JWTPayload } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      companyId?: string;
    }
  }
}
