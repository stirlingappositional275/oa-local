import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { templateApi, approvalApi } from '../api/client';

export default function Submit() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [tpls, setTpls] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [form, setForm] = useState<Record<string,any>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { templateApi.list().then(r => {
    setTpls(r.data);
    const pre = sp.get('template');
    if (pre) { const t = r.data.find((x:any) => x.template_code === pre); if (t) setSel(t); }
  }); }, []);

  function setField(f: string, v: any) { setForm(prev => ({...prev, [f]: v})); }

  async function submit() {
    if (!title.trim() || !sel) { setErr('请填写标题并选择模板'); return; }
    setLoading(true); setErr('');
    try {
      const amount = Number(form.amount || form.pay_amount || form.borrow_amount || form.contract_amount || 0);
      await approvalApi.create({ title: title.trim(), templateCode: sel.template_code, formData: form, amount, currency: form.currency || 'CNY', entity: sel.template_code });
      nav('/my-requests');
    } catch (e: any) { setErr(e.response?.data?.error || '提交失败'); }
    finally { setLoading(false); }
  }

  const renderField = (f: any) => {
    const v = form[f.field] ?? '';
    if (f.type === 'textarea') return <textarea value={v} onChange={e => setField(f.field, e.target.value)} placeholder={f.label} rows={2} className="input-3d resize-none text-sm" />;
    if (f.type === 'select') return <select value={v} onChange={e => setField(f.field, e.target.value)} className="input-3d text-sm bg-white"><option value="">请选择</option>{f.options?.map((o:string) => <option key={o} value={o}>{o}</option>)}</select>;
    if (f.type === 'date') return <input type="date" value={v} onChange={e => setField(f.field, e.target.value)} className="input-3d text-sm" />;
    return <input type={f.type||'text'} value={v} onChange={e => setField(f.field, f.type==='number'?Number(e.target.value):e.target.value)} placeholder={f.label} className="input-3d text-sm" />;
  };

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="nav-glass sticky top-0 z-10 flex items-center px-4 py-3 gap-3">
        <button onClick={() => nav(-1)} className="text-indigo-500 font-medium text-sm">← 返回</button>
        <span className="text-base font-semibold text-black">提交审批</span>
      </div>
      <div className="px-4 pt-3 pb-24 max-w-lg mx-auto space-y-4">
        <p className="text-xs text-gray-400 mb-1">选择模板</p>
        <div className="flex flex-wrap gap-2">{tpls.map((t:any) => (
          <button key={t.id} onClick={() => { setSel(t); setForm({}); setErr(''); }}
            className={`pill ${sel?.id===t.id?'pill-active':''}`}>{t.template_name}</button>
        ))}</div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="审批标题" className="input-3d text-sm" />

        {sel && (
          <div className="card-3d space-y-3">
            {JSON.parse(sel.form_config||'[]').map((f:any) => (
              <div key={f.field}>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
        )}
        {err && <p className="text-xs text-red-500">{err}</p>}
        <button onClick={submit} disabled={loading || !sel} className="btn-3d btn-primary-3d w-full">{loading ? '提交中...' : '提交审批'}</button>
      </div>
    </div>
  );
}
