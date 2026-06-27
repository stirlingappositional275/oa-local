import React, { useRef, useState } from 'react';

interface Props {
  approvalId: string;
  onUploaded?: (files: any[]) => void;
}

export default function FileUpload({ approvalId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const token = localStorage.getItem('oa_token');
      const response = await fetch(`/api/approvals/${approvalId}/attach`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setFiles([]);
      onUploaded?.(result.files);
    } catch (err) {
      console.error('Upload error:', err);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="text-sm text-accent hover:text-accent-light font-medium transition-colors"
        >
          + 选择文件
        </button>
        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="text-sm bg-accent hover:bg-accent-light text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="text-xs text-muted flex items-center gap-2">
              <span>📎</span>
              <span>{f.name}</span>
              <span>({(f.size / 1024).toFixed(1)} KB)</span>
              <button
                onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                className="text-error hover:text-red-600 ml-1"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
