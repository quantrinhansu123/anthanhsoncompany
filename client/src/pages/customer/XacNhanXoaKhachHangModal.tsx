import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { customerService } from '../../lib/services/customerService';

interface XacNhanXoaKhachHangModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: { id: string | number; tenDonVi: string } | null;
    onSuccess?: () => void;
}

export function XacNhanXoaKhachHangModal({ isOpen, onClose, customer, onSuccess }: XacNhanXoaKhachHangModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!customer) return;
        
        setLoading(true);
        setError(null);
        try {
            const success = await customerService.delete(String(customer.id));
            
            if (success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setError('Không thể xóa khách hàng. Vui lòng thử lại sau.');
            }
        } catch (err: any) {
            console.error('[XacNhanXoaKhachHangModal] Error deleting customer:', err);
            setError(err.message || 'Đã xảy ra lỗi khi xóa khách hàng.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Warning Icon */}
                <div className="bg-red-50 px-6 py-6 flex flex-col items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <Trash2 size={24} className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Xác nhận xóa</h3>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 pb-2">
                    <div className="text-center space-y-3">
                        <p className="text-slate-600">
                            Bạn có chắc chắn muốn xóa khách hàng <span className="font-bold text-slate-800">{customer?.tenDonVi}</span> không?
                        </p>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-amber-800 text-left leading-relaxed">
                                Hành động này <span className="font-bold">không thể hoàn tác</span>. Toàn bộ dự án, hợp đồng và dữ liệu liên quan sẽ bị ảnh hưởng hoặc bị xóa.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                            <AlertTriangle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 flex flex-col gap-2">
                    <button 
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        {loading ? 'Đang lý...' : 'Xác nhận xóa'}
                    </button>
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl border border-slate-200 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                </div>
            </div>
        </div>
    );
}
