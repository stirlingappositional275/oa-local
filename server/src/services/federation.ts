/**
 * Federation Service (sql.js version - Phase 2)
 */

import { getConfig } from '../config';
import { getDb, queryOne, execute } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export async function forwardToParent(approvalId: string, tenantId: string, stepName: string, role: string) {
  const config = getConfig();
  if (!config.federation.parentUrl) { console.warn('[Federation] PARENT_URL not configured'); return { success: false }; }
  await getDb();
  const app = queryOne('SELECT * FROM approvals WHERE id = ? AND tenant_id = ?', [approvalId, tenantId]);
  if (!app) return { success: false };

  const payload = { sourceTenantId: tenantId, sourceTenantName: config.tenantName, sourceApprovalId: approvalId, title: app.title, templateCode: app.template_code, stepName, role, applicantName: app.applicant, applicantEmail: app.applicant_email, formData: app.form_data, amount: app.amount, currency: app.currency };

  try {
    const res = await fetch(`${config.federation.parentUrl}/api/federation/approvals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.federation.apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Parent returned ${res.status}`);
    const result: any = await res.json();
    execute("INSERT INTO federation_log (id, tenant_id, direction, source_tenant, target_tenant, approval_id, action, status, request_body) VALUES (?,?,?,?,?,?,?,?,?)",
      [uuidv4(), tenantId, 'outbound', tenantId, 'parent', approvalId, 'forward', 'sent', JSON.stringify(payload)]);
    return { success: true, parentApprovalId: result.id as string };
  } catch (e: any) {
    execute("INSERT INTO federation_log (id, tenant_id, direction, source_tenant, target_tenant, approval_id, action, status, response_body) VALUES (?,?,?,?,?,?,?,?,?)",
      [uuidv4(), tenantId, 'outbound', tenantId, 'parent', approvalId, 'forward', 'failed', e.message]);
    return { success: false };
  }
}

export async function receiveFromSubsidiary(payload: any) {
  const config = getConfig();
  if (config.federation.role !== 'hub') throw new Error('Not a federation hub');
  await getDb();
  const id = uuidv4(); const now = new Date().toISOString();
  execute(`INSERT INTO approvals (id, tenant_id, title, template_code, applicant, applicant_email, form_data, amount, currency, entity, status, current_step, total_steps, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,'federation','pending',0,1,?)`,
    [id, config.tenantId, `[${payload.sourceTenantName}] ${payload.title}`, payload.templateCode, payload.applicantName, payload.applicantEmail, payload.formData, payload.amount, payload.currency, now]);
  execute("INSERT INTO step_records (id, approval_id, tenant_id, step_order, step_name, action) VALUES (?,?,?,1,?,'pending')",
    [uuidv4(), id, config.tenantId, payload.stepName]);
  execute("INSERT INTO federation_log (id, tenant_id, direction, source_tenant, target_tenant, approval_id, action, status, request_body) VALUES (?,?,?,?,?,?,?,?,?)",
    [uuidv4(), config.tenantId, 'inbound', payload.sourceTenantId, config.tenantId, id, 'receive', 'received', JSON.stringify(payload)]);
  return { id };
}
