import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approvalApi } from '../api/client';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => { if (id) approvalApi.getById(id).then(r => setApproval(r.data)).finally(() => setLoading(false)); }, [id]);

  async function handle(action: 'approve' | 'reject') {
    setActing(true);
    try {
      if (action === 'approve') await approvalApi.approve(id!, comment);
      else await approvalApi.reject(id!, comment);
      navigate('/pending');
    } catch (e: any) { alert(e.response?.data?.error || '操作失败'); }
    finally { setActing(false); }
  }

  if (loading) return <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center text-gray-400">加载中...</div>;
  if (!approval) return <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center text-gray-400">未找到</div>;

  const isPending = approval.status === 'pending';
  const badge = approval.status === 'approved' ? <span className="badge-sm badge-approved">已通过</span>
    : approval.status === 'rejected' ? <span className="badge-sm badge-rejected">已驳回</span>
    : <span className="badge-sm badge-pending">待审批</span>;

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center px-4 py-3 gap-3">
        <button onClick={() => navigate(-1)} className="text-indigo-500 font-medium text-sm">← 返回</button>
        <span className="text-base font-semibold text-black tracking-tight">审批详情</span>
      </div>

      <div className="px-4 pt-3 pb-24 max-w-lg mx-auto space-y-3">
        {/* Info */}
        <div className="card-3d card-elevated" style={{borderLeft:'3px solid #6366f1'}}>
          <div className="flex justify-between items-start mb-3"><h2 className="text-lg font-semibold text-black">{approval.title}</h2>{badge}</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div><span className="text-gray-400">申请人</span><br/>{approval.applicant}</div>
            <div><span className="text-gray-400">金额</span><br/><b className="text-indigo-500">¥{approval.amount?.toLocaleString()}</b></div>
            <div><span className="text-gray-400">币种</span><br/>{approval.currency}</div>
            <div><span className="text-gray-400">提交时间</span><br/>{approval.submitted_at?.slice(0,16)}</div>
          </div>
          <p className="text-[10px] text-gray-400 mb-1">表单信息</p>
          <div className="text-xs text-gray-600 leading-relaxed">
            {approval.form_data && Object.entries(approval.form_data).map(([k,v]:[string,any]) => (
              <span key={k} className="mr-3">{k}: {String(v)}</span>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="card-3d card-elevated">
          <h3 className="text-sm font-semibold text-black mb-3">审批进度</h3>
          {approval.steps?.map((step: any, idx: number) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={step.action === 'approved' ? 'step-dot step-done' : step.action === 'rejected' ? 'step-dot' : idx === approval.current_step ? 'step-dot step-current' : 'step-dot step-wait'}>
                  {step.action === 'approved' ? '✓' : step.action === 'rejected' ? '✗' : idx + 1}
                </div>
                {idx < (approval.steps?.length || 0) - 1 && (
                  <div className={step.action === 'approved' ? 'step-line step-line-done' : 'step-line step-line-wait'}></div>
                )}
              </div>
              <div className="pb-2 flex-1">
                <p className="text-xs font-medium text-black">{step.step_name}</p>
                {step.action !== 'pending' && <p className="text-[10px] text-gray-400">{step.approver} · {step.action === 'approved' ? '通过' : '驳回'} {step.acted_at?.slice(0,10)}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Attachments */}
        {approval.att_state === 'uploaded' && (
          <div className="card-3d card-elevated">
            <h3 className="text-sm font-semibold text-black mb-2">附件</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs"><span className="text-xl">📎</span><span>发票.pdf</span><span className="text-gray-400">245 KB</span><span className="text-indigo-500 ml-auto">预览 ›</span></div>
            </div>
            <div className="text-center py-4">
              <div className="text-3xl mb-1 opacity-30">🔒</div>
              <p className="text-xs font-semibold text-gray-400">文件仅支持在线预览</p>
              <p className="text-[10px] text-gray-300">下载功能已禁用 · 右键另存无效</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="card-3d card-elevated space-y-3">
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="审批意见（可选）" rows={2}
              className="input-3d resize-none text-sm" />
            <div className="flex gap-2">
              <button onClick={() => handle('approve')} disabled={acting} className="btn-3d btn-success-3d flex-1">✓ 通过</button>
              <button onClick={() => handle('reject')} disabled={acting} className="btn-3d btn-danger-3d flex-1">✗ 驳回</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
