/**
 * Database schema initialization (sql.js version).
 */

import { Database as SqlJsDatabase } from 'sql.js';
import { executeMany, queryOne } from './connection';
import { initFileVault } from '../services/file-vault';
import { initAuditLog } from '../services/audit';
import { initRbac } from '../middleware/rbac';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS approvals (
  id              TEXT PRIMARY KEY NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'parent',
  title           TEXT NOT NULL,
  template_code   TEXT NOT NULL,
  applicant       TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  form_data       TEXT NOT NULL DEFAULT '{}',
  amount          REAL DEFAULT 0,
  currency        TEXT DEFAULT 'CNY',
  department      TEXT,
  entity          TEXT NOT NULL DEFAULT 'expense',
  status          TEXT NOT NULL DEFAULT 'pending',
  current_step    INTEGER NOT NULL DEFAULT 0,
  total_steps     INTEGER NOT NULL DEFAULT 1,
  att_link        TEXT,
  att_state       TEXT DEFAULT 'none',
  feedback_link   TEXT,
  feedback_state  TEXT DEFAULT 'none',
  dept_head_email TEXT,
  finance_email   TEXT,
  mgr_email       TEXT,
  president_email TEXT,
  group_ceo_email TEXT,
  sub_ceo_email   TEXT,
  lang            TEXT DEFAULT 'zh',
  resend_flag     TEXT DEFAULT '0',
  submitted_at    TEXT NOT NULL,
  resolved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_applicant ON approvals(tenant_id, applicant_email);
CREATE INDEX IF NOT EXISTS idx_approvals_submitted ON approvals(tenant_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS templates (
  id              TEXT PRIMARY KEY NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'parent',
  template_name   TEXT NOT NULL,
  template_code   TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL,
  icon            TEXT,
  form_config     TEXT NOT NULL DEFAULT '[]',
  approval_config TEXT NOT NULL DEFAULT '[]',
  is_enabled      INTEGER NOT NULL DEFAULT 1,
  scope           TEXT NOT NULL DEFAULT 'tenant',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_tenant ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_code ON templates(tenant_id, template_code);

CREATE TABLE IF NOT EXISTS step_records (
  id              TEXT PRIMARY KEY NOT NULL,
  approval_id     TEXT NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'parent',
  step_order      INTEGER NOT NULL,
  step_name       TEXT NOT NULL,
  approver        TEXT,
  approver_email  TEXT,
  action          TEXT DEFAULT 'pending',
  comment         TEXT,
  acted_at        TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (approval_id) REFERENCES approvals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_steps_approval ON step_records(approval_id);
CREATE INDEX IF NOT EXISTS idx_steps_tenant ON step_records(tenant_id);

CREATE TABLE IF NOT EXISTS report_lines (
  id              TEXT PRIMARY KEY NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'parent',
  employee_name   TEXT NOT NULL,
  employee_email  TEXT NOT NULL UNIQUE,
  manager_email   TEXT,
  dept_head_email TEXT,
  department      TEXT,
  level           INTEGER DEFAULT 1,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reportlines_tenant ON report_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reportlines_email ON report_lines(tenant_id, employee_email);

CREATE TABLE IF NOT EXISTS federation_log (
  id              TEXT PRIMARY KEY NOT NULL,
  tenant_id       TEXT NOT NULL DEFAULT 'parent',
  direction       TEXT NOT NULL,
  source_tenant   TEXT,
  target_tenant   TEXT,
  approval_id     TEXT,
  action          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'sent',
  request_body    TEXT,
  response_body   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fedlog_tenant ON federation_log(tenant_id);
`;

const DEFAULT_TEMPLATES = [
  ['tpl-expense', 'parent', '费用报销', 'expense', '报销', '💰',
   '[{"field":"amount","label":"报销金额","type":"number","required":true},{"field":"currency","label":"币种","type":"select","options":["CNY","USD","EUR","JPY","AED"],"required":true},{"field":"pay_type","label":"付款方式","type":"select","options":["现金","银行转账","信用卡","其他"]},{"field":"payee","label":"收款方","type":"text","required":true},{"field":"reason","label":"报销事由","type":"textarea","required":true}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"},{"order":2,"name":"财务审核","role":"finance","scope":"tenant"},{"order":3,"name":"CFO终审","role":"group_cfo","scope":"tenant"}]',
   1, 'tenant'],
  ['tpl-seal', 'parent', '用印申请', 'seal', '用印', '🔖',
   '[{"field":"seal_entity","label":"用印实体","type":"text","required":true},{"field":"seal_reason","label":"用印事由","type":"textarea","required":true},{"field":"copies","label":"用印份数","type":"number","required":true}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"},{"order":2,"name":"总裁审批","role":"president","scope":"tenant"}]',
   1, 'tenant'],
  ['tpl-payment', 'parent', '付款申请', 'payment', '付款', '💳',
   '[{"field":"pay_title","label":"付款标题","type":"text","required":true},{"field":"pay_amount","label":"付款金额","type":"number","required":true},{"field":"pay_currency","label":"币种","type":"select","options":["CNY","USD","EUR"],"required":true},{"field":"payee_full","label":"收款方全称","type":"text","required":true},{"field":"pay_purpose","label":"付款用途","type":"textarea","required":true}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"},{"order":2,"name":"财务审核","role":"finance","scope":"tenant"},{"order":3,"name":"总裁审批","role":"president","scope":"tenant"}]',
   1, 'tenant'],
  ['tpl-borrowing', 'parent', '借款申请', 'borrowing', '借款', '💵',
   '[{"field":"borrow_amount","label":"借款金额","type":"number","required":true},{"field":"borrow_currency","label":"币种","type":"select","options":["CNY","USD"],"required":true},{"field":"borrower","label":"借款人","type":"text","required":true},{"field":"borrow_reason","label":"借款事由","type":"textarea","required":true},{"field":"return_date","label":"预计归还日期","type":"date"}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"},{"order":2,"name":"财务审核","role":"finance","scope":"tenant"},{"order":3,"name":"总裁审批","role":"president","scope":"tenant"}]',
   1, 'tenant'],
  ['tpl-contract', 'parent', '合同审批', 'contract', '合同', '📄',
   '[{"field":"contract_name","label":"合同名称","type":"text","required":true},{"field":"contract_party","label":"合同对方","type":"text","required":true},{"field":"contract_amount","label":"合同金额","type":"number","required":true},{"field":"contract_currency","label":"币种","type":"select","options":["CNY","USD","EUR"],"required":true},{"field":"contract_type","label":"合同类型","type":"select","options":["采购合同","销售合同","服务合同","租赁合同","其他"]},{"field":"contract_desc","label":"合同摘要","type":"textarea","required":true}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"},{"order":2,"name":"法务审核","role":"legal","scope":"tenant"},{"order":3,"name":"总裁审批","role":"president","scope":"tenant"}]',
   1, 'tenant'],
  ['tpl-leave', 'parent', '请假申请', 'leave_request', '请假', '🏖️',
   '[{"field":"leave_type","label":"请假类型","type":"select","options":["年假","病假","事假","婚假","产假","其他"],"required":true},{"field":"start_date","label":"开始日期","type":"date","required":true},{"field":"start_hour","label":"开始时间","type":"select","options":["上午","下午"]},{"field":"end_date","label":"结束日期","type":"date","required":true},{"field":"end_hour","label":"结束时间","type":"select","options":["上午","下午"]},{"field":"reason","label":"请假原因","type":"textarea"}]',
   '[{"order":1,"name":"部门负责人","role":"dept_head","scope":"tenant"}]',
   1, 'tenant'],
];

const DEFAULT_REPORT_LINE = [
  'rpt-001', 'parent', '示例用户', 'user@example.com', 'manager@example.com', 'dept-head@example.com', '示例部门', 1,
];

export function initializeSchema(db: SqlJsDatabase): void {
  console.log('[DB] Initializing schema...');

  // Execute schema creation
  db.run(SCHEMA_SQL);

  // Check if templates exist
  const tplCount = queryOne('SELECT COUNT(*) as count FROM templates');
  if (!tplCount || tplCount.count === 0) {
    console.log('[DB] Inserting default templates...');
    const insertTpl = 'INSERT OR IGNORE INTO templates (id, tenant_id, template_name, template_code, category, icon, form_config, approval_config, is_enabled, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    for (const t of DEFAULT_TEMPLATES) {
      db.run(insertTpl, t);
    }
  }

  // Insert sample report line
  const rptCount = queryOne('SELECT COUNT(*) as count FROM report_lines');
  if (!rptCount || rptCount.count === 0) {
    console.log('[DB] Inserting sample report line...');
    db.run(
      'INSERT OR IGNORE INTO report_lines (id, tenant_id, employee_name, employee_email, manager_email, dept_head_email, department, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      DEFAULT_REPORT_LINE
    );
  }

  console.log('[DB] Schema initialization complete.');

  // Initialize new modules
  initFileVault();
  initAuditLog();
  initRbac();
  console.log('[DB] File vault, audit log, RBAC initialized.');
}

export default { initializeSchema };
