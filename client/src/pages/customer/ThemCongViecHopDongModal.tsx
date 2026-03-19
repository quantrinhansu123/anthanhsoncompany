import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ThemCongViecHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
}

export function ThemCongViecHopDongModal({ isOpen, onClose, onSuccess }: ThemCongViecHopDongModalProps) {
    const [form, setForm] = useState({ 
        ten_task: '', 
        mo_ta: '', 
        trang_thai: 'Chưa bắt đầu', 
        uu_tien: 'Trung bình',
        ngay_bat_dau: '', 
        ngay_ket_thuc: '', 
        nguoi_phu_trach: '',
        tien_do: 0,
        ghi_chu: ''
    });

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!form.ten_task.trim()) {
            alert('Vui lòng nhập tên công việc');
            return;
        }
        onSuccess(form);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-slate-800">Thêm công việc mới</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Nhập tên công việc..." value={form.ten_task} onChange={e => setForm({ ...form, ten_task: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                        <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={3} value={form.mo_ta} onChange={e => setForm({ ...form, mo_ta: e.target.value })}></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.trang_thai} onChange={e => setForm({ ...form, trang_thai: e.target.value })}>
                                <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                <option value="Đang thực hiện">Đang thực hiện</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Tạm dừng">Tạm dừng</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Độ ưu tiên</label>
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.uu_tien} onChange={e => setForm({ ...form, uu_tien: e.target.value })}>
                                <option value="Thấp">Thấp</option>
                                <option value="Trung bình">Trung bình</option>
                                <option value="Cao">Cao</option>
                                <option value="Khẩn cấp">Khẩn cấp</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.ngay_bat_dau} onChange={e => setForm({ ...form, ngay_bat_dau: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.ngay_ket_thuc} onChange={e => setForm({ ...form, ngay_ket_thuc: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Tên người phụ trách..." value={form.nguoi_phu_trach} onChange={e => setForm({ ...form, nguoi_phu_trach: e.target.value })} />
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
