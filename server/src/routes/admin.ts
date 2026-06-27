/**
 * Admin Routes — Audit dashboard
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { requireRole } from '../middleware/rbac';
import { queryAuditLog } from '../services/audit';
import { getFileForDownload } from '../services/file-vault';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/admin/audit — query audit logs (admin only)
 */
router.get('/audit', requireRole('admin'), (req: Request, res: Response) => {
  try {
    const result = queryAuditLog(getTenantId(req), {
      userEmail: req.query.userEmail as string,
      action: req.query.action as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 50,
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/**
 * GET /api/admin/stats — system statistics (admin only)
 */
router.get('/stats', requireRole('admin'), (req: Request, res: Response) => {
  const { getDb } = require('../db/connection');
  const db = require('../db/connection');
  const tid = getTenantId(req);
  const approvals = db.queryOne('SELECT COUNT(*) as total FROM approvals WHERE tenant_id = ?', [tid]) as any;
  const files = db.queryOne('SELECT COUNT(*) as total FROM file_vault WHERE tenant_id = ?', [tid]) as any;
  const users = db.queryOne('SELECT COUNT(DISTINCT user_email) as total FROM audit_log WHERE tenant_id = ?', [tid]) as any;
  res.json({
    totalApprovals: approvals?.total || 0,
    totalFiles: files?.total || 0,
    activeUsers: users?.total || 0,
  });
});

export default router;
