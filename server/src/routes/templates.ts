/**
 * Template Routes (sql.js version)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { getDb, queryAll } from '../db/connection';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    await getDb();
    const rows = queryAll('SELECT * FROM templates WHERE tenant_id = ? AND is_enabled = 1 ORDER BY category, template_name', [getTenantId(req)]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { templateName, templateCode, category, icon, formConfig, approvalConfig, scope } = req.body;
    if (!templateName || !templateCode || !category) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    const id = uuidv4();
    db.run(`INSERT INTO templates (id, tenant_id, template_name, template_code, category, icon, form_config, approval_config, scope, is_enabled) VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [id, getTenantId(req), templateName, templateCode, category, icon || '📋', JSON.stringify(formConfig || []), JSON.stringify(approvalConfig || []), scope || 'tenant']);
    const row = queryAll('SELECT * FROM templates WHERE id = ?', [id])[0];
    res.status(201).json(row);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

export default router;
