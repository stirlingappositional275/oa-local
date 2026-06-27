import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api/client';

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchApi.search({ q: query.trim() });
      setItems(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => navigate('/')} className="text-muted hover:text-gray-600 text-sm mb-4 block">
        ← 返回首页
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">检索审批</h1>

      {/* Search Box */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索审批标题..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
        />
        <button
          onClick={handleSearch}
          className="bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-lg transition-colors text-sm font-medium"
        >
          搜索
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-muted">搜索中...</div>
      ) : searched && items.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-3">🔍</p>
          <p>未找到匹配的审批记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => navigate(`/detail/${item.id}`)}
              className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">{item.title}</h3>
                  <p className="text-sm text-muted mt-1">
                    {item.applicant} · ¥{item.amount?.toLocaleString()} · {item.entity}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {new Date(item.submitted_at).toLocaleString('zh-CN')} · 
                    <span className={`ml-2 ${
                      item.status === 'approved' ? 'text-success' : 
                      item.status === 'rejected' ? 'text-error' : 'text-warning'
                    }`}>
                      {item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已驳回' : '待审批'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
