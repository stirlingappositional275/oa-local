/**
 * File Vault Service
 * 
 * Rules:
 * - Upload: all users
 * - Download: blocked by default (API-level intercept)
 * - Preview: Base64 streaming for approvers
 * - Email: dispatched by tag on approval
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDb, queryAll, queryOne, execute } from '../db/connection';
import { encrypt } from '../db/crypto';
import { getConfig } from '../config';

// ━━ Types ━━
export interface FileRecord {
  id: string; tenant_id: string; original_name: string;
  stored_name: string; file_path: string; size: number;
  mime_type: string; tag: string; approval_id: string | null;
  uploaded_by: string; uploaded_at: string;
  download_blocked: number; preview_allowed: number;
}

// Tags and their email rules
const TAG_EMAIL_RULES: Record<string, string[]> = {
  '普通附件': [],
  '用印凭证': ['applicant'],
  '付款凭证': ['applicant', 'finance'],
  '合同文件': ['applicant', 'legal'],
  '发票':     ['applicant', 'finance'],
  '保密文件': [],  // admin only
};

// ━━ Schema init ━━
export function initFileVault() {
  execute(`
    CREATE TABLE IF NOT EXISTS file_vault (
      id TEXT PRIMARY KEY NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'parent',
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT DEFAULT 'application/octet-stream',
      tag TEXT DEFAULT '普通附件',
      approval_id TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      download_blocked INTEGER NOT NULL DEFAULT 1,
      preview_allowed INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (approval_id) REFERENCES approvals(id)
    );
    CREATE INDEX IF NOT EXISTS idx_filevault_tenant ON file_vault(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_filevault_approval ON file_vault(approval_id);
    CREATE INDEX IF NOT EXISTS idx_filevault_tag ON file_vault(tenant_id, tag);
  `);
}

// ━━ Upload ━━
export function saveFileRecord(input: {
  tenantId: string; originalName: string; storedName: string;
  filePath: string; size: number; mimeType: string;
  tag: string; approvalId?: string; uploadedBy: string;
}): FileRecord {
  const id = uuidv4();
  execute(`INSERT INTO file_vault (id, tenant_id, original_name, stored_name, file_path, size, mime_type, tag, approval_id, uploaded_by, download_blocked, preview_allowed)
    VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
    [id, input.tenantId, input.originalName, input.storedName, input.filePath, input.size, input.mimeType, input.tag, input.approvalId || null, input.uploadedBy]);
  return queryOne('SELECT * FROM file_vault WHERE id = ?', [id]) as FileRecord;
}

// ━━ List ━━
export function listFiles(tenantId: string, tag?: string, approvalId?: string) {
  let where = 'WHERE tenant_id = ?';
  const args: any[] = [tenantId];
  if (tag) { where += ' AND tag = ?'; args.push(tag); }
  if (approvalId) { where += ' AND approval_id = ?'; args.push(approvalId); }
  return queryAll(`SELECT * FROM file_vault ${where} ORDER BY uploaded_at DESC LIMIT 100`, args);
}

// ━━ Get by ID ━━
export function getFileById(id: string, tenantId: string): FileRecord | null {
  return queryOne('SELECT * FROM file_vault WHERE id = ? AND tenant_id = ?', [id, tenantId]) as FileRecord;
}

// ━━ Preview (read file as base64) ━━
export function getFilePreview(id: string, tenantId: string): { mimeType: string; base64: string; name: string } | null {
  const file = getFileById(id, tenantId);
  if (!file) return null;
  try {
    const data = fs.readFileSync(file.file_path);
    return { mimeType: file.mime_type, base64: data.toString('base64'), name: file.original_name };
  } catch { return null; }
}

// ━━ Download (blocked by default — admin only) ━━
export function getFileForDownload(id: string, tenantId: string, isAdmin: boolean): { data: Buffer; mimeType: string; name: string } | null {
  const file = getFileById(id, tenantId);
  if (!file) return null;
  if (file.download_blocked && !isAdmin) return null;  // blocked
  try {
    return { data: fs.readFileSync(file.file_path), mimeType: file.mime_type, name: file.original_name };
  } catch { return null; }
}

// ━━ Get email recipients for a tag ━━
export function getEmailRecipientsForTag(tag: string, approval: any): string[] {
  const roles = TAG_EMAIL_RULES[tag] || [];
  const recipients: string[] = [];
  for (const role of roles) {
    if (role === 'applicant' && approval?.applicant_email) {
      recipients.push(approval.applicant_email);
    }
    if (role === 'finance' && approval?.finance_email) {
      recipients.push(approval.finance_email);
    }
    if (role === 'legal') {
      // Legal email from approval record or tenant config
      recipients.push(approval?.president_email || '');
    }
  }
  return [...new Set(recipients)];
}

// ━━ Stats ━━
export function getFileStats(tenantId: string) {
  const total = queryOne('SELECT COUNT(*) as count FROM file_vault WHERE tenant_id = ?', [tenantId]) as any;
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = queryOne("SELECT COUNT(*) as count FROM file_vault WHERE tenant_id = ? AND uploaded_at >= ?", [tenantId, monthStart.toISOString()]) as any;
  const byTag = queryAll('SELECT tag, COUNT(*) as count FROM file_vault WHERE tenant_id = ? GROUP BY tag', [tenantId]);
  return { total: total?.count || 0, thisMonth: thisMonth?.count || 0, byTag };
}

export default { initFileVault, saveFileRecord, listFiles, getFileById, getFilePreview, getFileForDownload, getEmailRecipientsForTag, getFileStats };
