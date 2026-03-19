import React, { useState } from 'react';
import { X, FileText, Upload, Info } from 'lucide-react';
import { useHopDongModal } from '../../contexts/HopDongModalContext';

interface ThemTaiLieuHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { name: string; type: string; file?: File }) => void;
}

export function ThemTaiLieuHopDongModal({ isOpen, onClose, onSuccess }: ThemTaiLieuHopDongModalProps) {
    const { contractData: selectedContract } = useHopDongModal();
    const [form, setForm] = useState({ name: '', type: '', file: null as File | null });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.type) {
            alert('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        setIsSaving(true);
        try {
            await onSuccess({ name: form.name, type: form.type, file: form.file || undefined });
            onClose();
        } catch (error) {
            console.error('Error adding document:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Thêm tài liệu mới</h2>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">HĐ: {selectedContract?.soHopDong}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white rounded-full transition-all hover:shadow-md text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Tên tài liệu / Văn bản</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium" 
                                placeholder="Ví dụ: Phụ lục 01, Biên bản bàn giao..." 
                                value={form.name} 
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Phân loại tài liệu</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium appearance-none" 
                                value={form.type} 
                                onChange={e => setForm({ ...form, type: e.target.value })}
                                required
                            >
                                <option value="">-- Chọn loại tài liệu --</option>
                                <option value="Hợp đồng gốc">Hợp đồng gốc</option>
                                <option value="Phụ lục hợp đồng">Phụ lục hợp đồng</option>
                                <option value="Biên bản nghiệm thu">Biên bản nghiệm thu</option>
                                <option value="Biên bản bàn giao">Biên bản bàn giao</option>
                                <option value="Hồ sơ thiết kế">Hồ sơ thiết kế</option>
                                <option value="Chứng từ thanh toán">Chứng từ thanh toán</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                                Tệp đính kèm
                                <Info size={14} className="text-slate-400" />
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setForm({ ...form, file });
                                    }}
                                />
                                <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-400 rounded-2xl p-6 transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload size={24} className="text-blue-600" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">
                                        {form.file ? form.file.name : 'Nhấp hoặc kéo thả tệp vào đây'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">PDF, DOCX, ZIP, JPG (MAX 20MB)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FileText size={18} />
                                    XÁC NHẬN THÊM
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
