/**
 * Federation Routes (Phase 2).
 * 
 * POST /api/federation/approvals  - Receive cross-company approval from subsidiary
 * 
 * These routes are protected by API key, not user JWT.
 * In Phase 1 (parent only), these are deployed but not actively used.
 */

import { Router, Request, Response } from 'express';
import { getConfig } from '../config';
import { receiveFromSubsidiary } from '../services/federation';

const router = Router();

/**
 * API Key authentication for federation endpoints
 */
function federationAuth(req: Request, res: Response, next: Function): void {
  const config = getConfig();
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing federation API key' });
    return;
  }

  const apiKey = authHeader.substring(7);
  if (apiKey !== config.federation.apiKey) {
    res.status(403).json({ error: 'Invalid federation API key' });
    return;
  }

  next();
}

/**
 * POST /api/federation/approvals
 * Receive an approval from a subsidiary company.
 * The subsidiary only sends role names, NOT specific personnel info.
 */
router.post('/approvals', federationAuth, async (req: Request, res: Response) => {
  try {
    const {
      sourceTenantId,
      sourceTenantName,
      sourceApprovalId,
      title,
      templateCode,
      stepName,
      role,
      applicantName,
      applicantEmail,
      formData,
      amount,
      currency,
    } = req.body;

    if (!sourceTenantId || !title || !stepName) {
      res.status(400).json({ error: 'Missing required fields: sourceTenantId, title, stepName' });
      return;
    }

    const result = await receiveFromSubsidiary({
      sourceTenantId,
      sourceTenantName: sourceTenantName || sourceTenantId,
      sourceApprovalId,
      title,
      templateCode: templateCode || 'expense',
      stepName,
      role: role || 'dept_head',
      applicantName: applicantName || '',
      applicantEmail: applicantEmail || '',
      formData: formData || '{}',
      amount: amount || '0',
      currency: currency || 'CNY',
    });

    res.status(201).json({ id: result.id, status: 'received' });
  } catch (err: any) {
    console.error('[Federation] Receive error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
