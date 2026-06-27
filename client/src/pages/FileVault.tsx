import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function FileVault() {
  const nav = useNavigate();
  const [files, setFiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [tag, setTag] = useState('');

  useEffect(() => { load(); }, [tag]);

  async function load() {
    try {
      const [fRes, sRes] = await Promise.all([
        apiClient.get('/vault', { params: { tag: tag || undefined } }),
        apiClient.get('/vault/stats'),
      ]);
      setFiles(fRes.data || []);
      setStats(sRes.data || { total: 0, thisMonth: 0 });
    } catch (e) { console.error(e); }
  }

  const tagBadge = (t: string) => {
    const colors: Record<string,string> = { '用印凭证':'bg-amber-50 text-amber-600','付款凭证':'bg-emerald-50 text-emerald-600','合同文件':'bg-blue-50 text-blue-600','发票':'bg-indigo-50 text-indigo-600','普通附件':'bg-gray-100 text-gray-500' };
    return <span className={`badge-sm ${colors[t]||'bg-gray-100 text-gray-500'}`}>{t}</span>;
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="text-base font-semibold text-black">文件保险箱</span>
        <button onClick={() => nav('/submit')} className="text-xs text-indigo-500 font-medium">上传</button>
      </div>
      <div className="px-4 pt-3 pb-20 max-w-lg mx-auto">
        <div className="flex rounded-xl p-0.5 bg-gray-200 mb-3">
          {['','用印凭证','付款凭证','合同文件'].map(t => (
            <button key={t} onClick={()=>setTag(t)} className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium ${tag===t?'bg-white text-black shadow-sm':'text-gray-400'}`}>{t||'全部'}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="stat-3d"><p className="text-[10px] text-gray-400">文件总数</p><p className="text-xl font-bold text-black">{stats.total}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">本月上传</p><p className="text-xl font-bold text-indigo-500">{stats.thisMonth}</p></div>
        </div>
        <div className="card-3d">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-xl">📄</span>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{f.original_name}</p><p className="text-[10px] text-gray-400">{Math.round(f.size/1024)}KB · {f.uploaded_at?.slice(0,10)}</p></div>
              {tagBadge(f.tag)}
            </div>
          ))}
          {files.length===0 && <p className="text-center text-gray-400 text-xs py-6">暂无文件</p>}
        </div>
        <div className="mt-3 rounded-2xl p-4" style={{background:'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.02))',border:'0.5px solid rgba(99,102,241,0.1)'}}>
          <h4 className="text-xs font-semibold text-indigo-500 mb-2">🔒 保险箱模式 · 只进不出</h4>
          <ul className="text-[10px] text-gray-500 space-y-1">
            <li>· 普通附件 — 锁存不可下载</li>
            <li>· 用印凭证 — 审批通过后邮件发送</li>
            <li>· 付款凭证 — 邮件发送申请人+财务</li>
            <li>· 合同文件 — 邮件发送申请人+法务</li>
            <li>· 保密文件 — 仅管理员审计查看</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
