import React, { useState, useEffect, useCallback } from 'react';
import {
    X,
    FileText,
    FolderOpen,
    ClipboardList,
    Plus,
    Maximize2,
    Link as LinkIcon,
    Image as ImageIcon,
    FileCheck,
    CreditCard,
    User,
    ExternalLink,
    Eye,
    Pencil,
    Trash2,
} from 'lucide-react';
import { contractService, ContractFile } from '../../lib/services/contractService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { taskDetailService } from '../../lib/services/taskDetailService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { useNavigate } from 'react-router-dom';

interface Contract {
    id?: number;
    uuid?: string;
    duAnId?: string | null;
    fileStatus: string;
    files?: ContractFile[] | null;
    ngayKyHD: string;
    soHopDong: string;
    tenGoiThau: string;
    loaiDichVu: string;
    giaTriHD: number;
    giaTriQT: number;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
}

interface ChiTietHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
}

export function ChiTietHopDongModal({ isOpen, onClose, contract }: ChiTietHopDongModalProps) {
    const { 
        openAddDocument, 
        openAddFinance, 
        openAddTask, 
        openNghiemThu 
    } = useHopDongModal();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('info');
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [viewTask, setViewTask] = useState<TaskRow | null>(null);
    const [editTask, setEditTask] = useState<TaskRow | null>(null);
    const [editForm, setEditForm] = useState({
        ten_task: '',
        mo_ta: '',
        trang_thai: 'Chưa bắt đầu',
        uu_tien: 'Trung bình',
        ngay_bat_dau: '',
        ngay_ket_thuc: '',
        nguoi_phu_trach: '',
        tien_do: 0,
        ghi_chu: '',
    });

    const loadTasks = useCallback(async () => {
        if (!contract?.uuid) return;
        setLoadingTasks(true);
        try {
            const taskList = await taskService.getByHopDongId(contract.uuid);
            setTasks(taskList);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    }, [contract?.uuid]);

    useEffect(() => {
        if (isOpen && contract?.uuid) {
            loadTasks();
        }
    }, [isOpen, contract?.uuid, loadTasks]);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN');
    };
    
    const formatDate = (v: string | null) => {
        if (!v) return '';
        const s = String(v).trim();
        if (!s) return '';
        // Supabase thường trả về format YYYY-MM-DD cho DATE
        return s.length >= 10 ? s.slice(0, 10) : s;
    };

    const formatDateRange = (start: string | null, end: string | null) => {
        const a = formatDate(start);
        const b = formatDate(end);
        if (a && b) return `${a} - ${b}`;
        if (a) return `Bắt đầu: ${a}`;
        if (b) return `Kết thúc: ${b}`;
        return '';
    };

    const shortText = (v: string | null | undefined, max = 90) => {
        const s = (v ?? '').toString().trim();
        if (!s) return '';
        if (s.length <= max) return s;
        return `${s.slice(0, max)}...`;
    };

    const getStatusBadge = (status: string) => {
        const s = (status || '').trim();
        const base =
            'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border';

        switch (s) {
            case 'Hoàn thành':
                return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
            case 'Đang thực hiện':
                return `${base} bg-blue-50 text-blue-700 border-blue-200`;
            case 'Tạm dừng':
                return `${base} bg-amber-50 text-amber-700 border-amber-200`;
            case 'Chưa bắt đầu':
            default:
                return `${base} bg-slate-50 text-slate-700 border-slate-200`;
        }
    };

    const toDateOrNull = (v: string) => {
        const s = (v ?? '').toString().trim();
        return s === '' ? null : s;
    };

    useEffect(() => {
        if (!editTask) return;
        setEditForm({
            ten_task: editTask.ten_task || '',
            mo_ta: editTask.mo_ta || '',
            trang_thai: editTask.trang_thai || 'Chưa bắt đầu',
            uu_tien: editTask.uu_tien || 'Trung bình',
            ngay_bat_dau: editTask.ngay_bat_dau || '',
            ngay_ket_thuc: editTask.ngay_ket_thuc || '',
            nguoi_phu_trach: editTask.nguoi_phu_trach || '',
            tien_do: Number(editTask.tien_do) || 0,
            ghi_chu: editTask.ghi_chu || '',
        });
    }, [editTask]);

    const handleDeleteTask = async (task: TaskRow) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
        try {
            await taskService.delete(task.id);
            setViewTask(null);
            setEditTask(null);
            await loadTasks();
        } catch (err: any) {
            console.error('[ChiTietHopDongModal] Error deleting task:', err);
            alert(err?.message || 'Lỗi khi xóa công việc');
        }
    };

    const handleOpenQuanLyCongViec = (task: TaskRow) => {
        // Đóng modal chi tiết hợp đồng rồi điều hướng sang màn hình quản lý công việc.
        onClose();
        navigate(
            `/quy-trinh/quan-ly-cong-viec?taskId=${encodeURIComponent(String(task.id))}`,
        );
    };

    const handleSaveTask = async () => {
        if (!editTask) return;
        if (!editForm.ten_task.trim()) {
            alert('Vui lòng nhập tên công việc');
            return;
        }
        try {
            const updated = await taskService.update(editTask.id, {
                ten_task: editForm.ten_task.trim(),
                mo_ta: editForm.mo_ta ? editForm.mo_ta.trim() : null,
                trang_thai: editForm.trang_thai,
                uu_tien: editForm.uu_tien,
                ngay_bat_dau: toDateOrNull(editForm.ngay_bat_dau),
                ngay_ket_thuc: toDateOrNull(editForm.ngay_ket_thuc),
                nguoi_phu_trach: editForm.nguoi_phu_trach ? editForm.nguoi_phu_trach.trim() : null,
                tien_do: Number(editForm.tien_do) || 0,
                ghi_chu: editForm.ghi_chu ? editForm.ghi_chu.trim() : null,
            } as any);

            // Đồng bộ sang bảng cong_viec_chi_tiet để trang "Quản lý công việc"
            // hiển thị đúng thông tin sau khi sửa.
            await taskDetailService.upsertFromTask(updated as any, { allowInsert: false });

            setEditTask(null);
            await loadTasks();
        } catch (err: any) {
            console.error('[ChiTietHopDongModal] Error saving task:', err);
            alert(err?.message || 'Lỗi khi lưu công việc');
        }
    };

    if (!isOpen || !contract) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg flex flex-col max-h-[80vh]">
                <div className="px-3 py-2.5 flex justify-between items-center border-b border-slate-200">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Chi tiết hợp đồng</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Số HĐ: {contract.soHopDong}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="border-b border-slate-100 bg-slate-50/50 flex">
                    {['info', 'documents', 'finance', 'tasks'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-b-2 ${
                                activeTab === tab 
                                ? 'text-purple-600 border-purple-600 bg-white' 
                                : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                        >
                            {tab === 'info' && 'Thông tin chung'}
                            {tab === 'documents' && 'Tài liệu'}
                            {tab === 'finance' && 'Thu chi'}
                            {tab === 'tasks' && 'Công việc'}
                        </button>
                    ))}
                </div>

                <div className="p-3 overflow-y-auto flex-1">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2">
                            <InfoRow label="Số hợp đồng" value={contract.soHopDong} />
                            <InfoRow label="Tên gói thầu" value={contract.tenGoiThau} />
                            <InfoRow label="Loại dịch vụ" value={contract.loaiDichVu} />
                            <InfoRow label="Ngày ký HĐ" value={contract.ngayKyHD} />
                            <InfoRow label="Giá trị HĐ" value={`${formatCurrency(contract.giaTriHD)} đ`} />
                            <InfoRow label="Giá trị QT" value={`${formatCurrency(contract.giaTriQT)} đ`} />
                            <InfoRow label="Đã thu" value={`${formatCurrency(contract.daThu)} đ`} />
                            <InfoRow label="Còn phải thu" value={`${formatCurrency(contract.conPhaiThu)} đ`} />
                            <InfoRow label="Nhân sự phụ trách" value={contract.nhanSuTen || '(Chưa rõ)'} />
                            <InfoRow label="Trạng thái file" value={contract.fileStatus} />
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Danh sách tài liệu</h3>
                                <button onClick={openAddDocument} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            {contract.files && contract.files.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {contract.files.map((file, idx) => (
                                        <div key={idx} className="p-2.5 border border-slate-200 rounded-xl hover:shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-slate-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">{file.file_type}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{file.file_name}</div>
                                                </div>
                                            </div>
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><ExternalLink size={16} /></a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-400 italic">Chưa có tài liệu</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Thu chi</h3>
                                <button onClick={openAddFinance} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Loại phiếu</th>
                                        <th className="px-4 py-2 text-left">Ngày</th>
                                        <th className="px-4 py-2 text-right">Số tiền</th>
                                        <th className="px-4 py-2 text-left">Nội dung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contract.daThu > 0 ? (
                                        <tr className="border-b border-slate-100">
                                            <td className="px-4 py-3"><span className="text-green-600 font-medium">Phiếu thu</span></td>
                                            <td className="px-4 py-3 text-slate-500">Đã thanh toán</td>
                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(contract.daThu)} đ</td>
                                            <td className="px-4 py-3 text-slate-500">Thanh toán theo hợp đồng</td>
                                        </tr>
                                    ) : (
                                        <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">Chưa có phiếu thu chi</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Công việc chi tiết</h3>
                                <button onClick={openAddTask} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            {loadingTasks ? (
                                <div className="py-10 text-center text-slate-400">Đang tải...</div>
                            ) : tasks.length > 0 ? (
                                <div className="space-y-2">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-slate-800 truncate">{task.ten_task}</div>
                                                        <span className={getStatusBadge(task.trang_thai)}>{task.trang_thai}</span>
                                                    </div>

                                                    <div className="text-[10.5px] text-slate-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-1.5">
                                                        <span className="truncate">Phụ trách: {task.nguoi_phu_trach || 'Chưa rõ'}</span>
                                                        <span>Ưu tiên: {task.uu_tien || 'Trung bình'}</span>
                                                    </div>

                                                    {formatDateRange(task.ngay_bat_dau, task.ngay_ket_thuc) && (
                                                        <div className="text-[10.5px] text-slate-500 mt-1.5">
                                                            {formatDateRange(task.ngay_bat_dau, task.ngay_ket_thuc)}
                                                        </div>
                                                    )}

                                                    {task.mo_ta && shortText(task.mo_ta, 80) && (
                                                        <div className="text-[10px] text-slate-600 mt-1.5 leading-snug">
                                                            {shortText(task.mo_ta, 80)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="shrink-0 flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenQuanLyCongViec(task)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                            title="Xem ở trang quản lý"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditTask(task)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50"
                                                            title="Sửa"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteTask(task)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenQuanLyCongViec(task)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                            title="Mở trang quản lý công việc"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => openNghiemThu(task)}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100"
                                                        title="Nghiệm thu"
                                                    >
                                                        <FileCheck size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-600 h-full" style={{ width: `${task.tien_do}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{task.tien_do}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-400 italic">Chưa có công việc</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm">Đóng</button>
                </div>
            </div>

            {/* Task View Modal */}
            {viewTask && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 line-clamp-1">{viewTask.ten_task}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Task • Mức ưu tiên: {viewTask.uu_tien}</p>
                            </div>
                            <button onClick={() => setViewTask(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={getStatusBadge(viewTask.trang_thai)}>{viewTask.trang_thai}</span>
                                <span className="text-xs text-slate-600">Phụ trách: {viewTask.nguoi_phu_trach || '(Chưa rõ)'}</span>
                            </div>

                            {formatDateRange(viewTask.ngay_bat_dau, viewTask.ngay_ket_thuc) ? (
                                <div className="text-xs text-slate-600">
                                    {formatDateRange(viewTask.ngay_bat_dau, viewTask.ngay_ket_thuc)}
                                </div>
                            ) : null}

                            {viewTask.mo_ta ? (
                                <div className="text-sm text-slate-700 leading-snug pt-1">
                                    {viewTask.mo_ta}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500 italic pt-1">Không có mô tả</div>
                            )}

                            {viewTask.ghi_chu ? (
                                <div className="text-sm text-slate-700 leading-snug pt-1">
                                    <span className="font-medium text-slate-600">Ghi chú:</span> {viewTask.ghi_chu}
                                </div>
                            ) : null}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setViewTask(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    setEditTask(viewTask);
                                    setViewTask(null);
                                }}
                                className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-md transition-colors"
                            >
                                Sửa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Edit Modal */}
            {editTask && (
                <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-base font-bold text-slate-800">Sửa công việc</h3>
                            <button
                                onClick={() => setEditTask(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={editForm.ten_task}
                                    onChange={(e) => setEditForm((p) => ({ ...p, ten_task: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    rows={3}
                                    value={editForm.mo_ta}
                                    onChange={(e) => setEditForm((p) => ({ ...p, mo_ta: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.trang_thai}
                                        onChange={(e) => setEditForm((p) => ({ ...p, trang_thai: e.target.value }))}
                                    >
                                        <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                        <option value="Đang thực hiện">Đang thực hiện</option>
                                        <option value="Hoàn thành">Hoàn thành</option>
                                        <option value="Tạm dừng">Tạm dừng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Độ ưu tiên</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.uu_tien}
                                        onChange={(e) => setEditForm((p) => ({ ...p, uu_tien: e.target.value }))}
                                    >
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
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.ngay_bat_dau}
                                        onChange={(e) => setEditForm((p) => ({ ...p, ngay_bat_dau: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.ngay_ket_thuc}
                                        onChange={(e) => setEditForm((p) => ({ ...p, ngay_ket_thuc: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.nguoi_phu_trach}
                                        onChange={(e) => setEditForm((p) => ({ ...p, nguoi_phu_trach: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={editForm.tien_do}
                                        onChange={(e) => setEditForm((p) => ({ ...p, tien_do: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    rows={2}
                                    value={editForm.ghi_chu}
                                    onChange={(e) => setEditForm((p) => ({ ...p, ghi_chu: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button
                                onClick={() => setEditTask(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveTask}
                                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="py-[3px] border-b border-slate-50/70">
            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
            <div className="text-[12.5px] font-medium text-slate-700 leading-snug truncate">
                {value || '(Trống)'}
            </div>
        </div>
    );
}
