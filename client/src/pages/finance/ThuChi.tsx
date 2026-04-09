import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    Gauge,
    Percent
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';
import { customerService, type Customer } from '../../lib/services/customerService';
import { useThuChiModal } from '../../contexts/ThuChiModalContext';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { parseMoneyVi, parseExcelDate } from '../../lib/excelTableTools';

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
        <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {label}
        </span>
    );
}

export function ThuChi() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    /** Dữ liệu gốc từ API — chỉ đổi khi fetch lại, tránh gọi getAll() mỗi khi map metadata cập nhật. */
    const [rawThuChi, setRawThuChi] = useState<ThuChiRow[]>([]);
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
            hop_dong_row_id?: string | null;
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

    const customCdtExcelColumns: ExcelColumnDef[] = [
        { key: 'so_hd_plhd', header: 'Số HĐ & PLHĐ' },
        { key: 'ngay_ky_hd', header: 'Ngày ký HĐ' },
        { key: 'nam_ky_hd', header: 'Năm ký HĐ' },
        { key: 'ten_da', header: 'Tên DA' },
        { key: 'ten_goi_thau', header: 'Tên gói thầu' },
        { key: 'loai_dv', header: 'Loại DV' },
        { key: 'gia_hd_plhd', header: 'Giá HĐ/PLHĐ' },
        { key: 'gia_xuat_hd', header: 'Giá xuất HĐ' },
        { key: 'cdt_thanh_toan', header: 'CĐT thanh toán' },
        { key: 'cdt_no', header: 'CĐT nợ' },
        { key: 'cdt_tam_ung', header: 'CĐT tạm ứng' },
        { key: 'noi_dung_xuat_hd', header: 'Nội dung xuất hóa đơn' },
        { key: 'thong_tin_kh', header: 'Thông tin KH' },
        { key: 'mst_kh', header: 'MST KH' },
        { key: 'so_hd', header: 'Số HĐ' },
        { key: 'ngay_xuat_hd', header: 'Ngày xuất Hóa đơn' },
        { key: 'nam_xuat_hd', header: 'Năm xuất Hóa đơn' },
        { key: 'ghi_chu_co', header: 'Ghi chú/Có' },
        { key: 'ghi_chu_chua_co', header: 'Ghi chú/Chưa có' },
        { key: 'ngay_tien_ve', header: 'Ngày tiền về' },
        { key: 'ngay_kiem_tra_hs', header: 'Ngày kiểm tra HS' },
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
                const [customerList, projectList, contractList, employeeList] =
                    await Promise.all([
                        customerService.getAll(),
                        projectService.getAll(),
                        contractService.getAll(),
                        employeeService.getAll(),
                    ]);

                setCustomers(
                    (customerList || []).map((c: any) => ({
                        id: c.id,
                        ten_don_vi: c.ten_don_vi,
                    })),
                );

                setProjects(
                    projectList.map((p: any) => ({
                        id: p.id,
                        ten_du_an: p.ten_du_an,
                        customer_id: p.customer_id || null,
                        customer_name: p.customer_name || p.ten_khach_hang || null,
                    })),
                );

                setContracts(
                    contractList.map((c: any) => ({
                        id: c.id,
                        hop_dong_row_id: c.hop_dong_row_id ?? null,
                        so_hop_dong: c.so_hop_dong,
                        du_an_id: c.du_an_id || null,
                        customer_id: c.customer_id || null,
                        customer_name: c.customer_name || null,
                        gia_tri_qt: c.gia_tri_qt ?? null,
                        nguong_chi_nhan_su: c.nguong_chi_nhan_su ?? null,
                        nguong_chi_nhan_su_loai: c.nguong_chi_nhan_su_loai ?? null,
                    })),
                );

                setEmployees(
                    employeeList.map((emp) => ({
                        id: emp.id.toString(),
                        full_name: emp.full_name || emp.name || emp.hoTen || '',
                        code: emp.code || '',
                    })),
                );
            } catch (error) {
                console.error('Error loading filter data:', error);
            }
        })();
    }, []);

    /** Khớp `thu_chi.hop_dong_id` (thường là PK bảng hop_dong) với bản ghi hợp đồng từ API */
    const hopDongRef = (c: (typeof contracts)[number]) => String(c.hop_dong_row_id || c.id || '').trim();

    // Handle initial filters from URL (khách hàng / dự án / hợp đồng — cùng bộ tham số với các trang KH)
    useEffect(() => {
        const customerIdParam = searchParams.get('customerId');
        const duAnIdParam = searchParams.get('duAnId');
        const hopDongParam = searchParams.get('hopDongId');
        const projectName = searchParams.get('project');

        if (customers.length > 0 && customerIdParam) {
            const ok = customers.some((c) => String(c.id) === customerIdParam);
            if (ok) {
                setSelectedCustomerIds((prev) =>
                    prev.length === 1 && prev[0] === customerIdParam ? prev : [customerIdParam],
                );
            }
        }

        if (projects.length > 0) {
            if (duAnIdParam && projects.some((p) => p.id === duAnIdParam)) {
                setSelectedDuAnIds((prev) =>
                    prev.length === 1 && prev[0] === duAnIdParam ? prev : [duAnIdParam],
                );
            } else if (projectName) {
                const matchedProject = projects.find((p) => p.ten_du_an === projectName);
                if (matchedProject) {
                    setSelectedDuAnIds((prev) =>
                        prev.length === 1 && prev[0] === matchedProject.id ? prev : [matchedProject.id],
                    );
                }
            }
        }

        if (contracts.length > 0 && hopDongParam) {
            const keys = new Set<string>([hopDongParam]);
            contracts.forEach((c) => {
                if (String(c.id) === hopDongParam || String(c.hop_dong_row_id || '') === hopDongParam) {
                    const k = hopDongRef(c);
                    if (k) keys.add(k);
                }
            });
            const arr = [...keys].filter(Boolean);
            setSelectedHopDongIds((prev) => {
                if (prev.length === arr.length && arr.every((k) => prev.includes(k))) return prev;
                return arr;
            });
        }
    }, [searchParams, customers, projects, contracts]);

    const loadRecords = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await thuChiService.getAll();
            setRawThuChi(data);
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
            console.error('Error loading thu chi:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const items = useMemo(() => {
        const projectInfoMap = new Map<
            string,
            { ten_du_an: string | null; customer_id: string | null; customer_name: string | null }
        >();
        projects.forEach((p) => {
            projectInfoMap.set(p.id, {
                ten_du_an: p.ten_du_an || null,
                customer_id: p.customer_id || null,
                customer_name: p.customer_name || null,
            });
        });

        const contractByHopKey = new Map<string, (typeof contracts)[number]>();
        contracts.forEach((c) => {
            const k1 = hopDongRef(c);
            if (k1) contractByHopKey.set(k1, c);
            if (c.id) contractByHopKey.set(String(c.id), c);
        });

        return rawThuChi.map((item) => {
            const nhanSuDisplay = item.nhan_su_ten || null;
            const hid = item.hop_dong_id ? String(item.hop_dong_id).trim() : '';
            const linkedContract = hid ? contractByHopKey.get(hid) : undefined;
            const projInfo = projectInfoMap.get(item.du_an_id || '');
            const customerId =
                linkedContract?.customer_id ?? projInfo?.customer_id ?? null;
            let customerName =
                linkedContract?.customer_name ?? projInfo?.customer_name ?? null;
            if (!customerName && customerId) {
                customerName = customers.find((cc) => cc.id === customerId)?.ten_don_vi ?? null;
            }
            const soHopDong =
                (item.so_hop_dong && String(item.so_hop_dong).trim()) ||
                linkedContract?.so_hop_dong ||
                null;

            return {
                ...item,
                code: item.id.substring(0, 8).toUpperCase(),
                date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '',
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
                ten_du_an: item.ten_du_an || projInfo?.ten_du_an || '(Chưa có dự án)',
                customer_id: customerId,
                customer_name: customerName,
                so_hop_dong_display: soHopDong,
                nhan_su_display: nhanSuDisplay,
            };
        });
    }, [rawThuChi, projects, contracts, customers]);

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
                    .map((c) => hopDongRef(c));
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

    // Lọc chung (trừ tab) — dùng cho bộ đếm phiếu thu/chi theo bộ lọc hiện tại
    const baseFiltered = useMemo(() => {
        return items.filter((item) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                !searchTerm ||
                item.code?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term) ||
                (item as any).ten_du_an?.toLowerCase().includes(term) ||
                (item as any).customer_name?.toLowerCase().includes(term) ||
                (item as any).so_hop_dong_display?.toLowerCase().includes(term) ||
                (item as any).so_hop_dong?.toLowerCase().includes(term);

            const matchesCustomer =
                selectedCustomerIds.length === 0 ||
                ((item as any).customer_id && selectedCustomerIds.includes((item as any).customer_id));

            const matchesDuAn =
                selectedDuAnIds.length === 0 ||
                (item.du_an_id && selectedDuAnIds.includes(item.du_an_id));

            const matchesHopDong =
                selectedHopDongIds.length === 0 ||
                (item.hop_dong_id && selectedHopDongIds.includes(item.hop_dong_id));

            const matchesNhanSu =
                selectedNhanSuIds.length === 0 ||
                (item.nhan_su_id && selectedNhanSuIds.includes(item.nhan_su_id));

            let matchesDate = true;
            if (dateFrom || dateTo) {
                const itemDate = item.ngay ? new Date(item.ngay).toISOString().split('T')[0] : '';
                if (dateFrom && itemDate < dateFrom) matchesDate = false;
                if (dateTo && itemDate > dateTo) matchesDate = false;
            }

            return (
                matchesSearch &&
                matchesCustomer &&
                matchesDuAn &&
                matchesHopDong &&
                matchesNhanSu &&
                matchesDate
            );
        });
    }, [
        items,
        searchTerm,
        selectedCustomerIds,
        selectedDuAnIds,
        selectedHopDongIds,
        selectedNhanSuIds,
        dateFrom,
        dateTo,
    ]);

    const demPhieuThu = useMemo(
        () => baseFiltered.filter((i) => i.type === 'Phiếu thu').length,
        [baseFiltered],
    );
    const demPhieuChi = useMemo(
        () => baseFiltered.filter((i) => i.type === 'Phiếu chi').length,
        [baseFiltered],
    );
    const demPhieuTong = demPhieuThu + demPhieuChi;

    const filteredItems = useMemo(
        () =>
            baseFiltered.filter((item) =>
                activeTab === 'thu' ? item.type === 'Phiếu thu' : item.type === 'Phiếu chi',
            ),
        [baseFiltered, activeTab],
    );

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
            const rowId = c.hop_dong_row_id ? String(c.hop_dong_row_id) : '';
            if (rowId) m.set(rowId, vnd);
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
        <div className="bg-[#faf8ff] text-[#131b2e] min-h-screen animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="flex justify-between items-center w-full px-6 md:px-8 py-4 sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/tai-chinh')}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                        aria-label="Quay lai"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Quan ly thu chi</h1>
                    <span className="hidden md:inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Thu {demPhieuThu} | Chi {demPhieuChi} | Tong {demPhieuTong}
                    </span>
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 bg-[#004bcb] text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                    <span>{activeTab === 'thu' ? 'Them phieu thu' : 'Them phieu chi'}</span>
                </button>
            </header>

            <main className="p-6 md:p-8 space-y-6">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-[#283044] text-[#f2f2ff] p-8 rounded-xl shadow-lg">
                        <p className="uppercase tracking-wider text-slate-300 text-sm font-semibold mb-2">Tong tien</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{formattedTotalAmount}</h2>
                        <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                            <TrendingUp size={16} />
                            <span>{activeTab === 'thu' ? 'Dang xem phieu thu' : 'Dang xem phieu chi'}</span>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <p className="uppercase tracking-wider text-slate-500 text-sm font-semibold mb-2">So phieu</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{filteredItems.length}</h2>
                        <div className="mt-4 text-sm text-slate-500">Theo bo loc hien tai</div>
                    </div>
                    <div className="bg-[#eaedff] p-8 rounded-xl border border-[#dae2fd] flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3">
                            <Gauge size={18} className="text-[#004bcb]" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Dat nguong chi NS</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                            {activeTab === 'chi' && chiNhanSuSummary.pct != null
                                ? `${(Math.round(chiNhanSuSummary.pct * 10) / 10).toLocaleString('vi-VN')}%`
                                : '-'}
                        </p>
                    </div>
                </section>

                <section className="bg-[#f2f3ff] rounded-xl p-6 space-y-5 border border-[#dae2fd]">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Loai phieu</label>
                            <select
                                value={activeTab}
                                onChange={(e) => {
                                    setActiveTab(e.target.value as 'thu' | 'chi');
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg text-sm py-2 px-3"
                            >
                                <option value="thu">Phieu thu</option>
                                <option value="chi">Phieu chi</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Khach hang</label>
                            <select
                                value={selectedCustomerIds[0] || ''}
                                onChange={(e) => setSelectedCustomerIds(e.target.value ? [e.target.value] : [])}
                                className="w-full bg-white border border-slate-200 rounded-lg text-sm py-2 px-3"
                            >
                                <option value="">Tat ca khach hang</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{c.ten_don_vi}</option>
                                ))}
                            </select>
                        </div>

                        <div className="xl:col-span-2">
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Khoang thoi gian</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setQuickDateFilter(''); setSelectedMonth(''); }} className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 flex-1" />
                                <span className="text-slate-400">-&gt;</span>
                                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setQuickDateFilter(''); setSelectedMonth(''); }} className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 flex-1" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => handleQuickDateFilter('today')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${quickDateFilter === 'today' ? 'bg-[#004bcb] text-white' : 'bg-white hover:bg-slate-100'}`}>Hom nay</button>
                        <button onClick={() => handleQuickDateFilter('thisMonth')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${quickDateFilter === 'thisMonth' ? 'bg-[#004bcb] text-white' : 'bg-white hover:bg-slate-100'}`}>Thang nay</button>
                        <div className="relative flex-1 min-w-[220px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Tim ma, noi dung..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <ExcelImportExportBar
                            compact
                            className="shrink-0"
                            columns={[...thuChiExcelColumns, ...customCdtExcelColumns]}
                            templateFileName="mau-thu-chi"
                            sheetName="Thu chi"
                            onImport={async (rows, onProgress) => {
                                const errors: string[] = [];
                                let ok = 0;
                                const total = rows.length;
                                const isCdtTemplate = rows.some((r) => r.cdt_thanh_toan || r.ngay_tien_ve || r.ten_da);

                                if (isCdtTemplate) {
                                    const grouped = new Map<string, any>();
                                    for (let i = 0; i < rows.length; i++) {
                                        const r = rows[i];
                                        const tenDa = (r.ten_da || '').trim();
                                        if (!tenDa) continue;
                                        const soTien = parseMoneyVi(r.cdt_thanh_toan || '0') || parseMoneyVi(r.cdt_tam_ung || '0');
                                        if (soTien <= 0) continue;
                                        const ngayRaw = r.ngay_tien_ve || r.ngay_xuat_hd || '';
                                        const ngayP = parseExcelDate(ngayRaw, (r.nam_xuat_hd || '').trim());
                                        const ngayFinal = ngayP || new Date().toISOString().split('T')[0];
                                        const key = `${tenDa}_${ngayFinal}`;
                                        if (grouped.has(key)) grouped.get(key).so_tien += soTien;
                                        else grouped.set(key, { ten_da: tenDa, so_tien: soTien, ngay: ngayFinal, noi_dung: `Thu tien tu CDT (${tenDa})` });
                                        onProgress?.({ processed: i + 1, total, current: `Dang tong hop dong ${i + 2}` });
                                    }
                                    const rows2 = Array.from(grouped.values());
                                    for (let i = 0; i < rows2.length; i++) {
                                        const r = rows2[i];
                                        const project = projects.find((p) => (p.ten_du_an || '').trim().toLowerCase() === String(r.ten_da || '').toLowerCase());
                                        if (!project) { errors.push(`Dong CDT ${i + 2}: khong tim thay du an '${r.ten_da}'`); continue; }
                                        try {
                                            await thuChiService.create({ loai_phieu: 'Phieu thu', so_tien: Number(r.so_tien || 0), ngay: r.ngay, du_an_id: project.id, noi_dung: r.noi_dung, tinh_trang: 'thanh_toan' });
                                            ok++;
                                        } catch (e: any) { errors.push(`Dong CDT ${i + 2}: ${e?.message || 'Loi tao phieu thu'}`); }
                                    }
                                } else {
                                    for (let i = 0; i < rows.length; i++) {
                                        const r = rows[i];
                                        const loai = String(r.loai_phieu || '').trim();
                                        const soTien = parseMoneyVi(r.so_tien) || Number(String(r.so_tien || '').replace(/[, ]/g, ''));
                                        const tenDuAn = String(r.ten_du_an || '').trim();
                                        const project = projects.find((p) => (p.ten_du_an || '').trim().toLowerCase() === tenDuAn.toLowerCase());
                                        if (!(loai === 'Phi???u thu' || loai === 'Phi???u chi') || !project || !(soTien > 0)) { errors.push(`Dong ${i + 2}: du lieu khong hop le`); continue; }
                                        try {
                                            await thuChiService.create({ loai_phieu: loai, so_tien: soTien, ngay: parseExcelDate(r.ngay) || new Date().toISOString().split('T')[0], du_an_id: project.id, noi_dung: String(r.noi_dung || '').trim() || null });
                                            ok++;
                                        } catch (e: any) { errors.push(`Dong ${i + 2}: ${e?.message || 'Loi tao phieu'}`); }
                                    }
                                }
                                return { ok, errors };
                            }}
                            onDone={loadRecords}
                        />
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" /><p className="text-sm text-slate-500">Dang tai du lieu...</p></div>
                    ) : error ? (
                        <div className="p-8 text-center"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={loadRecords} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Thu lai</button></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                            <th className="px-4 py-4 w-10"><button onClick={toggleSelectAll}>{isAllSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}</button></th>
                                            <th className="px-6 py-4 font-bold">Ma chung tu</th>
                                            <th className="px-6 py-4 font-bold">Khach hang</th>
                                            <th className="px-6 py-4 font-bold">Ngay</th>
                                            <th className="px-6 py-4 font-bold">Loai phieu</th>
                                            <th className="px-6 py-4 font-bold text-right">So tien</th>
                                            <th className="px-6 py-4 font-bold">Noi dung</th>
                                            <th className="px-6 py-4 font-bold text-center">Hanh dong</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {currentItems.length === 0 ? (
                                            <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">Khong co du lieu phu hop bo loc hien tai</td></tr>
                                        ) : (
                                            currentItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-4"><button onClick={() => toggleSelect(item.id)}>{isSelected(item.id) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}</button></td>
                                                    <td className="px-6 py-4 text-sm font-bold text-[#004bcb]">{item.code || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-900">{(item as any).customer_name || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '-'}</td>
                                                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.type === 'Phi???u thu' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{item.type}</span></td>
                                                    <td className="px-6 py-4 text-sm font-black text-right text-slate-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.so_tien || 0))}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 max-w-[280px] truncate">{item.description || '-'}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleViewClick(item)} className="text-slate-400 hover:text-[#004bcb]"><Eye size={18} /></button>
                                                            <button onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-slate-700"><Edit size={18} /></button>
                                                            <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                                <p className="text-sm text-slate-500">Hien thi <span className="font-bold">{currentItems.length ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredItems.length)}</span> cua <span className="font-bold">{filteredItems.length}</span> ban ghi</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                                    <button className="w-8 h-8 rounded-lg bg-[#004bcb] text-white text-sm font-bold">{currentPage}</button>
                                    <button onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))} disabled={currentPage >= (totalPages || 1)} className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
