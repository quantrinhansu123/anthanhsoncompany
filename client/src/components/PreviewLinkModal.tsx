import React, { useMemo, useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

function previewModeForUrl(raw: string): 'img' | 'pdf' | 'iframe' {
  const path = raw.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/i.test(path)) return 'img';
  if (/\.pdf(\?|$)/i.test(path)) return 'pdf';
  return 'iframe';
}

export interface PreviewLinkModalProps {
  url: string | null | undefined;
  onClose: () => void;
  title?: string;
  /** Ví dụ z-[220] — đặt cao hơn modal cha */
  zIndexClass?: string;
}

export function PreviewLinkModal({
  url,
  onClose,
  title = 'Xem nội dung',
  zIndexClass = 'z-[220]',
}: PreviewLinkModalProps) {
  const trimmed = url?.trim() ?? '';
  const mode = useMemo(() => previewModeForUrl(trimmed), [trimmed]);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [trimmed]);

  if (!trimmed) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/70 p-3 sm:p-4`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[96vw] max-h-[96vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide truncate min-w-0">
            {title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.location.assign(trimmed)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở trực tiếp
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-[60vh] max-h-[calc(96vh-4rem)] bg-slate-200/80 overflow-hidden flex flex-col">
          {mode === 'img' && !imgFailed ? (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img
                src={trimmed}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                onError={() => setImgFailed(true)}
              />
            </div>
          ) : mode === 'img' && imgFailed ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-600">
              <p>Không hiển thị được ảnh trong khung (CORS hoặc định dạng).</p>
              <button
                type="button"
                onClick={() => window.location.assign(trimmed)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                Mở trực tiếp
              </button>
            </div>
          ) : (
            <iframe
              src={trimmed}
              title={title}
              className="w-full flex-1 min-h-[50vh] border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}
