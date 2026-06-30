/**
 * Simple i18n — matches original system's crd22_gblLang (zh/en)
 */
export type Lang = 'zh' | 'en';

const STRINGS: Record<string, Record<Lang, string>> = {
  appName: { zh: 'OA 审批', en: 'OA Approval' },
  login: { zh: '使用 Microsoft 账号登录', en: 'Sign in with Microsoft' },
  loginFooter: { zh: '企业级安全 · 无需额外注册', en: 'Enterprise-grade security · No registration needed' },
  homeHi: { zh: '下午好', en: 'Good afternoon' },
  dept: { zh: '技术部', en: 'Engineering' },
  myRequests: { zh: '我发起的', en: 'My Requests' },
  pending: { zh: '待审批', en: 'Pending' },
  approved: { zh: '已通过', en: 'Approved' },
  rejected: { zh: '已驳回', en: 'Rejected' },
  submitApproval: { zh: '提交审批', en: 'Submit' },
  myApplications: { zh: '我的申请', en: 'My Applications' },
  quickStart: { zh: '快速发起', en: 'Quick Start' },
  recent: { zh: '最近审批', en: 'Recent' },
  noRecords: { zh: '暂无记录', en: 'No records' },
  back: { zh: '← 返回', en: '← Back' },
  approvalDetail: { zh: '审批详情', en: 'Approval Detail' },
  applicant: { zh: '申请人', en: 'Applicant' },
  amount: { zh: '金额', en: 'Amount' },
  currency: { zh: '币种', en: 'Currency' },
  submitTime: { zh: '提交时间', en: 'Submitted' },
  formInfo: { zh: '表单信息', en: 'Form Data' },
  approvalProgress: { zh: '审批进度', en: 'Progress' },
  attachments: { zh: '附件', en: 'Attachments' },
  previewOnly: { zh: '文件仅支持在线预览', en: 'Preview only · Download disabled' },
  downloadBlocked: { zh: '下载功能已禁用 · 右键另存无效', en: 'Download blocked · Save-as disabled' },
  approve: { zh: '通过', en: 'Approve' },
  reject: { zh: '驳回', en: 'Reject' },
  commentPlaceholder: { zh: '审批意见（可选）', en: 'Comment (optional)' },
  fileVault: { zh: '文件保险箱', en: 'File Vault' },
  vaultMode: { zh: '保险箱模式 · 只进不出', en: 'Vault Mode · Upload Only' },
  vaultRule1: { zh: '普通附件 — 锁存不可下载', en: 'Regular — stored, download blocked' },
  vaultRule2: { zh: '用印凭证 — 审批通过后邮件发送', en: 'Seal receipt — emailed on approval' },
  vaultRule3: { zh: '付款凭证 — 邮件发送申请人+财务', en: 'Payment receipt — emailed to applicant+finance' },
  vaultRule4: { zh: '合同文件 — 邮件发送申请人+法务', en: 'Contract — emailed to applicant+legal' },
  vaultRule5: { zh: '保密文件 — 仅管理员审计查看', en: 'Confidential — admin audit only' },
  financeDashboard: { zh: '财务看板', en: 'Finance Dashboard' },
  totalRecords: { zh: '记录数', en: 'Records' },
  totalAmount: { zh: '总金额', en: 'Total' },
  export: { zh: '导出', en: 'Export' },
  selectTemplate: { zh: '选择模板', en: 'Select Template' },
  titlePlaceholder: { zh: '审批标题', en: 'Approval title' },
  submitBtn: { zh: '提交审批', en: 'Submit Approval' },
  logout: { zh: '退出登录', en: 'Log out' },
  home: { zh: '首页', en: 'Home' },
  submitTab: { zh: '提交', en: 'Submit' },
  financeTab: { zh: '财务', en: 'Finance' },
  vaultTab: { zh: '文件', en: 'Files' },
  pendingTab: { zh: '待审批', en: 'Pending' },
  upload: { zh: '上传', en: 'Upload' },
  all: { zh: '全部', en: 'All' },
  seal: { zh: '用印', en: 'Seal' },
  payment: { zh: '付款', en: 'Payment' },
  contract: { zh: '合同', en: 'Contract' },
  fileTotal: { zh: '文件总数', en: 'Total Files' },
  monthUpload: { zh: '本月上传', en: 'This Month' },
  loading: { zh: '加载中...', en: 'Loading...' },
  notFound: { zh: '未找到', en: 'Not found' },
  allApprovals: { zh: '全部', en: 'All' },
  sealDoc: { zh: '用印凭证', en: 'Seal Doc' },
  paymentDoc: { zh: '付款凭证', en: 'Payment Doc' },
  contractDoc: { zh: '合同文件', en: 'Contract Doc' },
  invoice: { zh: '发票', en: 'Invoice' },
  regular: { zh: '普通附件', en: 'Regular' },
  filter: { zh: '筛选', en: 'Filter' },
  exporting: { zh: '导出中...', en: 'Exporting...' },
  exportSuccess: { zh: '导出成功！解密密钥已发送到您的企业邮箱。', en: 'Export successful! Decryption key sent to your email.' },
  allSet: { zh: '🎉 没有待审批的申请', en: '🎉 No pending approvals' },
};

let _lang: Lang = 'zh';

// Initialize: stored preference > system language
function initLang(): Lang {
  const stored = localStorage.getItem('oa_lang') as Lang | null;
  if (stored === 'zh' || stored === 'en') return stored;
  
  // Detect system language
  const sys = (navigator.language || '').toLowerCase();
  if (sys.startsWith('zh')) return 'en';
  if (sys.startsWith('en')) return 'en';
  
  // Also check navigator.languages for secondary preferences
  const langs = navigator.languages || [];
  for (const l of langs) {
    const ll = l.toLowerCase();
    if (ll.startsWith('zh')) return 'en';
    if (ll.startsWith('en')) return 'en';
  }
  
  return 'en'; // fallback
}

_lang = initLang();

export function getLang(): Lang { return _lang; }
export function setLang(lang: Lang) { _lang = lang; localStorage.setItem('oa_lang', lang); }
export function toggleLang() { setLang(_lang === 'zh' ? 'en' : 'zh'); window.location.reload(); }
export function t(key: string): string {
  return STRINGS[key]?.[_lang] || key;
}
