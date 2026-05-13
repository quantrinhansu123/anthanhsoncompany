import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, FolderOpen, PlusCircle, User, CheckCircle, BarChart3, Briefcase, Calendar, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { contractService, ContractRow, ContractFile } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService, type ThuChiRow } from '../../lib/services/thuChiService';
import { customerService } from '../../lib/services/customerService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { HOPDONG_PROFILE_ACCESS_EVENT, type HopDongProfileAccessDetail } from '../../lib/hopDongProfileAccess';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import {
    parseExcelToRows,
    ExcelColumnDef,
    parseExcelDate,
    parseMoneyVi,
    cleanString,
    normalizeKey
} from '../../lib/excelTableTools';
import { cn } from '../../lib/utils';
import { PAGE_SIZE_OPTIONS, buildVisiblePages } from '../../lib/tablePagination';

interface Contract {
    id: number;
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
    nguongChiNhanSu: number;
    nguongChiNhanSuLoai: NguongChiNhanSuLoai;
    /** Tiền quy đổi (QT × % hoặc nhập VND) */
    nguongChiNhanSuTien: number;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
    nhanSuCode?: string | null;
    tenDayDuChuDauTu?: string | null;
    daiDienBenA?: string | null;
    chucVuDaiDienA?: string | null;
    mst?: string | null;
    diaChiTaiThoiDiemKy?: string | null;
    customerId?: string | null;
}

interface ProjectGroup {
    id: number;
    projectName: string;
    /** id dự án (du_an) — ưu tiên khi lọc */
    duAnId?: string | null;
    /** Hiển thị khách từ hợp đồng */
    customerLabel?: string | null;
    contracts: Contract[];
}

type ProjectMetaRow = {
    id: string;
    ten_du_an: string;
    customer_id?: string | null;
    customer_name?: string | null;
    ten_khach_hang?: string | null;
};

type HopDongSortKey =
    | 'khach'
    | 'du_an'
    | 'hop_dong'
    | 'trang_thai'
    | 'gia_tri_hd'
    | 'gia_tri_qt'
    | 'da_thu'
    | 'con_phai_thu'
    | 'ngay_update'
    | 'tien_do';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
    if (!active) return <ArrowUpDown size={14} className="opacity-40 shrink-0" aria-hidden />;
    return dir === 'asc' ? <ArrowUp size={14} className="shrink-0" aria-hidden /> : <ArrowDown size={14} className="shrink-0" aria-hidden />;
}

function parseViDateToTs(value: string): number {
    const s = String(value || '').trim();
    if (!s) return 0;
    const parts = s.split('/');
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts.map((x) => Number(x));
    if (!d || !m || !y) return 0;
    return new Date(y, m - 1, d).getTime();
}

