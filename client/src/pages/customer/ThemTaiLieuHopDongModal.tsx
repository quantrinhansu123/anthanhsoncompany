import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ThemTaiLieuHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { name: string; type: string }) => void;
}

export function ThemTaiLieuHopDongModal({ isOpen, onClose, onSuccess }: ThemTaiLieuHopDongModalProps) {
    const [form, setForm] = useState({ name: '', type: '' });

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!form.name || !form.type) {
            alert('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        onSuccess(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-800">Thêm tài liệu mới</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên tài liệu</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên tài liệu..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loại tài liệu</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="">Chọn loại...</option>
                            <option value="Hợp đồng">Hợp đồng</option>
                            <option value="Biên bản">Biên bản</option>
                            <option value="Phụ lục">Phụ lục</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors">Thêm</button>
                </div>
            </div>
        </div>
    );
}
