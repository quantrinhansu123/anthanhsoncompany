import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    FilterX,
    Bookmark,
    Briefcase,
    FileText,
    ChevronDown,
    Calendar,
    TrendingDown,
    TrendingUp,
    Gauge,
    Percent,
    Calculator,
    RefreshCw,
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
import { parseMoneyVi, parseExcelDate, cleanString, normalizeKey } from '../../lib/excelTableTools';
import { cn } from '../../lib/utils';
import { PAGE_SIZE_OPTIONS, buildVisiblePages } from '../../lib/tablePagination';
import {
    TRANG_THAI_HD_CO,
    TRANG_THAI_HD_PHAT_SINH,
    hangMucThuForTinhTrangPhieu,
    isCdtExcelRowCoHoaDon,
    normalizeHangMucThuInput,
    normalizeTrangThaiHdInput,
    normalizeTinhTrangPhieuInput,
    resolveThuChiTinhTrangDisplay,
    resolveTrangThaiHdDisplay,
    syncThuChiTrangThaiHdFields,
    trangThaiHdBadgeClass,
    tinhTrangPhieuBadgeClass,
    tinhTrangThuCdtLabel,
} from '../../lib/thuChiTinhTrang';

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

function formatNgayForThuChiExcel(isoNgay: string | null | undefined): string {
    const raw = String(isoNgay ?? '').trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return raw;
}

function mapThuChiListRowToExcel(item: {
    code?: string;
    customer_name?: string | null;
    ten_du_an?: string | null;
    so_hop_dong_display?: string | null;
    so_hop_dong?: string | null;
    ten_goi_thau?: string | null;
    ngay?: string | null;
    type?: string;
    loai_phieu?: string;
    tinh_trang_display?: string;
    trang_thai_hd_display?: string;
    trang_thai_hd?: string | null;
    so_tien?: number;
    description?: string;
    noi_dung?: string | null;
}): Record<string, unknown> {
    return {
        ma_chung_tu: item.code || '',
        doi_tuong: String(item.customer_name || '').trim(),
        ten_da: String(item.ten_du_an || '').trim(),
        so_hop_dong: String(item.so_hop_dong_display || item.so_hop_dong || '').trim(),
        ten_goi_thau: String(item.ten_goi_thau || '').trim(),
        ngay: formatNgayForThuChiExcel(item.ngay),
        loai_phieu: item.type || item.loai_phieu || '',
        tinh_trang: item.tinh_trang_display || '',
        trang_thai_hd: item.trang_thai_hd_display || item.trang_thai_hd || '',
        so_tien: Number(item.so_tien) || 0,
        noi_dung: String(item.description || item.noi_dung || '').trim(),
        so_hop_dong_phu: String(item.so_hop_dong_display || item.so_hop_dong || '').trim(),
        ten_kh: String(item.customer_name || '').trim(),
    };
}

