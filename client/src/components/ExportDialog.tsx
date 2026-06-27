import React, { useState } from 'react';
import { exportApi } from '../api/client';

interface Props {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entity, setEntity] = useState('');
  const [status, setStatus] = useState('');

  async function handleExport() {
    setExporting(true);
    setError('');
    setMessage('');

    try {
      const response = await exportApi.exportData({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        entity: entity || undefined,
        status: status || undefined,
      });

      // Download the encrypted file
      const blob = new Blob([response.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from header or use default
      const disposition = response.headers['content-disposition'];
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || 'oa-export.enc';
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      const exportId = response.headers['x-export-id'] || '';
      setMessage(`导出成功！加密文件已下载。解密密钥已发送到您的企业邮箱。导出编号：${exportId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">加密导出数据</h2>
          <button onClick={onClose} className="text-muted hover:text-gray-600 text-lg">✕</button>
        </div>

        <p className="text-sm text-muted mb-4">
          导出的数据将以 AES-256 加密打包下载。解密密钥将发送到您的 Microsoft 企业邮箱。
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-muted mb-1 block">开始日期</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">结束日期</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">审批类型</label>
            <select value={entity} onChange={e => setEntity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none">
              <option value="">全部</option>
              <option value="expense">报销</option>
              <option value="payment">付款</option>
              <option value="borrowing">借款</option>
              <option value="contract">合同</option>
              <option value="seal">用印</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">状态</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none">
              <option value="">全部</option>
              <option value="approved">已通过</option>
              <option value="pending">待审批</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-error mb-3">{error}</p>}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-success">{message}</p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-accent hover:bg-accent-light disabled:bg-gray-300 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {exporting ? '导出中...' : '🔐 加密导出'}
        </button>
      </div>
    </div>
  );
}
