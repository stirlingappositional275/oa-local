/**
 * Approval Routes (sql.js async version)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import * as svc from '../services/approval';

const router = Router();
router.use(authMiddleware);

function q(v: any): string | undefined { return v ? String(v) : undefined; }

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await svc.listUserApprovals(getTenantId(req), req.user!.email, {
      status: q(req.query.status),
      page: req.query.page ? parseInt(q(req.query.page)!) : undefined,
      pageSize: req.query.pageSize ? parseInt(q(req.query.pageSize)!) : undefined,
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/pending', async (req: Request, res: Response) => {
  try {
    const result = await svc.listPendingApprovals(getTenantId(req), req.user!.email, {
      page: req.query.page ? parseInt(q(req.query.page)!) : undefined,
      pageSize: req.query.pageSize ? parseInt(q(req.query.pageSize)!) : undefined,
    });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, templateCode, formData, amount, currency, department, entity } = req.body;
    if (!title || !templateCode || !formData) {
      res.status(400).json({ error: 'Missing: title, templateCode, formData' }); return;
    }
    const approval = await svc.createApproval({
      tenantId: getTenantId(req), title, templateCode,
      applicantName: req.user!.name, applicantEmail: req.user!.email,
      formData, amount, currency, department, entity,
    });
    res.status(201).json(approval);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const a = await svc.getApprovalById(String(req.params.id), getTenantId(req));
    if (!a) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(a);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const a = await svc.updateApproval(String(req.params.id), getTenantId(req), req.body);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const a = await svc.approveStep(String(req.params.id), getTenantId(req), req.user!.email, req.body.comment);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const a = await svc.rejectStep(String(req.params.id), getTenantId(req), req.user!.email, req.body.comment);
    res.json(a);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