function normalizeThuChiStatusLabel(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Phiếu thu CĐT tạm ứng — khớp cột Tình trạng / hạng mục thu. */
function isThuChiTamUngRow(item: {
    loai_phieu?: string;
    tinh_trang_display?: string;
    hang_muc_thu?: string | null;
}): boolean {
    if (item.loai_phieu !== 'Phiếu thu') return false;
    const hm = normalizeThuChiStatusLabel(item.hang_muc_thu);
    if (hm === 'tạm ứng' || hm === 'tam ung') return true;
    const st = normalizeThuChiStatusLabel(item.tinh_trang_display);
    return st === 'tạm ứng' || st === 'tam ung';
}

function thuChiHopDongNoiDungParts(item: {
    so_hop_dong?: string | null;
    so_hop_dong_display?: string | null;
    ten_goi_thau?: string | null;
    description?: string;
}) {
    const soHopDong =
        String(item.so_hop_dong_display || item.so_hop_dong || '').trim() || '—';
    const noiDung =
        String(item.ten_goi_thau || '').trim() ||
        String(item.description || '').trim() ||
        '—';
    return { soHopDong, noiDung };
}

/** Map cột Excel «Hạng mục chi» → giá trị lưu DB (giống ThuChiNhanSu). */
function parseHangMucChiFromExcel(raw: string): 'chi_du_an' | 'chi_nhan_su' {
    const h = cleanString(raw).toLowerCase();
    if (!h) return 'chi_du_an';
    if (h.includes('nhân') || h.includes('nhan')) return 'chi_nhan_su';
    return 'chi_du_an';
}

/** Đặt `true` để hiện nút xóa toàn bộ phiếu thu chi (mặc định ẩn). */
const SHOW_DELETE_ALL_THU_CHI_BUTTON = false;

export function ThuChi() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    /** Dữ liệu gốc từ API — chỉ đổi khi fetch lại, tránh gọi getAll() mỗi khi map metadata cập nhật. */
    const [rawThuChi, setRawThuChi] = useState<ThuChiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
    const [deletingSelected, setDeletingSelected] = useState(false);
    const [migratingCdtLabel, setMigratingCdtLabel] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);
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
    const customerFilterRef = useRef<HTMLDivElement>(null);

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [tamUngTotalsOpen, setTamUngTotalsOpen] = useState(false);

    /** Cột mẫu tải / xuất — khớp bảng Thu chi trên màn hình. */
    const thuChiExcelColumns: ExcelColumnDef[] = [
        { key: 'ma_chung_tu', header: 'Mã chứng từ', hint: 'Chỉ khi xuất dữ liệu' },
        { key: 'doi_tuong', header: 'Đối tượng', example: 'Tên khách hàng', matchHeaders: ['Đối tượng KH', 'Khách hàng'] },
        {
            key: 'ten_kh',
            header: 'Tên khách hàng',
            hint: 'Tự động lấy từ hợp đồng/dự án, để trống nếu chưa có',
            matchHeaders: ['Tên KH', 'ten_khach_hang', 'Khách hàng'],
        },
        {
            key: 'ten_da',
            header: 'Tên DA',
            example: 'Khớp tên dự án trong hệ thống',
            required: true,
            matchHeaders: ['Tên dự án', 'ten_du_an'],
        },
        {
            key: 'so_hop_dong',
            header: 'Số HĐ',
            matchHeaders: ['Số HĐ & PLHĐ'],
        },
        { key: 'ten_goi_thau', header: 'Tên gói thầu' },
        {
            key: 'ngay',
            header: 'Ngày chứng',
            example: '01/03/2025',
            required: true,
            matchHeaders: ['Ngày chứng từ', 'Ngày'],
        },
        {
            key: 'loai_phieu',
            header: 'Loại',
            example: 'Phiếu thu',
            required: true,
            matchHeaders: ['Loại phiếu'],
        },
        {
            key: 'tinh_trang',
            header: 'Tình trạng',
            example: 'Tạm ứng / Thanh toán / Xuất hóa đơn',
            matchHeaders: ['Tình trạng phiếu'],
        },
        {
            key: 'trang_thai_hd',
            header: 'Trạng thái',
            example: 'Có hóa đơn / Phát sinh',
            matchHeaders: ['Trạng thái HĐ'],
        },
        { key: 'so_tien', header: 'Số tiền', example: '15000000', required: true },
        { key: 'noi_dung', header: 'Nội dung', hint: 'Ghi chú / diễn giải' },
        {
            key: 'so_hop_dong_phu',
            header: 'Số hợp đồng',
            example: 'Nhập số hợp đồng nếu có',
        },
    ];

    /** Cột chỉ khi nhập (file cũ / CĐT / phiếu chi) — không có trong mẫu tải về. */
    const thuChiExcelImportExtraColumns: ExcelColumnDef[] = [
        {
            key: 'ten_nhan_su',
            header: 'Tên nhân sự',
            hint: 'Bắt buộc Phiếu chi',
        },
        {
            key: 'hang_muc_chi',
            header: 'Hạng mục chi',
            example: 'Chi dự án',
        },
    ];

    /** Mẫu bảng CĐT — chỉ nhánh import; không đưa vào file mẫu tải về. */
    const customCdtExcelColumns: ExcelColumnDef[] = [
        { key: 'tt', header: 'TT', hint: 'STT (tùy chọn)' },
        {
            key: 'so_hd_plhd',
            header: 'Số HĐ & PLHĐ',
            hint: 'Nên có để gắn / tạo HĐ',
        },
        { key: 'ngay_ky_hd', header: 'Ngày ký HĐ', example: '01/03/2025' },
        { key: 'nam_ky_hd', header: 'Năm ký HĐ', example: '2025' },
        { key: 'ten_da', header: 'Tên DA', example: 'Khớp tên dự án', required: true },
        { key: 'ten_goi_thau_cdt', header: 'Tên gói thầu (CĐT)', hint: 'Theo bảng CĐT' },
        { key: 'loai_dv', header: 'Loại DV', hint: 'Tùy chọn' },
        { key: 'gia_hd_plhd', header: 'Giá HĐ/PLHĐ', example: '0' },
        { key: 'gia_xuat_hd', header: 'Giá xuất HĐ', example: '0' },
        {
            key: 'cdt_thanh_toan',
            header: 'CĐT thanh toán',
            hint: 'Số tiền (một trong các cột CĐT)',
        },
        { key: 'cdt_no', header: 'CĐT nợ', hint: 'Số tiền (tùy chọn)' },
        { key: 'cdt_tam_ung', header: 'CĐT tạm ứng', hint: 'Số tiền (tùy chọn)' },
        { key: 'noi_dung_xuat_hd', header: 'Nội dung xuất hóa đơn', hint: 'Tùy chọn' },
        { key: 'thong_tin_kh', header: 'Thông tin KH', hint: 'Khi tạo HĐ mới từ file' },
        { key: 'mst_kh', header: 'MST KH', hint: 'Tùy chọn' },
        { key: 'so_hd', header: 'Số HĐ (xuất)', hint: 'Số hóa đơn (tùy chọn)' },
        { key: 'ngay_xuat_hd', header: 'Ngày xuất Hóa đơn', example: '01/03/2025' },
        { key: 'nam_xuat_hd', header: 'Năm xuất Hóa đơn', example: '2025' },
        { key: 'ghi_chu_co', header: 'Ghi chú/Có', hint: 'Tùy chọn' },
        { key: 'ghi_chu_chua_co', header: 'Ghi chú/Chưa có', hint: 'Tùy chọn' },
        {
            key: 'ngay_tien_ve',
            header: 'Ngày tiền về',
            hint: 'Ưu tiên làm ngày chứng từ CĐT',
        },
        { key: 'ngay_kiem_tra_hs', header: 'Ngày kiểm tra HS', hint: 'Tùy chọn' },
    ];

    const thuChiExcelImportColumns = useMemo(
        () => [...thuChiExcelColumns, ...thuChiExcelImportExtraColumns, ...customCdtExcelColumns],
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cột Excel cố định trong component
        [],
    );

    const { openChiTietThuChi, openDelete, openThemThuChi } = useThuChiModal();
    const handleEditClick = (item: any) => {
        const loaiPhieu =
            item.type === 'Phiếu chi' || item.loai_phieu === 'Phiếu chi' ? 'Phiếu chi' : 'Phiếu thu';
        openThemThuChi(
            'edit',
            {
                ...item,
                loai_phieu: item.loai_phieu ?? item.type,
                hang_muc_chi: item.hang_muc_chi,
                hang_muc_thu: item.hang_muc_thu,
                hang_muc_display: item.hang_muc_display,
            },
            loaiPhieu,
        );
    };

    const handleViewClick = (item: any) => {
        openChiTietThuChi(item);
    };


    const reloadLookupData = useCallback(async () => {
        try {
            const [customerRes, projectRes, contractRes, employeeRes] = await Promise.allSettled([
                customerService.getAll(),
                projectService.getAll(),
                contractService.getAll(),
                employeeService.getAll(),
            ]);
            const customerList =
                customerRes.status === 'fulfilled' ? customerRes.value : [];
            const projectList = projectRes.status === 'fulfilled' ? projectRes.value : [];
            const contractList = contractRes.status === 'fulfilled' ? contractRes.value : [];
            const employeeList = employeeRes.status === 'fulfilled' ? employeeRes.value : [];
            if (customerRes.status === 'rejected') {
                console.error('Error loading customers:', customerRes.reason);
            }
            if (projectRes.status === 'rejected') {
                console.error('Error loading projects:', projectRes.reason);
            }
            if (contractRes.status === 'rejected') {
                console.error('Error loading contracts:', contractRes.reason);
            }
            if (employeeRes.status === 'rejected') {
                console.error('Error loading employees:', employeeRes.reason);
            }

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

            const contractRows = Array.isArray(contractList)
                ? contractList
                : ((contractList as { data?: unknown[] })?.data ?? []);
            setContracts(
                contractRows.map((c: any) => ({
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
    }, []);

    useEffect(() => {
        void reloadLookupData();
    }, [reloadLookupData]);

    const filteredCustomersPick = useMemo(() => {
        const q = customerSearchInput.trim();
        if (!q) return customers;
        const termLower = q.toLowerCase();
        const termNorm = normalizeKey(q);
        return customers.filter((c) => {
            const name = String(c.ten_don_vi || '');
            return (
                name.toLowerCase().includes(termLower) ||
                normalizeKey(name).includes(termNorm)
            );
        });
    }, [customers, customerSearchInput]);

    const allVisibleCustomersSelected =
        filteredCustomersPick.length > 0 &&
        filteredCustomersPick.every((c) => selectedCustomerIds.includes(c.id));

    const selectAllVisibleCustomers = () => {
        const visibleIds = filteredCustomersPick.map((c) => c.id);
        setSelectedCustomerIds((prev) => [...new Set([...prev, ...visibleIds])]);
    };

    const customerFilterDisplayValue = useMemo(() => {
        if (customerPickerOpen) return customerSearchInput;
        if (selectedCustomerIds.length === 0) return customerSearchInput;
        if (selectedCustomerIds.length === 1) {
            return (
                customers.find((c) => c.id === selectedCustomerIds[0])?.ten_don_vi ||
                customerSearchInput
            );
        }
        return `${selectedCustomerIds.length} khách đã chọn`;
    }, [customerPickerOpen, customerSearchInput, selectedCustomerIds, customers]);

    useEffect(() => {
        if (!customerPickerOpen) return;
        const onDocMouseDown = (ev: MouseEvent) => {
            const el = ev.target as Node;
            if (customerFilterRef.current?.contains(el)) return;
            setCustomerPickerOpen(false);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [customerPickerOpen]);

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

    const handleImportDone = useCallback(() => {
        setToast({
            type: 'success',
            message: 'Đã nhập Excel — đang tải lại danh sách…',
        });
        void loadRecords();
        void reloadLookupData();
    }, [loadRecords, reloadLookupData]);

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
            const ref = hopDongRef(c);
            if (ref) contractByHopKey.set(ref, c);
            const logicalId = c.id != null ? String(c.id).trim() : '';
            const rowPk = c.hop_dong_row_id != null ? String(c.hop_dong_row_id).trim() : '';
            if (logicalId) contractByHopKey.set(logicalId, c);
            if (rowPk && rowPk !== logicalId) contractByHopKey.set(rowPk, c);
        });

        return rawThuChi.map((item) => {
            const nhanSuDisplay = item.nhan_su_ten || null;
            const hid = item.hop_dong_id ? String(item.hop_dong_id).trim() : '';
            const linkedContract = hid ? contractByHopKey.get(hid) : undefined;
            const projInfo = projectInfoMap.get(item.du_an_id || '');
            let customerId =
                linkedContract?.customer_id ?? projInfo?.customer_id ?? null;
            let customerName =
                item.customer_name ||
                linkedContract?.customer_name ||
                projInfo?.customer_name ||
                null;
            if (!customerName && customerId) {
                customerName = customers.find((cc) => cc.id === customerId)?.ten_don_vi ?? null;
            }
            if (!customerId && item.customer_id) {
                customerId = item.customer_id;
            }
            const soHopDong =
                (item.so_hop_dong && String(item.so_hop_dong).trim()) ||
                linkedContract?.so_hop_dong ||
                null;

            const tinhTrangDisplay = resolveThuChiTinhTrangDisplay(item);
            const trangThaiHdDisplay = resolveTrangThaiHdDisplay(item);

            return {
                ...item,
                code: item.id.substring(0, 8).toUpperCase(),
                date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '',
                type: item.loai_phieu,
                amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.so_tien),
                description: item.noi_dung || '',
                tinh_trang_display: tinhTrangDisplay,
                trang_thai_hd_display: trangThaiHdDisplay,
                hang_muc_display:
                    item.loai_phieu === 'Phiếu chi'
                        ? item.hang_muc_chi === 'chi_du_an'
                            ? 'Chi dự án'
                            : item.hang_muc_chi === 'chi_nhan_su'
                                ? 'Chi nhân sự'
                                : '—'
                        : '—',
                hang_muc_thu_display:
                    item.loai_phieu === 'Phiếu thu'
                        ? normalizeHangMucThuInput(item.hang_muc_thu) ||
                        resolveThuChiTinhTrangDisplay(item) ||
                        '—'
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

    const thuChiRowId = (id: string | number | null | undefined) => String(id ?? '').trim();

    const toggleSelect = (id: string | number) => {
        const sid = thuChiRowId(id);
        if (!sid) return;
        setSelectedIds((prev) =>
            prev.includes(sid) ? prev.filter((i) => i !== sid) : [...prev, sid],
        );
    };

    const isSelected = (id: string | number) => selectedIds.includes(thuChiRowId(id));

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
    const searchParamsStr = searchParams.toString();
    const hasActiveFilters = useMemo(() => {
        if (searchParamsStr) return true;
        return (
            selectedCustomerIds.length > 0 ||
            selectedDuAnIds.length > 0 ||
            selectedHopDongIds.length > 0 ||
            selectedNhanSuIds.length > 0 ||
            Boolean(dateFrom) ||
            Boolean(dateTo) ||
            Boolean(quickDateFilter) ||
            Boolean(selectedMonth) ||
            searchTerm.trim().length > 0
        );
    }, [
        searchParamsStr,
        selectedCustomerIds,
        selectedDuAnIds,
        selectedHopDongIds,
        selectedNhanSuIds,
        dateFrom,
        dateTo,
        quickDateFilter,
        selectedMonth,
        searchTerm,
    ]);

    const clearAllFilters = useCallback(() => {
        setSelectedCustomerIds([]);
        setSelectedDuAnIds([]);
        setSelectedHopDongIds([]);
        setSelectedNhanSuIds([]);
        setDateFrom('');
        setDateTo('');
        setQuickDateFilter('');
        setSelectedMonth('');
        setSearchTerm('');
        setOpenColumnFilter(null);
        setCustomerSearchInput('');
        setCustomerPickerOpen(false);
        setCurrentPage(1);
        setSearchParams({}, { replace: true });
    }, [setSearchParams]);

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

    /** HĐ có số khớp ô tìm kiếm — dùng khi phiếu thu/chi chưa có `so_hop_dong` join sẵn. */
    const hopDongIdsMatchingSearch = useMemo(() => {
        const q = searchTerm.trim();
        if (!q) return null;
        const termLower = q.toLowerCase();
        const termNorm = normalizeKey(q);
        const ids = new Set<string>();
        contracts.forEach((c) => {
            const so = String(c.so_hop_dong || '').trim();
            if (!so) return;
            const soLower = so.toLowerCase();
            const soNorm = normalizeKey(so);
            if (!soLower.includes(termLower) && !soNorm.includes(termNorm)) return;
            const ref = hopDongRef(c);
            if (ref) ids.add(ref);
            if (c.id) ids.add(String(c.id));
            if (c.hop_dong_row_id) ids.add(String(c.hop_dong_row_id));
        });
        return ids.size > 0 ? ids : null;
    }, [contracts, searchTerm]);

    const matchesThuChiSearch = (item: (typeof items)[number], q: string): boolean => {
        if (!q.trim()) return true;
        const termLower = q.trim().toLowerCase();
        const termNorm = normalizeKey(q);
        const fields = [
            item.code,
            item.description,
            item.noi_dung,
            (item as { ten_du_an?: string }).ten_du_an,
            (item as { customer_name?: string }).customer_name,
            (item as { so_hop_dong_display?: string | null }).so_hop_dong_display,
            item.so_hop_dong,
            (item as { ten_goi_thau?: string | null }).ten_goi_thau,
            item.id,
        ];
        if (
            fields.some((f) => {
                const raw = String(f ?? '').trim();
                if (!raw) return false;
                return (
                    raw.toLowerCase().includes(termLower) ||
                    normalizeKey(raw).includes(termNorm)
                );
            })
        ) {
            return true;
        }
        const hid = item.hop_dong_id ? String(item.hop_dong_id).trim() : '';
        return Boolean(hid && hopDongIdsMatchingSearch?.has(hid));
    };

    // Lọc chung (trừ tab) — dùng cho bộ đếm phiếu thu/chi theo bộ lọc hiện tại
    const baseFiltered = useMemo(() => {
        return items.filter((item) => {
            const matchesSearch = matchesThuChiSearch(item, searchTerm);

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
        hopDongIdsMatchingSearch,
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

    const thuChiExcelExportRows = useMemo(
        () => filteredItems.map((item) => mapThuChiListRowToExcel(item)),
        [filteredItems],
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

    /** Tổng «Đã thu tạm ứng» theo Hợp đồng / Nội dung (phiếu thu, bộ lọc hiện tại). */
    const tamUngByHopDongNoiDung = useMemo(() => {
        const map = new Map<
            string,
            { soHopDong: string; noiDung: string; total: number; count: number }
        >();
        for (const item of baseFiltered) {
            if (!isThuChiTamUngRow(item)) continue;
            const { soHopDong, noiDung } = thuChiHopDongNoiDungParts(item as typeof item & {
                so_hop_dong_display?: string;
                ten_goi_thau?: string;
            });
            const key = `${soHopDong}|||${noiDung}`;
            const cur = map.get(key);
            const amount = Number(item.so_tien) || 0;
            if (cur) {
                cur.total += amount;
                cur.count += 1;
            } else {
                map.set(key, { soHopDong, noiDung, total: amount, count: 1 });
            }
        }
        return [...map.values()].sort((a, b) => b.total - a.total);
    }, [baseFiltered]);

    const totalTamUngFiltered = useMemo(
        () => tamUngByHopDongNoiDung.reduce((s, r) => s + r.total, 0),
        [tamUngByHopDongNoiDung],
    );

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

    const isAllSelected =
        filteredItems.length > 0 &&
        filteredItems.every((item) => selectedIds.includes(thuChiRowId(item.id)));

    const toggleSelectAll = () => {
        setSelectedIds(
            isAllSelected ? [] : filteredItems.map((item) => thuChiRowId(item.id)).filter(Boolean),
        );
    };

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage) || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
    const visiblePages = useMemo(
        () => buildVisiblePages(currentPage, totalPages),
        [currentPage, totalPages],
    );

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    const selectedInTab = useMemo(
        () =>
            filteredItems
                .filter((i) => selectedIds.includes(thuChiRowId(i.id)))
                .map((i) => thuChiRowId(i.id))
                .filter(Boolean),
        [filteredItems, selectedIds],
    );

    const handleDeleteSelected = async () => {
        if (selectedInTab.length === 0 || deletingSelected) return;
        if (
            !window.confirm(
                `Xóa ${selectedInTab.length} chứng từ đã chọn trong tab hiện tại? Hành động không hoàn tác.`,
            )
        ) {
            return;
        }
        setDeletingSelected(true);
        try {
            const { deleted, requested, error: bulkErr } = await thuChiService.deleteMany(selectedInTab);
            setSelectedIds((prev) => prev.filter((id) => !selectedInTab.includes(id)));
            await loadRecords();
            if (bulkErr) {
                setToast({ type: 'error', message: bulkErr });
            } else if (deleted < requested) {
                setToast({
                    type: 'info',
                    message: `Đã xóa ${deleted}/${requested} chứng từ. Một số bản ghi không xóa được.`,
                });
            } else {
                setToast({ type: 'success', message: `Đã xóa ${deleted} chứng từ.` });
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Không xóa được chứng từ đã chọn.';
            setToast({ type: 'error', message: msg });
            await loadRecords();
        } finally {
            setDeletingSelected(false);
        }
    };

    const handleMigrateChuDauTuThanhToan = async () => {
        if (loading || migratingCdtLabel) return;
        if (
            !window.confirm(
                'Đổi toàn bộ «Chủ đầu tư thanh toán» thành chuẩn «CĐT thanh toán» (cột Tình trạng) trên mọi phiếu thu chi?\n\n' +
                'Tình trạng / hạng mục thu được lưu «Thanh toán»; nội dung có chữ cũ được thay bằng «CĐT thanh toán».',
            )
        ) {
            return;
        }
        setMigratingCdtLabel(true);
        try {
            const res = await thuChiService.migrateChuDauTuThanhToan();
            if (res.error) {
                setToast({ type: 'error', message: res.error });
                return;
            }
            await loadRecords();
            if (res.updated === 0) {
                setToast({
                    type: 'info',
                    message: 'Không có bản ghi nào chứa «Chủ đầu tư thanh toán».',
                });
            } else {
                setToast({
                    type: 'success',
                    message:
                        `Đã cập nhật ${res.updated} phiếu — Tình trạng: ${res.tinh_trang_phieu}, ` +
                        `Hạng mục thu: ${res.hang_muc_thu}, Nội dung: ${res.noi_dung}.`,
                });
            }
        } catch (err: unknown) {
            setToast({
                type: 'error',
                message: err instanceof Error ? err.message : 'Không chuẩn hóa được tình trạng.',
            });
        } finally {
            setMigratingCdtLabel(false);
        }
    };

    const handleDeleteAllThuChi = async () => {
        const n = rawThuChi.length;
        if (n === 0 || deletingAll) return;
        if (
            !window.confirm(
                `Bạn sắp xóa TOÀN BỘ ${n} phiếu thu & chi trong hệ thống (mọi bộ lọc/tab). Hành động không thể hoàn tác.\n\nBấm OK để tiếp tục bước xác nhận tiếp theo.`,
            )
        ) {
            return;
        }
        if (
            !window.confirm(
                'Xác nhận lần 2: Xóa vĩnh viễn toàn bộ dữ liệu thu chi khỏi cơ sở dữ liệu?',
            )
        ) {
            return;
        }
        setDeletingAll(true);
        try {
            const res = await thuChiService.deleteAll();
            setSelectedIds([]);
            await loadRecords();
            if (res.ok) {
                setToast({
                    type: 'success',
                    message:
                        res.deleted === 0
                            ? 'Không có phiếu thu chi nào để xóa.'
                            : `Đã xóa toàn bộ ${res.deleted} phiếu thu & chi.`,
                });
            } else {
                setToast({
                    type: 'error',
                    message: res.error
                        ? `Xóa không hoàn tất: ${res.error}`
                        : 'Không xóa được toàn bộ thu chi.',
                });
            }
        } catch {
            await loadRecords();
            setToast({ type: 'error', message: 'Lỗi khi xóa toàn bộ thu chi.' });
        } finally {
            setDeletingAll(false);
        }
    };

    useEffect(() => {
        setSelectedIds([]);
        setCurrentPage(1);
    }, [activeTab]);

    const handleThuChiExcelImport = useCallback(
        async (
            rows: Record<string, string>[],
            onProgress: (current: number, total: number) => void,
        ): Promise<ExcelImportResult> => {
            const errors: string[] = [];
            let ok = 0;
            const totalRows = rows.length;

            const normalizeLoaiPhieuKey = (raw: string) =>
                String(raw || '')
                    .trim()
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

            /** Dòng file mẫu CĐT (cột CĐT thanh toán / tạm ứng / nợ). */
            const isCdtExcelRow = (r: Record<string, string>) =>
                parseMoneyVi(String(r.cdt_thanh_toan ?? '')) > 0 ||
                parseMoneyVi(String(r.cdt_tam_ung ?? '')) > 0 ||
                parseMoneyVi(String(r.cdt_no ?? '')) > 0;

            /** Dòng mẫu Thu chi (Loại + Số tiền) — không nhầm với chỉ có Tên DA. */
            const isStandardThuChiExcelRow = (r: Record<string, string>) => {
                const soTien = parseMoneyVi(String(r.so_tien ?? ''));
                if (soTien <= 0) return false;
                const loai = normalizeLoaiPhieuKey(r.loai_phieu || '');
                if (!loai) return false;
                const hasPhieu = loai.includes('phieu');
                const hasThu = loai.includes('thu');
                const hasChi = loai.includes('chi');
                if (hasThu && hasChi) return false;
                return hasPhieu ? hasThu || hasChi : hasThu || hasChi;
            };

            const standardRowCount = rows.filter(isStandardThuChiExcelRow).length;
            const cdtRowCount = rows.filter(isCdtExcelRow).length;
            const isCdtTemplate = cdtRowCount > 0 && standardRowCount === 0;

            console.log('[ExcelImport] thuChi_import_branch', {
                isCdtTemplate,
                standardRowCount,
                cdtRowCount,
                totalRows,
            });

            // === DEBUG: in mẫu 3 dòng đầu để kiểm tra parse ===
            console.log('[ExcelImport] DEBUG sample_rows (3 dòng đầu):',
                rows.slice(0, 3).map((r, i) => ({ rowIdx: i + 2, ...r }))
            );
            console.log('[ExcelImport] DEBUG all_keys_in_row_0:', Object.keys(rows[0] || {}));

            if (isCdtTemplate) {
                type CdtAgg = {
                    ten_da: string;
                    ngay: string;
                    so_tien: number;
                    tinh_trang_phieu: string;
                    noi_dung: string;
                    /** Số HĐ & PLHĐ (hoặc Số HĐ) — dùng khớp `hop_dong.so_hop_dong`; rỗng = chỉ gắn dự án */
                    so_hd_lien_ket: string;
                    ten_goi_thau: string;
                };
                type CdtContractHint = {
                    loai_dv: string | null;
                    gia_hd_plhd: number;
                    gia_xuat_hd: number;
                    ngay_ky_hd: string | null;
                    thong_tin_kh: string | null;
                    mst_kh: string | null;
                    ten_goi_thau: string | null;
                };
                /** Gợi ý tạo HĐ: một cặp (Tên DA + số HĐ) → một hợp đồng, nhiều dòng thu chi vẫn gắn cùng HĐ */
                const contractHintsByKey = new Map<string, CdtContractHint>();
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
                    if (soHdLienKet) {
                        const hk = `${normalizeKey(tenDa)}|${normalizeKey(soHdLienKet)}`;
                        if (!contractHintsByKey.has(hk)) {
                            const gPlhd = parseMoneyVi(String(r.gia_hd_plhd ?? '').trim() || '0') || 0;
                            const gXuatRaw = parseMoneyVi(String(r.gia_xuat_hd ?? '').trim() || '0') || 0;
                            contractHintsByKey.set(hk, {
                                loai_dv: cleanString(r.loai_dv) || null,
                                gia_hd_plhd: gPlhd,
                                gia_xuat_hd: gXuatRaw > 0 ? gXuatRaw : gPlhd,
                                ngay_ky_hd:
                                    parseExcelDate(r.ngay_ky_hd, (r.nam_ky_hd || '').trim()) || null,
                                thong_tin_kh: cleanString(r.thong_tin_kh) || null,
                                mst_kh: cleanString(r.mst_kh) || null,
                                ten_goi_thau:
                                    cleanString(r.ten_goi_thau_cdt || r.ten_goi_thau || '') || null,
                            });
                        }
                    }
                    const soHdKey = soHdLienKet.toLowerCase();
                    const tenGoiThauRow = cleanString(r.ten_goi_thau_cdt || r.ten_goi_thau || '');
                    const tenGoiKey = tenGoiThauRow.toLowerCase();

                    const tt =
                        parseMoneyVi(String(r.cdt_thanh_toan ?? '').trim() || '0') || 0;
                    const tu =
                        parseMoneyVi(String(r.cdt_tam_ung ?? '').trim() || '0') || 0;

                    const bump = (amount: number, tinhTrang: string, noiDung: string) => {
                        if (amount <= 0) return;
                        const key = `${tenDa}_${ngayFinal}_${tinhTrang}_${soHdKey}_${tenGoiKey}`;
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
                                ten_goi_thau: tenGoiThauRow,
                            });
                    };

                    bump(tt, 'Thanh toán', `Thu CĐT thanh toán (${tenDa})`);
                    bump(tu, 'Tạm ứng', `Thu CĐT tạm ứng (${tenDa})`);

                    const giaXuatRow =
                        parseMoneyVi(String(r.gia_xuat_hd ?? '').trim() || '0') || 0;
                    let giaXuatAmt = giaXuatRow;
                    if (giaXuatAmt <= 0 && soHdLienKet) {
                        const hk = `${normalizeKey(tenDa)}|${normalizeKey(soHdLienKet)}`;
                        giaXuatAmt = contractHintsByKey.get(hk)?.gia_xuat_hd ?? 0;
                    }
                    if (giaXuatAmt > 0 && (giaXuatRow > 0 || isCdtExcelRowCoHoaDon(r))) {
                        bump(
                            giaXuatAmt,
                            'Xuất hóa đơn',
                            `Giá xuất HĐ — có hóa đơn (${tenDa})`,
                        );
                    }
                }
                const rows2 = Array.from(grouped.values());
                type ContractRowLite = (typeof contracts)[number];
                const contractsWorking: ContractRowLite[] = contracts.map((c) => ({ ...c }));
                const findContractLocal = (
                    soHd: string,
                    duAnId: string,
                ): ContractRowLite | undefined => {
                    const norm = soHd.trim().toLowerCase();
                    const hits = contractsWorking.filter(
                        (x) => (x.so_hop_dong || '').trim().toLowerCase() === norm,
                    );
                    return hits.find((x) => !x.du_an_id || String(x.du_an_id) === String(duAnId));
                };

                /** Đồng bộ `khach_hang`: tạo nếu chưa có (theo tên + MST), dùng khi tạo HĐ từ file CDT */
                const customerIdByNormKey = new Map<string, string>();
                for (const c of customers) {
                    const k = normalizeKey(c.ten_don_vi || '');
                    if (k) customerIdByNormKey.set(k, String(c.id));
                }
                const ensureKhachFromCdt = async (
                    thongTinKh: string,
                    mstKh: string | null | undefined,
                ): Promise<string | null> => {
                    const name = cleanString(thongTinKh || '');
                    if (!name) return null;
                    const nk = normalizeKey(name);
                    const cached = customerIdByNormKey.get(nk);
                    if (cached) return cached;
                    const mst = cleanString(mstKh || '') || undefined;
                    try {
                        const row = await customerService.create({
                            ten_don_vi: name,
                            ...(mst ? { mst } : {}),
                        });
                        const id = row?.id != null ? String(row.id) : null;
                        if (id) {
                            customerIdByNormKey.set(nk, id);
                            return id;
                        }
                    } catch {
                        const fb = customers.find((x) => normalizeKey(x.ten_don_vi || '') === nk);
                        if (fb?.id) {
                            const fid = String(fb.id);
                            customerIdByNormKey.set(nk, fid);
                            return fid;
                        }
                    }
                    return null;
                };
                const khSyncSeen = new Set<string>();
                for (const r of rows) {
                    const tn = cleanString(r.thong_tin_kh || '');
                    if (!tn) continue;
                    const nk = normalizeKey(tn);
                    if (khSyncSeen.has(nk)) continue;
                    khSyncSeen.add(nk);
                    await ensureKhachFromCdt(tn, cleanString(r.mst_kh || '') || null);
                }

                // --- PHASE 1: Parse CDT rows -> resolve contracts -> collect payloads ---
                const denom = Math.max(rows.length + rows2.length, 1);
                type CdtSavePayload = Parameters<typeof thuChiService.createMany>[0][number] & { _rowLabel: string };
                const cdtPayloads: CdtSavePayload[] = [];

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
                        const c = findContractLocal(soHd, project.id);
                        if (c) {
                            if (c.du_an_id && c.du_an_id !== project.id) {
                                errors.push(
                                    `CDT: hợp đồng «${soHd}» thuộc dự án khác, không khớp «${r.ten_da}»`,
                                );
                                continue;
                            }
                            hopDongId = hopDongRef(c);
                            if (c.du_an_id) duAnId = c.du_an_id;
                        } else {
                            const hk = `${normalizeKey(r.ten_da)}|${normalizeKey(soHd)}`;
                            const hint = contractHintsByKey.get(hk) ?? null;
                            const tenGoi =
                                String(r.ten_goi_thau || '').trim() ||
                                (hint?.ten_goi_thau || '').trim() ||
                                'Theo file CDT';
                            let customerId: string | null = null;
                            let tenDayDu: string | null = null;
                            if (hint?.thong_tin_kh) {
                                const nk = normalizeKey(hint.thong_tin_kh);
                                customerId = customerIdByNormKey.get(nk) ?? null;
                                if (!customerId) tenDayDu = hint.thong_tin_kh;
                            }
                            const giaHd = hint?.gia_hd_plhd ?? 0;
                            const giaQt = hint?.gia_xuat_hd ?? giaHd;
                            try {
                                const created = await contractService.create({
                                    du_an_id: project.id,
                                    project_name: project.ten_du_an || null,
                                    so_hop_dong: soHd,
                                    ten_goi_thau: tenGoi,
                                    loai_dich_vu: hint?.loai_dv || null,
                                    ngay_ky_hd: hint?.ngay_ky_hd || null,
                                    gia_tri_hd: giaHd,
                                    gia_tri_qt: giaQt,
                                    da_thu: 0,
                                    con_phai_thu: giaQt,
                                    file_status: 'Chưa có file',
                                    ...(customerId ? { customer_id: customerId } : {}),
                                    ...(tenDayDu && !customerId
                                        ? { ten_day_du_chu_dau_tu: tenDayDu }
                                        : {}),
                                });
                                if (!created?.id) {
                                    errors.push(
                                        `CDT «${r.ten_da}»: không tạo được hợp đồng «${soHd}» từ file`,
                                    );
                                    continue;
                                }
                                const newRow: ContractRowLite = {
                                    id: created.id,
                                    hop_dong_row_id: (created as { hop_dong_row_id?: string | null })
                                        .hop_dong_row_id ?? null,
                                    so_hop_dong: created.so_hop_dong || soHd,
                                    du_an_id: created.du_an_id ?? project.id,
                                    customer_id: created.customer_id ?? null,
                                    customer_name: created.customer_name ?? null,
                                    gia_tri_qt: created.gia_tri_qt ?? null,
                                    nguong_chi_nhan_su: created.nguong_chi_nhan_su ?? null,
                                    nguong_chi_nhan_su_loai: created.nguong_chi_nhan_su_loai ?? null,
                                };
                                contractsWorking.push(newRow);
                                hopDongId = hopDongRef(newRow);
                                if (newRow.du_an_id) duAnId = newRow.du_an_id;
                            } catch (e: any) {
                                errors.push(
                                    `CDT «${r.ten_da}»: lỗi tạo HĐ «${soHd}»: ${e?.message || e}`,
                                );
                                continue;
                            }
                        }
                    }

                    const syncedCdt = syncThuChiTrangThaiHdFields(
                        r.tinh_trang_phieu,
                        r.tinh_trang_phieu === 'Xuất hóa đơn'
                            ? TRANG_THAI_HD_CO
                            : TRANG_THAI_HD_PHAT_SINH,
                    );
                    cdtPayloads.push({
                        _rowLabel: `CDT ${i + 2}`,
                        loai_phieu: 'Phiếu thu',
                        so_tien: Number(r.so_tien || 0),
                        ngay: r.ngay,
                        du_an_id: duAnId,
                        hop_dong_id: hopDongId,
                        noi_dung: r.noi_dung,
                        tinh_trang_phieu: syncedCdt.tinh_trang_phieu,
                        trang_thai_hd: syncedCdt.trang_thai_hd,
                        hang_muc_thu: hangMucThuForTinhTrangPhieu(syncedCdt.tinh_trang_phieu),
                        ten_goi_thau: String(r.ten_goi_thau || '').trim() || null,
                    });
                }

                // --- PHASE 2: Bulk-insert CDT payloads in batches of 100 ---
                const CDT_BATCH = 100;
                for (let b = 0; b < cdtPayloads.length; b += CDT_BATCH) {
                    const chunk = cdtPayloads.slice(b, b + CDT_BATCH);
                    // Strip internal _rowLabel before sending to API
                    const apiChunk = chunk.map(({ _rowLabel: _rl, ...rest }) => rest);
                    const fromRow = b + 2;
                    const toRow = Math.min(b + CDT_BATCH, cdtPayloads.length) + 1;
                    try {
                        const result = await thuChiService.createMany(apiChunk);
                        ok += Array.isArray(result) ? result.length : (result as { inserted?: number }).inserted ?? apiChunk.length;
                    } catch (e: any) {
                        errors.push(
                            `Lỗi lưu CDT dòng ${fromRow}–${toRow}: ${e?.message || 'Không lưu được batch'}`,
                        );
                    }
                    onProgress(
                        rows.length + Math.min(b + CDT_BATCH, cdtPayloads.length),
                        denom,
                    );
                }
            } else {
                const projectKhPatched = new Set<string>();
                const findKhachHangByTen = (ten: string) => {
                    const key = normalizeKey(ten);
                    if (!key) return undefined;
                    return customers.find((c) => normalizeKey(c.ten_don_vi) === key);
                };
                const syncProjectKhachHangFromExcel = async (
                    project: { id: string; customer_id: string | null; customer_name: string | null },
                    doiTuong: string,
                ) => {
                    if (!doiTuong || projectKhPatched.has(project.id)) return project;
                    projectKhPatched.add(project.id);
                    const kh = findKhachHangByTen(doiTuong);
                    try {
                        if (kh && !project.customer_id) {
                            await projectService.update(project.id, {
                                customer_id: kh.id,
                                ten_khach_hang: kh.ten_don_vi,
                            });
                            return {
                                ...project,
                                customer_id: kh.id,
                                customer_name: kh.ten_don_vi,
                            };
                        }
                        if (!kh) {
                            await projectService.update(project.id, {
                                ten_khach_hang: doiTuong,
                            });
                            return { ...project, customer_name: doiTuong };
                        }
                    } catch (e: unknown) {
                        console.warn('[ExcelImport] syncProjectKhachHangFromExcel', e);
                    }
                    return project;
                };

                // --- PHASE 1: Parse all rows locally, sync project KH, collect valid payloads ---
                type StdSavePayload = Parameters<typeof thuChiService.createMany>[0][number] & { _rowLabel: string };
                const validPayloads: StdSavePayload[] = [];

                for (let i = 0; i < rows.length; i++) {
                    const r = rows[i];
                    onProgress(i + 1, totalRows);
                    const rowLabel = r.__rowNumber || String(i + 2);
                    const loai = String(r.loai_phieu || '').trim();
                    const soTien =
                        parseMoneyVi(r.so_tien) || Number(String(r.so_tien || '').replace(/[, ]/g, ''));
                    const tenDuAn = String(r.ten_da || r.ten_du_an || '').trim();
                    const soHdForProject = String(
                        r.so_hop_dong || r.so_hop_dong_phu || r.so_hd_plhd || r.so_hd || r.ma_chung_tu || '',
                    ).trim();
                    let project = tenDuAn
                        ? projects.find(
                            (p) =>
                                (p.ten_du_an || '').trim().toLowerCase() ===
                                tenDuAn.toLowerCase(),
                        )
                        : undefined;
                    if (!project && soHdForProject) {
                        const cForProj = contracts.find(
                            (x) =>
                                (x.so_hop_dong || '').trim().toLowerCase() ===
                                soHdForProject.toLowerCase(),
                        );
                        if (cForProj?.du_an_id) {
                            project = projects.find(
                                (p) => String(p.id) === String(cForProj.du_an_id),
                            );
                        }
                    }
                    const loaiL = normalizeLoaiPhieuKey(loai);
                    const hasPhieuWord = loaiL.includes('phieu');
                    const hasThu = loaiL.includes('thu');
                    const hasChi = loaiL.includes('chi');
                    const isPhieuThu = hasThu && !hasChi && (hasPhieuWord || loaiL === 'thu');
                    const isPhieuChi = hasChi && !hasThu && (hasPhieuWord || loaiL === 'chi');
                    if (!(isPhieuThu || isPhieuChi) || !(soTien > 0)) {
                        errors.push(
                            `Dòng ${rowLabel}: dữ liệu không hợp lệ (Loại: «${loai || 'trống'}», Số tiền: ${soTien || 0})`,
                        );
                        continue;
                    }
                    if (!project) {
                        errors.push(
                            `Dòng ${rowLabel}: cần «Tên DA» hoặc «Số HĐ» khớp hợp đồng trong hệ thống`,
                        );
                        continue;
                    }

                    const doiTuongExcel = String(r.doi_tuong || r.ten_kh || '').trim();
                    let projectForRow = project;
                    if (doiTuongExcel) {
                        projectForRow = await syncProjectKhachHangFromExcel(
                            { ...project },
                            doiTuongExcel,
                        );
                    }

                    const loaiPhieu = isPhieuThu ? 'Phiếu thu' : 'Phiếu chi';
                    let hangMucChi: 'chi_du_an' | 'chi_nhan_su' | null = null;
                    let nhanSuId: string | null = null;
                    if (loaiPhieu === 'Phiếu chi') {
                        const tn = String(r.ten_nhan_su || '').trim();
                        if (!tn) {
                            errors.push(`Dòng ${rowLabel}: Phiếu chi cần Tên nhân sự`);
                            continue;
                        }
                        const emp = employees.find(
                            (e) => (e.full_name || '').trim().toLowerCase() === tn.toLowerCase(),
                        );
                        if (!emp) {
                            errors.push(`Dòng ${rowLabel}: không tìm thấy nhân sự «${tn}»`);
                            continue;
                        }
                        nhanSuId = emp.id;
                        hangMucChi = parseHangMucChiFromExcel(r.hang_muc_chi || '');
                    }

                    const soHdRaw = String(r.so_hop_dong || r.so_hop_dong_phu || r.so_hd_plhd || r.so_hd || r.ma_chung_tu || '').trim();
                    let hopDongId: string | null = null;
                    if (soHdRaw) {
                        const c = contracts.find(
                            (x) =>
                                (x.so_hop_dong || '').trim().toLowerCase() === soHdRaw.toLowerCase() &&
                                (!x.du_an_id || String(x.du_an_id) === String(projectForRow.id)),
                        );
                        if (!c) {
                            // Không tìm thấy hợp đồng → vẫn lưu phiếu, gắn vào dự án, cảnh báo nhẹ
                            errors.push(
                                `Dòng ${rowLabel}: cảnh báo — hợp đồng «${soHdRaw}» chưa có trong hệ thống, phiếu được lưu vào dự án (không gắn HĐ)`,
                            );
                            // hopDongId vẫn là null → lưu gắn dự án
                        } else {
                            hopDongId = hopDongRef(c);
                        }
                    }
                    if (loaiPhieu === 'Phiếu chi' && hangMucChi === 'chi_nhan_su' && !hopDongId) {
                        errors.push(`Dòng ${rowLabel}: Chi nhân sự cần Số hợp đồng (hoặc Số HĐ & PLHĐ)`);
                        continue;
                    }

                    let tinhTrangPhieu = normalizeTinhTrangPhieuInput(
                        String(r.tinh_trang || r.tinh_trang_phieu || '').trim(),
                    );
                    const hangMucThuRaw = loaiPhieu === 'Phiếu thu' ? String(r.hang_muc_thu || '').trim() : '';
                    const hangMucThuNorm = hangMucThuRaw ? normalizeHangMucThuInput(hangMucThuRaw) : '';
                    if (!tinhTrangPhieu && hangMucThuNorm) {
                        tinhTrangPhieu = normalizeTinhTrangPhieuInput(hangMucThuNorm) || hangMucThuNorm;
                    }
                    if (!tinhTrangPhieu) tinhTrangPhieu = 'Tạm ứng';
                    const trangThaiHdRaw =
                        loaiPhieu === 'Phiếu thu'
                            ? normalizeTrangThaiHdInput(String(r.trang_thai_hd || '').trim()) ||
                            TRANG_THAI_HD_PHAT_SINH
                            : '';
                    const synced = syncThuChiTrangThaiHdFields(tinhTrangPhieu, trangThaiHdRaw || null);
                    tinhTrangPhieu = synced.tinh_trang_phieu || tinhTrangPhieu;
                    const hangMucThu =
                        loaiPhieu === 'Phiếu thu'
                            ? hangMucThuForTinhTrangPhieu(tinhTrangPhieu, hangMucThuNorm)
                            : null;

                    validPayloads.push({
                        _rowLabel: rowLabel,
                        loai_phieu: loaiPhieu,
                        so_tien: soTien,
                        ngay: parseExcelDate(r.ngay) || new Date().toISOString().split('T')[0],
                        du_an_id: projectForRow.id,
                        hop_dong_id: hopDongId,
                        noi_dung: String(r.noi_dung || '').trim() || null,
                        tinh_trang_phieu: tinhTrangPhieu,
                        trang_thai_hd: loaiPhieu === 'Phiếu thu' ? synced.trang_thai_hd : null,
                        hang_muc_thu: hangMucThu,
                        ten_goi_thau: String(r.ten_goi_thau || '').trim() || null,
                        hang_muc_chi: hangMucChi,
                        nhan_su_id: nhanSuId,
                    });
                }

                // --- PHASE 2: Bulk-insert valid payloads in batches of 100 ---
                const BATCH_SIZE = 100;
                const totalValid = validPayloads.length;
                for (let b = 0; b < totalValid; b += BATCH_SIZE) {
                    const chunk = validPayloads.slice(b, b + BATCH_SIZE);
                    // Strip internal _rowLabel before sending to API
                    const apiChunk = chunk.map(({ _rowLabel: _rl, ...rest }) => rest);
                    const fromRow = chunk[0]?._rowLabel ?? String(b + 2);
                    const toRow = chunk[chunk.length - 1]?._rowLabel ?? String(b + BATCH_SIZE + 1);
                    try {
                        const result = await thuChiService.createMany(apiChunk);
                        ok += Array.isArray(result) ? result.length : (result as { inserted?: number }).inserted ?? apiChunk.length;
                    } catch (e: any) {
                        errors.push(
                            `Lỗi lưu nhóm dòng ${fromRow}–${toRow}: ${e?.message || 'Không lưu được batch'}`,
                        );
                    }
                    onProgress(Math.min(b + BATCH_SIZE, totalValid), totalRows);
                }
            }

            if (ok === 0 && errors.length === 0) {
                errors.push(
                    'Không có phiếu nào được lưu. Kiểm tra: Tên DA khớp hệ thống, Loại (Phiếu thu/chi), Số tiền > 0. File mẫu «Tải mẫu Excel» dùng cột Loại/Số tiền — không phải bảng CĐT.',
                );
            }

            console.log('[ExcelImport] thuChi_import_done', { ok, errorCount: errors.length });

            // === DEBUG: tóm tắt nhóm lỗi để tìm ra lý do 763 dòng bị bỏ qua ===
            if (errors.length > 0) {
                const errorGroups: Record<string, number> = {};
                for (const e of errors) {
                    // Lấy phần mô tả lỗi (bỏ số dòng ở đầu)
                    const key = e.replace(/^Dòng \S+: /, '').replace(/«[^»]+»/g, '«…»').slice(0, 80);
                    errorGroups[key] = (errorGroups[key] ?? 0) + 1;
                }
                console.warn('[ExcelImport] DEBUG error_summary (nhóm lỗi):',
                    Object.entries(errorGroups)
                        .sort((a, b) => b[1] - a[1])
                        .map(([msg, count]) => `${count}x → ${msg}`)
                );
                console.warn('[ExcelImport] DEBUG first_10_errors:', errors.slice(0, 10));
            }

            return { ok, errors };
        },
        [projects, contracts, customers, employees],
    );

    return (
        <div className="bg-slate-50 text-slate-900 min-h-screen animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {tamUngTotalsOpen ? (
                <div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tam-ung-totals-title"
                    onClick={() => setTamUngTotalsOpen(false)}
                >
                    <div
                        className="flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <div>
                                <h2
                                    id="tam-ung-totals-title"
                                    className="text-lg font-bold text-slate-900"
                                >
                                    Tổng Đã thu tạm ứng
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Nhóm theo Hợp đồng / Nội dung — phiếu thu tình trạng Tạm ứng, theo
                                    bộ lọc hiện tại ({tamUngByHopDongNoiDung.length} nhóm)
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTamUngTotalsOpen(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                aria-label="Đóng"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto">
                            {tamUngByHopDongNoiDung.length === 0 ? (
                                <p className="px-5 py-10 text-center text-sm text-slate-500">
                                    Không có phiếu thu tạm ứng trong bộ lọc hiện tại.
                                </p>
                            ) : (
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="bg-blue-950 text-[11px] uppercase tracking-wider text-white">
                                            <th className="px-4 py-3 font-bold">
                                                Hợp đồng / Nội dung
                                            </th>
                                            <th className="px-4 py-3 text-right font-bold whitespace-nowrap">
                                                Đã thu tạm ứng
                                            </th>
                                            <th className="px-4 py-3 text-center font-bold w-20">
                                                Số phiếu
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tamUngByHopDongNoiDung.map((row) => (
                                            <tr
                                                key={`${row.soHopDong}|||${row.noiDung}`}
                                                className="hover:bg-slate-50/80"
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <span className="block text-sm font-bold text-slate-900">
                                                        {row.soHopDong}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-slate-500 line-clamp-2">
                                                        {row.noiDung}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-amber-800 whitespace-nowrap align-top">
                                                    {fmtVnd(row.total)}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-slate-600 tabular-nums align-top">
                                                    {row.count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-amber-50 border-t-2 border-amber-200">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-900">
                                                Tổng cộng
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-base font-extrabold text-amber-900 whitespace-nowrap">
                                                {fmtVnd(totalTamUngFiltered)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700 tabular-nums">
                                                {tamUngByHopDongNoiDung.reduce(
                                                    (s, r) => s + r.count,
                                                    0,
                                                )}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setTamUngTotalsOpen(false)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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

                        <div className="relative z-30" ref={customerFilterRef}>
                            <label className="block mb-1.5 text-sm text-slate-600 font-medium">Khách hàng</label>
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="search"
                                    role="combobox"
                                    aria-expanded={customerPickerOpen}
                                    aria-autocomplete="list"
                                    placeholder="Gõ để tìm khách hàng..."
                                    autoComplete="off"
                                    value={customerFilterDisplayValue}
                                    onChange={(e) => {
                                        setCustomerSearchInput(e.target.value);
                                        setCustomerPickerOpen(true);
                                    }}
                                    onFocus={() => setCustomerPickerOpen(true)}
                                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400"
                                />
                                {(customerSearchInput || selectedCustomerIds.length > 0) && (
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        aria-label="Xóa bộ lọc khách hàng"
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
                                <div
                                    role="listbox"
                                    className="absolute left-0 right-0 top-full z-40 mt-1 flex max-h-72 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                                >
                                    <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-2">
                                        {customerSearchInput.trim() &&
                                            filteredCustomersPick.length > 0 ? (
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    if (allVisibleCustomersSelected) {
                                                        const visible = new Set(
                                                            filteredCustomersPick.map((c) => c.id),
                                                        );
                                                        setSelectedCustomerIds((prev) =>
                                                            prev.filter((id) => !visible.has(id)),
                                                        );
                                                    } else {
                                                        selectAllVisibleCustomers();
                                                    }
                                                }}
                                                className="w-full rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-500/10"
                                            >
                                                {allVisibleCustomersSelected
                                                    ? `Bỏ chọn ${filteredCustomersPick.length} kết quả`
                                                    : `Chọn tất cả đang hiển thị (${filteredCustomersPick.length})`}
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="max-h-52 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedCustomerIds.length === 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedCustomerIds([]);
                                                    }
                                                }}
                                            />
                                            Tất cả khách hàng
                                        </label>
                                        <div className="mx-2 border-t border-slate-200" />
                                        {filteredCustomersPick.length === 0 ? (
                                            <p className="px-3 py-2 text-sm text-slate-500">
                                                {customerSearchInput.trim()
                                                    ? `Không khớp "${customerSearchInput.trim()}".`
                                                    : 'Không có khách hàng.'}
                                            </p>
                                        ) : (
                                            filteredCustomersPick.map((c) => {
                                                const checked =
                                                    selectedCustomerIds.length > 0 &&
                                                    selectedCustomerIds.includes(c.id);
                                                return (
                                                    <label
                                                        key={c.id}
                                                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            checked={checked}
                                                            onChange={() => toggleCustomerFilter(c.id)}
                                                        />
                                                        <span className="min-w-0 break-words">
                                                            {c.ten_don_vi}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
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
                            <input type="text" placeholder="Tìm mã, nội dung, số HĐ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400" />
                        </div>
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            disabled={!hasActiveFilters}
                            title="Xóa khách, dự án, HĐ, nhân sự, ngày, tìm kiếm và tham số URL"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <FilterX size={14} className="text-slate-500" aria-hidden />
                            Xóa bộ lọc
                        </button>
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
                                        disabled={
                                            selectedInTab.length === 0 || loading || deletingSelected
                                        }
                                        onClick={handleDeleteSelected}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {deletingSelected ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                        Xóa đã chọn
                                        {selectedInTab.length > 0 ? ` (${selectedInTab.length})` : ''}
                                    </button>
                                    {SHOW_DELETE_ALL_THU_CHI_BUTTON ? (
                                        <button
                                            type="button"
                                            disabled={loading || deletingAll || rawThuChi.length === 0}
                                            onClick={handleDeleteAllThuChi}
                                            title="Xóa mọi phiếu thu & chi trong hệ thống (không chỉ tab/bộ lọc hiện tại)"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50/80 px-3 py-1.5 text-xs font-bold text-rose-900 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            {deletingAll ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                            Xóa toàn bộ thu chi
                                            {rawThuChi.length > 0 ? ` (${rawThuChi.length})` : ''}
                                        </button>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleMigrateChuDauTuThanhToan}
                                        disabled={loading || migratingCdtLabel}
                                        title="Đổi mọi «Chủ đầu tư thanh toán» trong DB thành chuẩn hiển thị «CĐT thanh toán»"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-900 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {migratingCdtLabel ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        Đổi → CĐT thanh toán
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTamUngTotalsOpen(true)}
                                        disabled={loading}
                                        title="Tổng tiền tạm ứng theo Số HĐ và nội dung (gói thầu / diễn giải), theo bộ lọc hiện tại"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <Calculator className="w-3.5 h-3.5" />
                                        Tổng Đã thu tạm ứng
                                        {totalTamUngFiltered > 0
                                            ? ` (${fmtVnd(totalTamUngFiltered)})`
                                            : ''}
                                    </button>
                                    <span className="text-[11px] text-slate-500">
                                        Chọn từng dòng hoặc tick đầu cột để chọn/bỏ tất cả phiếu đang lọc (có thể nhiều trang).
                                    </span>
                                </div>
                                <ExcelImportExportBar
                                    className="shrink-0 min-w-0"
                                    columns={thuChiExcelColumns}
                                    importColumns={thuChiExcelImportColumns}
                                    data={thuChiExcelExportRows}
                                    templateFileName="mau-thu-chi"
                                    sheetName="Thu chi"
                                    onImport={handleThuChiExcelImport}
                                    onDone={handleImportDone}
                                    disabled={loading}
                                />
                            </div>
                            <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
                                <table className="min-w-[1280px] w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-blue-950 border-b border-blue-900 text-[11px] uppercase tracking-wider text-white">
                                            <th className="px-4 py-3.5 w-11 shrink-0">
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
                                            <th className="px-6 py-3.5 font-bold min-w-[9.5rem]">Mã chứng từ</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[17rem]">Khách Hàng</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[8rem]">Số HĐ</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[16rem]">Tên gói thầu</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[9rem] whitespace-nowrap">Ngày chứng từ</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[9.5rem]">Loại</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[12rem]">Tình trạng</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[10rem]">Trạng thái HĐ</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[11rem] text-right whitespace-nowrap">Số tiền</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[15rem]">Nội dung</th>
                                            <th className="px-6 py-3.5 font-bold min-w-[8rem] text-center">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {currentItems.length === 0 ? (
                                            <tr><td colSpan={12} className="px-6 py-10 text-center text-sm text-slate-500">Không có dữ liệu phù hợp bộ lọc hiện tại</td></tr>
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
                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 align-top whitespace-nowrap">{item.code || '-'}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-900 align-top min-w-[17rem] max-w-[22rem]">
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
                                                    <td className="px-6 py-4 text-sm text-slate-700 align-top min-w-[8rem] max-w-[11rem]">
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
                                                    <td className="px-6 py-4 text-sm text-slate-700 align-top min-w-[16rem] max-w-[22rem]">
                                                        <div
                                                            className="truncate"
                                                            title={
                                                                String((item as any).ten_goi_thau || '').trim() ||
                                                                undefined
                                                            }
                                                        >
                                                            {String((item as any).ten_goi_thau || '').trim() || '—'}
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
                                                    <td className="px-6 py-4 text-sm align-top min-w-[12rem] max-w-[16rem]">
                                                        {item.tinh_trang_display ? (
                                                            <span
                                                                title={tinhTrangThuCdtLabel(item.tinh_trang_display)}
                                                                className={cn(
                                                                    'inline-flex max-w-full items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight truncate align-top',
                                                                    tinhTrangPhieuBadgeClass(
                                                                        item.tinh_trang_display,
                                                                    ),
                                                                )}
                                                            >
                                                                {tinhTrangThuCdtLabel(item.tinh_trang_display)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm align-top min-w-[10rem] max-w-[14rem]">
                                                        {(item as { trang_thai_hd_display?: string })
                                                            .trang_thai_hd_display ? (
                                                            <span
                                                                className={cn(
                                                                    'inline-flex max-w-full items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-tight truncate',
                                                                    trangThaiHdBadgeClass(
                                                                        (item as { trang_thai_hd_display: string })
                                                                            .trang_thai_hd_display,
                                                                    ),
                                                                )}
                                                            >
                                                                {
                                                                    (item as { trang_thai_hd_display: string })
                                                                        .trang_thai_hd_display
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-black text-right text-slate-900 whitespace-nowrap align-top">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.so_tien || 0))}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500 align-top min-w-[15rem] max-w-[24rem]">
                                                        <div
                                                            className="truncate"
                                                            title={
                                                                String(item.description || '').trim() || undefined
                                                            }
                                                        >
                                                            {item.description?.trim() ? item.description : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-top whitespace-nowrap min-w-[8rem]">
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

                            <div className="px-6 py-4 flex flex-col gap-4 border-t border-slate-100 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                    <p>
                                        Hiển thị{' '}
                                        <span className="font-bold text-slate-800">
                                            {currentItems.length ? startIndex + 1 : 0} –{' '}
                                            {Math.min(startIndex + itemsPerPage, filteredItems.length)}
                                        </span>{' '}
                                        của <span className="font-bold text-slate-800">{filteredItems.length}</span> bản ghi
                                    </p>
                                    <label className="flex items-center gap-2 text-slate-600">
                                        <span className="whitespace-nowrap">Số dòng / trang</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(event) => setItemsPerPage(Number(event.target.value))}
                                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            {PAGE_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={size}>
                                                    {size}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className="flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                                        title="Trang đầu"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                                        title="Trang trước"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {visiblePages.map((page, index) =>
                                        page === 'ellipsis' ? (
                                            <span
                                                key={`ellipsis-${index}`}
                                                className="px-1 text-sm font-semibold text-slate-400"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    'h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition-colors',
                                                    currentPage === page
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-100',
                                                )}
                                            >
                                                {page}
                                            </button>
                                        ),
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                                        title="Trang sau"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage >= totalPages}
                                        className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                                        title="Trang cuối"
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
