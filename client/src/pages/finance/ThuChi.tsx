import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CheckSquare,
    Square,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Info,
    AlertCircle,
    X,
    Filter,
    Bookmark,
    Briefcase,
    FileText,
    ChevronDown,
    Calendar,
    TrendingDown,
    TrendingUp,
    Landmark,
    Gauge,
    Percent
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';
import { customerService, type Customer } from '../../lib/services/customerService';
import { useThuChiModal } from '../../contexts/ThuChiModalContext';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { parseMoneyVi } from '../../lib/excelTableTools';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100'
    };

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ${bgColors[type]}`}>
            {icons[type]}
            <p className="text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

function StatChip({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300">
            {label}
        </span>
    );
}

export function ThuChi() {
    const navigate = useNavigate();
    const [items, setItems] = useState<ThuChiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'thu' | 'chi'>('thu'); // Tab mặc định: Phiếu thu
    const [customers, setCustomers] = useState<Array<Pick<Customer, 'id' | 'ten_don_vi'>>>([]);
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string; customer_id: string | null; customer_name: string | null }>>([]);
    const [contracts, setContracts] = useState<
        Array<{
            id: string;
            so_hop_dong: string | null;
            du_an_id: string | null;
            customer_id: string | null;
            customer_name: string | null;
            gia_tri_qt?: number | null;
            nguong_chi_nhan_su?: number | null;
            nguong_chi_nhan_su_loai?: string | null;
        }>
    >([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    
    // Filter states - sử dụng mảng để có thể chọn nhiều
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [selectedDuAnIds, setSelectedDuAnIds] = useState<string[]>([]);
    const [selectedHopDongIds, setSelectedHopDongIds] = useState<string[]>([]);
    const [selectedNhanSuIds, setSelectedNhanSuIds] = useState<string[]>([]);
    
    // Date filter states
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [quickDateFilter, setQuickDateFilter] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    
    // Column filter dropdown states
    const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
    
    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const thuChiExcelColumns: ExcelColumnDef[] = [
        { key: 'loai_phieu', header: 'Loại phiếu', example: 'Phiếu thu hoặc Phiếu chi' },
        { key: 'so_tien', header: 'Số tiền', example: '5000000' },
        { key: 'ngay', header: 'Ngày', example: '2025-03-01' },
        { key: 'ten_du_an', header: 'Tên dự án', example: 'Khớp tên dự án' },
        { key: 'noi_dung', header: 'Nội dung', example: 'Ghi chú' },
        { key: 'hang_muc_chi', header: 'Hạng mục chi', example: 'Chi dự án / Chi nhân sự (phiếu chi)' },
        { key: 'ten_nhan_su', header: 'Tên nhân sự', example: 'Bắt buộc nếu Phiếu chi' },
        { key: 'tinh_trang', header: 'Tình trạng phiếu', example: 'Tạm ứng' },
    ];

    const { openChiTietThuChi, openDelete, openThemThuChi } = useThuChiModal();
    const handleEditClick = (item: any) => {
        openThemThuChi('edit', item);
    };

    const handleViewClick = (item: any) => {
        openChiTietThuChi(item);
    };


    // Load projects, contracts, employees
    useEffect(() => {
        (async () => {
            try {
                const customerList = await customerService.getAll();
                setCustomers((customerList || []).map((c: any) => ({ id: c.id, ten_don_vi: c.ten_don_vi })));

                const projectList = await projectService.getAll();
                setProjects(projectList.map((p: any) => ({
                    id: p.id,
                    ten_du_an: p.ten_du_an,
                    customer_id: p.customer_id || null,
                    customer_name: p.customer_name || p.ten_khach_hang || null
                })));
                
                const contractList = await contractService.getAll();
                setContracts(
                    contractList.map((c: any) => ({
                        id: c.id,
                        so_hop_dong: c.so_hop_dong,
                        du_an_id: c.du_an_id || null,
                        customer_id: c.customer_id || null,
                        customer_name: c.customer_name || null,
                        gia_tri_qt: c.gia_tri_qt ?? null,
                        nguong_chi_nhan_su: c.nguong_chi_nhan_su ?? null,
                        nguong_chi_nhan_su_loai: c.nguong_chi_nhan_su_loai ?? null,
                    })),
                );
                
                const employeeList = await employeeService.getAll();
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || ''
                })));
            } catch (error) {
                console.error('Error loading filter data:', error);
            }
        })();
    }, []);

    // Load data from database
    useEffect(() => {
        loadRecords();
    }, [selectedCustomerIds, selectedDuAnIds, selectedHopDongIds, selectedNhanSuIds, dateFrom, dateTo, quickDateFilter, selectedMonth]);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await thuChiService.getAll();
            
            // Map data để hiển thị
            const projectInfoMap = new Map<string, { ten_du_an: string | null; customer_id: string | null; customer_name: string | null }>();
            projects.forEach(p => {
                projectInfoMap.set(p.id, { ten_du_an: p.ten_du_an || null, customer_id: p.customer_id || null, customer_name: p.customer_name || null });
            });

            const mappedData = data.map((item) => {
                const nhanSuDisplay = item.nhan_su_ten || null;
                return {
                    ...item,
                    code: item.id.substring(0, 8).toUpperCase(), // Mã chứng từ từ ID
                    date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                    dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '', // Ngày giờ ghi nhận
                    type: item.loai_phieu,
                    amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.so_tien),
                    description: item.noi_dung || '',
                    hang_muc_display:
                        item.loai_phieu === 'Phiếu chi'
                            ? item.hang_muc_chi === 'chi_du_an'
                                ? 'Chi dự án'
                                : item.hang_muc_chi === 'chi_nhan_su'
                                  ? 'Chi nhân sự'
                                  : '—'
                            : '—',
                    ten_du_an: item.ten_du_an || projectInfoMap.get(item.du_an_id || '')?.ten_du_an || '(Chưa có dự án)',
                    customer_id: projectInfoMap.get(item.du_an_id || '')?.customer_id || null,
                    customer_name: projectInfoMap.get(item.du_an_id || '')?.customer_name || null,
                    nhan_su_display: nhanSuDisplay,
                };
            });
            setItems(mappedData);
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
            console.error('Error loading thu chi:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string | number) => {
        openDelete(id, loadRecords);
    };

    const handleAddClick = () => {
        const defaultType = activeTab === 'thu' ? 'Phiếu thu' : 'Phiếu chi';
        openThemThuChi('add', null, defaultType);
    };

    const toggleSelect = (id: string | number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isSelected = (id: string | number) => selectedIds.includes(id);

    const toggleCustomerFilter = (id: string) => {
        setSelectedCustomerIds(prev => {
            const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            // Khi bỏ chọn khách hàng, không cần ép các filter khác; UX ưu tiên giữ lựa chọn hiện tại
            return newIds;
        });
    };

    // Filter handlers
    const toggleDuAnFilter = (id: string) => {
        setSelectedDuAnIds(prev => {
            const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            // Khi bỏ chọn dự án, cũng bỏ chọn các hợp đồng thuộc dự án đó
            if (!newIds.includes(id)) {
                const contractsToRemove = contracts
                    .filter(c => c.du_an_id === id)
                    .map(c => c.id);
                setSelectedHopDongIds(prevHd => 
                    prevHd.filter(hdId => !contractsToRemove.includes(hdId))
                );
            }
            return newIds;
        });
    };

    const toggleHopDongFilter = (id: string) => {
        setSelectedHopDongIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleNhanSuFilter = (id: string) => {
        setSelectedNhanSuIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Lấy danh sách dự án theo khách hàng đã chọn
    const getFilteredProjects = () => {
        if (selectedCustomerIds.length === 0) return projects;
        return projects.filter(p => p.customer_id && selectedCustomerIds.includes(p.customer_id));
    };

    // Lấy danh sách hợp đồng theo dự án đã chọn
    const getFilteredContracts = () => {
        // Ưu tiên lọc theo dự án nếu có
        if (selectedDuAnIds.length > 0) {
            return contracts.filter(c => c.du_an_id && selectedDuAnIds.includes(c.du_an_id));
        }
        // Nếu chưa chọn dự án nhưng có chọn khách hàng, lọc theo khách hàng
        if (selectedCustomerIds.length > 0) {
            return contracts.filter(c => c.customer_id && selectedCustomerIds.includes(c.customer_id));
        }
        // Không chọn gì: trả về toàn bộ hợp đồng (có thể dài, nhưng vẫn hữu ích)
        return contracts;
    };

    // Xử lý quick date filter
    const handleQuickDateFilter = (filter: string) => {
        setQuickDateFilter(filter);
        setSelectedMonth('');
        
        const today = new Date();
        let fromDate = '';
        let toDate = '';
        
        switch (filter) {
            case 'today':
                fromDate = today.toISOString().split('T')[0];
                toDate = today.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                fromDate = yesterday.toISOString().split('T')[0];
                toDate = yesterday.toISOString().split('T')[0];
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

    // Xử lý chọn tháng
    const handleMonthSelect = (month: string) => {
        setSelectedMonth(month);
        setQuickDateFilter('');
        
        if (month) {
            const today = new Date();
            const year = today.getFullYear();
            const monthNum = parseInt(month);
            const fromDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
            const toDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
            setDateFrom(fromDate);
            setDateTo(toDate);
        }
    };

    // Filter theo tab (Phiếu thu hoặc Phiếu chi), search term và các bộ lọc
    const filteredItems = items.filter(item => {
        // Filter theo tab
        const matchesTab = activeTab === 'thu' 
            ? item.type === 'Phiếu thu'
            : item.type === 'Phiếu chi';
        
        // Filter theo search term
        const matchesSearch = !searchTerm || 
            item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());

        // Filter theo khách hàng
        const matchesCustomer = selectedCustomerIds.length === 0 ||
            ((item as any).customer_id && selectedCustomerIds.includes((item as any).customer_id));
        
        // Filter theo dự án
        const matchesDuAn = selectedDuAnIds.length === 0 || 
            (item.du_an_id && selectedDuAnIds.includes(item.du_an_id));
        
        // Filter theo hợp đồng
        const matchesHopDong = selectedHopDongIds.length === 0 || 
            (item.hop_dong_id && selectedHopDongIds.includes(item.hop_dong_id));
        
        // Filter theo nhân sự
        const matchesNhanSu = selectedNhanSuIds.length === 0 || 
            (item.nhan_su_id && selectedNhanSuIds.includes(item.nhan_su_id));
        
        // Filter theo ngày
        let matchesDate = true;
        if (dateFrom || dateTo) {
            const itemDate = item.ngay ? new Date(item.ngay).toISOString().split('T')[0] : '';
            if (dateFrom && itemDate < dateFrom) {
                matchesDate = false;
            }
            if (dateTo && itemDate > dateTo) {
                matchesDate = false;
            }
        }
        
        return matchesTab && matchesSearch && matchesCustomer && matchesDuAn && matchesHopDong && matchesNhanSu && matchesDate;
    });

    // Tính tổng số tiền theo các bộ lọc
    const totalAmount = filteredItems.reduce((sum, item) => sum + (item.so_tien || 0), 0);
    const formattedTotalAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount);

    const nguongVndByHopDongId = useMemo(() => {
        const m = new Map<string, number>();
        contracts.forEach((c) => {
            if (!c.id) return;
            const loai = normalizeNguongLoai(c.nguong_chi_nhan_su_loai);
            const raw = Number(c.nguong_chi_nhan_su ?? 0);
            const vnd = tienQuyDoiNguongChiNhanSu(loai, Number(c.gia_tri_qt) || 0, raw);
            m.set(String(c.id), vnd);
        });
        return m;
    }, [contracts]);

    /** Tab Phiếu chi: tổng chi NS & tổng ngưỡng (cộng ngưỡng các HĐ có phiếu chi NS trong bộ lọc) */
    const chiNhanSuSummary = useMemo(() => {
        if (activeTab !== 'chi') {
            return { tongChiNS: 0, tongNguong: 0, pct: null as number | null };
        }
        const chiNsRows = filteredItems.filter(
            (i) => i.loai_phieu === 'Phiếu chi' && i.hang_muc_chi === 'chi_nhan_su',
        );
        const tongChiNS = chiNsRows.reduce((s, i) => s + (Number(i.so_tien) || 0), 0);
        const hopIds = new Set<string>();
        chiNsRows.forEach((i) => {
            if (i.hop_dong_id) hopIds.add(String(i.hop_dong_id));
        });
        let tongNguong = 0;
        hopIds.forEach((hid) => {
            tongNguong += nguongVndByHopDongId.get(hid) ?? 0;
        });
        const pct = tongNguong > 0 ? (tongChiNS / tongNguong) * 100 : null;
        return { tongChiNS, tongNguong, pct };
    }, [activeTab, filteredItems, nguongVndByHopDongId]);

    const fmtVnd = (n: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

    /** Tổng chi nhân sự theo từng HĐ trong danh sách đang lọc (dùng cho cột ngưỡng / %) */
    const tongChiNsByHopFiltered = useMemo(() => {
        const m = new Map<string, number>();
        filteredItems.forEach((i) => {
            if (i.loai_phieu === 'Phiếu chi' && i.hang_muc_chi === 'chi_nhan_su' && i.hop_dong_id) {
                const k = String(i.hop_dong_id);
                m.set(k, (m.get(k) || 0) + (Number(i.so_tien) || 0));
            }
        });
        return m;
    }, [filteredItems]);

    const rowNguongMeta = (item: (typeof items)[0]) => {
        if (item.loai_phieu !== 'Phiếu chi' || item.hang_muc_chi !== 'chi_nhan_su' || !item.hop_dong_id) {
            return { nguong: null as number | null, pct: null as number | null };
        }
        const hid = String(item.hop_dong_id);
        const nguong = nguongVndByHopDongId.get(hid) ?? 0;
        const tong = tongChiNsByHopFiltered.get(hid) ?? 0;
        const pct = nguong > 0 ? (tong / nguong) * 100 : null;
        return { nguong: nguong > 0 ? nguong : null, pct };
    };

    const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id));

    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : filteredItems.map(item => item.id));
    };

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    return (
        <>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="bg-white rounded-2xl shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/90 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 md:px-8 pt-6 pb-5 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50/30">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                            <div className="flex items-start gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/tai-chinh')}
                                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                    aria-label="Quay lại"
                                >
                                    <ArrowLeft size={18} strokeWidth={2} />
                                </button>
                                <div>
                                    <h1 className="text-lg md:text-xl font-semibold tracking-tight text-slate-900">
                                        Quản lý thu chi
                                    </h1>
                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Theo dõi phiếu thu, phiếu chi và mức đạt ngưỡng nhân sự theo hợp đồng
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs — segmented */}
                        <div
                            className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 shadow-inner"
                            role="tablist"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'thu'}
                                onClick={() => {
                                    setActiveTab('thu');
                                    setCurrentPage(1);
                                    setSelectedIds([]);
                                }}
                                className={`relative px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'thu'
                                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200/80'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <TrendingUp size={16} className={activeTab === 'thu' ? 'text-emerald-600' : 'text-slate-400'} />
                                Phiếu thu
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'chi'}
                                onClick={() => {
                                    setActiveTab('chi');
                                    setCurrentPage(1);
                                    setSelectedIds([]);
                                }}
                                className={`relative px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                                    activeTab === 'chi'
                                        ? 'bg-white text-rose-700 shadow-sm ring-1 ring-slate-200/80'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <TrendingDown size={16} className={activeTab === 'chi' ? 'text-rose-600' : 'text-slate-400'} />
                                Phiếu chi
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-4 md:px-8 py-5 border-b border-slate-100 bg-white">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4">
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Tìm mã, nội dung..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2 relative">
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'status' ? null : 'status');
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                                    >
                                        <Bookmark size={14} className="text-slate-400" />
                                        Trạng thái
                                        <ChevronDown size={14} className="text-slate-400" />
                                    </button>
                                    {openColumnFilter === 'status' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2 space-y-1">
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                    <span className="text-xs">Tạm ứng</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                    <span className="text-xs">Thanh toán</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topCustomer' ? null : 'topCustomer');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedCustomerIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Filter size={14} className={selectedCustomerIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Khách hàng
                                        {selectedCustomerIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedCustomerIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedCustomerIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topCustomer' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[260px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCustomerIds.length === customers.length && customers.length > 0}
                                                            onChange={() => {
                                                                if (selectedCustomerIds.length === customers.length) {
                                                                    setSelectedCustomerIds([]);
                                                                } else {
                                                                    setSelectedCustomerIds(customers.map(c => c.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {customers.map(cus => (
                                                        <label key={cus.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedCustomerIds.includes(cus.id)}
                                                                onChange={() => toggleCustomerFilter(cus.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{cus.ten_don_vi}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topProject' ? null : 'topProject');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedDuAnIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Briefcase size={14} className={selectedDuAnIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Dự án
                                        {selectedDuAnIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedDuAnIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedDuAnIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topProject' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[250px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Tìm kiếm..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedDuAnIds.length === getFilteredProjects().length && getFilteredProjects().length > 0}
                                                            onChange={() => {
                                                                if (selectedDuAnIds.length === getFilteredProjects().length) {
                                                                    setSelectedDuAnIds([]);
                                                                } else {
                                                                    setSelectedDuAnIds(getFilteredProjects().map(p => p.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {getFilteredProjects().map(proj => (
                                                        <label key={proj.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDuAnIds.includes(proj.id)}
                                                                onChange={() => toggleDuAnFilter(proj.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{proj.ten_du_an}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topContract' ? null : 'topContract');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedHopDongIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <FileText size={14} className={selectedHopDongIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Hợp đồng
                                        {selectedHopDongIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedHopDongIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedHopDongIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topContract' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[260px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedHopDongIds.length === getFilteredContracts().length && getFilteredContracts().length > 0}
                                                            onChange={() => {
                                                                if (selectedHopDongIds.length === getFilteredContracts().length) {
                                                                    setSelectedHopDongIds([]);
                                                                } else {
                                                                    setSelectedHopDongIds(getFilteredContracts().map(c => c.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {getFilteredContracts().map(ct => (
                                                        <label key={ct.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedHopDongIds.includes(ct.id)}
                                                                onChange={() => toggleHopDongFilter(ct.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{ct.so_hop_dong || '(Trống)'}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topEmployee' ? null : 'topEmployee');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedNhanSuIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Filter size={14} className={selectedNhanSuIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Nhân sự
                                        {selectedNhanSuIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedNhanSuIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedNhanSuIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topEmployee' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[250px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Tìm kiếm..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedNhanSuIds.length === employees.length && employees.length > 0}
                                                            onChange={() => {
                                                                if (selectedNhanSuIds.length === employees.length) {
                                                                    setSelectedNhanSuIds([]);
                                                                } else {
                                                                    setSelectedNhanSuIds(employees.map(e => e.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {employees.map(emp => (
                                                        <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedNhanSuIds.includes(emp.id)}
                                                                onChange={() => toggleNhanSuFilter(emp.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{emp.full_name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ExcelImportExportBar
                                className="flex flex-wrap"
                                columns={thuChiExcelColumns}
                                templateFileName="mau-thu-chi"
                                sheetName="Thu chi"
                                onImport={async (rows) => {
                                    const errors: string[] = [];
                                    let ok = 0;
                                    for (let i = 0; i < rows.length; i++) {
                                        const r = rows[i];
                                        const loai = (r.loai_phieu || '').trim();
                                        if (loai !== 'Phiếu thu' && loai !== 'Phiếu chi') {
                                            errors.push(`Dòng ${i + 2}: Loại phiếu phải là "Phiếu thu" hoặc "Phiếu chi"`);
                                            continue;
                                        }
                                        if (activeTab === 'thu' && loai !== 'Phiếu thu') {
                                            errors.push(`Dòng ${i + 2}: đang tab Phiếu thu — chỉ nhập dòng Phiếu thu`);
                                            continue;
                                        }
                                        if (activeTab === 'chi' && loai !== 'Phiếu chi') {
                                            errors.push(`Dòng ${i + 2}: đang tab Phiếu chi — chỉ nhập dòng Phiếu chi`);
                                            continue;
                                        }
                                        const tenDuAn = (r.ten_du_an || '').trim();
                                        const proj = projects.find(
                                            (p) => p.ten_du_an.trim().toLowerCase() === tenDuAn.toLowerCase(),
                                        );
                                        if (!tenDuAn || !proj) {
                                            errors.push(`Dòng ${i + 2}: không tìm thấy dự án "${tenDuAn || '(trống)'}"`);
                                            continue;
                                        }
                                        const soTien = parseMoneyVi(r.so_tien || '0');
                                        if (soTien <= 0) {
                                            errors.push(`Dòng ${i + 2}: Số tiền không hợp lệ`);
                                            continue;
                                        }
                                        let nhanSuId: string | null = null;
                                        if (loai === 'Phiếu chi') {
                                            const tn = (r.ten_nhan_su || '').trim();
                                            const emp = employees.find(
                                                (e) =>
                                                    (e.full_name || '').trim().toLowerCase() === tn.toLowerCase(),
                                            );
                                            if (!tn || !emp) {
                                                errors.push(`Dòng ${i + 2}: thiếu/không khớp Tên nhân sự`);
                                                continue;
                                            }
                                            nhanSuId = emp.id;
                                        }
                                        const hm = (r.hang_muc_chi || '').toLowerCase();
                                        const hangMuc =
                                            loai === 'Phiếu chi'
                                                ? hm.includes('nhân')
                                                    ? 'chi_nhan_su'
                                                    : 'chi_du_an'
                                                : null;
                                        try {
                                            await thuChiService.create({
                                                loai_phieu: loai,
                                                so_tien: soTien,
                                                ngay: r.ngay?.trim() || new Date().toISOString().split('T')[0],
                                                du_an_id: proj.id,
                                                noi_dung: r.noi_dung?.trim() || null,
                                                hang_muc_chi: hangMuc,
                                                nhan_su_id: nhanSuId,
                                                nguoi_nhan: null,
                                                tinh_trang_phieu: r.tinh_trang?.trim() || 'Tạm ứng',
                                            });
                                            ok++;
                                        } catch (e: any) {
                                            errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi'}`);
                                        }
                                    }
                                    return { ok, errors };
                                }}
                                onDone={() => loadRecords()}
                            />
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className={`flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] ${
                                    activeTab === 'thu'
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600'
                                        : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600'
                                }`}
                            >
                                <Plus size={18} strokeWidth={2.5} />
                                {activeTab === 'thu' ? 'Thêm phiếu thu' : 'Thêm phiếu chi'}
                            </button>
                        </div>

                        {/* Date Filter Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => handleQuickDateFilter('today')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'today'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Hôm nay
                            </button>
                            <button
                                onClick={() => handleQuickDateFilter('yesterday')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'yesterday'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Hôm qua
                            </button>
                            <button
                                onClick={() => handleQuickDateFilter('thisMonth')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'thisMonth'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Tháng này
                            </button>
                            <select
                                value={selectedMonth}
                                onChange={(e) => handleMonthSelect(e.target.value)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            >
                                <option value="">Tháng</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month.toString().padStart(2, '0')}>
                                        Tháng {month}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setQuickDateFilter('');
                                        setSelectedMonth('');
                                    }}
                                    className="text-xs border-none focus:outline-none bg-transparent [color-scheme:light]"
                                    placeholder="Từ ngày"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setQuickDateFilter('');
                                        setSelectedMonth('');
                                    }}
                                    className="text-xs border-none focus:outline-none bg-transparent [color-scheme:light]"
                                    placeholder="Đến ngày"
                                />
                            </div>
                        </div>

                        {/* KPI tổng */}
                        <div className="px-4 md:px-8 pb-2 pt-1">
                            <div className="relative overflow-hidden rounded-2xl border border-slate-800/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-xl">
                                <div
                                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
                                    aria-hidden
                                />
                                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" aria-hidden />
                                <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />

                                {activeTab === 'chi' ? (
                                    <div className="relative px-5 py-6 md:px-7 md:py-7">
                                        <div className="flex items-center gap-2 mb-5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-rose-300 ring-1 ring-white/10">
                                                <TrendingDown size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                                    Tổng quan phiếu chi
                                                </p>
                                                <p className="text-sm text-slate-400">Theo bộ lọc hiện tại</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.06]">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Landmark size={15} className="text-rose-400/90" />
                                                    <span className="text-xs font-medium">Tổng tiền chi</span>
                                                </div>
                                                <p className="mt-3 text-2xl font-semibold tracking-tight text-rose-100 tabular-nums md:text-3xl">
                                                    {formattedTotalAmount}
                                                </p>
                                            </div>
                                            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.06]">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Gauge size={15} className="text-violet-300/90" />
                                                    <span className="text-xs font-medium">Tổng tiền ngưỡng</span>
                                                </div>
                                                <p className="mt-3 text-2xl font-semibold tracking-tight text-violet-100 tabular-nums md:text-3xl">
                                                    {chiNhanSuSummary.tongNguong > 0
                                                        ? fmtVnd(chiNhanSuSummary.tongNguong)
                                                        : '—'}
                                                </p>
                                                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                                    Cộng ngưỡng các HĐ có phiếu chi nhân sự trong lọc
                                                </p>
                                            </div>
                                            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.06]">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Percent size={15} className="text-slate-400" aria-hidden />
                                                        <span className="text-xs font-medium">Đạt ngưỡng (chi NS)</span>
                                                    </div>
                                                    {chiNhanSuSummary.pct != null && chiNhanSuSummary.tongNguong > 0 ? (
                                                        <span
                                                            className={`text-lg font-semibold tabular-nums ${
                                                                chiNhanSuSummary.pct > 100
                                                                    ? 'text-red-300'
                                                                    : chiNhanSuSummary.pct >= 90
                                                                      ? 'text-amber-200'
                                                                      : 'text-emerald-300'
                                                            }`}
                                                        >
                                                            {(Math.round(chiNhanSuSummary.pct * 10) / 10).toLocaleString('vi-VN')}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-slate-500">—</span>
                                                    )}
                                                </div>
                                                {chiNhanSuSummary.pct != null && chiNhanSuSummary.tongNguong > 0 ? (
                                                    <>
                                                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-white/5">
                                                            <div
                                                                className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                                                                    chiNhanSuSummary.pct > 100
                                                                        ? 'from-red-600 to-red-400'
                                                                        : chiNhanSuSummary.pct >= 90
                                                                          ? 'from-amber-600 to-amber-400'
                                                                          : 'from-emerald-600 to-emerald-400'
                                                                }`}
                                                                style={{
                                                                    width: `${Math.min(100, chiNhanSuSummary.pct)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <p className="mt-3 text-[11px] text-slate-400 tabular-nums">
                                                            Chi NS: {fmtVnd(chiNhanSuSummary.tongChiNS)}
                                                            {chiNhanSuSummary.pct > 100 ? (
                                                                <span className="ml-1.5 font-medium text-red-300">
                                                                    · Vượt ngưỡng
                                                                </span>
                                                            ) : null}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                                                        Cần phiếu chi nhân sự có hợp đồng và ngưỡng trên HĐ.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
                                            <StatChip label={`${filteredItems.length} phiếu`} />
                                            {selectedCustomerIds.length > 0 && (
                                                <StatChip label={`${selectedCustomerIds.length} khách hàng`} />
                                            )}
                                            {selectedHopDongIds.length > 0 && (
                                                <StatChip label={`${selectedHopDongIds.length} hợp đồng`} />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col gap-6 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-7 md:py-7">
                                        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
                                        <div className="relative flex items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                                                <TrendingUp size={22} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                                    Tổng tiền thu
                                                </p>
                                                <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-100 tabular-nums md:text-4xl">
                                                    {formattedTotalAmount}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500">Theo bộ lọc hiện tại</p>
                                            </div>
                                        </div>
                                        <div className="relative flex flex-wrap items-center gap-2 md:justify-end">
                                            <StatChip label={`${filteredItems.length} phiếu`} />
                                            {selectedCustomerIds.length > 0 && (
                                                <StatChip label={`${selectedCustomerIds.length} khách hàng`} />
                                            )}
                                            {selectedHopDongIds.length > 0 && (
                                                <StatChip label={`${selectedHopDongIds.length} hợp đồng`} />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="p-8 text-center border-b border-slate-100">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="p-8 text-center border-b border-slate-100">
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <button
                                onClick={() => { }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <div className="overflow-x-auto" onClick={() => setOpenColumnFilter(null)}>
                            <table className="w-full text-sm text-left">
                                <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <button onClick={toggleSelectAll} className="flex items-center">
                                                {isAllSelected ? (
                                                    <CheckSquare size={18} className="text-blue-600" />
                                                ) : (
                                                    <Square size={18} className="text-slate-400" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Mã chứng từ</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'code' ? null : 'code');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'code' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Dự án</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'project' ? null : 'project');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'project' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[250px] max-h-60 overflow-y-auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <div className="space-y-1">
                                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                                <span className="text-xs">Chọn tất cả</span>
                                                            </label>
                                                            <div className="border-t border-slate-200 my-1"></div>
                                                            {projects.map(proj => (
                                                                <label key={proj.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedDuAnIds.includes(proj.id)}
                                                                        onChange={() => toggleDuAnFilter(proj.id)}
                                                                        className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                                    />
                                                                    <span className="text-xs">{proj.ten_du_an}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap">Ngày chứng từ</th>
                                        <th className="p-4 whitespace-nowrap">Loại phiếu</th>
                                        <th className="p-4 whitespace-nowrap">Hạng mục chi</th>
                                        <th className="p-4 whitespace-nowrap text-right pr-6">Số tiền</th>
                                        {activeTab === 'chi' && (
                                            <>
                                                <th className="p-4 whitespace-nowrap text-right min-w-[7.5rem]">
                                                    Ngưỡng (HĐ)
                                                </th>
                                                <th className="p-4 whitespace-nowrap min-w-[9.5rem]">
                                                    Đạt ngưỡng
                                                </th>
                                            </>
                                        )}
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Nội dung</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'content' ? null : 'content');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'content' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap">Ảnh</th>
                                        <th className="p-4 whitespace-nowrap text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b border-slate-100/90 transition-colors hover:bg-slate-50/80 group"
                                            >
                                                <td className="p-4">
                                                    <button onClick={() => toggleSelect(item.id)} className="flex items-center">
                                                        {isSelected(item.id) ? (
                                                            <CheckSquare size={18} className="text-blue-600" />
                                                        ) : (
                                                            <Square size={18} className="text-slate-400" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="p-4 font-medium text-slate-700">
                                                    {item.code || '(Trống)'}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {item.ten_du_an || '(Chưa có dự án)'}
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">
                                                    {item.date || '(Trống)'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'Phiếu thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {item.type || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-600 whitespace-nowrap">
                                                    {item.hang_muc_display ?? '—'}
                                                </td>
                                                <td className="p-4 text-slate-900 font-bold text-right pr-6">
                                                    {item.amount || '0'}
                                                </td>
                                                {activeTab === 'chi' && (() => {
                                                    const { nguong, pct } = rowNguongMeta(item);
                                                    const over = pct != null && pct > 100;
                                                    const near = pct != null && pct >= 90 && pct <= 100;
                                                    return (
                                                        <>
                                                            <td className="p-4 text-right align-middle">
                                                                {nguong != null && nguong > 0 ? (
                                                                    <span className="text-xs font-medium text-slate-700 tabular-nums">
                                                                        {fmtVnd(nguong)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 align-middle min-w-[9.5rem]">
                                                                {pct != null && nguong != null && nguong > 0 ? (
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span
                                                                                className={`text-[11px] font-semibold tabular-nums ${
                                                                                    over
                                                                                        ? 'text-red-600'
                                                                                        : near
                                                                                          ? 'text-amber-600'
                                                                                          : 'text-violet-700'
                                                                                }`}
                                                                            >
                                                                                {(Math.round(pct * 10) / 10).toLocaleString('vi-VN')}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full max-w-[8rem] rounded-full bg-slate-200 overflow-hidden ml-auto">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${
                                                                                    over
                                                                                        ? 'bg-red-500'
                                                                                        : near
                                                                                          ? 'bg-amber-500'
                                                                                          : 'bg-violet-500'
                                                                                }`}
                                                                                style={{
                                                                                    width: `${Math.min(100, pct)}%`,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-400 leading-tight">
                                                                            Theo tổng chi NS (lọc) của HĐ
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">—</span>
                                                                )}
                                                            </td>
                                                        </>
                                                    );
                                                })()}
                                                <td className="p-4 text-slate-600">
                                                    {item.description || '(Trống)'}
                                                </td>
                                                <td className="p-4">
                                                    {item.anh_url ? (
                                                        <img 
                                                            src={item.anh_url} 
                                                            alt="Chứng từ" 
                                                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => openChiTietThuChi(item)}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-1.5 transition-opacity">
                                                        <button
                                                            onClick={() => handleViewClick(item)}
                                                            className="action-btn p-1.5 text-purple-600 border border-purple-100 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                                                            title="Xem"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditClick(item)}
                                                            className="action-btn p-1.5 text-orange-500 border border-orange-100 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="action-btn p-1.5 text-red-500 border border-red-100 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
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
                                            <td colSpan={activeTab === 'chi' ? 12 : 10} className="p-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-sm font-medium">
                                                        {activeTab === 'thu' ? 'Không có phiếu thu' : 'Không có phiếu chi'}
                                                    </p>
                                                    <p className="text-xs text-slate-400">Vui lòng thêm phiếu {activeTab === 'thu' ? 'thu' : 'chi'} mới</p>
                                                    <button
                                                        onClick={handleAddClick}
                                                        className="mt-4 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm ripple"
                                                    >
                                                        Thêm phiếu {activeTab === 'thu' ? 'thu' : 'chi'} đầu tiên
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !error && (
                        <div className="px-4 md:px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="font-semibold">{filteredItems.length}</span> bản ghi
                                <div className="h-4 w-px bg-slate-300 mx-2"></div>
                                <select
                                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                                    defaultValue={itemsPerPage}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>/ trang</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-3 py-1 text-sm text-slate-600">
                                    Trang {currentPage} / {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage >= totalPages}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
