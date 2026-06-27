/**
 * Authentication Routes.
 * 
 * POST /api/auth/login  - Exchange MSAL authorization code for JWT
 * GET  /api/auth/me     - Get current user info
 */

import { Router, Request, Response } from 'express';
import { acquireTokenByCode, extractUserClaims } from '../auth/msal';
import { signToken, authMiddleware } from '../middleware/auth';
import { getConfig } from '../config';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { code: string }  (MSAL authorization code)
 * Returns: { token: string, user: { ... } }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    // Exchange code with Azure AD
    const { idTokenClaims } = await acquireTokenByCode(code);
    const claims = extractUserClaims(idTokenClaims);
    const config = getConfig();

    // Build user object
    const user = {
      oid: claims.oid,
      email: claims.email,
      name: claims.name,
      tenant_id: config.tenantId,
    };

    // Sign JWT
    const token = signToken({
      sub: claims.oid,
      email: claims.email,
      name: claims.name,
      tenant_id: config.tenantId,
      oid: claims.oid,
    });

    res.json({
      token,
      user: {
        id: claims.oid,
        email: claims.email,
        name: claims.name,
        tenantId: config.tenantId,
        tenantName: config.tenantName,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err.message);
    res.status(401).json({ error: 'Authentication failed', detail: err.message });
  }
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's information.
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const config = getConfig();

  res.json({
    id: req.user.oid,
    email: req.user.email,
    name: req.user.name,
    tenantId: req.user.tenant_id,
    tenantName: config.tenantName,
  });
});

export default router;
