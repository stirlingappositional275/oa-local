/**
 * Tenant Isolation Middleware.
 * 
 * Automatically injects tenant_id into all requests.
 * Uses the tenant_id from the JWT payload (set during login).
 * All database queries should filter by req.tenantId.
 */

import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Middleware to extract tenant_id from the authenticated user's JWT
 * and attach it to the request. This ensures all subsequent operations
 * are scoped to the correct tenant.
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Priority 1: From authenticated user's JWT
  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    next();
    return;
  }

  // Priority 2: From server config (for system-level operations)
  const config = getConfig();
  req.tenantId = config.tenantId;
  next();
}

/**
 * Helper to get the current tenant ID from a request.
 * Falls back to the server's own tenant ID.
 */
export function getTenantId(req: Request): string {
  if (req.tenantId) return req.tenantId;
  return getConfig().tenantId;
}

export default { tenantMiddleware, getTenantId };
