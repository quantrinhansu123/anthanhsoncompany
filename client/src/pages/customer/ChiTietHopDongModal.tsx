import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    X, Edit, Trash2, FileText, FolderOpen, ClipboardList, Plus, Maximize2, 
    Link as LinkIcon, FileCheck, Image as ImageIcon,
    CreditCard, User, Eye, Pencil, Download
} from 'lucide-react';
import { contractService, ContractFile } from '../../lib/services/contractService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { taskDetailService } from '../../lib/services/taskDetailService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { useThuChiModal } from '../../contexts/ThuChiModalContext';
import { useNavigate } from 'react-router-dom';
import { PreviewLinkModal } from '../../components/PreviewLinkModal';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import {
    HOP_DONG_FILE_TYPES,
    HOP_DONG_FILE_TYPE_LABELS,
    hopDongFileTypeLabel,
    normalizeHopDongFileType,
    normalizeContractFiles,
    calculateHopDongFileStatus,
    downloadContractFile,
} from '../../lib/hopDongFiles';

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
    nguongChiNhanSu?: number;
    nguongChiNhanSuLoai?: NguongChiNhanSuLoai;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
    projectName?: string;
}

interface ChiTietHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
}

const FILE_TYPES = HOP_DONG_FILE_TYPES;
const FILE_TYPE_LABELS = HOP_DONG_FILE_TYPE_LABELS;

