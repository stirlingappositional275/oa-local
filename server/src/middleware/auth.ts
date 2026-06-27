/**
 * JWT Authentication Middleware.
 * 
 * Validates the Bearer token in the Authorization header.
 * If valid, attaches user info to req.user.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  tenant_id: string;
  oid: string;
  iat: number;
  exp: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    } else {
      res.status(500).json({ error: 'Authentication error' });
    }
  }
}

/**
 * Sign a JWT token with user claims.
 */
export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const config = getConfig();
  return jwt.sign(payload as object, config.jwt.secret, {
    expiresIn: '24h',
  });
}

export default { authMiddleware, signToken };
