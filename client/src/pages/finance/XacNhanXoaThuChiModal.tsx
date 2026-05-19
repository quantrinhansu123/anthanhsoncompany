import React, { useState } from 'react';
import { Trash2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { thuChiService } from '../../lib/services/thuChiService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    onSuccess: () => void;
}

export function XacNhanXoaThuChiModal({ isOpen, onClose, item, onSuccess }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !item) return null;

    const deleteId =
        item && typeof item === 'object' && item !== null && 'id' in item
            ? String((item as { id: string | number }).id)
            : String(item);
    const displayCode =
        item && typeof item === 'object' && item !== null && 'code' in item && (item as { code?: string }).code
            ? String((item as { code?: string }).code)
            : deleteId.slice(0, 8).toUpperCase();

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            const ok = await thuChiService.delete(deleteId);
            if (!ok) {
                throw new Error('Không xóa được chứng từ. Kiểm tra server API đang chạy.');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Lỗi khi xóa chứng từ:', err);
            setError(err.message || 'Không thể xóa chứng từ này. Vui lòng thử lại sau.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col items-center p-8 text-center relative">
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Danger Icon with pulse effect */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-20"></div>
                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center border-2 border-rose-100 shadow-inner relative z-10">
                        <Trash2 size={40} strokeWidth={2.5} />
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-800 mb-3 uppercase tracking-tight">Xác nhận xóa phiếu</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[280px]">
                    Bạn đang thực hiện xóa chứng từ <span className="font-bold text-slate-700">{displayCode}</span>. Hành động này sẽ loại bỏ hoàn toàn dữ liệu và không thể khôi phục.
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-left animate-in slide-in-from-top-1 duration-200 w-full">
                        <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-rose-600 font-medium leading-tight">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full">
                    <button 
                        onClick={onClose} 
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 uppercase tracking-wide disabled:opacity-50"
                    >
                        Hủy yêu cầu
                    </button>
                    <button 
                        onClick={handleDelete} 
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-2xl transition-all shadow-lg shadow-rose-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
                    >
                        {isDeleting ? (
                            <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4"></span>
                        ) : (
                            <CheckCircle2 size={18} />
                        )}
                        {isDeleting ? 'Đang xử lý...' : 'Xác nhận xóa'}
                    </button>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 px-3 py-1 rounded-full border border-slate-100">
                    <AlertCircle size={10} />
                    Hành động vĩnh viễn
                </div>
            </div>
        </div>
    );
}
