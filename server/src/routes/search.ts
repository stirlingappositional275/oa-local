/**
 * Search Routes (sql.js version)
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getTenantId } from '../middleware/tenant';
import { getDb, queryAll, queryOne } from '../db/connection';
import { decrypt, decryptNumber, decryptNullable } from '../db/crypto';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    await getDb();
    const tenantId = getTenantId(req);
    const { q, status, entity, dateFrom, dateTo, page: ps, pageSize: pss } = req.query;
    const page = ps ? parseInt(ps as string) : 1;
    const pageSize = pss ? parseInt(pss as string) : 20;
    const offset = (page - 1) * pageSize;

    let where = 'WHERE tenant_id = ?';
    const args: any[] = [tenantId];

    if (q) { where += ' AND title LIKE ?'; args.push(`%${q}%`); }
    if (status) { where += ' AND status = ?'; args.push(status); }
    if (entity) { where += ' AND entity = ?'; args.push(entity); }
    if (dateFrom) { where += ' AND submitted_at >= ?'; args.push(dateFrom); }
    if (dateTo) { where += ' AND submitted_at <= ?'; args.push(dateTo); }

    const cnt = queryOne(`SELECT COUNT(*) as total FROM approvals ${where}`, args) as any;
    const rows = queryAll(`SELECT * FROM approvals ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`, [...args, pageSize, offset]);

    const items = rows.map(r => ({
      id: r.id, title: r.title, template_code: r.template_code,
      applicant: decrypt(r.applicant), applicant_email: decrypt(r.applicant_email),
      form_data: JSON.parse(decrypt(r.form_data || '{}')),
      amount: decryptNumber(r.amount), currency: r.currency,
      department: decryptNullable(r.department), entity: r.entity,
      status: r.status, current_step: r.current_step, total_steps: r.total_steps,
      att_state: r.att_state, submitted_at: r.submitted_at, resolved_at: r.resolved_at,
    }));

    res.json({ items, total: cnt?.total || 0, page, pageSize, totalPages: Math.ceil((cnt?.total || 0) / pageSize) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