export function ChiTietHopDongModal({ isOpen, onClose, contract: contractProp }: ChiTietHopDongModalProps) {
    const { 
        contractData,
        patchContractData,
        isAddDocumentOpen,
        openAddDocument, 
        openAddFinance, 
        openAddTask, 
        openNghiemThu,
        openThemHopDong
    } = useHopDongModal();
    const contract = contractData ?? contractProp;
    const contractFiles = useMemo(
        () => normalizeContractFiles(contract?.files),
        [contract?.files],
    );
    const { openThemThuChi, openDelete } = useThuChiModal();
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
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [thuChiRows, setThuChiRows] = useState<ThuChiRow[]>([]);
    const [loadingThuChi, setLoadingThuChi] = useState(false);

    const loadThuChi = useCallback(async () => {
        if (!contract?.uuid) {
            setThuChiRows([]);
            return;
        }
        setLoadingThuChi(true);
        try {
            const all = await thuChiService.getAll();
            setThuChiRows(
                all
                    .filter((r) => (r.hop_dong_id || '') === contract.uuid)
                    .sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || ''))),
            );
        } catch (e) {
            console.error('[ChiTietHopDongModal] loadThuChi:', e);
            setThuChiRows([]);
        } finally {
            setLoadingThuChi(false);
        }
    }, [contract?.uuid]);

    useEffect(() => {
        if (!isOpen) setPreviewUrl(null);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && contract?.uuid) {
            loadThuChi();
        }
    }, [isOpen, contract?.uuid, loadThuChi]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

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

    const refreshContractFiles = useCallback(async () => {
        const id = String(contract?.uuid || '').trim();
        if (!id) return;
        try {
            const row = await contractService.getById(id);
            if (!row) return;
            const files = normalizeContractFiles(row.files);
            const fileStatus = row.file_status || calculateHopDongFileStatus(files);
            patchContractData({ files, fileStatus });
        } catch (e) {
            console.error('[ChiTietHopDongModal] refreshContractFiles:', e);
        }
    }, [contract?.uuid, patchContractData]);

    const prevAddDocumentOpen = useRef(isAddDocumentOpen);
    useEffect(() => {
        if (prevAddDocumentOpen.current && !isAddDocumentOpen && isOpen) {
            void refreshContractFiles();
        }
        prevAddDocumentOpen.current = isAddDocumentOpen;
    }, [isAddDocumentOpen, isOpen, refreshContractFiles]);

    useEffect(() => {
        if (isOpen && activeTab === 'documents' && contract?.uuid) {
            void refreshContractFiles();
        }
    }, [isOpen, activeTab, contract?.uuid, refreshContractFiles]);

    /** Ghi `ngay_update` khi mở xem để cột "Lịch sử HS" trên danh sách HĐ phản ánh lần truy cập gần nhất. */
    useEffect(() => {
        if (!isOpen || !contract?.uuid) return;
        let cancelled = false;
        const uuid = contract.uuid;
        (async () => {
            try {
                await contractService.update(uuid, {});
                if (cancelled) return;
            } catch (e) {
                console.warn('[ChiTietHopDongModal] Ghi nhận truy cập hồ sơ:', e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, contract?.uuid]);

    const contractProgress = useMemo(() => {
        if (!tasks.length) return 0;
        const total = tasks.reduce((sum, task) => sum + (task.tien_do || 0), 0);
        return Math.round(total / tasks.length);
    }, [tasks]);

    const formatDate = (v: string | null) => {
        if (!v) return '';
        const s = String(v).trim();
        if (!s) return '';
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
        const base = 'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border';

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
        onClose();
        navigate(`/quy-trinh/quan-ly-cong-viec?taskId=${encodeURIComponent(String(task.id))}`);
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

            await taskDetailService.upsertFromTask(updated as any, { allowInsert: false });

            setEditTask(null);
            await loadTasks();
        } catch (err: any) {
            console.error('[ChiTietHopDongModal] Error saving task:', err);
            alert(err?.message || 'Lỗi khi lưu công việc');
        }
    };

    return (
        <>
        {isOpen && contract ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">Chi tiết hợp đồng</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Số HĐ: {contract.soHopDong}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                openThemHopDong(contract as any);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                            <Edit size={15} />
                            Sửa
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200 bg-white">
                    <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                        {[
                            { id: 'info', label: 'Thông tin hợp đồng' },
                            { id: 'documents', label: 'Tài liệu HĐ' },
                            { id: 'finance', label: 'Thu chi' },
                            { id: 'tasks', label: 'Công việc CT' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all duration-200
                                    ${activeTab === tab.id
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                    {activeTab === 'info' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Project Name */}
                            {(contract.projectName || (contract as any).tenDuAn) && (
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
                                    <div className="text-xs text-slate-400 font-medium mb-1">Dự án</div>
                                    <div className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                                        <span>★</span>
                                        <span className="italic">{contract.projectName || (contract as any).tenDuAn}</span>
                                    </div>
                                </div>
                            )}

                            {/* Contract Details */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                {[
                                    { label: 'Số hợp đồng', value: contract.soHopDong },
                                    { label: 'Ngày ký HĐ', value: contract.ngayKyHD },
                                    { label: 'Tên gói thầu', value: contract.tenGoiThau },
                                    { label: 'Loại dịch vụ', value: contract.loaiDichVu || '—' },
                                    { label: 'Trạng thái file', value: contract.fileStatus, highlight: true },
                                    { label: 'Nhân sự phụ trách', value: contract.nhanSuTen || '(Chưa rõ)' },
                                    { label: 'Ngày cập nhật', value: contract.ngayUpdate },
                                ].map((row, index) => (
                                    <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                        <div className={`flex-1 font-medium ${row.highlight ? 'text-red-600 italic' : 'text-slate-800'}`}>{row.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Task Progress */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                    <h3 className="text-sm font-semibold text-slate-800">Tiến độ công việc</h3>
                                </div>
                                <div className="px-4 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-600 font-medium">Hoàn thành: {tasks.filter(t => t.tien_do === 100).length} / {tasks.length} task</span>
                                        <span className="text-sm font-bold text-slate-800">{contractProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                contractProgress === 100 ? 'bg-emerald-500' :
                                                contractProgress >= 75 ? 'bg-blue-500' :
                                                contractProgress >= 50 ? 'bg-yellow-500' :
                                                contractProgress >= 25 ? 'bg-orange-500' :
                                                'bg-slate-400'
                                            }`}
                                            style={{ width: `${contractProgress}%` }}
                                        />
                                    </div>
                                    {tasks.length === 0 && (
                                        <p className="text-xs text-slate-400 mt-2 italic text-center">Chưa có task nào</p>
                                    )}
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                    <h3 className="text-sm font-semibold text-slate-800">Thông tin tài chính</h3>
                                </div>
                                {[
                                    { label: 'Giá trị hợp đồng', value: formatCurrency(contract.giaTriHD), color: 'text-slate-800' },
                                    { label: 'Giá trị quyết toán', value: formatCurrency(contract.giaTriQT), color: 'text-green-600' },
                                    {
                                        label: 'Ngưỡng chi nhân sự',
                                        value: (() => {
                                            const loai = normalizeNguongLoai(contract.nguongChiNhanSuLoai);
                                            const raw = contract.nguongChiNhanSu ?? 0;
                                            const tien = tienQuyDoiNguongChiNhanSu(loai, contract.giaTriQT, raw);
                                            if (loai === 'phan_tram' && raw > 0) {
                                                return `${Number(raw).toLocaleString('vi-VN')}% × QT → ${formatCurrency(tien)}`;
                                            }
                                            return formatCurrency(tien);
                                        })(),
                                        color: 'text-violet-700',
                                    },
                                    { label: 'Đã thu', value: formatCurrency(contract.daThu), color: 'text-green-600' },
                                    { label: 'Còn phải thu', value: formatCurrency(contract.conPhaiThu), color: contract.conPhaiThu > 0 ? 'text-red-500' : 'text-green-600' },
                                ].map((row, index) => (
                                    <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                        <div className={`flex-1 font-bold ${row.color}`}>{row.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Files List */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-800">Danh sách file</h3>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                                            {contractFiles.length}
                                        </span>
                                    </div>
                                    <button onClick={openAddDocument} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm tài liệu">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {contractFiles.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {contractFiles.map((file, index) => (
                                            <div key={index} className="px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <FileText size={18} className="text-slate-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-800">{hopDongFileTypeLabel(file.file_type)}</div>
                                                        <div className="text-xs text-slate-500 truncate">{file.file_name}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadContractFile(file)}
                                                    className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md flex items-center gap-2 transition-colors shrink-0"
                                                >
                                                    <Download size={14} />
                                                    Tải tài liệu
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-10 text-center">
                                        <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm text-slate-400 italic">Chưa có tài liệu</p>
                                    </div>
                                )}

                                {/* Missing Files Warning */}
                                {(() => {
                                    const uploadedTypes = new Set(
                                        contractFiles
                                            .filter(f => f.file_url && f.file_url.trim() !== '')
                                            .map(f => normalizeHopDongFileType(f.file_type))
                                    );
                                    const mandatoryTypes = FILE_TYPES.filter(t => t !== 'File_QD' && t !== 'File_Khac');
                                    const missingFiles = mandatoryTypes.filter(type => !uploadedTypes.has(type));
                                    if (missingFiles.length > 0) {
                                        return (
                                            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                                                <div className="text-xs font-semibold text-amber-800 mb-1">Các file còn thiếu:</div>
                                                <div className="text-xs text-amber-700">{missingFiles.map(t => FILE_TYPE_LABELS[t] || t).join(', ')}</div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-slate-800">Thu chi</h3>
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">
                                        {thuChiRows.length}
                                    </span>
                                </div>
                                <button onClick={openAddFinance} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm thu chi">
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                {loadingThuChi ? (
                                    <p className="px-4 py-6 text-xs text-slate-500">Đang tải chứng từ...</p>
                                ) : (
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white text-[10px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Loại phiếu</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Hạng mục</th>
                                            <th className="px-4 py-3 whitespace-nowrap">Hạng mục thu</th>
                                            <th className="px-4 py-3">Ngày</th>
                                            <th className="px-4 py-3 text-right">Số tiền</th>
                                            <th className="px-4 py-3 min-w-[8rem]">Nội dung</th>
                                            <th className="px-4 py-3 text-center w-24">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {thuChiRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                                    Chưa có phiếu thu/chi nào
                                                </td>
                                            </tr>
                                        ) : (
                                            thuChiRows.map((row) => (
                                                <tr key={row.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className={row.loai_phieu === 'Phiếu thu' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                                                            {row.loai_phieu}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {row.loai_phieu === 'Phiếu chi'
                                                            ? row.hang_muc_chi === 'chi_nhan_su'
                                                                ? 'Chi nhân sự'
                                                                : row.hang_muc_chi === 'chi_du_an'
                                                                  ? 'Chi dự án'
                                                                  : '—'
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-600">
                                                        {row.loai_phieu === 'Phiếu thu'
                                                            ? String(row.hang_muc_thu || '').trim() || '—'
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                        {formatDate(row.ngay)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
                                                        {formatCurrency(row.so_tien || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[14rem]">
                                                        {row.noi_dung || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openThemThuChi(
                                                                        'edit',
                                                                        row,
                                                                        row.loai_phieu === 'Phiếu chi'
                                                                            ? 'Phiếu chi'
                                                                            : 'Phiếu thu',
                                                                    )
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                                                title="Sửa"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openDelete({ id: row.id })}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-800">Công việc chi tiết</h3>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{tasks.length}</span>
                                    </div>
                                    <button onClick={openAddTask} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm công việc">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {loadingTasks ? (
                                    <div className="px-4 py-10 text-center text-sm text-slate-400">Đang tải...</div>
                                ) : tasks.length === 0 ? (
                                    <div className="px-4 py-10 text-center">
                                        <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm text-slate-400 italic">Chưa có công việc nào</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {tasks.map((task) => (
                                            <div key={task.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-sm font-bold text-slate-800">{task.ten_task}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                task.trang_thai === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                                                                task.trang_thai === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {task.trang_thai}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-2">Phụ trách: {task.nguoi_phu_trach || '—'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                                                <div
                                                                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${task.tien_do}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{task.tien_do}%</span>
                                                        </div>
                                                        {(task.link_tai_lieu || task.anh_bang_chung) && (
                                                            <div className="mt-2 flex items-center gap-3">
                                                                {task.link_tai_lieu && (
                                                                    <button type="button" onClick={() => setPreviewUrl(task.link_tai_lieu!)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                                        <LinkIcon size={10} /> Tài liệu
                                                                    </button>
                                                                )}
                                                                {task.anh_bang_chung && (
                                                                    <button type="button" onClick={() => setPreviewUrl(task.anh_bang_chung!)} className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                                        <ImageIcon size={10} /> Bằng chứng
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => openNghiemThu(task)} 
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 transition-colors" 
                                                        title="Nghiệm thu"
                                                    >
                                                        <FileCheck size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors shadow-sm"
                    >
                        Đóng
                    </button>
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
        ) : null}
        <PreviewLinkModal
            url={previewUrl}
            onClose={() => setPreviewUrl(null)}
            title="Xem tài liệu"
            zIndexClass="z-[280]"
        />
        </>
    );
}
