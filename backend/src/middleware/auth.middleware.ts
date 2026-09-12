import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../modules/auth/auth.service';
import { JwtPayload } from '../types/auth.types';

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * authenticate — verifies the JWT Bearer token in Authorization header.
 * Attaches decoded payload to req.user on success.
 * Returns 401 if token is missing, malformed, or expired.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Bearer token missing.' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * authorize — factory that returns a middleware enforcing one of the given roles.
 * Must be used after `authenticate`.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
      return;
    }

    next();
  };
}

// Pre-built role guards for convenience
export const requireAdmin = authorize(UserRole.ADMIN);
export const requireOperations = authorize(UserRole.OPERATIONS, UserRole.ADMIN);
export const requireSales = authorize(UserRole.SALES, UserRole.ADMIN);
