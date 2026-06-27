import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../auth/MsalProvider';
import { approvalApi, templateApi } from '../api/client';

export default function Home() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [stats, setStats] = useState({ myRequests: 0, pending: 0, approved: 0 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [myRes, pendingRes, approvedRes, tplRes] = await Promise.all([
        approvalApi.list({ pageSize: 3 }), approvalApi.listPending({ pageSize: 1 }),
        approvalApi.list({ status: 'approved', pageSize: 1 }), templateApi.list(),
      ]);
      setStats({ myRequests: myRes.data.total || 0, pending: pendingRes.data.total || 0, approved: approvedRes.data.total || 0 });
      setTemplates(tplRes.data || []);
      setRecent(myRes.data.items?.slice(0, 3) || []);
    } catch (e) { console.error(e); }
  }

  const statusBadge = (s: string) => s === 'approved' ? <span className="badge-sm badge-approved">已通过</span>
    : s === 'rejected' ? <span className="badge-sm badge-rejected">已驳回</span>
    : <span className="badge-sm badge-pending">待审批</span>;

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center justify-between px-4 py-3">
        <span className="text-base font-semibold text-black tracking-tight">OA 审批</span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/vault')} className="text-xs text-gray-400">保险箱</button>
          <div onClick={logout} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',boxShadow:'0 3px 10px rgba(99,102,241,0.3)'}}>
            {user?.name?.[0] || 'U'}</div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-black tracking-tight mb-0.5">下午好</h1>
        <p className="text-xs text-gray-400 mb-4">{user?.name}{user?.tenantName ? ' · ' + user.tenantName : ''}</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="stat-3d"><p className="text-[10px] text-gray-400">我发起的</p><p className="text-2xl font-bold text-black">{stats.myRequests}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">待审批</p><p className="text-2xl font-bold text-indigo-500">{stats.pending}</p></div>
          <div className="stat-3d"><p className="text-[10px] text-gray-400">已通过</p><p className="text-2xl font-bold text-emerald-400">{stats.approved}</p></div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => navigate('/submit')} className="btn-3d btn-primary-3d flex-1">+ 提交审批</button>
          <button onClick={() => navigate('/my-requests')} className="btn-3d btn-secondary-3d flex-1">我的申请</button>
        </div>

        <h3 className="text-sm font-semibold text-black mb-2">快速发起</h3>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {templates.map((t: any) => (
            <button key={t.id} onClick={() => navigate(`/submit?template=${t.template_code}`)}
              className="pill">{t.template_name}</button>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-black mb-2">最近审批</h3>
        <div className="card-3d">
          {recent.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">暂无记录</p> :
            recent.map((item: any) => (
              <div key={item.id} onClick={() => navigate(`/detail/${item.id}`)}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 cursor-pointer">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">📄</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.title}</p><p className="text-[10px] text-gray-400">¥{item.amount?.toLocaleString()} · {item.submitted_at?.slice(0,10)}</p></div>
                {statusBadge(item.status)}
              </div>
            ))
          }
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="nav-glass fixed bottom-0 left-0 right-0 flex justify-around py-2 z-20">
        {[{p:'/',l:'首页',i:'🏠'},{p:'/pending',l:'待审批',i:'📋'},{p:'/submit',l:'提交',i:'✍️'},{p:'/finance',l:'财务',i:'📊'},{p:'/vault',l:'文件',i:'🔒'}].map(x=>(
          <button key={x.p} onClick={()=>navigate(x.p)} className="flex flex-col items-center px-3 py-1">
            <span className="text-lg">{x.i}</span><span className="text-[10px] text-gray-400">{x.l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
