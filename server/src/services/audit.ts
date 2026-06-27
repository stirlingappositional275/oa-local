/**
 * Audit Logging Service
 * Records all sensitive operations: login, approval, file access, export, admin actions.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, execute } from '../db/connection';

export function initAuditLog() {
  execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'parent',
      user_email TEXT NOT NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      detail TEXT,
      ip_address TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(tenant_id, user_email);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(tenant_id, action);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC);
  `);
}

export function logAction(input: {
  tenantId: string; userEmail: string; userName?: string;
  action: string; resourceType?: string; resourceId?: string;
  detail?: string; ip?: string; success?: boolean;
}) {
  execute(`INSERT INTO audit_log (id, tenant_id, user_email, user_name, action, resource_type, resource_id, detail, ip_address, success)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [uuidv4(), input.tenantId, input.userEmail, input.userName || '', input.action,
     input.resourceType || '', input.resourceId || '', input.detail || '',
     input.ip || '', input.success !== false ? 1 : 0]);
}

export function queryAuditLog(tenantId: string, filters: {
  userEmail?: string; action?: string; dateFrom?: string; dateTo?: string;
  page?: number; pageSize?: number;
}) {
  const page = filters.page || 1, pageSize = filters.pageSize || 50, offset = (page-1)*pageSize;
  let where = 'WHERE tenant_id = ?'; const args: any[] = [tenantId];
  if (filters.userEmail) { where += ' AND user_email = ?'; args.push(filters.userEmail); }
  if (filters.action) { where += ' AND action = ?'; args.push(filters.action); }
  if (filters.dateFrom) { where += ' AND created_at >= ?'; args.push(filters.dateFrom); }
  if (filters.dateTo) { where += ' AND created_at <= ?'; args.push(filters.dateTo); }
  const cnt = queryOne(`SELECT COUNT(*) as total FROM audit_log ${where}`, args) as any;
  const rows = queryAll(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...args, pageSize, offset]);
  return { items: rows, total: cnt?.total || 0, page, pageSize, totalPages: Math.ceil((cnt?.total||0)/pageSize) };
}

export default { initAuditLog, logAction, queryAuditLog };
