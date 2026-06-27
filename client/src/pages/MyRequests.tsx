import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../api/client';

export default function MyRequests() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { approvalApi.list({ status: filter || undefined }).then(r => setItems(r.data.items||[])); }, [filter]);

  const badge = (s: string) => s === 'approved' ? <span className="badge-sm badge-approved">已通过</span>
    : s === 'rejected' ? <span className="badge-sm badge-rejected">已驳回</span> : <span className="badge-sm badge-pending">待审批</span>;

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center px-4 py-3 gap-3">
        <button onClick={() => nav(-1)} className="text-indigo-500 font-medium text-sm">← 返回</button>
        <span className="text-base font-semibold text-black">我的申请</span>
      </div>
      <div className="px-4 pt-3 pb-20 max-w-lg mx-auto">
        <div className="flex gap-2 mb-4">{['','pending','approved','rejected'].map(s => (
          <button key={s} onClick={()=>setFilter(s)} className={`pill ${filter===s?'pill-active':''}`}>{s===''?'全部':s==='pending'?'待审批':s==='approved'?'已通过':'已驳回'}</button>
        ))}</div>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} onClick={() => nav(`/detail/${item.id}`)} className="card-3d cursor-pointer">
              <div className="flex justify-between items-start"><h3 className="text-sm font-medium text-black truncate flex-1">{item.title}</h3>{badge(item.status)}</div>
              <p className="text-xs text-gray-400 mt-1">¥{item.amount?.toLocaleString()} · {item.entity} · {item.submitted_at?.slice(0,10)}</p>
            </div>
          ))}
          {items.length===0 && <p className="text-center text-gray-400 text-sm py-8">暂无记录</p>}
        </div>
      </div>
    </div>
  );
}
