import React, { useState, useEffect } from 'react';
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Info,
    AlertCircle,
    X,
    Filter,
    FileText,
    CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThuChiModal } from '../../contexts/ThuChiModalContext';
import { NhanSuAvatar } from '../../components/NhanSuTenAnhPicker';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { employeeService } from '../../lib/services/employeeService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { parseMoneyVi } from '../../lib/excelTableTools';
import { cn } from '../../lib/utils';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100',
    };

    return (
        <div
            className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ${bgColors[type]}`}
        >
            {icons[type]}
            <p className="text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export function ThuChiNhanSu() {
    const navigate = useNavigate();
    const [items, setItems] = useState<ThuChiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
    const [searchContractTerm, setSearchContractTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    const [projects, setProjects] = useState<
        Array<{ id: string; ten_du_an: string; customer_name?: string | null; ten_khach_hang?: string | null }>
    >([]);
    const [contracts, setContracts] = useState<
        Array<{ id: string; hop_dong_row_id?: string | null; so_hop_dong: string | null; du_an_id: string | null }>
    >([]);

    const [selectedNhanSuIds, setSelectedNhanSuIds] = useState<string[]>([]);
    const [selectedDuAnIds, setSelectedDuAnIds] = useState<string[]>([]);
    const [selectedHopDongIds, setSelectedHopDongIds] = useState<string[]>([]);

    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [quickDateFilter, setQuickDateFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [filterPanelOpen, setFilterPanelOpen] = useState(true);

    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const { openChiTietThuChi, openDelete } = useThuChiModal();

    const thuChiNsExcelColumns: ExcelColumnDef[] = [
        { key: 'so_tien', header: 'Số tiền', example: '3000000' },
        { key: 'ngay', header: 'Ngày', example: '2025-03-01' },
        { key: 'ten_du_an', header: 'Tên dự án', example: 'Khớp tên dự án' },
        { key: 'so_hop_dong', header: 'Số hợp đồng', example: 'Để trống nếu Chi dự án' },
        { key: 'hang_muc_chi', header: 'Hạng mục chi', example: 'Chi dự án hoặc Chi nhân sự' },
        { key: 'ten_nhan_su', header: 'Tên nhân sự', example: 'Bắt buộc' },
        { key: 'noi_dung', header: 'Nội dung', example: '' },
        { key: 'tinh_trang', header: 'Tình trạng phiếu', example: 'Tạm ứng' },
    ];

    useEffect(() => {
        (async () => {
            try {
                const employeeList = await employeeService.getAll();
                setEmployees(
                    employeeList.map((emp) => ({
                        id: emp.id.toString(),
                        full_name: emp.full_name || emp.name || emp.hoTen || '',
                        code: emp.code || '',
                    })),
                );

                const projectList = await projectService.getAll();
                setProjects(
                    projectList.map((p) => ({
                        id: p.id,
                        ten_du_an: p.ten_du_an,
                        customer_name: p.customer_name ?? null,
                        ten_khach_hang: (p as { ten_khach_hang?: string | null }).ten_khach_hang ?? null,
                    })),
                );

                const contractList = await contractService.getAll();
                setContracts(
                    contractList.map((c) => ({
                        id: c.id,
                        hop_dong_row_id: c.hop_dong_row_id ?? c.id,
                        so_hop_dong: c.so_hop_dong,
                        du_an_id: c.du_an_id || null,
                    })),
                );
            } catch (e) {
                console.error('Error loading data:', e);
            }
        })();
    }, []);

    useEffect(() => {
        loadRecords();
    }, [selectedNhanSuIds, selectedDuAnIds, selectedHopDongIds, dateFrom, dateTo, quickDateFilter, projects]);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await thuChiService.getAll();

            let filteredData = data.filter((item) => item.loai_phieu === 'Phiếu chi');

            if (selectedNhanSuIds.length > 0) {
                filteredData = filteredData.filter(
                    (item) => item.nhan_su_id && selectedNhanSuIds.includes(item.nhan_su_id),
                );
            }

            if (selectedDuAnIds.length > 0) {
                filteredData = filteredData.filter((item) => item.du_an_id && selectedDuAnIds.includes(item.du_an_id));
            }

            if (selectedHopDongIds.length > 0) {
                filteredData = filteredData.filter(
                    (item) => item.hop_dong_id && selectedHopDongIds.includes(item.hop_dong_id),
                );
            }

            if (dateFrom || dateTo) {
                filteredData = filteredData.filter((item) => {
                    if (!item.ngay) return false;
                    const itemDate = new Date(item.ngay).toISOString().split('T')[0];
                    if (dateFrom && itemDate < dateFrom) return false;
                    if (dateTo && itemDate > dateTo) return false;
                    return true;
                });
            }

            const projectCustomerMap = new Map<string, string>();
            projects.forEach((p) => {
                const name = p.customer_name || p.ten_khach_hang || '';
                if (name) projectCustomerMap.set(p.id, name);
            });

            const mappedData = filteredData.map((item) => ({
                ...item,
                code: item.id.substring(0, 8).toUpperCase(),
                date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '',
                type: item.loai_phieu,
                amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.so_tien),
                description: item.noi_dung || '',
                ten_du_an: item.ten_du_an || '(Chưa có dự án)',
                nhan_su_display: item.nhan_su_ten || null,
                customer_name: item.du_an_id ? projectCustomerMap.get(item.du_an_id) || null : null,
            }));
            setItems(mappedData as any);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu';
            setError(msg);
            console.error('Error loading thu chi nhan su:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (item: ThuChiRow) => {
        openDelete(item, loadRecords);
    };

    const handleAddClick = () => {
        navigate('/tai-chinh/thu-chi/them');
    };

    const handleEditClick = (item: ThuChiRow) => {
        navigate(`/tai-chinh/thu-chi/them/${item.id}`);
    };

    const handleViewClick = (item: ThuChiRow) => {
        openChiTietThuChi(item);
    };

    const toggleNhanSuFilter = (id: string) => {
        setSelectedNhanSuIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const toggleDuAnFilter = (id: string) => {
        setSelectedDuAnIds((prev) => {
            const newIds = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            if (!newIds.includes(id)) {
                const contractsToRemove = contracts.filter((c) => c.du_an_id === id).map((c) => c.id);
                setSelectedHopDongIds((prevHd) => prevHd.filter((hdId) => !contractsToRemove.includes(hdId)));
            }
            return newIds;
        });
    };

    const toggleHopDongFilter = (id: string) => {
        setSelectedHopDongIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const getFilteredContracts = () => {
        if (selectedDuAnIds.length === 0) {
            return [];
        }
        return contracts.filter((c) => c.du_an_id && selectedDuAnIds.includes(c.du_an_id));
    };

    const handleQuickDateFilter = (filter: string) => {
        setQuickDateFilter(filter);

        const today = new Date();
        let fromDate = '';
        let toDate = '';

        switch (filter) {
            case 'today':
                fromDate = today.toISOString().split('T')[0];
                toDate = today.toISOString().split('T')[0];
                break;
            case 'thisMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                break;
            default:
                return;
        }

        setDateFrom(fromDate);
        setDateTo(toDate);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSearchCustomerTerm('');
        setSearchContractTerm('');
        setSelectedNhanSuIds([]);
        setSelectedDuAnIds([]);
        setSelectedHopDongIds([]);
        setDateFrom('');
        setDateTo('');
        setQuickDateFilter('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch =
            !searchTerm ||
            item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.nhan_su_display?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCustomer =
            !searchCustomerTerm ||
            ((item as { customer_name?: string }).customer_name || '')
                .toLowerCase()
                .includes(searchCustomerTerm.toLowerCase());

        const matchesContract =
            !searchContractTerm || (item.so_hop_dong || '').toLowerCase().includes(searchContractTerm.toLowerCase());

        const matchesDuAn = selectedDuAnIds.length === 0 || (item.du_an_id && selectedDuAnIds.includes(item.du_an_id));

        const matchesHopDong =
            selectedHopDongIds.length === 0 || (item.hop_dong_id && selectedHopDongIds.includes(item.hop_dong_id));

        const matchesNhanSu =
            selectedNhanSuIds.length === 0 || (item.nhan_su_id && selectedNhanSuIds.includes(item.nhan_su_id));

        let matchesDate = true;
        if (dateFrom || dateTo) {
            const itemDate = item.ngay ? new Date(item.ngay).toISOString().split('T')[0] : '';
            if (dateFrom && itemDate < dateFrom) matchesDate = false;
            if (dateTo && itemDate > dateTo) matchesDate = false;
        }

        const matchesStatus =
            !statusFilter || (item.tinh_trang_phieu || '').trim() === statusFilter.trim();

        return (
            matchesSearch &&
            matchesCustomer &&
            matchesContract &&
            matchesDuAn &&
            matchesHopDong &&
            matchesNhanSu &&
            matchesDate &&
            matchesStatus
        );
    });

    const totalAmount = filteredItems.reduce((sum, item) => sum + (item.so_tien || 0), 0);
    const formattedTotalNumber = new Intl.NumberFormat('vi-VN').format(totalAmount);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchTerm,
        searchCustomerTerm,
        searchContractTerm,
        selectedNhanSuIds,
        selectedDuAnIds,
        selectedHopDongIds,
        dateFrom,
        dateTo,
        statusFilter,
    ]);

    const inputClass =
        'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-400 transition-all';
    const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-slate-500';

    return (
        <>
            <style>{`
        .tcns-filter-panel {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-height: 1200px;
            opacity: 1;
        }
        .tcns-filter-panel.tcns-hidden-panel {
            max-height: 0;
            opacity: 0;
            margin-bottom: 0;
            padding-top: 0;
            padding-bottom: 0;
            overflow: hidden;
            pointer-events: none;
        }
      `}</style>
            <div
                className={cn(
                    '-m-3 sm:-m-4 md:-m-6 min-h-[calc(100vh-5rem)] bg-slate-50 text-slate-900 px-3 sm:px-4 md:px-6 py-6 pb-24 md:pb-12 font-sans animate-in fade-in duration-300',
                )}
            >
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                {/* Editorial header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                    <div className="flex gap-4 items-start">
                        <button
                            type="button"
                            onClick={() => navigate('/tai-chinh')}
                            className="mt-1 p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-colors shrink-0"
                            aria-label="Quay lại Tài chính"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2 leading-none font-[Manrope,sans-serif]">
                                Quản lý thu chi nhân sự
                            </h1>
                            <p className="text-slate-600 font-medium text-sm">
                                Theo dõi và phê duyệt các giao dịch tài chính nội bộ
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start md:justify-end">
                        <button
                            type="button"
                            onClick={() => setFilterPanelOpen((v) => !v)}
                            className={cn(
                                'px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2 font-semibold text-sm',
                                filterPanelOpen && 'bg-blue-50 border-blue-200 text-blue-900',
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            Lọc
                        </button>
                        <div className="flex flex-wrap gap-2 items-center [&_button]:border-slate-200 [&_button]:bg-white [&_button]:text-slate-700 [&_button:hover]:bg-slate-50 [&_button]:text-xs [&_span.text-slate-600]:text-slate-500">
                            <ExcelImportExportBar
                                className="flex flex-wrap"
                                columns={thuChiNsExcelColumns}
                                templateFileName="mau-phieu-chi-nhan-su"
                                sheetName="Phieu chi"
                                onImport={async (rows, onProgress) => {
                                    const errors: string[] = [];
                                    let ok = 0;
                                    const total = rows.length;
                                    const chunkSize = 50;

                                    for (let i = 0; i < rows.length; i += chunkSize) {
                                        const chunk = rows.slice(i, i + chunkSize);
                                        const payloads: Record<string, unknown>[] = [];

                                        for (let j = 0; j < chunk.length; j++) {
                                            const r = chunk[j];
                                            const tenDuAn = (r.ten_du_an || '').trim();
                                            const proj = projects.find(
                                                (p) => p.ten_du_an.trim().toLowerCase() === tenDuAn.toLowerCase(),
                                            );
                                            if (!tenDuAn || !proj) {
                                                errors.push(`Dòng ${r.__rowNumber || i + j + 2}: không tìm thấy dự án`);
                                                continue;
                                            }
                                            const soTien = parseMoneyVi(r.so_tien || '0');
                                            if (soTien <= 0) {
                                                errors.push(`Dòng ${r.__rowNumber || i + j + 2}: Số tiền không hợp lệ`);
                                                continue;
                                            }
                                            const tn = (r.ten_nhan_su || '').trim();
                                            const emp = employees.find(
                                                (e) => (e.full_name || '').trim().toLowerCase() === tn.toLowerCase(),
                                            );
                                            if (!tn || !emp) {
                                                errors.push(
                                                    `Dòng ${r.__rowNumber || i + j + 2}: thiếu/không khớp Tên nhân sự`,
                                                );
                                                continue;
                                            }
                                            const hm = (r.hang_muc_chi || '').toLowerCase();
                                            const hangMuc = hm.includes('nhân') ? 'chi_nhan_su' : 'chi_du_an';
                                            const soHd = (r.so_hop_dong || '').trim();
                                            let hopDongId: string | null = null;
                                            if (soHd) {
                                                const c = contracts.find(
                                                    (x) =>
                                                        String(x.du_an_id || '') === String(proj.id) &&
                                                        (x.so_hop_dong || '').trim().toLowerCase() ===
                                                            soHd.toLowerCase(),
                                                );
                                                if (!c) {
                                                    errors.push(
                                                        `Dòng ${r.__rowNumber || i + j + 2}: không tìm thấy HĐ "${soHd}" thuộc dự án`,
                                                    );
                                                    continue;
                                                }
                                                hopDongId = String(c.hop_dong_row_id || c.id);
                                            } else if (hangMuc === 'chi_nhan_su') {
                                                errors.push(`Dòng ${r.__rowNumber || i + j + 2}: Chi nhân sự cần Số hợp đồng`);
                                                continue;
                                            }

                                            payloads.push({
                                                loai_phieu: 'Phiếu chi',
                                                so_tien: soTien,
                                                ngay: r.ngay?.trim() || new Date().toISOString().split('T')[0],
                                                du_an_id: proj.id,
                                                hop_dong_id: hopDongId,
                                                noi_dung: r.noi_dung?.trim() || null,
                                                hang_muc_chi: hangMuc,
                                                nhan_su_id: emp.id,
                                                nguoi_nhan: null,
                                                tinh_trang_phieu: r.tinh_trang?.trim() || 'Tạm ứng',
                                            });
                                        }

                                        if (payloads.length > 0) {
                                            try {
                                                const res = await thuChiService.createMany(payloads as any);
                                                ok += res.length;
                                            } catch (e: unknown) {
                                                const msg = e instanceof Error ? e.message : 'Lỗi';
                                                errors.push(`Lỗi khi lưu lô dòng từ ${i + 1}: ${msg}`);
                                            }
                                        }
                                        onProgress(Math.min(i + chunkSize, total), total);
                                    }
                                    return { ok, errors };
                                }}
                                onDone={() => loadRecords()}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddClick}
                            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/15 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-2 text-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Thêm phiếu
                        </button>
                    </div>
                </div>

                {/* Filter panel */}
                <div
                    className={cn(
                        'bg-white rounded-2xl p-6 mb-8 shadow-sm relative overflow-hidden border border-slate-200 tcns-filter-panel',
                        !filterPanelOpen && 'tcns-hidden-panel',
                    )}
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
                        <div className="space-y-1.5">
                            <label className={labelClass}>Mã chứng từ/nội dung</label>
                            <input
                                className={inputClass}
                                placeholder="Tìm kiếm..."
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelClass}>Khách hàng</label>
                            <input
                                className={inputClass}
                                placeholder="Tên khách hàng"
                                type="text"
                                value={searchCustomerTerm}
                                onChange={(e) => setSearchCustomerTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelClass}>Trạng thái phiếu</label>
                            <select
                                className={cn(inputClass, 'appearance-none cursor-pointer')}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="Tạm ứng">Tạm ứng</option>
                                <option value="Thanh toán">Thanh toán</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelClass}>Số hợp đồng</label>
                            <input
                                className={inputClass}
                                placeholder="SHD-2024-XXX"
                                type="text"
                                value={searchContractTerm}
                                onChange={(e) => setSearchContractTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                            <label className={labelClass}>Dự án</label>
                            <div
                                className={cn(
                                    inputClass,
                                    'max-h-[120px] overflow-y-auto space-y-1.5 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300',
                                )}
                            >
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedDuAnIds.length === projects.length && projects.length > 0}
                                        onChange={() => {
                                            if (selectedDuAnIds.length === projects.length) setSelectedDuAnIds([]);
                                            else setSelectedDuAnIds(projects.map((p) => p.id));
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Chọn tất cả
                                </label>
                                {projects.map((proj) => (
                                    <label
                                        key={proj.id}
                                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDuAnIds.includes(proj.id)}
                                            onChange={() => toggleDuAnFilter(proj.id)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{proj.ten_du_an}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelClass}>Nhân sự</label>
                            <div
                                className={cn(
                                    inputClass,
                                    'max-h-[120px] overflow-y-auto space-y-1.5 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300',
                                )}
                            >
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedNhanSuIds.length === employees.length && employees.length > 0}
                                        onChange={() => {
                                            if (selectedNhanSuIds.length === employees.length) setSelectedNhanSuIds([]);
                                            else setSelectedNhanSuIds(employees.map((e) => e.id));
                                        }}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Chọn tất cả
                                </label>
                                {employees.map((emp) => (
                                    <label
                                        key={emp.id}
                                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedNhanSuIds.includes(emp.id)}
                                            onChange={() => toggleNhanSuFilter(emp.id)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="truncate">{emp.full_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {getFilteredContracts().length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 relative z-10">
                            <p className={cn(labelClass, 'mb-2')}>Hợp đồng (theo dự án đã chọn)</p>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {getFilteredContracts().map((c) => (
                                    <label
                                        key={c.id}
                                        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer text-slate-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedHopDongIds.includes(c.id)}
                                            onChange={() => toggleHopDongFilter(c.id)}
                                            className="rounded border-slate-300 text-blue-600"
                                        />
                                        {c.so_hop_dong || c.id}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-slate-200 relative z-10">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={labelClass}>Khoảng thời gian:</span>
                            <div className="flex gap-2 items-center">
                                <input
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 [color-scheme:light]"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setQuickDateFilter('');
                                    }}
                                />
                                <span className="text-slate-400 text-xs">→</span>
                                <input
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 [color-scheme:light]"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setQuickDateFilter('');
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(labelClass, 'mr-1')}>Nhanh:</span>
                            <button
                                type="button"
                                onClick={() => handleQuickDateFilter('today')}
                                className={cn(
                                    'px-3 py-1 rounded-full text-[11px] font-medium transition-colors border border-transparent',
                                    quickDateFilter === 'today'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                                )}
                            >
                                Hôm nay
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickDateFilter('thisMonth')}
                                className={cn(
                                    'px-3 py-1 rounded-full text-[11px] font-medium transition-colors border border-transparent',
                                    quickDateFilter === 'thisMonth'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                                )}
                            >
                                Tháng này
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-2 hidden sm:block" />
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-blue-600 text-xs font-bold hover:underline"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800 text-white p-6 rounded-2xl flex items-center justify-between group border border-slate-700/50 shadow-md">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-blue-200">
                                <CreditCard className="w-7 h-7" aria-hidden />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                    Tổng số tiền (Phiếu chi)
                                </p>
                                <h3 className="text-2xl font-extrabold text-white font-[Manrope,sans-serif]">
                                    {formattedTotalNumber}{' '}
                                    <span className="text-base text-slate-400 font-normal ml-1">đ</span>
                                </h3>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-blue-200 bg-white/10 px-2 py-0.5 rounded-full inline-block mb-1">
                                Live Balance
                            </div>
                            <p className="text-slate-400 text-[10px]">Cập nhật tức thì</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl flex items-center justify-between group border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                <FileText className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                    Số lượng phiếu
                                </p>
                                <h3 className="text-2xl font-extrabold text-slate-900 font-[Manrope,sans-serif]">
                                    {filteredItems.length}{' '}
                                    <span className="text-base text-slate-500 font-normal ml-1">phiếu</span>
                                </h3>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1 border border-blue-100">
                                Thống kê
                            </div>
                            <p className="text-slate-500 text-[10px]">
                                {filteredItems.length ? 'Đã lọc theo điều kiện' : 'Đang chờ dữ liệu'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                    {loading && (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
                        </div>
                    )}
                    {error && !loading && (
                        <div className="p-12 text-center">
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <button
                                type="button"
                                onClick={() => loadRecords()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Mã chứng từ
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Dự án
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Ngày chứng từ
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Loại
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 text-right whitespace-nowrap">
                                            Số tiền
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 min-w-[140px]">
                                            Nội dung
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Nhân sự
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">
                                            Ảnh
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 text-center whitespace-nowrap">
                                            Hành động
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                                            >
                                                <td className="px-4 md:px-6 py-3 font-bold text-blue-600 whitespace-nowrap">
                                                    {item.code || '(Trống)'}
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-slate-700 max-w-[200px] truncate">
                                                    {item.ten_du_an || '(Chưa có dự án)'}
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-slate-600 whitespace-nowrap">
                                                    {(item as { date?: string }).date || '(Trống)'}
                                                </td>
                                                <td className="px-4 md:px-6 py-3">
                                                    <span
                                                        className={cn(
                                                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                                            item.loai_phieu === 'Phiếu thu'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-rose-100 text-rose-800',
                                                        )}
                                                    >
                                                        {item.loai_phieu || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-slate-900 font-bold text-right pr-4 md:pr-6 whitespace-nowrap">
                                                    {(item as { amount?: string }).amount || '0'}
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-slate-600 max-w-[220px]">
                                                    <span className="line-clamp-2">
                                                        {(item as { description?: string }).description || '(Trống)'}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-3 text-slate-700 text-sm">
                                                    {(item as { nhan_su_display?: string }).nhan_su_display ? (
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <NhanSuAvatar
                                                                src={item.nhan_su_anh}
                                                                name={(item as { nhan_su_display?: string }).nhan_su_display}
                                                                className="w-8 h-8 text-xs"
                                                            />
                                                            <span className="truncate">
                                                                {(item as { nhan_su_display?: string }).nhan_su_display}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-3">
                                                    {item.anh_url ? (
                                                        <img
                                                            src={item.anh_url}
                                                            alt="Chứng từ"
                                                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => handleViewClick(item)}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 md:px-6 py-3">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewClick(item)}
                                                            className="p-1.5 text-slate-400 border border-slate-200 bg-white rounded-lg hover:text-blue-600 hover:border-blue-200 transition-colors"
                                                            title="Xem"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(item)}
                                                            className="p-1.5 text-slate-400 border border-slate-200 bg-white rounded-lg hover:text-slate-800 hover:border-slate-300 transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item)}
                                                            className="p-1.5 text-slate-400 border border-slate-200 bg-white rounded-lg hover:text-red-600 hover:border-red-200 transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td className="py-20 md:py-24" colSpan={9}>
                                                <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
                                                    <div className="w-24 h-24 mb-6 bg-slate-100 rounded-full flex items-center justify-center relative border border-slate-200">
                                                        <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-full" />
                                                        <FileText className="w-12 h-12 text-blue-300 relative z-10" />
                                                    </div>
                                                    <h4 className="text-xl font-bold text-slate-900 mb-2 font-[Manrope,sans-serif]">
                                                        Không có phiếu chi nào
                                                    </h4>
                                                    <p className="text-slate-500 mb-6 font-medium text-sm">
                                                        Vui lòng thêm phiếu chi mới để bắt đầu quản lý các giao dịch nhân
                                                        sự trong hệ thống.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddClick}
                                                        className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 text-sm group"
                                                    >
                                                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                                        Thêm phiếu chi mới
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && !error && (
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                        <div className="text-slate-500 text-[13px] font-medium text-center sm:text-left">
                            Hiển thị{' '}
                            <span className="text-slate-800 font-bold">
                                {filteredItems.length === 0 ? 0 : startIndex + 1}-
                                {Math.min(startIndex + itemsPerPage, filteredItems.length)}
                            </span>{' '}
                            trên <span className="text-slate-800 font-bold">{filteredItems.length}</span> bản ghi
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 hidden sm:inline">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 border border-slate-200 shadow-sm"
                                aria-label="Trang trước"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 border border-slate-200 shadow-sm"
                                aria-label="Trang sau"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
