import React, { useEffect, useState } from 'react';
import { X, Eye, FileText, Calendar, DollarSign, User, Briefcase, Clock, Layout } from 'lucide-react';
import { PreviewLinkModal } from '../../components/PreviewLinkModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: any;
}

export function ChiTietThuChiModal({ isOpen, onClose, item }: Props) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) setPreviewUrl(null);
    }, [isOpen]);

    return (
        <>
            {isOpen && item && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col border border-slate-100">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 leading-tight uppercase">Chi tiết chứng từ</h2>
                                    <p className="text-xs text-slate-500">Mã chứng từ: <span className="font-bold text-slate-700">{item.code}</span></p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Thông tin chứng từ */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            Thông tin cơ bản
                                        </h3>
                                        
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar size={14} />
                                                    Ngày lập:
                                                </div>
                                                <div className="text-slate-800 font-bold text-right">{item.date}</div>

                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Clock size={14} />
                                                    Thời gian ghi nhận:
                                                </div>
                                                <div className="text-slate-600 text-[11px] text-right">
                                                    {item.dateTime || item.created_at ? new Date(item.created_at || '').toLocaleString('vi-VN') : '(Trống)'}
                                                </div>

                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Layout size={14} />
                                                    Loại phiếu:
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${item.type === 'Phiếu thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                        {item.type}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-slate-500 mt-2">
                                                    <DollarSign size={16} />
                                                    Số tiền:
                                                </div>
                                                <div className={`text-right font-bold text-xl mt-1 ${item.type === 'Phiếu thu' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {item.amount}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-50">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ghi chú / Nội dung</div>
                                                <div className="text-slate-700 leading-relaxed italic bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm">
                                                    {item.description || '(Không có nội dung ghi chú cho chứng từ này)'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                            Đối tác & Nhân sự
                                        </h3>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                                                        <User size={16} />
                                                    </div>
                                                    <div className="text-sm text-slate-500">Người nộp/nhận:</div>
                                                </div>
                                                <div className="text-sm font-bold text-slate-800">{item.person}</div>
                                            </div>

                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                                                        <User size={16} />
                                                    </div>
                                                    <div className="text-sm text-slate-500">Nhân sự phụ trách:</div>
                                                </div>
                                                <div className="text-sm font-bold text-slate-800">{item.nhan_su_display || '(Chưa phân bổ)'}</div>
                                            </div>

                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors">
                                                        <Briefcase size={16} />
                                                    </div>
                                                    <div className="text-sm text-slate-500">Dự án liên quan:</div>
                                                </div>
                                                <div className="text-sm font-bold text-indigo-600">{item.ten_du_an || '(Chưa có dự án)'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ảnh chứng từ */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full transition-all hover:shadow-md">
                                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                            Ảnh chứng từ / Hóa đơn
                                        </h3>
                                        
                                        <div className="flex-1 flex flex-col">
                                            {item.anh_url ? (
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <div className="w-full relative group">
                                                        <img 
                                                            src={item.anh_url} 
                                                            alt="Chứng từ" 
                                                            className="w-full h-auto max-h-[450px] object-contain rounded-2xl border border-slate-100 shadow-lg cursor-pointer transition-all group-hover:shadow-xl group-hover:scale-[1.01]"
                                                            onClick={() => setPreviewUrl(item.anh_url)}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const errorDiv = document.createElement('div');
                                                                errorDiv.className = 'text-center text-slate-400 py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200';
                                                                errorDiv.textContent = 'Hình ảnh không khả dụng hoặc đã bị xóa';
                                                                target.parentElement?.appendChild(errorDiv);
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                                                            <span className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm flex items-center gap-2">
                                                                <Eye size={14} /> Xem phóng to
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewUrl(item.anh_url)}
                                                        className="mt-6 px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                                                    >
                                                        <Eye size={16} /> Mở trong cửa sổ xem
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-4 border border-slate-100">
                                                        <Eye size={32} />
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-500">Chưa cập nhật ảnh chứng từ</p>
                                                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Hệ thống đang chờ hình ảnh</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-5 bg-white border-t border-slate-100 flex justify-end flex-shrink-0 animate-in slide-in-from-bottom-2 duration-300">
                            <button 
                                onClick={onClose} 
                                className="px-8 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 uppercase tracking-wide"
                            >
                                Quay lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <PreviewLinkModal
                url={previewUrl}
                onClose={() => setPreviewUrl(null)}
                title="Ảnh chứng từ"
                zIndexClass="z-[240]"
            />
        </>
    );
}
