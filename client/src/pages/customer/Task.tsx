import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X, CheckCircle, Clock, AlertCircle, PlayCircle, PauseCircle, Calendar, User, FileText } from 'lucide-react';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { contractService } from '../../lib/services/contractService';
import { useSearchParams } from 'react-router-dom';

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : CheckCircle;

    return (
        <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter`}>
            <Icon size={18} />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export function Task() {
    const [searchParams] = useSearchParams();
    const hopDongId = searchParams.get('hop_dong_id');
    
    const [items, setItems] = useState<TaskRow[]>([]);
    const [contracts, setContracts] = useState<Array<{ id: string; so_hop_dong: string; ten_goi_thau: string }>>([]);
    const [selectedHopDongId, setSelectedHopDongId] = useState<string>(hopDongId || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>>({
        hop_dong_id: selectedHopDongId || '',
        ten_task: '',
        mo_ta: '',
        trang_thai: 'Chưa bắt đầu',
        uu_tien: 'Trung bình',
        ngay_bat_dau: '',
        ngay_ket_thuc: '',
        ngay_hoan_thanh: '',
        nguoi_phu_trach: '',
        tien_do: 0,
        ghi_chu: ''
    });

    // Load contracts để chọn hợp đồng
    useEffect(() => {
        (async () => {
            try {
                const contractsData = await contractService.getAll();
                setContracts(contractsData.map(c => ({
                    id: c.id,
                    so_hop_dong: c.so_hop_dong || '',
                    ten_goi_thau: c.ten_goi_thau || ''
                })));
            } catch (error) {
                console.error('Error loading contracts:', error);
            }
        })();
    }, []);

    // Load tasks khi selectedHopDongId thay đổi
    useEffect(() => {
        if (selectedHopDongId) {
            loadTasks();
        } else {
            setItems([]);
        }
    }, [selectedHopDongId]);

    // Set selectedHopDongId từ URL param
    useEffect(() => {
        if (hopDongId) {
            setSelectedHopDongId(hopDongId);
            setFormData(prev => ({ ...prev, hop_dong_id: hopDongId }));
        }
    }, [hopDongId]);

    const loadTasks = async () => {
        if (!selectedHopDongId) return;
        
        setLoading(true);
        try {
            const data = await taskService.getByHopDongId(selectedHopDongId);
            setItems(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
            setToast({ message: 'Lỗi khi tải danh sách task', type: 'warning' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (!selectedHopDongId) {
            setToast({ message: 'Vui lòng chọn hợp đồng trước', type: 'warning' });
            return;
        }
        setEditingTask(null);
        setFormData({
            hop_dong_id: selectedHopDongId,
            ten_task: '',
            mo_ta: '',
            trang_thai: 'Chưa bắt đầu',
            uu_tien: 'Trung bình',
            ngay_bat_dau: '',
            ngay_ket_thuc: '',
            ngay_hoan_thanh: '',
            nguoi_phu_trach: '',
            tien_do: 0,
            ghi_chu: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (task: TaskRow) => {
        setEditingTask(task);
        setFormData({
            hop_dong_id: task.hop_dong_id,
            ten_task: task.ten_task,
            mo_ta: task.mo_ta || '',
            trang_thai: task.trang_thai,
            uu_tien: task.uu_tien,
            ngay_bat_dau: task.ngay_bat_dau || '',
            ngay_ket_thuc: task.ngay_ket_thuc || '',
            ngay_hoan_thanh: task.ngay_hoan_thanh || '',
            nguoi_phu_trach: task.nguoi_phu_trach || '',
            tien_do: task.tien_do,
            ghi_chu: task.ghi_chu || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.ten_task.trim()) {
            setToast({ message: 'Vui lòng nhập tên task', type: 'warning' });
            return;
        }

        try {
            if (editingTask) {
                await taskService.update(editingTask.id, formData);
                setToast({ message: 'Cập nhật task thành công', type: 'success' });
            } else {
                await taskService.create(formData);
                setToast({ message: 'Thêm task thành công', type: 'success' });
            }
            setIsModalOpen(false);
            loadTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            setToast({ message: 'Lỗi khi lưu task', type: 'warning' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa task này?')) return;

        try {
            await taskService.delete(id);
            setToast({ message: 'Xóa task thành công', type: 'success' });
            loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            setToast({ message: 'Lỗi khi xóa task', type: 'warning' });
        }
    };

    const filteredItems = items.filter(item =>
        item.ten_task.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.mo_ta && item.mo_ta.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getTrangThaiBadge = (trangThai: string) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
            'Chưa bắt đầu': { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock },
            'Đang thực hiện': { bg: 'bg-blue-100', text: 'text-blue-700', icon: PlayCircle },
            'Hoàn thành': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
            'Tạm dừng': { bg: 'bg-amber-100', text: 'text-amber-700', icon: PauseCircle }
        };
        const style = styles[trangThai] || styles['Chưa bắt đầu'];
        const Icon = style.icon;
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${style.bg} ${style.text}`}>
                <Icon size={14} />
                {trangThai}
            </span>
        );
    };

    const getUuTienBadge = (uuTien: string) => {
        const styles: Record<string, string> = {
            'Thấp': 'bg-slate-100 text-slate-700',
            'Trung bình': 'bg-blue-100 text-blue-700',
            'Cao': 'bg-orange-100 text-orange-700',
            'Khẩn cấp': 'bg-red-100 text-red-700'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[uuTien] || styles['Trung bình']}`}>
                {uuTien}
            </span>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Quản lý Task</h1>
                    <p className="text-sm text-slate-500">Quản lý các task theo hợp đồng</p>
                </div>
                <button
                    onClick={handleAdd}
                    disabled={!selectedHopDongId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={18} />
                    Thêm Task
                </button>
            </div>

            {/* Filter: Chọn hợp đồng */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Chọn hợp đồng</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={selectedHopDongId}
                            onChange={(e) => {
                                setSelectedHopDongId(e.target.value);
                                setFormData(prev => ({ ...prev, hop_dong_id: e.target.value }));
                            }}
                        >
                            <option value="">-- Chọn hợp đồng --</option>
                            {contracts.map(contract => (
                                <option key={contract.id} value={contract.id}>
                                    {contract.so_hop_dong} - {contract.ten_goi_thau}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm theo tên task, mô tả..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
                    <p className="text-slate-500">Đang tải...</p>
                </div>
            ) : !selectedHopDongId ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
                    <p className="text-slate-500">Vui lòng chọn hợp đồng để xem danh sách task</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
                    <p className="text-slate-500">Chưa có task nào. Nhấn "Thêm Task" để tạo mới.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Tên Task</th>
                                    <th className="p-3">Trạng thái</th>
                                    <th className="p-3">Ưu tiên</th>
                                    <th className="p-3">Tiến độ</th>
                                    <th className="p-3">Người phụ trách</th>
                                    <th className="p-3">Ngày bắt đầu</th>
                                    <th className="p-3">Ngày kết thúc</th>
                                    <th className="p-3 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-3">
                                            <div className="text-sm font-medium text-slate-800">{item.ten_task}</div>
                                            {item.mo_ta && (
                                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.mo_ta}</div>
                                            )}
                                        </td>
                                        <td className="p-3">{getTrangThaiBadge(item.trang_thai)}</td>
                                        <td className="p-3">{getUuTienBadge(item.uu_tien)}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${item.tien_do}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600 w-10 text-right">{item.tien_do}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs text-slate-600">{item.nguoi_phu_trach || '—'}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.ngay_bat_dau || '—'}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.ngay_ket_thuc || '—'}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                                {editingTask ? 'Chỉnh sửa Task' : 'Thêm Task mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[75vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên Task *</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.ten_task}
                                        onChange={(e) => setFormData({ ...formData, ten_task: e.target.value })}
                                        placeholder="Nhập tên task"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mô tả</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        rows={3}
                                        value={formData.mo_ta}
                                        onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
                                        placeholder="Nhập mô tả task"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Trạng thái</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.trang_thai}
                                        onChange={(e) => setFormData({ ...formData, trang_thai: e.target.value })}
                                    >
                                        <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                        <option value="Đang thực hiện">Đang thực hiện</option>
                                        <option value="Hoàn thành">Hoàn thành</option>
                                        <option value="Tạm dừng">Tạm dừng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Độ ưu tiên</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.uu_tien}
                                        onChange={(e) => setFormData({ ...formData, uu_tien: e.target.value })}
                                    >
                                        <option value="Thấp">Thấp</option>
                                        <option value="Trung bình">Trung bình</option>
                                        <option value="Cao">Cao</option>
                                        <option value="Khẩn cấp">Khẩn cấp</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.ngay_bat_dau}
                                        onChange={(e) => setFormData({ ...formData, ngay_bat_dau: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.ngay_ket_thuc}
                                        onChange={(e) => setFormData({ ...formData, ngay_ket_thuc: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Người phụ trách</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.nguoi_phu_trach}
                                        onChange={(e) => setFormData({ ...formData, nguoi_phu_trach: e.target.value })}
                                        placeholder="Nhập tên người phụ trách"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tiến độ (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.tien_do}
                                        onChange={(e) => setFormData({ ...formData, tien_do: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ghi chú</label>
                                    <textarea
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        rows={2}
                                        value={formData.ghi_chu}
                                        onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                                        placeholder="Nhập ghi chú"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors uppercase"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/20 active:scale-95 uppercase"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
