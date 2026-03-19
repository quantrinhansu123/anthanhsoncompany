import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ThemThuChiHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { type: string; amount: number; note: string }) => void;
}

export function ThemThuChiHopDongModal({ isOpen, onClose, onSuccess }: ThemThuChiHopDongModalProps) {
    const [form, setForm] = useState({ type: 'Phiếu thu', amount: '', note: '' });

    if (!isOpen) return null;

    const handleSubmit = () => {
        const amount = Number(form.amount.replace(/\./g, '')) || 0;
        if (amount <= 0) {
            alert('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        onSuccess({ ...form, amount });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-800">Thêm phiếu thu/chi</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loại phiếu</label>
                        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="Phiếu thu">Phiếu thu</option>
                            <option value="Phiếu chi">Phiếu chi</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                            placeholder="0" 
                            value={form.amount ? (Number(form.amount.replace(/\./g, '')) || 0).toLocaleString('vi-VN') : ''} 
                            onChange={e => setForm({ ...form, amount: e.target.value.replace(/\./g, '') })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                        <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập nội dung..." rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}></textarea>
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
