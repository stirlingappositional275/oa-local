/**
 * Email Service.
 * 
 * Sends emails via SMTP (configured for Microsoft 365 / Exchange Online).
 * Uses nodemailer for transport.
 */

import nodemailer from 'nodemailer';
import { getConfig } from '../config';

let _transporter: nodemailer.Transporter | null = null;

/**
 * Get or create the SMTP transporter.
 */
function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const config = getConfig();

  _transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return _transporter;
}

/**
 * Send an email.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}): Promise<boolean> {
  try {
    const config = getConfig();
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log(`[Email] Sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${options.to}:`, err.message);
    return false;
  }
}

/**
 * Send approval notification email (bilingual — matches original OA system).
 */
export async function sendApprovalNotification(
  to: string,
  approvalTitle: string,
  status: 'approved' | 'rejected',
  lang: 'zh' | 'en' = 'zh',
  comment?: string
): Promise<boolean> {
  const isApproved = status === 'approved';
  const subject = lang === 'en'
    ? `${isApproved ? 'Approved' : 'Rejected'} - ${approvalTitle}`
    : `${isApproved ? '审批已通过' : '审批已驳回'} - ${approvalTitle}`;

  const statusText = lang === 'en' ? (isApproved ? 'Approved' : 'Rejected') : (isApproved ? '已通过' : '已驳回');
  const statusColor = isApproved ? '#3d8756' : '#90534d';
  const emoji = isApproved ? '✅' : '❌';
  const headerText = lang === 'en'
    ? `${emoji} ${statusText}`
    : `${emoji} 审批${statusText}`;
  const bodyText = lang === 'en'
    ? `Your request <b>${approvalTitle}</b> has been ${statusText.toLowerCase()}.`
    : `您的申请 <b>${approvalTitle}</b> ${statusText}。`;
  const commentLabel = lang === 'en' ? 'Comment' : '审批意见';
  const footer = lang === 'en'
    ? 'This email was sent automatically by the OA Approval System. Please do not reply.'
    : '此邮件由 OA 审批系统自动发送，请勿回复。';

  const html = `
    <div style="font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${statusColor}; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${headerText}</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; color: #333;">${bodyText}</p>
        ${comment ? `<p style="color: #666; font-size: 14px;">${commentLabel}：${comment}</p>` : ''}
        <p style="color: #999; font-size: 12px; margin-top: 20px;">${footer}</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send decryption key email for data export.
 */
export async function sendExportKey(
  to: string,
  exportId: string,
  decryptionKey: string,
  lang: 'zh' | 'en' = 'zh'
): Promise<boolean> {
  const subject = lang === 'en'
    ? `Export Decryption Key - ID ${exportId}`
    : `数据导出解密密钥 - 导出编号 ${exportId}`;

  const html = lang === 'en' ? `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #5028c7; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🔐 Data Export Decryption Key</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 14px; color: #333;">You exported approval data at <b>${new Date().toLocaleString('en-US')}</b>.</p>
        <p style="font-size: 14px; color: #333;">Export ID: <b>${exportId}</b></p>
        <div style="background: #fff; border: 2px dashed #5028c7; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0 0 8px 0;">Decryption Key (keep secure, do not share)</p>
          <p style="font-family: monospace; font-size: 18px; color: #5028c7; margin: 0; word-break: break-all;">${decryptionKey}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">⚠️ This key is sent only once. Save it immediately.</p>
      </div>
    </div>
  ` : `
    <div style="font-family: 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #5028c7; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🔐 数据导出解密密钥</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 14px; color: #333;">您于 <b>${new Date().toLocaleString('zh-CN')}</b> 导出了审批数据。</p>
        <p style="font-size: 14px; color: #333;">导出编号：<b>${exportId}</b></p>
        <div style="background: #fff; border: 2px dashed #5028c7; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0 0 8px 0;">解密密钥（请妥善保管，勿转发他人）</p>
          <p style="font-family: monospace; font-size: 18px; color: #5028c7; margin: 0; word-break: break-all;">${decryptionKey}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">⚠️ 此密钥仅发送一次，请立即保存。</p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

export default { sendEmail, sendApprovalNotification, sendExportKey };
