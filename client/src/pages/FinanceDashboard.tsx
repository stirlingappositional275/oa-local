import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi, exportApi } from '../api/client';

export default function FinanceDashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState('');
  const [entity, setEntity] = useState(''); const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await searchApi.search({ dateFrom: dateFrom||undefined, dateTo: dateTo||undefined, entity: entity||undefined, status: status||undefined, pageSize: 100 });
    setItems(res.data.items||[]);
  }

  async function doExport() {
    setExporting(true);
    try {
      const res = await exportApi.exportData({ dateFrom: dateFrom||undefined, dateTo: dateTo||undefined, entity: entity||undefined, status: status||undefined });
      const blob = new Blob([res.data],{type:'application/octet-stream'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'oa-export.enc'; a.click();
      alert('导出成功！解密密钥已发送到您的企业邮箱。');
    } catch { alert('导出失败'); }
    finally { setExporting(false); }
  }

  const totalAmount = items.reduce((s:number,i:any)=>s+(i.amount||0),0);

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="text-base font-semibold text-black">财务看板</span>
        <button onClick={doExport} disabled={exporting} className="btn-3d btn-primary-3d text-xs px-4 py-2">{exporting?'导出中...':'📥 导出'}</button>
      </div>
      <div className="px-4 pt-3 pb-20 max-w-lg mx-auto">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="stat-3d"><p className="text-[10px] text-gray-400">记录数</p><p className="text-lg font-bold">{items.length}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">总金额</p><p className="text-lg font-bold text-indigo-500">¥{totalAmount.toLocaleString()}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">已通过</p><p className="text-lg font-bold text-emerald-400">{items.filter(i=>i.status==='approved').length}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">待审批</p><p className="text-lg font-bold text-amber-400">{items.filter(i=>i.status==='pending').length}</p></div>
        </div>
        <div className="flex gap-2 mb-3">
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="input-3d flex-1 text-xs" />
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="input-3d flex-1 text-xs" />
          <select value={entity} onChange={e=>setEntity(e.target.value)} className="input-3d text-xs bg-white"><option value="">全部</option><option>expense</option><option>payment</option><option>seal</option><option>borrowing</option><option>contract</option></select>
          <button onClick={load} className="btn-3d bg-gray-800 text-white text-xs px-4">筛选</button>
        </div>
        <div className="card-3d space-y-1">
          {items.slice(0,30).map(item => (
            <div key={item.id} onClick={()=>nav(`/detail/${item.id}`)} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0 cursor-pointer text-xs">
              <span className="flex-1 truncate">{item.title}</span><span className="text-gray-400">{item.applicant}</span>
              <span className="font-medium">¥{item.amount?.toLocaleString()}</span>
              <span className={item.status==='approved'?'text-emerald-500':item.status==='rejected'?'text-red-400':'text-amber-500'}>
                {item.status==='approved'?'通过':item.status==='rejected'?'驳回':'待审'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
