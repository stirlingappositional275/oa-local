/**
 * Approval Engine Service (sql.js version).
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, execute } from '../db/connection';
import { encrypt, encryptNullable, decrypt, decryptNullable, decryptNumber } from '../db/crypto';

// ━━ Types ━━
export interface CreateApprovalInput {
  tenantId: string; title: string; templateCode: string;
  applicantName: string; applicantEmail: string;
  formData: Record<string, any>; amount?: number;
  currency?: string; department?: string; entity?: string;
}
export interface ApprovalRecord {
  id: string; tenant_id: string; title: string; template_code: string;
  applicant: string; applicant_email: string; form_data: Record<string, any>;
  amount: number; currency: string; department: string | null; entity: string;
  status: string; current_step: number; total_steps: number;
  att_link: string | null; att_state: string; submitted_at: string;
  resolved_at: string | null; created_at: string; updated_at: string;
  steps: StepRecord[];
}
export interface StepRecord {
  id: string; approval_id: string; step_order: number; step_name: string;
  approver: string | null; approver_email: string | null;
  action: string; comment: string | null; acted_at: string | null;
}

// ━━ Helpers ━━
async function ensureDb() { return getDb(); }

function getTemplate(tenantId: string, templateCode: string) {
  return queryOne(
    'SELECT * FROM templates WHERE tenant_id = ? AND template_code = ? AND is_enabled = 1',
    [tenantId, templateCode]
  );
}

function findApproverByRole(tenantId: string, applicantEmail: string, role: string) {
  const rl = queryOne(
    'SELECT * FROM report_lines WHERE tenant_id = ? AND employee_email = ? AND is_active = 1',
    [tenantId, applicantEmail]
  );
  if (!rl) return null;
  if (role === 'dept_head') return rl.dept_head_email ? { email: rl.dept_head_email, name: rl.dept_head_email } : null;
  if (role === 'manager') return rl.manager_email ? { email: rl.manager_email, name: rl.manager_email } : null;
  return null;
}

function parseApprovalConfig(template: any) {
  try { return JSON.parse(template.approval_config || '[]'); } catch { return []; }
}

function decryptRow(row: any): any {
  if (!row) return null;
  try {
    return {
      ...row,
      applicant: decrypt(row.applicant),
      applicant_email: decrypt(row.applicant_email),
      form_data: JSON.parse(decrypt(row.form_data || '{}')),
      amount: decryptNumber(row.amount || '0'),
      department: decryptNullable(row.department),
    };
  } catch { return row; }
}

// ━━ Core ━━
export async function createApproval(input: CreateApprovalInput): Promise<ApprovalRecord> {
  await ensureDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  const template = getTemplate(input.tenantId, input.templateCode);
  if (!template) throw new Error(`Template not found: ${input.templateCode}`);

  const chain = parseApprovalConfig(template);
  if (chain.length === 0) throw new Error(`No approval chain: ${input.templateCode}`);

  const entity = input.entity || input.templateCode;

  execute(`INSERT INTO approvals (id, tenant_id, title, template_code, applicant, applicant_email, form_data, amount, currency, department, entity, status, current_step, total_steps, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',0,?,?)`,
    [id, input.tenantId, input.title, input.templateCode,
     encrypt(input.applicantName), encrypt(input.applicantEmail),
     encrypt(JSON.stringify(input.formData)), encrypt((input.amount || 0).toString()),
     input.currency || 'CNY', encryptNullable(input.department || null),
     entity, chain.length, now]);

  const steps: StepRecord[] = [];
  for (const sc of chain) {
    const sid = uuidv4();
    let ae: string | null = null, an: string | null = null;
    if (sc.scope === 'tenant') {
      const found = findApproverByRole(input.tenantId, input.applicantEmail, sc.role);
      if (found) { ae = found.email; an = found.name; }
    }
    execute(`INSERT INTO step_records (id, approval_id, tenant_id, step_order, step_name, approver, approver_email, action) VALUES (?,?,?,?,?,?,?,'pending')`,
      [sid, id, input.tenantId, sc.order, sc.name, an, ae]);
    steps.push({ id: sid, approval_id: id, step_order: sc.order, step_name: sc.name, approver: an, approver_email: ae, action: 'pending', comment: null, acted_at: null });
  }

  return (await getApprovalById(id, input.tenantId))!;
}

export async function getApprovalById(id: string, tenantId: string): Promise<ApprovalRecord | null> {
  await ensureDb();
  const row = queryOne('SELECT * FROM approvals WHERE id = ? AND tenant_id = ?', [id, tenantId]);
  if (!row) return null;
  const d = decryptRow(row);
  const srows = queryAll('SELECT * FROM step_records WHERE approval_id = ? ORDER BY step_order ASC', [id]);
  const steps: StepRecord[] = srows.map((s: any) => ({
    id: s.id, approval_id: s.approval_id, step_order: s.step_order, step_name: s.step_name,
    approver: s.approver, approver_email: s.approver_email, action: s.action, comment: s.comment, acted_at: s.acted_at,
  }));
  return { ...d, steps };
}

export async function listUserApprovals(tenantId: string, applicantEmail: string, options: { status?: string; page?: number; pageSize?: number }) {
  await ensureDb();
  const page = options.page || 1, pageSize = options.pageSize || 20, offset = (page - 1) * pageSize;
  const encEmail = encrypt(applicantEmail);
  let where = 'WHERE tenant_id = ? AND applicant_email = ?';
  const args: any[] = [tenantId, encEmail];
  if (options.status) { where += ' AND status = ?'; args.push(options.status); }

  const cnt = queryOne(`SELECT COUNT(*) as total FROM approvals ${where}`, args) as any;
  const rows = queryAll(`SELECT * FROM approvals ${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?`, [...args, pageSize, offset]);

  const items = rows.map(r => ({ id: r.id, title: r.title, template_code: r.template_code, applicant: decrypt(r.applicant), amount: decryptNumber(r.amount), currency: r.currency, entity: r.entity, status: r.status, current_step: r.current_step, total_steps: r.total_steps, submitted_at: r.submitted_at, resolved_at: r.resolved_at }));
  return { items, total: cnt?.total || 0, page, pageSize, totalPages: Math.ceil((cnt?.total || 0) / pageSize) };
}

export async function listPendingApprovals(tenantId: string, userEmail: string, options: { page?: number; pageSize?: number }) {
  await ensureDb();
  const page = options.page || 1, pageSize = options.pageSize || 20, offset = (page - 1) * pageSize;

  const cnt = queryOne(`SELECT COUNT(DISTINCT a.id) as total FROM approvals a INNER JOIN step_records s ON a.id = s.approval_id WHERE a.tenant_id = ? AND a.status = 'pending' AND s.action = 'pending' AND s.approver_email = ?`, [tenantId, userEmail]) as any;
  const rows = queryAll(`SELECT DISTINCT a.*, s.step_name as pending_step_name, s.step_order as pending_step_order FROM approvals a INNER JOIN step_records s ON a.id = s.approval_id WHERE a.tenant_id = ? AND a.status = 'pending' AND s.action = 'pending' AND s.approver_email = ? ORDER BY a.submitted_at DESC LIMIT ? OFFSET ?`, [tenantId, userEmail, pageSize, offset]);

  const items = rows.map(r => ({ id: r.id, title: r.title, template_code: r.template_code, applicant: decrypt(r.applicant), amount: decryptNumber(r.amount), currency: r.currency, entity: r.entity, status: r.status, current_step: r.current_step, total_steps: r.total_steps, pending_step_name: r.pending_step_name, pending_step_order: r.pending_step_order, submitted_at: r.submitted_at }));
  return { items, total: cnt?.total || 0, page, pageSize, totalPages: Math.ceil((cnt?.total || 0) / pageSize) };
}

export async function approveStep(approvalId: string, tenantId: string, approverEmail: string, comment?: string): Promise<ApprovalRecord> {
  await ensureDb();
  const now = new Date().toISOString();
  const app = queryOne("SELECT * FROM approvals WHERE id = ? AND tenant_id = ? AND status = 'pending'", [approvalId, tenantId]);
  if (!app) throw new Error('Approval not found or not pending');

  const cs = app.current_step;
  const step = queryOne("SELECT * FROM step_records WHERE approval_id = ? AND step_order = ? AND action = 'pending'", [approvalId, cs + 1]);
  if (!step) throw new Error('No pending step found');

  execute("UPDATE step_records SET action = 'approved', approver = ?, approver_email = ?, comment = ?, acted_at = ? WHERE id = ?", [approverEmail, approverEmail, comment || null, now, step.id]);

  const total = app.total_steps;
  if (cs + 1 >= total) {
    execute("UPDATE approvals SET status = 'approved', current_step = ?, resolved_at = ?, updated_at = ? WHERE id = ?", [cs + 1, now, now, approvalId]);
  } else {
    execute("UPDATE approvals SET current_step = ?, updated_at = ? WHERE id = ?", [cs + 1, now, approvalId]);
  }
  return (await getApprovalById(approvalId, tenantId))!;
}

export async function rejectStep(approvalId: string, tenantId: string, approverEmail: string, comment?: string): Promise<ApprovalRecord> {
  await ensureDb();
  const now = new Date().toISOString();
  const app = queryOne("SELECT * FROM approvals WHERE id = ? AND tenant_id = ? AND status = 'pending'", [approvalId, tenantId]);
  if (!app) throw new Error('Approval not found or not pending');

  const cs = app.current_step;
  const step = queryOne("SELECT * FROM step_records WHERE approval_id = ? AND step_order = ? AND action = 'pending'", [approvalId, cs + 1]);
  if (!step) throw new Error('No pending step found');

  execute("UPDATE step_records SET action = 'rejected', approver = ?, approver_email = ?, comment = ?, acted_at = ? WHERE id = ?", [approverEmail, approverEmail, comment || null, now, step.id]);
  execute("UPDATE approvals SET status = 'rejected', current_step = ?, resolved_at = ?, updated_at = ? WHERE id = ?", [cs + 1, now, now, approvalId]);
  execute("UPDATE step_records SET action = 'rejected' WHERE approval_id = ? AND step_order > ? AND action = 'pending'", [approvalId, cs + 1]);

  return (await getApprovalById(approvalId, tenantId))!;
}

export async function updateApproval(approvalId: string, tenantId: string, updates: { title?: string; formData?: Record<string, any>; amount?: number }): Promise<ApprovalRecord> {
  await ensureDb();
  const app = queryOne("SELECT * FROM approvals WHERE id = ? AND tenant_id = ? AND status = 'pending' AND current_step = 0", [approvalId, tenantId]);
  if (!app) throw new Error('Cannot update - already in review');
  const now = new Date().toISOString();
  if (updates.title) execute('UPDATE approvals SET title = ?, updated_at = ? WHERE id = ?', [updates.title, now, approvalId]);
  if (updates.formData) execute('UPDATE approvals SET form_data = ?, updated_at = ? WHERE id = ?', [encrypt(JSON.stringify(updates.formData)), now, approvalId]);
  if (updates.amount != null) execute('UPDATE approvals SET amount = ?, updated_at = ? WHERE id = ?', [encrypt(updates.amount.toString()), now, approvalId]);
  return (await getApprovalById(approvalId, tenantId))!;
}

export default { createApproval, getApprovalById, listUserApprovals, listPendingApprovals, approveStep, rejectStep, updateApproval };
