import React, { useState } from 'react';
import { X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface NghiemThuCongViecModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onSuccess: (data: any) => void;
}

export function NghiemThuCongViecModal({ isOpen, onClose, task, onSuccess }: NghiemThuCongViecModalProps) {
    const [form, setForm] = useState({
        tien_do: task?.tien_do || 0,
        link_tai_lieu: task?.link_tai_lieu || '',
        anh_bang_chung_url: task?.anh_bang_chung || ''
    });

    if (!isOpen || !task) return null;

    const handleSubmit = () => {
        onSuccess(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-800">Nghiệm thu công việc</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                        <div className="text-xs text-purple-600 font-bold uppercase mb-1">Đang nghiệm thu cho:</div>
                        <div className="text-sm font-medium text-purple-900">{task.ten_task}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ (%)</label>
                        <input type="range" min="0" max="100" className="w-full" value={form.tien_do} onChange={e => setForm({ ...form, tien_do: parseInt(e.target.value) })} />
                        <div className="text-center font-bold text-purple-600 mt-1">{form.tien_do}%</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><LinkIcon size={14} />Link tài liệu</label>
                        <input type="url" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." value={form.link_tai_lieu} onChange={e => setForm({ ...form, link_tai_lieu: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><ImageIcon size={14} />Link ảnh bằng chứng</label>
                        <input type="url" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." value={form.anh_bang_chung_url} onChange={e => setForm({ ...form, anh_bang_chung_url: e.target.value })} />
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-md transition-colors">Xác nhận</button>
                </div>
            </div>
        </div>
    );
}
