/**
 * RBAC Middleware — Role-Based Access Control
 * 
 * Roles: admin, finance, dept_head, user
 * 
 * Usage:
 *   router.get('/sensitive', requireRole('admin', 'finance'), handler);
 */

import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'finance' | 'dept_head' | 'user';

// In production, roles come from JWT or DB. For now, derive from email pattern or config.
function getUserRole(req: Request): Role {
  // In production, role comes from user_roles table or JWT claims
  // Fallback: check env-configured admin email
  const email = req.user?.email || '';
  if (email === (process.env.ADMIN_EMAIL || '')) return 'admin';
  return 'user';
}

export function initRbac() {
  // Create roles table if not exists
  const { execute } = require('../db/connection');
  execute(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'parent',
      user_email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_roles_tenant ON user_roles(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_roles_email ON user_roles(tenant_id, user_email);
  `);
}

/**
 * Require one of the specified roles to access this route.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getUserRole(req);
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: insufficient permissions', required: roles, current: userRole });
    }
  };
}

/**
 * Check if current user has a specific role.
 */
export function hasRole(req: Request, role: Role): boolean {
  return getUserRole(req) === role;
}

/**
 * Get current user's role.
 */
export function getRole(req: Request): Role {
  return getUserRole(req);
}

export default { requireRole, hasRole, getRole, initRbac };
