import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { employeeService } from '../../lib/services/employeeService';
import { taskService } from '../../lib/services/taskService';
import { taskDetailService } from '../../lib/services/taskDetailService';

interface ThemCongViecHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: any) => void;
}

export function ThemCongViecHopDongModal({ isOpen, onClose, onSuccess }: ThemCongViecHopDongModalProps) {
    const { contractData } = useHopDongModal();
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

    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
    const [openNguoiPhuTrach, setOpenNguoiPhuTrach] = useState(false);
    const [selectedNguoiPhuTrachIds, setSelectedNguoiPhuTrachIds] = useState<string[]>([]);

    const responsibleIds = useMemo(() => {
        const ids = contractData?.nhanSuIds || (contractData?.nhanSuId ? [contractData?.nhanSuId] : []);
        return (ids || []).map(String);
    }, [contractData?.nhanSuIds, contractData?.nhanSuId]);

    useEffect(() => {
        if (!isOpen) return;
        setForm({
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
        setSelectedNguoiPhuTrachIds([]);
        setOpenNguoiPhuTrach(false);
    }, [isOpen, contractData?.uuid]);

    useEffect(() => {
        let cancelled = false;
        if (!isOpen) return;

        (async () => {
            try {
                const all = await employeeService.getAll();
                if (cancelled) return;
                const mapped = (all || []).map((e: any) => ({
                    id: String(e.id),
                    full_name: e.full_name || e.name || e.hoTen || '',
                }));

                const filtered = mapped.filter((e) => responsibleIds.includes(e.id));
                setEmployees(filtered);

                // If edit mode has a pre-selected responsibility, keep it.
                if (form.nguoi_phu_trach && filtered.length > 0) {
                    const byName = filtered.find((e) => e.full_name === form.nguoi_phu_trach);
                    if (byName) setSelectedNguoiPhuTrachIds([byName.id]);
                }
            } catch (err) {
                console.error('[ThemCongViec] Failed to load employees:', err);
                setEmployees([]);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, responsibleIds.join('|')]);

    const selectedEmployeeNames = useMemo(() => {
        const ids = new Set(selectedNguoiPhuTrachIds);
        return employees.filter((e) => ids.has(e.id)).map((e) => e.full_name);
    }, [employees, selectedNguoiPhuTrachIds]);

    const toggleNguoiPhuTrach = (id: string) => {
        const sid = String(id);
        setSelectedNguoiPhuTrachIds((prev) => {
            // allow multi-select (tickbox), but task schema stores a single string
            return prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid];
        });
    };

    if (!isOpen) return null;

    const handleSubmitAsync = async () => {
        if (!form.ten_task.trim()) {
            alert('Vui lòng nhập tên công việc');
            return;
        }

        const firstName = selectedEmployeeNames[0] || '';
        if (!firstName) {
            alert('Vui lòng chọn người phụ trách từ danh sách hợp đồng.');
            return;
        }

        if (!contractData?.uuid) {
            alert('Không tìm thấy hợp đồng. Vui lòng mở từ trang chi tiết hợp đồng.');
            return;
        }

        const toDateOrNull = (v: string) => {
            const s = (v ?? '').toString().trim();
            return s === '' ? null : s;
        };

        const payload = {
            hop_dong_id: contractData.uuid,
            ten_task: form.ten_task,
            mo_ta: form.mo_ta || null,
            trang_thai: form.trang_thai,
            uu_tien: form.uu_tien,
            ngay_bat_dau: toDateOrNull(form.ngay_bat_dau),
            ngay_ket_thuc: toDateOrNull(form.ngay_ket_thuc),
            ngay_hoan_thanh: null,
            nguoi_phu_trach: firstName,
            tien_do: Number(form.tien_do) || 0,
            ghi_chu: form.ghi_chu || null,
        };

        try {
            const created = await taskService.create(payload as any);
            // Đồng bộ sang bảng cong_viec_chi_tiet để trang "Quản lý công việc"
            // hiển thị đúng các task được tạo từ màn hình hợp đồng.
            await taskDetailService.upsertFromTask(created as any, { allowInsert: true });
            onSuccess(created);
            onClose();
        } catch (err: any) {
            console.error('[ThemCongViec] Error creating task:', err);
            const message =
                err?.message ||
                err?.error ||
                err?.response?.data?.error ||
                'Lỗi lưu công việc. Vui lòng thử lại.';
            alert(message);
        }
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
                        <div className="relative">
                            <button
                                type="button"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white flex items-center justify-between gap-3"
                                onClick={() => setOpenNguoiPhuTrach((v) => !v)}
                            >
                                <span className="text-slate-700">
                                    {selectedEmployeeNames.length === 0
                                        ? 'Chọn người phụ trách'
                                        : selectedEmployeeNames.length === 1
                                          ? selectedEmployeeNames[0]
                                          : `${selectedEmployeeNames.length} người`}
                                </span>
                                <span className="text-slate-400">▾</span>
                            </button>

                            {openNguoiPhuTrach && (
                                <div className="absolute left-0 right-0 mt-2 z-50 border border-slate-200 rounded-lg bg-white shadow-lg max-h-44 overflow-y-auto">
                                    <div className="p-2 space-y-1.5">
                                        {employees.map((emp) => {
                                            const checked = selectedNguoiPhuTrachIds.includes(emp.id);
                                            return (
                                                <label
                                                    key={emp.id}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-slate-50 transition-colors ${
                                                        checked ? 'bg-purple-50' : ''
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleNguoiPhuTrach(emp.id)}
                                                        className="rounded border-slate-300 w-4 h-4 text-purple-600"
                                                    />
                                                    <span className="text-sm text-slate-800 truncate">{emp.full_name}</span>
                                                </label>
                                            );
                                        })}

                                        {employees.length === 0 && (
                                            <div className="px-2 py-3 text-sm text-slate-400">
                                                Không có nhân sự phụ trách trong hợp đồng.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                    <button onClick={handleSubmitAsync} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors">Thêm</button>
                </div>
            </div>
        </div>
    );
}
