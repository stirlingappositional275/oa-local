/**
 * Export Routes.
 * 
 * POST /api/export  - Export approvals as encrypted ZIP
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { exportApprovals } from '../services/export';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/export
 * Body: { status?, entity?, dateFrom?, dateTo?, amountFrom?, amountTo?, department? }
 * Returns: encrypted .enc file download
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userEmail = req.user!.email;

    const { status, entity, dateFrom, dateTo, amountFrom, amountTo, department } = req.body;

    const result = await exportApprovals(
      {
        tenantId,
        status,
        entity,
        dateFrom,
        dateTo,
        amountFrom: amountFrom ? parseFloat(amountFrom) : undefined,
        amountTo: amountTo ? parseFloat(amountTo) : undefined,
        department,
      },
      userEmail
    );

    // Send the encrypted file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', result.encryptedBuffer.length);
    res.setHeader('X-Export-Id', result.exportId);

    res.send(result.encryptedBuffer);
  } catch (err: any) {
    console.error('[Export] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
