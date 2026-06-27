/**
 * Export Service (sql.js version)
 */

import crypto from 'crypto';
import archiver from 'archiver';
import { getDb, queryAll, queryOne } from '../db/connection';
import { decrypt, decryptNumber, decryptNullable, encrypt } from '../db/crypto';
import { sendExportKey } from './email';
import { v4 as uuidv4 } from 'uuid';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export interface ExportFilter {
  tenantId: string; status?: string; entity?: string;
  dateFrom?: string; dateTo?: string; amountFrom?: number;
  amountTo?: number; department?: string;
}
export interface ExportResult { exportId: string; encryptedBuffer: Buffer; fileName: string; }

function generateExportKey(): string { return crypto.randomBytes(32).toString('hex'); }

function encryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]);
}

export async function exportApprovals(filter: ExportFilter, userEmail: string): Promise<ExportResult> {
  await getDb();
  const exportId = uuidv4();

  let where = 'WHERE tenant_id = ?';
  const args: any[] = [filter.tenantId];
  if (filter.status) { where += ' AND status = ?'; args.push(filter.status); }
  if (filter.entity) { where += ' AND entity = ?'; args.push(filter.entity); }
  if (filter.dateFrom) { where += ' AND submitted_at >= ?'; args.push(filter.dateFrom); }
  if (filter.dateTo) { where += ' AND submitted_at <= ?'; args.push(filter.dateTo); }
  if (filter.department) { where += ' AND department = ?'; args.push(encrypt(filter.department)); }

  const rows = queryAll(`SELECT * FROM approvals ${where} ORDER BY submitted_at DESC`, args);

  const items = rows.map(r => {
    const steps = queryAll('SELECT * FROM step_records WHERE approval_id = ? ORDER BY step_order ASC', [r.id]);
    return {
      id: r.id, title: r.title, template_code: r.template_code,
      applicant: decrypt(r.applicant), applicant_email: decrypt(r.applicant_email),
      form_data: JSON.parse(decrypt(r.form_data || '{}')),
      amount: decryptNumber(r.amount), currency: r.currency,
      department: decryptNullable(r.department), entity: r.entity,
      status: r.status, current_step: r.current_step, total_steps: r.total_steps,
      att_link: r.att_link, att_state: r.att_state,
      submitted_at: r.submitted_at, resolved_at: r.resolved_at,
      steps: steps.map((s: any) => ({ step_order: s.step_order, step_name: s.step_name, approver: s.approver, action: s.action, comment: s.comment, acted_at: s.acted_at })),
    };
  });

  const exportData = { exportId, exportedAt: new Date().toISOString(), exportedBy: userEmail, filter, totalRecords: items.length, approvals: items };
  const jsonData = JSON.stringify(exportData, null, 2);

  // Create ZIP in memory
  const chunks: Buffer[] = [];
  const archive = archiver('zip', { zlib: { level: 9 } });
  const zipPromise = new Promise<Buffer>((resolve, reject) => {
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.append(jsonData, { name: `oa-export-${exportId}.json` });
    archive.finalize();
  });
  const zipBuffer = await zipPromise;

  const exportKey = generateExportKey();
  const keyBuffer = Buffer.from(exportKey, 'hex');
  const encryptedBuffer = encryptBuffer(zipBuffer, keyBuffer);

  await sendExportKey(userEmail, exportId, exportKey);

  return { exportId, encryptedBuffer, fileName: `oa-export-${exportId}.enc` };
}
