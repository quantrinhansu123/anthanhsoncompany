import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Download, AlertCircle, Loader2 } from 'lucide-react';

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName?: string;
}

function getFileExtension(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const ext = pathname.split('.').pop()?.toLowerCase() || '';
        return ext;
    } catch {
        const parts = url.split('.');
        return parts[parts.length - 1]?.toLowerCase() || '';
    }
}

function getFileType(url: string): 'pdf' | 'image' | 'word' | 'excel' | 'unknown' {
    const ext = getFileExtension(url);
    
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    
    return 'unknown';
}

export function FileViewerModal({ isOpen, onClose, fileUrl, fileName }: FileViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewerType, setViewerType] = useState<'google' | 'office' | 'direct'>('google');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError(null);
            
            // Hỗ trợ phím ESC để đóng
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, fileUrl, onClose]);

    if (!isOpen) return null;

    const fileType = getFileType(fileUrl);
    const displayName = fileName || fileUrl.split('/').pop() || 'File';

    const handleDownload = () => {
        window.open(fileUrl, '_blank');
    };

    const handleOpenExternal = () => {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    };

    const renderViewer = () => {
        // Ảnh - hiển thị trực tiếp
        if (fileType === 'image') {
            return (
                <div className="flex items-center justify-center h-full bg-slate-900 p-4">
                    <img
                        src={fileUrl}
                        alt={displayName}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => setLoading(false)}
                        onError={() => {
                            setLoading(false);
                            setError('Không thể tải ảnh');
                        }}
                    />
                </div>
            );
        }

        // PDF - hiển thị trực tiếp
        if (fileType === 'pdf') {
            return (
                <iframe
                    src={fileUrl}
                    className="w-full h-full border-0"
                    title={displayName}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setError('Không thể tải PDF. Vui lòng tải xuống để xem.');
                    }}
                />
            );
        }

        // Word/Excel - dùng viewer
        if (fileType === 'word' || fileType === 'excel') {
            const encodedUrl = encodeURIComponent(fileUrl);
            
            // Google Docs Viewer (mặc định)
            let viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
            
            // Office Online Viewer (backup)
            if (viewerType === 'office') {
                viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
            }

            return (
                <div className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-center gap-2 p-2 bg-slate-100 border-b">
                        <button
                            onClick={() => setViewerType('google')}
                            className={`px-3 py-1 text-xs rounded ${
                                viewerType === 'google'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            Google Viewer
                        </button>
                        <button
                            onClick={() => setViewerType('office')}
                            className={`px-3 py-1 text-xs rounded ${
                                viewerType === 'office'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            Office Viewer
                        </button>
                    </div>
                    <iframe
                        key={viewerUrl}
                        src={viewerUrl}
                        className="w-full flex-1 border-0"
                        title={displayName}
                        onLoad={() => setLoading(false)}
                        onError={() => {
                            setLoading(false);
                            setError('Không thể tải file. Thử đổi viewer hoặc tải xuống để xem.');
                        }}
                    />
                </div>
            );
        }

        // File không hỗ trợ xem trực tiếp
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertCircle size={48} className="text-amber-500 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                    Không thể xem trực tiếp
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                    Định dạng file này không hỗ trợ xem trực tiếp trong trình duyệt.
                </p>
                <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                    <Download size={16} />
                    Tải xuống để xem
                </button>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full h-full md:w-[90vw] md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-slate-800 truncate">
                                {displayName}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {fileType === 'pdf' && 'PDF Document'}
                                {fileType === 'image' && 'Ảnh'}
                                {fileType === 'word' && 'Word Document'}
                                {fileType === 'excel' && 'Excel Spreadsheet'}
                                {fileType === 'unknown' && 'File'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleOpenExternal}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Mở trong tab mới"
                        >
                            <ExternalLink size={18} />
                        </button>
                        <button
                            onClick={handleDownload}
                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Tải xuống"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Đóng"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 relative overflow-hidden bg-slate-100">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                <p className="text-sm text-slate-600">Đang tải file...</p>
                            </div>
                        </div>
                    )}
                    
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                            <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md">
                                <AlertCircle size={48} className="text-red-500" />
                                <h3 className="text-lg font-bold text-slate-800">Lỗi tải file</h3>
                                <p className="text-sm text-slate-600">{error}</p>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                                    >
                                        <Download size={16} />
                                        Tải xuống
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {renderViewer()}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 shrink-0">
                    <p className="text-xs text-slate-500 text-center">
                        💡 Mẹo: Nhấn <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">ESC</kbd> để đóng
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
