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
import { ExcelImportExportBar, type ExcelImportResult } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { parseMoneyVi, parseExcelDate } from '../../lib/excelTableTools';
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

/** Hiển thị tình trạng thu CĐT (nhập Excel) — thêm tiền tố CĐT cho đúng ngữ cảnh. */
function tinhTrangThuCdtLabel(display: string): string {
    if (display === 'Thanh toán') return 'CĐT thanh toán';
    if (display === 'Tạm ứng') return 'CĐT tạm ứng';
    return display;
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

    const [customerSearchInput, setCustomerSearchInput] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);

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

    useEffect(() => {
        const id = selectedCustomerIds[0];
        if (!id) {
            setCustomerSearchInput('');
            return;
        }
        const c = customers.find((x) => x.id === id);
        if (c?.ten_don_vi) setCustomerSearchInput(c.ten_don_vi);
    }, [selectedCustomerIds, customers]);

    const filteredCustomersPick = useMemo(() => {
        const q = customerSearchInput.trim().toLowerCase();
        if (!q) return customers;
        return customers.filter((c) => (c.ten_don_vi || '').toLowerCase().includes(q));
    }, [customers, customerSearchInput]);

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

            const rawTinhTrang = (item.tinh_trang_phieu || '').trim();
            const tinhTrangDisplay =
                !rawTinhTrang
                    ? ''
                    : rawTinhTrang.toLowerCase() === 'thanh_toan'
                      ? 'Thanh toán'
                      : rawTinhTrang;

            return {
                ...item,
                code: item.id.substring(0, 8).toUpperCase(),
                date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '',
                type: item.loai_phieu,
                amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.so_tien),
                description: item.noi_dung || '',
                tinh_trang_display: tinhTrangDisplay,
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

    const handleDelete = (item: (typeof items)[0]) => {
        openDelete({ id: item.id, code: item.code });
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

    const selectedInTab = useMemo(
        () => filteredItems.filter((i) => selectedIds.includes(i.id)).map((i) => String(i.id)),
        [filteredItems, selectedIds],
    );

    const handleDeleteSelected = async () => {
        if (selectedInTab.length === 0) return;
        if (
            !window.confirm(
                `Xóa ${selectedInTab.length} chứng từ đã chọn trong tab hiện tại? Hành động không hoàn tác.`,
            )
        ) {
            return;
        }
        let failed = 0;
        for (const id of selectedInTab) {
            try {
                const ok = await thuChiService.delete(id);
                if (!ok) failed++;
            } catch {
                failed++;
            }
        }
        setSelectedIds((prev) => prev.filter((id) => !selectedInTab.includes(String(id))));
        await loadRecords();
        if (failed > 0) {
            setToast({
                type: 'error',
                message: `Đã xóa ${selectedInTab.length - failed} bản ghi; ${failed} bản ghi không xóa được.`,
            });
        } else {
            setToast({ type: 'success', message: `Đã xóa ${selectedInTab.length} chứng từ.` });
        }
    };

    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    const handleThuChiExcelImport = useCallback(
        async (
            rows: Record<string, string>[],
            onProgress: (current: number, total: number) => void,
        ): Promise<ExcelImportResult> => {
            const errors: string[] = [];
            let ok = 0;
            const totalRows = rows.length;
            const isCdtTemplate = rows.some((r) => r.cdt_thanh_toan || r.ngay_tien_ve || r.ten_da);

            if (isCdtTemplate) {
                type CdtAgg = {
                    ten_da: string;
                    ngay: string;
                    so_tien: number;
                    tinh_trang_phieu: string;
                    noi_dung: string;
                    /** Số HĐ & PLHĐ (hoặc Số HĐ) — dùng khớp `hop_dong.so_hop_dong`; rỗng = chỉ gắn dự án */
                    so_hd_lien_ket: string;
                };
                const grouped = new Map<string, CdtAgg>();
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    onProgress(i + 1, totalRows);
                    const tenDa = (r.ten_da || '').trim();
                    if (!tenDa) continue;
                    const ngayRaw = r.ngay_tien_ve || r.ngay_xuat_hd || '';
                    const ngayP = parseExcelDate(ngayRaw, (r.nam_xuat_hd || '').trim());
                    const ngayFinal = ngayP || new Date().toISOString().split('T')[0];
                    const soHdLienKet = (r.so_hd_plhd || r.so_hd || '').trim();
                    const soHdKey = soHdLienKet.toLowerCase();

                    const tt =
                        parseMoneyVi(String(r.cdt_thanh_toan ?? '').trim() || '0') || 0;
                    const tu =
                        parseMoneyVi(String(r.cdt_tam_ung ?? '').trim() || '0') || 0;

                    const bump = (amount: number, tinhTrang: string, noiDung: string) => {
                        if (amount <= 0) return;
                        const key = `${tenDa}_${ngayFinal}_${tinhTrang}_${soHdKey}`;
                        const cur = grouped.get(key);
                        if (cur) cur.so_tien += amount;
                        else
                            grouped.set(key, {
                                ten_da: tenDa,
                                ngay: ngayFinal,
                                so_tien: amount,
                                tinh_trang_phieu: tinhTrang,
                                noi_dung: noiDung,
                                so_hd_lien_ket: soHdLienKet,
                            });
                    };

                    bump(tt, 'Thanh toán', `Thu CĐT thanh toán (${tenDa})`);
                    bump(tu, 'Tạm ứng', `Thu CĐT tạm ứng (${tenDa})`);
                }
                const rows2 = Array.from(grouped.values());
                const denom = Math.max(rows.length + rows2.length, 1);
                for (let i = 0; i < rows2.length; i++) {
                    const r = rows2[i];
                    onProgress(rows.length + i + 1, denom);
                    const project = projects.find(
                        (p) =>
                            (p.ten_du_an || '').trim().toLowerCase() ===
                            String(r.ten_da || '').toLowerCase(),
                    );
                    if (!project) {
                        errors.push(`Dòng CDT ${i + 2}: không tìm thấy dự án '${r.ten_da}'`);
                        continue;
                    }

                    const soHd = (r.so_hd_lien_ket || '').trim();
                    let hopDongId: string | null = null;
                    let duAnId = project.id;
                    if (soHd) {
                        const c = contracts.find(
                            (x) =>
                                (x.so_hop_dong || '').trim().toLowerCase() ===
                                soHd.toLowerCase(),
                        );
                        if (!c) {
                            errors.push(
                                `CDT «${r.ten_da}»: không tìm thấy hợp đồng số «${soHd}» — kiểm tra cột Số HĐ & PLHĐ trùng hệ thống`,
                            );
                            continue;
                        }
                        if (c.du_an_id && c.du_an_id !== project.id) {
                            errors.push(
                                `CDT: hợp đồng «${soHd}» thuộc dự án khác, không khớp «${r.ten_da}»`,
                            );
                            continue;
                        }
                        hopDongId = hopDongRef(c);
                        if (c.du_an_id) duAnId = c.du_an_id;
                    }

                    try {
                        await thuChiService.create({
                            loai_phieu: 'Phiếu thu',
                            so_tien: Number(r.so_tien || 0),
                            ngay: r.ngay,
                            du_an_id: duAnId,
                            hop_dong_id: hopDongId,
                            noi_dung: r.noi_dung,
                            tinh_trang_phieu: r.tinh_trang_phieu,
                        });
                        ok++;
                    } catch (e: any) {
                        errors.push(`Dòng CDT ${i + 2}: ${e?.message || 'Lỗi tạo phiếu thu'}`);
                    }
                }
            } else {
                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    onProgress(i + 1, totalRows);
                    const loai = String(r.loai_phieu || '').trim();
                    const soTien =
                        parseMoneyVi(r.so_tien) || Number(String(r.so_tien || '').replace(/[, ]/g, ''));
                    const tenDuAn = String(r.ten_du_an || '').trim();
                    const project = projects.find(
                        (p) => (p.ten_du_an || '').trim().toLowerCase() === tenDuAn.toLowerCase(),
                    );
                    const loaiL = loai.toLowerCase();
                    const isPhieuThu =
                        loaiL.includes('thu') && (loaiL.includes('phiếu') || loaiL.includes('phieu'));
                    const isPhieuChi =
                        loaiL.includes('chi') && (loaiL.includes('phiếu') || loaiL.includes('phieu'));
                    if (!(isPhieuThu || isPhieuChi) || !project || !(soTien > 0)) {
                        errors.push(`Dòng ${i + 2}: dữ liệu không hợp lệ (loại phiếu / dự án / số tiền)`);
                        continue;
                    }
                    const loaiPhieu = isPhieuThu ? 'Phiếu thu' : 'Phiếu chi';
                    try {
                        await thuChiService.create({
                            loai_phieu: loaiPhieu,
                            so_tien: soTien,
                            ngay:
                                parseExcelDate(r.ngay) || new Date().toISOString().split('T')[0],
                            du_an_id: project.id,
                            noi_dung: String(r.noi_dung || '').trim() || null,
                        });
                        ok++;
                    } catch (e: any) {
                        errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi tạo phiếu'}`);
                    }
                }
            }
            return { ok, errors };
        },
        [projects, contracts],
    );

    return (
        <div className="bg-slate-50 text-slate-900 min-h-screen animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="flex justify-between items-center w-full px-6 md:px-8 py-4 sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/tai-chinh')}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                        aria-label="Quay lại"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Quản lý thu chi</h1>
                    <span className="hidden md:inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200/80">
                        Thu {demPhieuThu} | Chi {demPhieuChi} | Tổng {demPhieuTong}
                    </span>
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <Plus size={16} />
                    <span>{activeTab === 'thu' ? 'Thêm phiếu thu' : 'Thêm phiếu chi'}</span>
                </button>
            </header>

            <main className="p-6 md:p-8 space-y-6">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-slate-800 text-white p-8 rounded-xl shadow-md border border-slate-700/50">
                        <p className="uppercase tracking-wider text-slate-300 text-sm font-semibold mb-2">Tổng tiền</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{formattedTotalAmount}</h2>
                        <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                            <TrendingUp size={16} />
                            <span>{activeTab === 'thu' ? 'Đang xem phiếu thu' : 'Đang xem phiếu chi'}</span>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <p className="uppercase tracking-wider text-slate-500 text-sm font-semibold mb-2">Số phiếu</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">{filteredItems.length}</h2>
                        <div className="mt-4 text-sm text-slate-500">Theo bộ lọc hiện tại</div>
                    </div>
                    <div className="bg-indigo-50 p-8 rounded-xl border border-indigo-100 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm border border-indigo-100">
                            <Gauge size={18} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Đạt ngưỡng chi NS</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">
                            {activeTab === 'chi' && chiNhanSuSummary.pct != null
                                ? `${(Math.round(chiNhanSuSummary.pct * 10) / 10).toLocaleString('vi-VN')}%`
                                : '-'}
                        </p>
                    </div>
                </section>

                <section className="bg-slate-100 rounded-xl p-6 space-y-5 border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div>
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Loại phiếu</label>
                            <select
                                value={activeTab}
                                onChange={(e) => {
                                    setActiveTab(e.target.value as 'thu' | 'chi');
                                    setCurrentPage(1);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg text-sm py-2 px-3"
                            >
                                <option value="thu">Phiếu thu</option>
                                <option value="chi">Phiếu chi</option>
                            </select>
                        </div>

                        <div className="relative z-30">
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Khách hàng</label>
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    role="combobox"
                                    aria-expanded={customerPickerOpen}
                                    aria-autocomplete="list"
                                    placeholder="Gõ để tìm khách hàng..."
                                    autoComplete="off"
                                    value={customerSearchInput}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setCustomerSearchInput(v);
                                        setCustomerPickerOpen(true);
                                        const selId = selectedCustomerIds[0];
                                        if (selId) {
                                            const cur = customers.find((x) => x.id === selId);
                                            if (cur && v !== cur.ten_don_vi) {
                                                setSelectedCustomerIds([]);
                                            }
                                        }
                                    }}
                                    onFocus={() => setCustomerPickerOpen(true)}
                                    onBlur={() => {
                                        window.setTimeout(() => setCustomerPickerOpen(false), 200);
                                    }}
                                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400"
                                />
                                {customerSearchInput && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        aria-label="Xóa"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setSelectedCustomerIds([]);
                                            setCustomerSearchInput('');
                                            setCustomerPickerOpen(false);
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {customerPickerOpen && (
                                <ul
                                    role="listbox"
                                    className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-40"
                                >
                                    <li>
                                        <button
                                            type="button"
                                            role="option"
                                            className={cn(
                                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                selectedCustomerIds.length === 0 ? 'bg-blue-50 text-blue-800 font-medium' : 'text-slate-700',
                                            )}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setSelectedCustomerIds([]);
                                                setCustomerSearchInput('');
                                                setCustomerPickerOpen(false);
                                            }}
                                        >
                                            Tất cả khách hàng
                                        </button>
                                    </li>
                                    {filteredCustomersPick.length === 0 ? (
                                        <li className="px-3 py-2 text-sm text-slate-500">Không tìm thấy khách hàng</li>
                                    ) : (
                                        filteredCustomersPick.map((c) => (
                                            <li key={c.id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    className={cn(
                                                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate',
                                                        selectedCustomerIds[0] === c.id
                                                            ? 'bg-blue-50 text-blue-800 font-medium'
                                                            : 'text-slate-800',
                                                    )}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setSelectedCustomerIds([c.id]);
                                                        setCustomerSearchInput(c.ten_don_vi || '');
                                                        setCustomerPickerOpen(false);
                                                    }}
                                                >
                                                    {c.ten_don_vi}
                                                </button>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                        </div>

                        <div className="xl:col-span-2">
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Khoảng thời gian</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setQuickDateFilter(''); setSelectedMonth(''); }} className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 flex-1" />
                                <span className="text-slate-400">-&gt;</span>
                                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setQuickDateFilter(''); setSelectedMonth(''); }} className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 flex-1" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => handleQuickDateFilter('today')} className={`px-3 py-1.5 text-xs font-semibold rounded-full border border-transparent ${quickDateFilter === 'today' ? 'bg-blue-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>Hôm nay</button>
                        <button type="button" onClick={() => handleQuickDateFilter('thisMonth')} className={`px-3 py-1.5 text-xs font-semibold rounded-full border border-transparent ${quickDateFilter === 'thisMonth' ? 'bg-blue-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>Tháng này</button>
                        <div className="relative flex-1 min-w-[220px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Tìm mã, nội dung..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400" />
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                    {loading ? (
                        <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" /><p className="text-sm text-slate-500">Đang tải dữ liệu...</p></div>
                    ) : error ? (
                        <div className="p-8 text-center"><p className="text-sm text-red-600 mb-4">{error}</p><button type="button" onClick={loadRecords} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Thử lại</button></div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/90 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={selectedInTab.length === 0 || loading}
                                        onClick={handleDeleteSelected}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Xóa đã chọn
                                        {selectedInTab.length > 0 ? ` (${selectedInTab.length})` : ''}
                                    </button>
                                    <span className="text-[11px] text-slate-500">
                                        Chọn từng dòng hoặc tick đầu cột để chọn/bỏ tất cả phiếu đang lọc (có thể nhiều trang).
                                    </span>
                                </div>
                                <ExcelImportExportBar
                                    className="shrink-0 min-w-0"
                                    columns={[...thuChiExcelColumns, ...customCdtExcelColumns]}
                                    templateFileName="mau-thu-chi"
                                    sheetName="Thu chi"
                                    onImport={handleThuChiExcelImport}
                                    onDone={loadRecords}
                                    disabled={loading}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-left border-collapse">
                                    <thead>
                                        <tr className="bg-blue-950 border-b border-blue-900 text-[11px] uppercase tracking-wider text-white">
                                            <th className="px-4 py-3.5 w-[4%]">
                                                <button
                                                    type="button"
                                                    title="Chọn tất cả trên các dòng đang lọc"
                                                    onClick={toggleSelectAll}
                                                    className="rounded p-0.5 text-white/90 hover:bg-white/10 hover:text-white"
                                                >
                                                    {isAllSelected ? (
                                                        <CheckSquare size={16} className="text-sky-200" />
                                                    ) : (
                                                        <Square size={16} className="text-white/70" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-6 py-3.5 font-bold w-[9%]">Mã chứng từ</th>
                                            <th className="px-6 py-3.5 font-bold w-[21%] min-w-0">Đối tượng</th>
                                            <th className="px-6 py-3.5 font-bold w-[9%] min-w-0">Số HĐ</th>
                                            <th className="px-6 py-3.5 font-bold w-[9%] whitespace-nowrap">Ngày chứng từ</th>
                                            <th className="px-6 py-3.5 font-bold w-[10%]">Loại</th>
                                            <th className="px-6 py-3.5 font-bold w-[12%] min-w-0">Tình trạng</th>
                                            <th className="px-6 py-3.5 font-bold text-right w-[12%] whitespace-nowrap">Số tiền</th>
                                            <th className="px-6 py-3.5 font-bold w-[9%] min-w-0">Nội dung</th>
                                            <th className="px-6 py-3.5 font-bold text-center w-[5%] min-w-[5.5rem]">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentItems.length === 0 ? (
                                            <tr><td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-500">Không có dữ liệu phù hợp bộ lọc hiện tại</td></tr>
                                        ) : (
                                            currentItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSelect(item.id)}
                                                            className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
                                                            aria-label="Chọn dòng"
                                                        >
                                                            {isSelected(item.id) ? (
                                                                <CheckSquare size={16} className="text-blue-600" />
                                                            ) : (
                                                                <Square size={16} className="text-slate-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 align-top">{item.code || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-900 min-w-0 align-top max-w-0">
                                                        <div
                                                            className="truncate"
                                                            title={
                                                                String((item as any).customer_name || '').trim() ||
                                                                undefined
                                                            }
                                                        >
                                                            {(item as any).customer_name?.trim()
                                                                ? (item as any).customer_name
                                                                : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-700 min-w-0 align-top max-w-0">
                                                        <div
                                                            className="truncate font-medium"
                                                            title={
                                                                (
                                                                    (item as any).so_hop_dong_display ||
                                                                    item.so_hop_dong ||
                                                                    ''
                                                                ).trim() || undefined
                                                            }
                                                        >
                                                            {(
                                                                (item as any).so_hop_dong_display ||
                                                                item.so_hop_dong ||
                                                                ''
                                                            ).trim() || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 tabular-nums whitespace-nowrap align-top">
                                                        {item.ngay
                                                            ? new Date(item.ngay).toLocaleDateString('vi-VN')
                                                            : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 align-top">
                                                        <span
                                                            className={`inline-flex max-w-full items-center px-2.5 py-0.5 rounded-full text-xs font-bold truncate ${item.type === 'Phiếu thu' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'}`}
                                                        >
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm min-w-0 align-top max-w-0">
                                                        {item.tinh_trang_display ? (
                                                            <span
                                                                title={tinhTrangThuCdtLabel(item.tinh_trang_display)}
                                                                className={cn(
                                                                    'inline-flex max-w-full items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight truncate align-top',
                                                                    item.tinh_trang_display === 'Thanh toán' &&
                                                                        'bg-emerald-100 text-emerald-900',
                                                                    item.tinh_trang_display === 'Tạm ứng' &&
                                                                        'bg-amber-100 text-amber-900',
                                                                    item.tinh_trang_display !== 'Thanh toán' &&
                                                                        item.tinh_trang_display !== 'Tạm ứng' &&
                                                                        'bg-slate-100 text-slate-700',
                                                                )}
                                                            >
                                                                {tinhTrangThuCdtLabel(item.tinh_trang_display)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-black text-right text-slate-900 whitespace-nowrap align-top">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.so_tien || 0))}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 min-w-0 align-top max-w-0">
                                                        <div
                                                            className="truncate"
                                                            title={
                                                                String(item.description || '').trim() || undefined
                                                            }
                                                        >
                                                            {item.description?.trim() ? item.description : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-top">
                                                        <div className="flex justify-center gap-2">
                                                            <button type="button" onClick={() => handleViewClick(item)} className="text-slate-400 hover:text-blue-600"><Eye size={18} /></button>
                                                            <button type="button" onClick={() => handleEditClick(item)} className="text-slate-400 hover:text-slate-700"><Edit size={18} /></button>
                                                            <button type="button" onClick={() => handleDelete(item)} className="text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50">
                                <p className="text-sm text-slate-500">Hiển thị <span className="font-bold text-slate-800">{currentItems.length ? startIndex + 1 : 0} – {Math.min(startIndex + itemsPerPage, filteredItems.length)}</span> của <span className="font-bold text-slate-800">{filteredItems.length}</span> bản ghi</p>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-white disabled:opacity-50"><ChevronLeft size={16} /></button>
                                    <button type="button" className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-sm">{currentPage}</button>
                                    <button type="button" onClick={() => setCurrentPage(Math.min(totalPages || 1, currentPage + 1))} disabled={currentPage >= (totalPages || 1)} className="p-1 rounded border border-slate-300 text-slate-400 hover:bg-white disabled:opacity-50"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
