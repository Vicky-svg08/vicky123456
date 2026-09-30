import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import type { UploadedFile, UploadProgress } from '../../hooks/useUpload';

interface Props {
  onFiles: (files: File[]) => void;
  uploaded: UploadedFile[];
  progress: UploadProgress[];
  onRemove: (path: string) => void;
  uploading: boolean;
  multiple?: boolean;
  allowedExt?: string;
  maxSizeMb?: number;
  error?: string | null;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ type }: { type: string }) => {
  if (type === 'application/pdf') return <span className="text-xl">📄</span>;
  return <span className="text-xl">🖼️</span>;
};

export const FileUpload = ({
  onFiles, uploaded, progress, onRemove,
  uploading, multiple = true,
  allowedExt = '.jpg, .jpeg, .png, .webp, .pdf',
  maxSizeMb = 10,
  error,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all ${
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="text-3xl">{uploading ? '⏳' : '📎'}</div>
        <div>
          <p className="text-sm font-semibold text-gray-700">
            {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {allowedExt} · max {maxSizeMb} MB each
            {multiple ? ' · multiple files allowed' : ''}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={allowedExt}
          multiple={multiple}
          onChange={handleChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <span className="mt-0.5 flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Upload progress bars */}
      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="max-w-[200px] truncate text-xs font-medium text-gray-700">{p.file}</span>
                <span className={`text-xs font-semibold ${
                  p.status === 'done' ? 'text-green-600' :
                  p.status === 'error' ? 'text-red-600' : 'text-indigo-600'
                }`}>
                  {p.status === 'done' ? '✓ Done' : p.status === 'error' ? '✗ Failed' : `${p.percent}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    p.status === 'done' ? 'bg-green-500' :
                    p.status === 'error' ? 'bg-red-400' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${p.percent}%` }}
                />
              </div>
              {p.error && <p className="mt-1 text-[10px] text-red-500">{p.error}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded file list */}
      {uploaded.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Uploaded {uploaded.length} file{uploaded.length > 1 ? 's' : ''}
          </p>
          {uploaded.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
              {/* Preview thumbnail for images */}
              {f.type.startsWith('image/') ? (
                <img
                  src={f.signedUrl}
                  alt={f.name}
                  className="h-10 w-10 flex-shrink-0 rounded-lg object-cover border border-gray-100"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <FileIcon type={f.type} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{f.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(f.size)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={f.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  View ↗
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(f.path)}
                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-100 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