function hopDongProjectCustomerKey(p: ProjectMetaRow): string {
    const cid = String(p.customer_id ?? '').trim();
    if (cid) return `id:${cid}`;
    const n = String(p.customer_name || p.ten_khach_hang || '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
    return n ? `name:${n}` : 'empty:';
}

/** Tổng Phiếu thu theo HĐ: `thu_chi.hop_dong_id` có thể trùng PK bảng `hop_dong` hoặc `contract_id` tùy dữ liệu. */
function sumPhieuThuForHopDong(c: ContractRow, thuChiMap: Map<string, number>): number {
    const rowPk = c.hop_dong_row_id != null ? String(c.hop_dong_row_id).trim() : '';
    const logicalId = c.id != null ? String(c.id).trim() : '';
    const v1 = rowPk ? thuChiMap.get(rowPk) : undefined;
    const v2 = logicalId ? thuChiMap.get(logicalId) : undefined;
    if (v1 !== undefined) return v1;
    if (v2 !== undefined) return v2;
    return 0;
}

function hopDongGroupCustomerKey(
    group: { duAnId?: string | null; customerLabel?: string | null; projectName: string },
    projectsMeta: ProjectMetaRow[],
): string {
    const du = group.duAnId ? String(group.duAnId).trim() : '';
    if (du) {
        const pm = projectsMeta.find((p) => String(p.id) === du);
        if (pm) return hopDongProjectCustomerKey(pm);
    }
    const byName = projectsMeta.find(
        (p) => (p.ten_du_an || '').trim() === (group.projectName || '').trim(),
    );
    if (byName) return hopDongProjectCustomerKey(byName);
    const cn = String(group.customerLabel || '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
    return cn ? `name:${cn}` : 'empty:';
}

function normalizeHangMucThuLabel(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function isTamUngHangMucThu(value: string | null | undefined): boolean {
    const normalized = normalizeHangMucThuLabel(value);
    return normalized === 'tạm ứng' || normalized === 'tam ung';
}

function isThanhToanHangMucThu(value: string | null | undefined): boolean {
    const normalized = normalizeHangMucThuLabel(value);
    return normalized === 'thanh toán' || normalized === 'thanh toan';
}

function sumThuByHangMucThu(
    rows: ThuChiRow[],
    contractIds: Set<string>,
    matchHangMucThu: (value: string | null | undefined) => boolean,
): number {
    if (contractIds.size === 0) return 0;
    return rows.reduce((sum, tc) => {
        if (tc.loai_phieu !== 'Phiếu thu') return sum;
        if (!matchHangMucThu(tc.hang_muc_thu)) return sum;
        const hopDongId = String(tc.hop_dong_id || '').trim();
        if (!hopDongId || !contractIds.has(hopDongId)) return sum;
        return sum + (Number(tc.so_tien) || 0);
    }, 0);
}

function Toast({ message, type, onClose, action }: {
    message: string;
    type: 'success' | 'info' | 'warning';
    onClose: () => void;
    action?: { label: string; onClick: () => void }
}) {
    useEffect(() => {
        // Don't auto-close if there's an action (like opening a doc)
        if (action) return;

        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose, action]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    const Icon = type === 'success' ? CheckCircle : type === 'warning' ? Trash2 : PlusCircle;

    return createPortal(
        <div className={`fixed top-5 right-5 z-[10000] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4`}>
            <Icon size={18} />
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{message}</span>
                {action && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                        }}
                        className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded border border-white/30 transition-colors w-fit"
                    >
                        {action.label}
                    </button>
                )}
            </div>
            <button onClick={onClose} className="ml-2 hover:opacity-70 p-1 rounded-full hover:bg-white/10 transition-colors">
                <X size={16} />
            </button>
        </div>,
        document.body
    );
}

/** Đặt `true` để hiện nút xóa toàn bộ hợp đồng (mặc định ẩn). */
const SHOW_DELETE_ALL_HOP_DONG_BUTTON = false;

export function HopDong() {
    const [searchParams] = useSearchParams();
    const filterFromUrl = searchParams.get('project');
    const filterCustomerIdFromUrl = searchParams.get('customerId');

    const {
        openThemHopDong,
        openChiTietHopDong,
        openDelete,
        setIsExporting
    } = useHopDongModal();

    const [items, setItems] = useState<ProjectGroup[]>([]);
    const [projectsMeta, setProjectsMeta] = useState<ProjectMetaRow[]>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string | null }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'folder'>('table');
    const [selectedFolderProjectId, setSelectedFolderProjectId] = useState<number | null>(null);
    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);

    // Pagination states
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
    const [totalContracts, setTotalContracts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [totalGiaTriQT, setTotalGiaTriQT] = useState(0);
    const [totalDaThu, setTotalDaThu] = useState(0);
    const [deletingAllContracts, setDeletingAllContracts] = useState(false);
    const [allThuChi, setAllThuChi] = useState<ThuChiRow[]>([]);

    /** Bộ lọc checkbox: khách + dự án (client-side trên trang hiện tại) */
    const [filterHopDongKhachKeys, setFilterHopDongKhachKeys] = useState<string[]>([]);
    const [filterHopDongDuAnIds, setFilterHopDongDuAnIds] = useState<string[]>([]);
    const [hdKhachFilterOpen, setHdKhachFilterOpen] = useState(false);
    const [hdKhachFilterSearch, setHdKhachFilterSearch] = useState('');
    const hdKhachFilterRef = useRef<HTMLDivElement>(null);
    const hdKhachSearchRef = useRef<HTMLInputElement>(null);
    const [hdDuAnFilterOpen, setHdDuAnFilterOpen] = useState(false);
    const [hdDuAnFilterSearch, setHdDuAnFilterSearch] = useState('');
    const hdDuAnFilterRef = useRef<HTMLDivElement>(null);
    const hdDuAnSearchRef = useRef<HTMLInputElement>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'info' | 'warning';
        action?: { label: string; onClick: () => void }
    } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [hopDongSortKey, setHopDongSortKey] = useState<HopDongSortKey | null>(null);
    const [hopDongSortDir, setHopDongSortDir] = useState<'asc' | 'desc'>('asc');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const hopDongExcelColumns: ExcelColumnDef[] = [
        { key: 'tt', header: 'TT', example: '1' },
        { key: 'so_ho_plhd', header: 'Số HĐ & PLHĐ', example: 'HĐ-01/2025' },
        { key: 'ngay_ky_hd', header: 'Ngày', example: '15/01' }, // Định dạng ngày/tháng
        { key: 'nam_ky_hd', header: 'Năm', example: '2025' },  // Định dạng năm đầy đủ (YYYY)
        { key: 'ten_da', header: 'Tên DA', example: 'Khớp tên dự án hệ thống' },
        { key: 'ten_goi_thau', header: 'Tên gói thầu', example: 'Gói thi công' },
        { key: 'loai_dv', header: 'Loại DV', example: 'Tư vấn' },
        { key: 'gia_hd_plhd', header: 'Giá HĐ/PLHĐ', example: '1000000000' },
        { key: 'gia_xuat_hd', header: 'Giá xuất HĐ', example: '1000000000' },
        { key: 'cdt_thanh_toan', header: 'CĐT thanh toán', example: '500000000' },
        { key: 'cdt_no', header: 'CĐT nợ', example: '500000000' },
        { key: 'cdt_tam_ung', header: 'CĐT tạm ứng', example: '0' },
        { key: 'noi_dung_xuat_hoa_don', header: 'Nội dung xuất hóa đơn', example: 'Thanh toán đợt 1' },
        { key: 'thong_tin_kh', header: 'Thông tin KH', example: 'Công ty ABC' },
        { key: 'mst_kh', header: 'MST KH', example: '0123456789' },
        { key: 'so_hd_xuat', header: 'Số HĐ', example: '0000123' },
        { key: 'ngay_xuat_hoa_don', header: 'Ngày xuất Hóa đơn', example: '20/01/2025' },
        { key: 'nam_xuat_hoa_don', header: 'Năm xuất Hóa đơn', example: '2025' },
        { key: 'ghi_chu_co', header: 'Ghi chú/Có', example: '' },
        { key: 'ghi_chu_chua_co', header: 'Ghi chú/Chưa có', example: '' },
        { key: 'ngay_tien_ve', header: 'Ngày tiền về', example: '25/01/2025' },
        { key: 'ngay_kiem_tra_hs', header: 'Ngày kiểm tra HS', example: '10/01/2025' },
    ];
    const [tasksByContract, setTasksByContract] = useState<Map<string, TaskRow[]>>(new Map());
    const [allContracts, setAllContracts] = useState<any[]>([]);

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil((totalContracts || 0) / pageSize)),
        [totalContracts, pageSize]
    );
    const visiblePages = useMemo(
        () => buildVisiblePages(page, totalPages),
        [page, totalPages],
    );
    const pageStart = totalContracts === 0 ? 0 : (page - 1) * pageSize + 1;
    const pageEnd = Math.min(page * pageSize, totalContracts);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    const hopDongCustomerOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of projectsMeta) {
            const key = hopDongProjectCustomerKey(p);
            const label =
                key === 'empty:'
                    ? '(Chưa có khách hàng)'
                    : (p.customer_name || p.ten_khach_hang || '').trim() || '—';
            if (!map.has(key)) map.set(key, label);
        }
        return Array.from(map.entries())
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [projectsMeta]);

    const hopDongProjectOptions = useMemo(() => {
        let list = projectsMeta;
        if (filterHopDongKhachKeys.length > 0) {
            const allow = new Set(filterHopDongKhachKeys);
            list = list.filter((p) => allow.has(hopDongProjectCustomerKey(p)));
        }
        return list
            .map((p) => ({ id: String(p.id), label: (p.ten_du_an || p.id).trim() || String(p.id) }))
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [projectsMeta, filterHopDongKhachKeys]);

    const hopDongKhachOptionsMatching = useMemo(() => {
        const q = hdKhachFilterSearch.trim().toLowerCase();
        if (!q) return hopDongCustomerOptions;
        return hopDongCustomerOptions.filter(
            (o) => o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q),
        );
    }, [hopDongCustomerOptions, hdKhachFilterSearch]);

    const hopDongProjectOptionsMatching = useMemo(() => {
        const q = hdDuAnFilterSearch.trim().toLowerCase();
        if (!q) return hopDongProjectOptions;
        return hopDongProjectOptions.filter(
            (o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
        );
    }, [hopDongProjectOptions, hdDuAnFilterSearch]);

    useEffect(() => {
        if (!hdKhachFilterOpen) {
            setHdKhachFilterSearch('');
            return;
        }
        const t = window.setTimeout(() => hdKhachSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [hdKhachFilterOpen]);

    useEffect(() => {
        if (!hdKhachFilterOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (hdKhachFilterRef.current?.contains(el)) return;
            setHdKhachFilterOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [hdKhachFilterOpen]);

    useEffect(() => {
        if (!hdDuAnFilterOpen) {
            setHdDuAnFilterSearch('');
            return;
        }
        const t = window.setTimeout(() => hdDuAnSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [hdDuAnFilterOpen]);

    useEffect(() => {
        if (!hdDuAnFilterOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (hdDuAnFilterRef.current?.contains(el)) return;
            setHdDuAnFilterOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [hdDuAnFilterOpen]);

    useEffect(() => {
        const allowed = new Set(hopDongProjectOptions.map((o) => o.id));
        setFilterHopDongDuAnIds((prev) => {
            if (prev.length === 0) return prev;
            const next = prev.filter((id) => allowed.has(id));
            if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
            return next;
        });
    }, [hopDongProjectOptions]);

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const toggleProject = (projectId: number) => {
        setExpandedProjects(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        );
    };

    // Load metadata (projects, employees, tasks) once
    useEffect(() => {
        (async () => {
            try {
                const [projectList, employeeList, allTasks] = await Promise.all([
                    projectService.getAll(),
                    employeeService.getAll(),
                    taskService.getAll()
                ]);

                setProjectsMeta(
                    projectList.map((p: any) => ({
                        id: String(p.id),
                        ten_du_an: p.ten_du_an || '',
                        customer_id:
                            p.customer_id != null && String(p.customer_id).trim() !== ''
                                ? String(p.customer_id).trim()
                                : null,
                        customer_name: p.customer_name?.trim() ? p.customer_name : null,
                        ten_khach_hang: p.ten_khach_hang?.trim() ? p.ten_khach_hang : null,
                    })),
                );
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || '',
                    anh_nhan_su: (emp as any).anh_nhan_su || null
                })));

                const tasksMap = new Map<string, TaskRow[]>();
                ((allTasks as any).data || allTasks).forEach((t: TaskRow) => {
                    if (t.hop_dong_id) {
                        const list = tasksMap.get(t.hop_dong_id) || [];
                        list.push(t);
                        tasksMap.set(t.hop_dong_id, list);
                    }
                });
                setTasksByContract(tasksMap);
            } catch (error) {
                console.error("[HopDong] Error loading metadata:", error);
            }
        })();
    }, []);

    // Load paged contracts
    useEffect(() => {
        (async () => {
            try {
                setIsLoading(true);
                const [response, thuChiRows] = await Promise.all([
                    contractService.getAll({
                        page,
                        pageSize,
                        search: debouncedSearch,
                    }),
                    thuChiService.getAll(),
                ]);
                setAllThuChi(thuChiRows);

                const contractRows = response.data || [];
                const total = response.total || 0;
                setTotalContracts(total);

                // Calculate "Đã thu" map
                const thuChiMap = new Map<string, number>();
                thuChiRows.forEach((tc) => {
                    if (tc.loai_phieu !== 'Phiếu thu') return;
                    const hid = tc.hop_dong_id != null ? String(tc.hop_dong_id).trim() : '';
                    if (!hid) return;
                    const current = thuChiMap.get(hid) || 0;
                    thuChiMap.set(hid, current + (tc.so_tien || 0));
                });

                // Grouping logic
                const groups = new Map<string, ContractRow[]>();
                contractRows.forEach(row => {
                    const key = row.project_name || '(Chưa có tên dự án)';
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(row);
                });

                let idCounter = 1;
                const projectGroups: ProjectGroup[] = Array.from(groups.entries()).map(([projectName, contracts]) => {
                    const first = contracts[0] as ContractRow;
                    const duAnId =
                        first?.du_an_id != null && String(first.du_an_id).trim() !== ''
                            ? String(first.du_an_id).trim()
                            : null;
                    const customerLabel =
                        (first?.customer_name && String(first.customer_name).trim()) ||
                        (first?.ten_day_du_chu_dau_tu && String(first.ten_day_du_chu_dau_tu).trim()) ||
                        null;
                    return {
                    id: idCounter++,
                    projectName,
                    duAnId,
                    customerLabel,
                    contracts: contracts.map((c, idx) => {
                        const daThu = sumPhieuThuForHopDong(c, thuChiMap);
                        const giaTriQT = Number(c.gia_tri_qt || 0);
                        const loaiNs = normalizeNguongLoai(c.nguong_chi_nhan_su_loai);
                        const rawNguong = Number(c.nguong_chi_nhan_su ?? 0);
                        return {
                            id: idx + 1,
                            uuid: c.id,
                            duAnId: c.du_an_id || null,
                            fileStatus: c.file_status || 'Chưa có file',
                            files: c.files || [],
                            ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                            soHopDong: c.so_hop_dong || '',
                            tenGoiThau: c.ten_goi_thau || '',
                            loaiDichVu: c.loai_dich_vu || '',
                            giaTriHD: Number(c.gia_tri_hd || 0),
                            giaTriQT,
                            nguongChiNhanSu: rawNguong,
                            nguongChiNhanSuLoai: loaiNs,
                            nguongChiNhanSuTien: tienQuyDoiNguongChiNhanSu(loaiNs, giaTriQT, rawNguong),
                            daThu,
                            // Đồng bộ với cột "Đã thu" (tổng Phiếu thu theo HĐ). Cột `con_phai_thu` trên DB dễ lệch vì không luôn được cập nhật khi có thu chi.
                            conPhaiThu: Math.max(0, giaTriQT - daThu),
                            ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                            nhanSuId: c.nhan_su_id || null,
                            nhanSuIds: (c as any).nhan_su_ids || (c.nhan_su_id ? [c.nhan_su_id] : []),
                            nhanSuTen: c.nhan_su_ten || null,
                            nhanSuCode: c.nhan_su_code || null,
                            tenDayDuChuDauTu: c.ten_day_du_chu_dau_tu || null,
                            dai_dien_ben_a: c.dai_dien_ben_a || null,
                            chuc_vu_dai_dien_a: c.chuc_vu_dai_dien_a || null,
                            mst: c.mst || null,
                            dia_chi_tai_thoi_diem_ky: c.dia_chi_tai_thoi_diem_ky || null,
                            customerId: c.customer_id || null,
                        } as any;
                    }),
                };
                });

                setItems(projectGroups);
                setAllContracts(contractRows);
                setExpandedProjects(projectGroups.map(p => p.id));

                // Tổng QT / đã thu chỉ cho các HĐ trên trang hiện tại (tránh nhầm với toàn hệ thống khi phân trang)
                setTotalGiaTriQT(contractRows.reduce((s: number, c: any) => s + Number(c.gia_tri_qt || 0), 0));
                setTotalDaThu(contractRows.reduce((s: number, c: ContractRow) => s + sumPhieuThuForHopDong(c, thuChiMap), 0));

            } catch (error) {
                console.error("[HopDong] Error loading paged data:", error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [page, pageSize, debouncedSearch, reloadKey]);

    useEffect(() => {
        const onAccess = (ev: Event) => {
            const d = (ev as CustomEvent<HopDongProfileAccessDetail>).detail;
            if (!d?.uuid) return;
            setItems((prev) =>
                prev.map((g) => ({
                    ...g,
                    contracts: g.contracts.map((row) =>
                        row.uuid === d.uuid ? { ...row, ngayUpdate: d.ngayUpdate } : row,
                    ),
                })),
            );
        };
        window.addEventListener(HOPDONG_PROFILE_ACCESS_EVENT, onAccess);
        return () => window.removeEventListener(HOPDONG_PROFILE_ACCESS_EVENT, onAccess);
    }, []);

    const openedContractFromUrlRef = useRef<string | null>(null);

    // Bộ lọc từ URL: duAnId, customerId (khớp bộ lọc checkbox)
    useEffect(() => {
        const duAnId = searchParams.get('duAnId');
        const cid = searchParams.get('customerId');
        if (duAnId?.trim()) {
            setFilterHopDongDuAnIds((prev) =>
                prev.length === 1 && prev[0] === duAnId ? prev : [duAnId.trim()],
            );
        }
        if (cid?.trim()) {
            const key = `id:${cid.trim()}`;
            setFilterHopDongKhachKeys((prev) =>
                prev.length === 1 && prev[0] === key ? prev : [key],
            );
        }
    }, [searchParams]);

    const urlOpenContractKey = [
        searchParams.get('edit'),
        searchParams.get('contract'),
        searchParams.get('hopDongId'),
    ]
        .filter(Boolean)
        .join('|');

    useEffect(() => {
        openedContractFromUrlRef.current = null;
    }, [urlOpenContractKey]);

    useEffect(() => {
        const editId = searchParams.get('edit');
        const viewId = searchParams.get('contract') || searchParams.get('hopDongId');
        const targetId = editId || viewId;
        if (!targetId || items.length === 0) return;
        if (openedContractFromUrlRef.current === targetId) return;

        const flat = items.flatMap((pg) => pg.contracts);
        const c = flat.find((x) => x.uuid === targetId);
        if (!c) return;

        openedContractFromUrlRef.current = targetId;
        if (editId) openThemHopDong(c);
        else openChiTietHopDong(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ mở modal một lần khi tìm thấy hàng trong `items`
    }, [items, searchParams]);

    const filteredItems = useMemo(() => {
        return items
            .filter((group) => {
                if (filterFromUrl && group.projectName !== filterFromUrl) return false;

                if (filterHopDongKhachKeys.length > 0) {
                    const gk = hopDongGroupCustomerKey(group, projectsMeta);
                    if (!filterHopDongKhachKeys.includes(gk)) return false;
                }
                if (filterHopDongDuAnIds.length > 0) {
                    const pid =
                        group.duAnId ||
                        projectsMeta.find((p) => p.ten_du_an === group.projectName)?.id;
                    if (!pid || !filterHopDongDuAnIds.includes(String(pid))) return false;
                }
                return true;
            })
            .map((project) => ({ ...project, contracts: project.contracts }))
            .filter((project) => project.contracts.length > 0);
    }, [items, filterFromUrl, filterHopDongKhachKeys, filterHopDongDuAnIds, projectsMeta]);

    const filteredContractIds = useMemo(() => {
        const ids = new Set<string>();
        for (const group of filteredItems) {
            for (const contract of group.contracts) {
                const id = String(contract.uuid || '').trim();
                if (id) ids.add(id);
            }
        }
        return ids;
    }, [filteredItems]);

    const totalTamUng = useMemo(
        () => sumThuByHangMucThu(allThuChi, filteredContractIds, isTamUngHangMucThu),
        [allThuChi, filteredContractIds],
    );

    const totalDaThanhToan = useMemo(
        () => sumThuByHangMucThu(allThuChi, filteredContractIds, isThanhToanHangMucThu),
        [allThuChi, filteredContractIds],
    );

    useEffect(() => {
        if (viewMode === 'folder' && filteredItems.length > 0) {
            const exists = selectedFolderProjectId !== null && filteredItems.some(p => p.id === selectedFolderProjectId);
            if (!exists) setSelectedFolderProjectId(filteredItems[0].id);
        }
    }, [viewMode, filteredItems, selectedFolderProjectId]);

    const getContractProgress = (uuid: string | undefined) => {
        const tasks = tasksByContract.get(uuid || '') || [];
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.tien_do === 100).length;
        return Math.round((completed / tasks.length) * 100);
    };

    const hopDongFlatRows = useMemo(() => {
        const rows: Array<{
            group: ProjectGroup;
            c: Contract;
            khachDisplay: string;
            duAnDisplay: string;
        }> = [];
        for (const group of filteredItems) {
            const pm = group.duAnId
                ? projectsMeta.find((p) => String(p.id) === String(group.duAnId))
                : projectsMeta.find((p) => p.ten_du_an === group.projectName);
            const khachDisplay =
                group.customerLabel?.trim() ||
                (pm?.customer_name || pm?.ten_khach_hang || '').trim() ||
                '—';
            const duAnDisplay = group.projectName || '—';
            for (const c of group.contracts) {
                rows.push({ group, c, khachDisplay, duAnDisplay });
            }
        }
        return rows;
    }, [filteredItems, projectsMeta]);

    const sortedHopDongRows = useMemo(() => {
        if (!hopDongSortKey) return hopDongFlatRows;
        const mul = hopDongSortDir === 'asc' ? 1 : -1;
        const progress = (uuid: string | undefined) => {
            const tasks = tasksByContract.get(uuid || '') || [];
            if (tasks.length === 0) return 0;
            const completed = tasks.filter((t) => t.tien_do === 100).length;
            return Math.round((completed / tasks.length) * 100);
        };
        const arr = [...hopDongFlatRows];
        arr.sort((a, b) => {
            let cmp = 0;
            switch (hopDongSortKey) {
                case 'khach':
                    cmp = a.khachDisplay.localeCompare(b.khachDisplay, 'vi');
                    break;
                case 'du_an':
                    cmp = a.duAnDisplay.localeCompare(b.duAnDisplay, 'vi');
                    break;
                case 'hop_dong': {
                    cmp = (a.c.soHopDong || '').localeCompare(b.c.soHopDong || '', undefined, { numeric: true });
                    if (cmp === 0) cmp = (a.c.tenGoiThau || '').localeCompare(b.c.tenGoiThau || '', 'vi');
                    break;
                }
                case 'trang_thai':
                    cmp = (a.c.fileStatus || '').localeCompare(b.c.fileStatus || '', 'vi');
                    break;
                case 'gia_tri_hd':
                    cmp = a.c.giaTriHD - b.c.giaTriHD;
                    break;
                case 'gia_tri_qt':
                    cmp = a.c.giaTriQT - b.c.giaTriQT;
                    break;
                case 'da_thu':
                    cmp = a.c.daThu - b.c.daThu;
                    break;
                case 'con_phai_thu':
                    cmp = a.c.conPhaiThu - b.c.conPhaiThu;
                    break;
                case 'ngay_update':
                    cmp = parseViDateToTs(a.c.ngayUpdate) - parseViDateToTs(b.c.ngayUpdate);
                    break;
                case 'tien_do':
                    cmp = progress(a.c.uuid) - progress(b.c.uuid);
                    break;
                default:
                    return 0;
            }
            return mul * cmp;
        });
        return arr;
    }, [hopDongFlatRows, hopDongSortKey, hopDongSortDir, tasksByContract]);

    const toggleHopDongSort = (key: HopDongSortKey) => {
        setHopDongSortKey((prev) => {
            if (prev === key) {
                setHopDongSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setHopDongSortDir('asc');
            return key;
        });
    };

    const handleDeleteAllHopDong = async () => {
        const n = totalContracts;
        if (n === 0 || deletingAllContracts || isLoading) return;
        if (
            !window.confirm(
                `Bạn sắp xóa TOÀN BỘ ${n} hợp đồng trong hệ thống (mọi bộ lọc/trang). Công việc gắn hợp đồng sẽ bị xóa theo; phiếu thu chi vẫn giữ nhưng có thể mất liên kết hợp đồng. Không thể hoàn tác.\n\nBấm OK để tiếp tục bước xác nhận tiếp theo.`,
            )
        ) {
            return;
        }
        if (
            !window.confirm(
                'Xác nhận lần 2: Xóa vĩnh viễn toàn bộ hợp đồng khỏi cơ sở dữ liệu?',
            )
        ) {
            return;
        }
        setDeletingAllContracts(true);
        try {
            const res = await contractService.deleteAll();
            if (res.ok) {
                setPage(1);
                setReloadKey((k) => k + 1);
                setToast({
                    type: 'success',
                    message:
                        res.deleted === 0
                            ? 'Không có hợp đồng nào để xóa.'
                            : `Đã xóa toàn bộ ${res.deleted} hợp đồng.`,
                });
            } else {
                setToast({
                    type: 'warning',
                    message: res.error
                        ? `Xóa không hoàn tất: ${res.error}`
                        : 'Không xóa được toàn bộ hợp đồng.',
                });
            }
        } catch {
            setToast({ type: 'warning', message: 'Lỗi khi xóa toàn bộ hợp đồng.' });
        } finally {
            setDeletingAllContracts(false);
        }
    };

    const handleExportGoogleDocs = async (contract: Contract, projectName: string) => {
        try {
            setIsExporting(true);
            console.log('[HopDong] Preparing export for contract:', { contract, projectName });
            setToast({ message: 'Đang chuẩn bị dữ liệu xuất...', type: 'info' });

            const payload = {
                ...contract,
                projectName,
            };

            console.log('[HopDong] Payload to send:', payload);
            const result = await contractService.exportToGoogleDocs(payload);

            if (result && result.success && result.documentUrl) {
                setToast({
                    message: 'Xuất file thành công!',
                    type: 'success',
                    action: {
                        label: 'Mở tài liệu',
                        onClick: () => window.open(result.documentUrl, '_blank')
                    }
                });
            } else {
                setToast({ message: 'Yêu cầu xuất file đã được gửi!', type: 'success' });
            }
        } catch (error: any) {
            console.error('[HopDong] Export error:', error);
            setToast({ message: error.message || 'Lỗi khi xuất file', type: 'warning' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-[#faf8ff] text-[#131b2e] min-h-screen animate-in fade-in duration-500 p-6 md:p-8 space-y-6">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    action={toast.action}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">QUẢN LÝ HỢP ĐỒNG</h2>
                    <p className="text-sm text-slate-500 mt-1">Hệ thống / Hợp đồng</p>
                </div>
                <button
                    type="button"
                    onClick={() => openThemHopDong()}
                    className="bg-[#004bcb] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:opacity-90"
                >
                    <Plus size={18} />
                    THÊM HỢP ĐỒNG
                </button>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                <div className="bg-[#283044] text-white p-6 rounded-xl shadow-sm">
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-1">Tổng hợp đồng</p>
                    <h3 className="text-3xl font-extrabold">{totalContracts}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">Tổng quyết toán</p>
                    <h3 className="text-3xl font-extrabold text-slate-900">{formatCurrency(totalGiaTriQT)} đ</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">Đã thu hồi</p>
                    <h3 className="text-3xl font-extrabold text-emerald-700">{formatCurrency(totalDaThu)} đ</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">Tiền tạm ứng</p>
                    <h3 className="text-3xl font-extrabold text-amber-700">{formatCurrency(totalTamUng)} đ</h3>
                    <p className="text-[11px] text-slate-500 mt-2">Phiếu thu có Hạng mục thu = Tạm ứng theo bộ lọc hiện tại</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">Đã thanh toán</p>
                    <h3 className="text-3xl font-extrabold text-sky-700">{formatCurrency(totalDaThanhToan)} đ</h3>
                    <p className="text-[11px] text-slate-500 mt-2">Phiếu thu có Hạng mục thu = Thanh toán theo bộ lọc hiện tại</p>
                </div>
            </section>

            <section className="bg-[#f2f3ff] rounded-xl p-4 border border-slate-200 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <div className="relative w-full max-w-md min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm hợp đồng..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm"
                        />
                    </div>
                    <div className="relative min-w-[10.5rem] max-w-[14rem]" ref={hdKhachFilterRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setHdKhachFilterOpen((o) => !o);
                                setHdDuAnFilterOpen(false);
                            }}
                            className="w-full flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30"
                            aria-expanded={hdKhachFilterOpen}
                            aria-haspopup="listbox"
                            title="Lọc theo khách hàng"
                        >
                            <span className="truncate min-w-0 text-left">
                                {filterHopDongKhachKeys.length === 0
                                    ? 'Tất cả khách hàng'
                                    : filterHopDongKhachKeys.length === 1
                                      ? hopDongCustomerOptions.find((x) => x.key === filterHopDongKhachKeys[0])
                                          ?.label || '1 khách'
                                      : `${filterHopDongKhachKeys.length} khách đã chọn`}
                            </span>
                            <ChevronDown
                                className={`w-4 h-4 shrink-0 text-slate-500 ${hdKhachFilterOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>
                        {hdKhachFilterOpen ? (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-lg">
                                <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-2">
                                    <div className="relative">
                                        <Search
                                            size={14}
                                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            ref={hdKhachSearchRef}
                                            type="search"
                                            value={hdKhachFilterSearch}
                                            onChange={(e) => setHdKhachFilterSearch(e.target.value)}
                                            placeholder="Tìm khách hàng…"
                                            autoComplete="off"
                                            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#004bcb] focus:outline-none focus:ring-2 focus:ring-[#004bcb]/25"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[min(12rem,40vh)] min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                            checked={filterHopDongKhachKeys.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setFilterHopDongKhachKeys([]);
                                            }}
                                        />
                                        Tất cả khách hàng
                                    </label>
                                    <div className="mx-2 border-t border-slate-200" />
                                    {hopDongCustomerOptions.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">Chưa có dữ liệu dự án.</p>
                                    ) : hopDongKhachOptionsMatching.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">
                                            Không khớp &quot;{hdKhachFilterSearch.trim()}&quot;.
                                        </p>
                                    ) : (
                                        hopDongKhachOptionsMatching.map((o) => {
                                            const checked =
                                                filterHopDongKhachKeys.length > 0 &&
                                                filterHopDongKhachKeys.includes(o.key);
                                            return (
                                                <label
                                                    key={o.key}
                                                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setFilterHopDongKhachKeys((prev) => {
                                                                if (prev.length === 0) return [o.key];
                                                                if (prev.includes(o.key))
                                                                    return prev.filter((x) => x !== o.key);
                                                                return [...prev, o.key];
                                                            });
                                                        }}
                                                    />
                                                    <span className="min-w-0 break-words">{o.label}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className="relative min-w-[10.5rem] max-w-[14rem]" ref={hdDuAnFilterRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setHdDuAnFilterOpen((o) => !o);
                                setHdKhachFilterOpen(false);
                            }}
                            disabled={hopDongProjectOptions.length === 0}
                            className="w-full flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30 disabled:cursor-not-allowed disabled:opacity-55"
                            aria-expanded={hdDuAnFilterOpen}
                            aria-haspopup="listbox"
                            title="Lọc theo dự án"
                        >
                            <span className="truncate min-w-0 text-left">
                                {filterHopDongDuAnIds.length === 0
                                    ? 'Tất cả dự án'
                                    : filterHopDongDuAnIds.length === 1
                                      ? hopDongProjectOptions.find((x) => x.id === filterHopDongDuAnIds[0])
                                          ?.label || '1 dự án'
                                      : `${filterHopDongDuAnIds.length} dự án đã chọn`}
                            </span>
                            <ChevronDown
                                className={`w-4 h-4 shrink-0 text-slate-500 ${hdDuAnFilterOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>
                        {hdDuAnFilterOpen && hopDongProjectOptions.length > 0 ? (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-lg">
                                <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-2">
                                    <div className="relative">
                                        <Search
                                            size={14}
                                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            ref={hdDuAnSearchRef}
                                            type="search"
                                            value={hdDuAnFilterSearch}
                                            onChange={(e) => setHdDuAnFilterSearch(e.target.value)}
                                            placeholder="Tìm dự án…"
                                            autoComplete="off"
                                            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#004bcb] focus:outline-none focus:ring-2 focus:ring-[#004bcb]/25"
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[min(12rem,40vh)] min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                            checked={filterHopDongDuAnIds.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setFilterHopDongDuAnIds([]);
                                            }}
                                        />
                                        Tất cả dự án
                                    </label>
                                    <div className="mx-2 border-t border-slate-200" />
                                    {hopDongProjectOptionsMatching.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">
                                            {hdDuAnFilterSearch.trim()
                                                ? `Không khớp "${hdDuAnFilterSearch.trim()}".`
                                                : 'Không có dự án.'}
                                        </p>
                                    ) : (
                                        hopDongProjectOptionsMatching.map((o) => {
                                            const checked =
                                                filterHopDongDuAnIds.length > 0 &&
                                                filterHopDongDuAnIds.includes(o.id);
                                            return (
                                                <label
                                                    key={o.id}
                                                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                        checked={checked}
                                                        onChange={() => {
                                                            setFilterHopDongDuAnIds((prev) => {
                                                                if (prev.length === 0) return [o.id];
                                                                if (prev.includes(o.id))
                                                                    return prev.filter((x) => x !== o.id);
                                                                return [...prev, o.id];
                                                            });
                                                        }}
                                                    />
                                                    <span className="min-w-0 break-words">{o.label}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {SHOW_DELETE_ALL_HOP_DONG_BUTTON ? (
                        <button
                            type="button"
                            disabled={isLoading || deletingAllContracts || totalContracts === 0}
                            onClick={handleDeleteAllHopDong}
                            title="Xóa mọi hợp đồng trong hệ thống (không chỉ trang/bộ lọc hiện tại)"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50/90 px-3 py-2 text-xs font-bold text-rose-900 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {deletingAllContracts ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Xóa toàn bộ HĐ
                            {totalContracts > 0 ? ` (${totalContracts})` : ''}
                        </button>
                    ) : null}
                    <ExcelImportExportBar
                        columns={hopDongExcelColumns}
                        data={[...allContracts].sort((a, b) => {
                            const pA = a.project_name || '';
                            const pB = b.project_name || '';
                            if (pA !== pB) return pA.localeCompare(pB);
                            return (a.so_hop_dong || '').localeCompare(b.so_hop_dong || '');
                        })}
                        templateFileName="mau-hop-dong"
                        sheetName="Hop dong"
                        onImport={async (rows) => {
                            try {
                                const customerMap = new Map<string, any>();
                                const projectMap = new Map<string, any>();
                                const getOrCreateCustomer = async (r: any) => {
                                    const customerName = cleanString(r.thong_tin_kh);
                                    if (!customerName) return null;
                                    const normName = normalizeKey(customerName);
                                    if (customerMap.has(normName)) return customerMap.get(normName);
                                    const newC = await customerService.create({ ten_don_vi: customerName, mst: (r.mst_kh || '').trim() || undefined });
                                    if (newC?.id) customerMap.set(normName, newC.id);
                                    return newC?.id || null;
                                };
                                const getOrCreateProject = async (r: any, customerId: any) => {
                                    const projectName = cleanString(r.ten_da);
                                    if (!projectName) return null;
                                    const normProject = normalizeKey(projectName);
                                    if (projectMap.has(normProject)) return projectMap.get(normProject);
                                    const newP = await projectService.create({
                                        ten_du_an: projectName,
                                        status: 'Đang thực hiện',
                                        progress: 0,
                                        customer_id: customerId,
                                        ten_khach_hang: (r.thong_tin_kh || '').trim() || null,
                                    });
                                    if (newP?.id) projectMap.set(normProject, newP.id);
                                    return newP?.id || null;
                                };
                                let totalOk = 0;
                                const allErrors: string[] = [];
                                for (let i = 0; i < rows.length; i += 20) {
                                    const chunk = rows.slice(i, i + 20);
                                    const processedChunk = [];
                                    for (const r of chunk) {
                                        const customerId = await getOrCreateCustomer(r);
                                        const duAnId = await getOrCreateProject(r, customerId);
                                        processedChunk.push({
                                            ...r,
                                            __rowNumber: r.__rowNumber,
                                            du_an_id: duAnId,
                                            customer_id: customerId,
                                            gia_tri_hd: parseMoneyVi(r.gia_hd_plhd || '0'),
                                            gia_tri_qt: parseMoneyVi(r.gia_xuat_hd || '0'),
                                            da_thu: parseMoneyVi(r.cdt_thanh_toan || '0'),
                                            con_phai_thu: parseMoneyVi(r.cdt_no || '0'),
                                            so_hop_dong: (r.so_ho_plhd || '').trim(),
                                            project_name: cleanString(r.ten_da),
                                            ten_goi_thau: cleanString(r.ten_goi_thau),
                                            loai_dich_vu: cleanString(r.loai_dv),
                                            ten_day_du_chu_dau_tu: cleanString(r.thong_tin_kh),
                                            mst: (r.mst_kh || '').trim(),
                                            ngay_ky_hd: parseExcelDate(r.ngay_ky_hd, r.nam_ky_hd),
                                        });
                                    }
                                    
                                    // Nhóm các dòng theo số hợp đồng và cộng dồn giá trị quyết toán
                                    const contractGroups = new Map<string, any>();
                                    for (const row of processedChunk) {
                                        const soHd = (row.so_hop_dong || '').trim().toLowerCase();
                                        const duAnId = row.du_an_id || '';
                                        const groupKey = `${soHd}|${duAnId}`; // Key = số HĐ + dự án để tránh trùng
                                        
                                        if (!soHd) {
                                            // Không có số HĐ, xử lý như bình thường (không nhóm)
                                            const uniqueKey = `no_contract_${Math.random()}`;
                                            contractGroups.set(uniqueKey, row);
                                            continue;
                                        }
                                        
                                        if (contractGroups.has(groupKey)) {
                                            // Đã có HĐ này, cộng dồn giá trị
                                            const existing = contractGroups.get(groupKey);
                                            existing.gia_tri_hd += row.gia_tri_hd || 0;
                                            existing.gia_tri_qt += row.gia_tri_qt || 0;
                                            // Không cộng da_thu và con_phai_thu vì sẽ được tính lại từ phiếu thu
                                            // Giữ nguyên thông tin khác từ dòng đầu tiên
                                        } else {
                                            // HĐ mới, thêm vào map
                                            contractGroups.set(groupKey, { ...row });
                                        }
                                    }
                                    
                                    // Chuyển map thành array để import
                                    const mergedChunk = Array.from(contractGroups.values());
                                    const result = await contractService.bulkImport(mergedChunk);
                                    totalOk += result.created + result.updated;
                                    if (result.errors.length > 0) allErrors.push(...result.errors);
                                }
                                return { ok: totalOk, errors: allErrors };
                            } catch (e: any) {
                                return { ok: 0, errors: [e?.message || 'Lỗi kết nối server'] };
                            }
                        }}
                        onDone={() => {
                            setPage(1);
                            setReloadKey((k) => k + 1);
                            setToast({ message: 'Đã xử lý nhập Excel hợp đồng.', type: 'success' });
                        }}
                    />
                </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1780px] text-left border-collapse">
                    <thead className="bg-[#283044] border-b border-[#1c2436]">
                        <tr>
                            <th className="px-4 py-3 text-xs min-w-[8rem]">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('khach')}
                                    className="w-full inline-flex items-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors text-left"
                                >
                                    <span>Khách hàng</span>
                                    <SortIcon active={hopDongSortKey === 'khach'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-xs min-w-[8rem]">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('du_an')}
                                    className="w-full inline-flex items-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors text-left"
                                >
                                    <span>Dự án</span>
                                    <SortIcon active={hopDongSortKey === 'du_an'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-xs">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('hop_dong')}
                                    className="w-full inline-flex items-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors text-left"
                                >
                                    <span>Hợp đồng / Nội dung</span>
                                    <SortIcon active={hopDongSortKey === 'hop_dong'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-center min-w-[6rem]">
                                <span className="uppercase tracking-wider font-bold text-[#f2f2ff]">
                                    Ngày ký HĐ
                                </span>
                            </th>
                            <th className="px-3 py-3 text-xs">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('trang_thai')}
                                    className="w-full inline-flex items-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors text-left"
                                >
                                    <span>Trạng thái</span>
                                    <SortIcon active={hopDongSortKey === 'trang_thai'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-right">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('gia_tri_hd')}
                                    className="w-full inline-flex items-center justify-end gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                                >
                                    <span>Giá trị HĐ ký</span>
                                    <SortIcon active={hopDongSortKey === 'gia_tri_hd'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-right">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('gia_tri_qt')}
                                    className="w-full inline-flex items-center justify-end gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                                >
                                    <span>Giá trị QT</span>
                                    <SortIcon active={hopDongSortKey === 'gia_tri_qt'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-right">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('da_thu')}
                                    className="w-full inline-flex items-center justify-end gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                                >
                                    <span>Đã thu</span>
                                    <SortIcon active={hopDongSortKey === 'da_thu'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-right">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('con_phai_thu')}
                                    className="w-full inline-flex items-center justify-end gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                                >
                                    <span>Còn nợ</span>
                                    <SortIcon active={hopDongSortKey === 'con_phai_thu'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs text-center min-w-[8rem]">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('ngay_update')}
                                    className="w-full inline-flex items-center justify-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors"
                                >
                                    <span>Lịch sử HS</span>
                                    <SortIcon active={hopDongSortKey === 'ngay_update'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-3 py-3 text-xs w-40">
                                <button
                                    type="button"
                                    onClick={() => toggleHopDongSort('tien_do')}
                                    className="w-full inline-flex items-center gap-1.5 uppercase tracking-wider font-bold text-[#f2f2ff] hover:text-white hover:bg-white/10 rounded px-1 py-0.5 -mx-1 transition-colors text-left"
                                >
                                    <span>Tiến độ</span>
                                    <SortIcon active={hopDongSortKey === 'tien_do'} dir={hopDongSortDir} />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-xs uppercase tracking-wider font-bold text-[#f2f2ff] text-center">
                                Thao tác
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedHopDongRows.map(({ group, c, khachDisplay, duAnDisplay }) => {
                            const progress = getContractProgress(c.uuid);
                            return (
                                <tr key={c.uuid} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-900 align-top border-r border-slate-50">
                                        <span className="line-clamp-2 leading-snug">{khachDisplay}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-800 align-top border-r border-slate-50">
                                        <span className="line-clamp-2 leading-snug font-medium">{duAnDisplay}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">{c.soHopDong}</span>
                                            <span className="text-xs text-slate-500 mt-1">{c.tenGoiThau}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center text-xs text-slate-700 font-medium whitespace-nowrap">
                                        {c.ngayKyHD || '—'}
                                    </td>
                                    <td className="px-4 py-4">
                                        {(() => {
                                            const status = c.fileStatus || 'Chưa có file';
                                            const isDayDu = status === 'Đầy đủ file';
                                            const fileCount = (c.files || []).length;
                                            
                                            if (isDayDu) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                        <CheckCircle size={10} />
                                                        Đầy đủ
                                                    </span>
                                                );
                                            }
                                            
                                            if (fileCount === 0) {
                                                return (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                        Chưa có file
                                                    </span>
                                                );
                                            }
                                            
                                            // Có file nhưng chưa đủ
                                            return (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 w-fit">
                                                        <FileText size={10} />
                                                        {fileCount} file
                                                    </span>
                                                    <span className="text-[9px] text-slate-500">Chưa đủ</span>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-slate-800">
                                        {formatCurrency(c.giaTriHD)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-slate-800">
                                        {formatCurrency(c.giaTriQT)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-emerald-700">
                                        {formatCurrency(c.daThu)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono text-sm font-semibold text-rose-700">
                                        {formatCurrency(c.conPhaiThu)}
                                    </td>
                                    <td className="px-4 py-4 text-center text-xs text-slate-600 font-medium">
                                        {c.ngayUpdate
                                            ? `Vào xem / sửa gần nhất: ${c.ngayUpdate}`
                                            : 'Chưa cập nhật'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                                            </div>
                                            <span className="text-[10px] font-bold text-blue-700">{progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button type="button" onClick={() => openChiTietHopDong(c)} className="p-1.5 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50">
                                                <Eye size={14} />
                                            </button>
                                            <button type="button" onClick={() => openThemHopDong(c)} className="p-1.5 rounded-md text-slate-500 hover:text-amber-700 hover:bg-amber-50">
                                                <Edit size={14} />
                                            </button>
                                            <button type="button" onClick={() => handleExportGoogleDocs(c, group.projectName)} className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50">
                                                <FileText size={14} />
                                            </button>
                                            <button type="button" onClick={() => openDelete({ id: c.id, uuid: c.uuid, soHopDong: c.soHopDong })} className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>

                <div className="px-6 py-4 bg-slate-50 flex flex-col gap-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <p>
                            Hiển thị{' '}
                            <span className="font-bold text-slate-800">
                                {pageStart} – {pageEnd}
                            </span>{' '}
                            của <span className="font-bold text-slate-800">{totalContracts}</span> hợp đồng
                        </p>
                        <label className="flex items-center gap-2 text-slate-600">
                            <span className="whitespace-nowrap">Số dòng / trang</span>
                            <select
                                value={pageSize}
                                onChange={(event) => setPageSize(Number(event.target.value))}
                                disabled={isLoading}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
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
                            disabled={page <= 1 || isLoading}
                            onClick={() => setPage(1)}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang đầu"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            type="button"
                            disabled={page <= 1 || isLoading}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang trước"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {visiblePages.map((pageNumber, index) =>
                            pageNumber === 'ellipsis' ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-1 text-sm font-semibold text-slate-400"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    disabled={isLoading}
                                    onClick={() => setPage(pageNumber)}
                                    className={cn(
                                        'h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition-colors disabled:opacity-50',
                                        page === pageNumber
                                            ? 'bg-[#004bcb] text-white shadow-sm'
                                            : 'border border-slate-300 bg-white text-slate-600 hover:bg-white',
                                    )}
                                >
                                    {pageNumber}
                                </button>
                            ),
                        )}
                        <button
                            type="button"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang sau"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => setPage(totalPages)}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang cuối"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
