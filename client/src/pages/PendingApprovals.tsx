import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../api/client';

export default function PendingApprovals() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { approvalApi.listPending().then(r => setItems(r.data.items||[])); }, []);

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center px-4 py-3 gap-3">
        <button onClick={() => nav(-1)} className="text-indigo-500 font-medium text-sm">← 返回</button>
        <span className="text-base font-semibold text-black">待我审批</span>
      </div>
      <div className="px-4 pt-3 pb-20 max-w-lg mx-auto">
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} onClick={() => nav(`/detail/${item.id}`)} className="card-3d cursor-pointer" style={{borderLeft:'3px solid #6366f1'}}>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-medium">{item.pending_step_name}</span>
              <h3 className="text-sm font-medium text-black mt-2 truncate">{item.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{item.applicant} · ¥{item.amount?.toLocaleString()} · {item.submitted_at?.slice(0,10)}</p>
            </div>
          ))}
          {items.length===0 && <p className="text-center text-gray-400 text-sm py-8">🎉 没有待审批的申请</p>}
        </div>
      </div>
    </div>
  );
}
