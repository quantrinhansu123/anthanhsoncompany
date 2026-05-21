import React, { useEffect, useState, useMemo, useRef, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, FolderOpen, PlusCircle, User, CheckCircle, BarChart3, Briefcase, Calendar, Loader2, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw } from 'lucide-react';
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
    ExcelColumnDef,
    parseExcelDate,
    parseMoneyVi,
    cleanString,
    normalizeKey,
} from '../../lib/excelTableTools';
import { cn } from '../../lib/utils';
import { PAGE_SIZE_OPTIONS, buildVisiblePages } from '../../lib/tablePagination';

type HopDongTienDo = 'Đang thực hiện' | 'Hoàn thành';

const HOP_DONG_TIEN_DO_OPTIONS: HopDongTienDo[] = ['Đang thực hiện', 'Hoàn thành'];

const HOP_DONG_MONTH_QUICK = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Tháng ${i + 1}`,
}));

function formatLocalDateIso(year: number, month1: number, day: number): string {
    return `${year}-${String(month1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Tháng 1–12: ngày đầu tháng → ngày cuối tháng (theo giờ máy, tránh lệch UTC của toISOString). */
function hopDongMonthRangeIso(month: number, year: number): { from: string; to: string } {
    const lastDay = new Date(year, month, 0).getDate();
    return {
        from: formatLocalDateIso(year, month, 1),
        to: formatLocalDateIso(year, month, lastDay),
    };
}

function buildHopDongFilterYears(anchorYear: number, span = 8): number[] {
    const years: number[] = [];
    for (let y = anchorYear - span; y <= anchorYear + 1; y += 1) {
        years.push(y);
    }
    return years;
}

function normalizeHopDongTienDo(raw: string | null | undefined): HopDongTienDo {
    const t = String(raw ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase();
    if (
        t === 'hoàn thành' ||
        t === 'hoan thanh' ||
        t.includes('hoàn thành') ||
        t === 'đã xong' ||
        t === 'da xong'
    ) {
        return 'Hoàn thành';
    }
    return 'Đang thực hiện';
}

function hopDongTienDoSelectClass(value: HopDongTienDo): string {
    return value === 'Hoàn thành'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-blue-200 bg-blue-50 text-blue-800';
}

function hopDongRowSelectId(c: { uuid?: string; hopDongRowId?: string }): string {
    return String(c.hopDongRowId ?? c.uuid ?? '').trim();
}

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
    trangThai: HopDongTienDo;
    /** PK bảng hop_dong — dùng khi xóa (khác id logic / thu_chi). */
    hopDongRowId?: string;
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

function normalizeHopDongCustomerName(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Giá trị `ten_khach_hang` / `customer_id` dạng mã số — không dùng làm nhãn cột Khách hàng. */
function isHopDongKhachHangIdLike(value: string): boolean {
    const s = value.trim();
    if (!s) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
    if (/^[0-9a-f]{8}$/i.test(s)) return true;
    if (/^\d{6,}$/.test(s)) return true;
    return false;
}

type HopDongKhachDisplayInput = {
    customerName?: string | null;
    tenDayDuChuDauTu?: string | null;
    projectCustomerName?: string | null;
    projectTenKhachHang?: string | null;
};

/** Cùng thứ tự ưu tiên với cột «Khách hàng» trên bảng HĐ. */
function resolveHopDongKhachHangDisplay(input: HopDongKhachDisplayInput): string {
    const cn = String(input.customerName ?? '').trim();
    if (cn && !isHopDongKhachHangIdLike(cn)) return cn;

    const cdt = String(input.tenDayDuChuDauTu ?? '').trim();
    if (cdt) return cdt;

    const pcn = String(input.projectCustomerName ?? '').trim();
    if (pcn && !isHopDongKhachHangIdLike(pcn)) return pcn;

    const tk = String(input.projectTenKhachHang ?? '').trim();
    if (tk && !isHopDongKhachHangIdLike(tk)) return tk;

    if (cn) return cn;
    return '';
}

function hopDongKhachHangNameKey(display: string): string {
    const n = normalizeHopDongCustomerName(display);
    return n ? `name:${n}` : 'empty:';
}

function findHopDongProjectMeta(
    projectsMeta: ProjectMetaRow[],
    duAnId?: string | null,
    projectName?: string | null,
): ProjectMetaRow | undefined {
    const du = duAnId != null ? String(duAnId).trim() : '';
    if (du) {
        const pm = projectsMeta.find((p) => String(p.id) === du);
        if (pm) return pm;
    }
    const pn = (projectName || '').trim();
    if (!pn) return undefined;
    return projectsMeta.find((p) => (p.ten_du_an || '').trim() === pn);
}

function resolveHopDongKhachHangDisplayFromContract(
    row: Pick<ContractRow, 'customer_name' | 'ten_day_du_chu_dau_tu' | 'du_an_id' | 'project_name'>,
    projectsMeta: ProjectMetaRow[],
): string {
    const pm = findHopDongProjectMeta(projectsMeta, row.du_an_id, row.project_name);
    return resolveHopDongKhachHangDisplay({
        customerName: row.customer_name,
        tenDayDuChuDauTu: row.ten_day_du_chu_dau_tu,
        projectCustomerName: pm?.customer_name,
        projectTenKhachHang: pm?.ten_khach_hang,
    });
}

function resolveHopDongKhachHangDisplayFromGroup(
    group: HopDongKhachGroupRef,
    projectsMeta: ProjectMetaRow[],
): string {
    const pm = findHopDongProjectMeta(projectsMeta, group.duAnId, group.projectName);
    return resolveHopDongKhachHangDisplay({
        customerName: group.customerLabel,
        projectCustomerName: pm?.customer_name,
        projectTenKhachHang: pm?.ten_khach_hang,
    });
}

type HopDongKhachFilterOption = { key: string; label: string };

/** Gợi ý lọc khách: mọi HĐ khớp bộ lọc bảng, tên = cột «Khách hàng». */
function buildHopDongKhachOptionsFromContractRows(
    rows: ContractRow[],
    projectsMeta: ProjectMetaRow[],
    scope: {
        filterFromUrl?: string | null;
        filterTrangThai?: '' | HopDongTienDo;
    },
): HopDongKhachFilterOption[] {
    const map = new Map<string, string>();
    const projectFilter = scope.filterFromUrl?.trim() || '';

    for (const row of rows) {
        if (projectFilter && (row.project_name || '').trim() !== projectFilter) continue;
        if (
            scope.filterTrangThai &&
            normalizeHopDongTienDo(row.trang_thai) !== scope.filterTrangThai
        ) {
            continue;
        }
        const label = resolveHopDongKhachHangDisplayFromContract(row, projectsMeta);
        if (!label) continue;
        const key = hopDongKhachHangNameKey(label);
        if (!map.has(key)) map.set(key, label);
    }

    return Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

/** Gợi ý từ nhóm HĐ đang hiển thị — khớp cột «Khách hàng» trên bảng. */
function buildHopDongKhachOptionsFromProjectGroups(
    groups: ProjectGroup[],
    projectsMeta: ProjectMetaRow[],
): HopDongKhachFilterOption[] {
    const map = new Map<string, string>();
    for (const g of groups) {
        const label = resolveHopDongKhachHangDisplayFromGroup(g, projectsMeta);
        if (!label) continue;
        const key = hopDongKhachHangNameKey(label);
        if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

function mergeHopDongKhachFilterOptions(
    ...lists: HopDongKhachFilterOption[][]
): HopDongKhachFilterOption[] {
    const map = new Map<string, string>();
    for (const list of lists) {
        for (const { key, label } of list) {
            const L = label.trim();
            if (!map.has(key) || (L && map.get(key) === '—')) map.set(key, L || '—');
        }
    }
    return Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

/** API `/contracts` không page trả về mảng thuần, có page trả `{ data, total }`. */
function normalizeContractGetAllRows(res: unknown): ContractRow[] {
    if (Array.isArray(res)) return res as ContractRow[];
    if (res && typeof res === 'object' && Array.isArray((res as { data?: unknown }).data)) {
        return (res as { data: ContractRow[] }).data;
    }
    return [];
}

function hopDongProjectCustomerKey(p: ProjectMetaRow): string {
    const display = resolveHopDongKhachHangDisplay({
        projectCustomerName: p.customer_name,
        projectTenKhachHang: p.ten_khach_hang,
    });
    if (display) return hopDongKhachHangNameKey(display);
    const cid = String(p.customer_id ?? '').trim();
    if (cid) return `id:${cid}`;
    return 'empty:';
}

type HopDongKhachGroupRef = {
    duAnId?: string | null;
    customerLabel?: string | null;
    projectName: string;
};

function collectHopDongGroupCustomerKeys(
    group: HopDongKhachGroupRef,
    projectsMeta: ProjectMetaRow[],
): string[] {
    const keys = new Set<string>();
    keys.add(hopDongGroupCustomerKey(group, projectsMeta));

    const du = group.duAnId ? String(group.duAnId).trim() : '';
    if (du) {
        const pm = projectsMeta.find((p) => String(p.id) === du);
        if (pm) keys.add(hopDongProjectCustomerKey(pm));
    }
    const byName = projectsMeta.find(
        (p) => (p.ten_du_an || '').trim() === (group.projectName || '').trim(),
    );
    if (byName) keys.add(hopDongProjectCustomerKey(byName));

    const display = resolveHopDongKhachHangDisplayFromGroup(group, projectsMeta);
    if (display) keys.add(hopDongKhachHangNameKey(display));

    for (const k of [...keys]) {
        if (!k.startsWith('id:')) continue;
        const cid = k.slice(3);
        const pm = projectsMeta.find((p) => String(p.customer_id ?? '').trim() === cid);
        if (!pm) continue;
        keys.add(hopDongProjectCustomerKey(pm));
        const label = resolveHopDongKhachHangDisplay({
            projectCustomerName: pm.customer_name,
            projectTenKhachHang: pm.ten_khach_hang,
        });
        if (label) keys.add(hopDongKhachHangNameKey(label));
    }

    return [...keys];
}

/** Khớp lọc khách: cùng id KH, cùng tên chuẩn hóa, hoặc trùng một trong các khóa suy ra từ dự án / nhãn HĐ. */
function hopDongKhachFilterMatches(
    selectedKeys: string[],
    group: HopDongKhachGroupRef,
    projectsMeta: ProjectMetaRow[],
): boolean {
    if (isHopDongKhachFilterNone(selectedKeys)) return false;
    if (isHopDongKhachFilterAll(selectedKeys)) return true;

    const groupKeys = collectHopDongGroupCustomerKeys(group, projectsMeta);
    if (groupKeys.some((gk) => selectedKeys.includes(gk))) return true;

    const selectedIds = new Set<string>();
    const selectedNames = new Set<string>();
    let selectedEmpty = false;
    for (const sk of selectedKeys) {
        if (sk === 'empty:') {
            selectedEmpty = true;
            continue;
        }
        if (sk.startsWith('id:')) selectedIds.add(sk.slice(3));
        else if (sk.startsWith('name:')) selectedNames.add(sk.slice(5));
    }

    for (const gid of selectedIds) {
        if (groupKeys.some((gk) => gk === `id:${gid}`)) return true;
        const pm = projectsMeta.find((p) => String(p.customer_id ?? '').trim() === gid);
        if (!pm) continue;
        const pn = normalizeHopDongCustomerName(
            resolveHopDongKhachHangDisplay({
                projectCustomerName: pm.customer_name,
                projectTenKhachHang: pm.ten_khach_hang,
            }),
        );
        const gl = normalizeHopDongCustomerName(resolveHopDongKhachHangDisplayFromGroup(group, projectsMeta));
        if (pn && gl && pn === gl) return true;
    }

    for (const gn of selectedNames) {
        if (groupKeys.some((gk) => gk === `name:${gn}`)) return true;
        const gl = normalizeHopDongCustomerName(resolveHopDongKhachHangDisplayFromGroup(group, projectsMeta));
        if (gl && gl === gn) return true;
    }

    if (selectedEmpty && groupKeys.some((gk) => gk === 'empty:')) return true;

    return false;
}

/** CĐT nợ = Giá xuất HĐ − (CĐT thanh toán + CĐT tạm ứng). Mẫu Excel HĐ không có cột thu — mặc định 0; nhập thu qua module Thu chi. */
function recalcHopDongThuTuExcel(row: {
    gia_tri_qt?: number;
    cdt_thanh_toan?: number;
    cdt_tam_ung?: number;
    cdt_no?: number;
    da_thu?: number;
    con_phai_thu?: number;
}) {
    const giaQt = Number(row.gia_tri_qt) || 0;
    const thanhToan = Number(row.cdt_thanh_toan) || 0;
    const tamUng = Number(row.cdt_tam_ung) || 0;
    row.cdt_thanh_toan = thanhToan;
    row.cdt_tam_ung = tamUng;
    const daThu = thanhToan + tamUng;
    row.da_thu = daThu;
    const cdtNo = Math.max(0, giaQt - daThu);
    row.cdt_no = cdtNo;
    row.con_phai_thu = cdtNo;
}

function splitNgayKyHdForExcel(ngayKyHd?: string | null): { ngay: string; nam: string } {
    const iso = String(ngayKyHd ?? '').trim().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return { ngay: '', nam: '' };
    return { ngay: `${m[3]}/${m[2]}`, nam: m[1] };
}

function resolveHopDongTenKhachHang(
    c: ContractRow,
    projectsMeta?: ProjectMetaRow[],
): string {
    if (!projectsMeta?.length) {
        return resolveHopDongKhachHangDisplay({
            customerName: c.customer_name,
            tenDayDuChuDauTu: c.ten_day_du_chu_dau_tu,
        });
    }
    return resolveHopDongKhachHangDisplayFromContract(c, projectsMeta);
}

function excelRowTenKhachHang(r: Record<string, string>): string {
    return cleanString(r.ten_khach_hang || r.thong_tin_kh || '');
}

function mapHopDongContractToExcelRow(
    c: ContractRow,
    index: number,
    projectsMeta?: ProjectMetaRow[],
): Record<string, unknown> {
    const { ngay, nam } = splitNgayKyHdForExcel(c.ngay_ky_hd);
    return {
        tt: index + 1,
        so_ho_plhd: c.so_hop_dong ?? '',
        ngay_ky_hd: ngay,
        nam_ky_hd: nam,
        ten_khach_hang: resolveHopDongTenKhachHang(c, projectsMeta),
        ten_da: c.project_name ?? '',
        ten_goi_thau: c.ten_goi_thau ?? '',
        loai_dv: c.loai_dich_vu ?? '',
        gia_hd_plhd: c.gia_tri_hd ?? '',
        gia_xuat_hd: c.gia_tri_qt ?? '',
        thong_tin_kh: c.ten_day_du_chu_dau_tu ?? '',
        mst_kh: c.mst ?? '',
        so_hd_xuat: '',
    };
}

const HOP_DONG_EXCEL_COLUMNS: ExcelColumnDef[] = [
    { key: 'tt', header: 'TT', example: '1' },
    {
        key: 'so_ho_plhd',
        header: 'Số HĐ & PLHĐ',
        example: 'HĐ-01/2025',
        matchHeaders: ['So HD & PLHD', 'Số hợp đồng', 'So hop dong', 'Số HĐ và PLHĐ'],
    },
    { key: 'ngay_ky_hd', header: 'Ngày', example: '15/01', matchHeaders: ['Ngay ky HD', 'Ngày ký'] },
    { key: 'nam_ky_hd', header: 'Năm', example: '2025', matchHeaders: ['Nam ky HD'] },
    {
        key: 'ten_khach_hang',
        header: 'Tên Khách hàng',
        example: 'Công ty ABC',
        matchHeaders: ['Ten khach hang', 'Tên KH', 'Khách hàng', 'customer_name'],
    },
    {
        key: 'ten_da',
        header: 'Tên DA',
        example: 'Khớp tên dự án hệ thống',
        matchHeaders: ['Ten DA', 'Tên dự án', 'Ten du an'],
    },
    {
        key: 'ten_goi_thau',
        header: 'Tên gói thầu',
        example: 'Gói thi công',
        matchHeaders: ['Ten goi thau', 'Tên gói th'],
    },
    { key: 'loai_dv', header: 'Loại DV', example: 'Tư vấn', matchHeaders: ['Loai DV', 'Loại dịch vụ'] },
    {
        key: 'gia_hd_plhd',
        header: 'Giá HĐ/PLHĐ',
        example: '1000000000',
        matchHeaders: ['Gia HD/PLHD', 'Giá trị HĐ', 'gia_tri_hd'],
    },
    {
        key: 'gia_xuat_hd',
        header: 'Giá xuất HĐ',
        example: '1000000000',
        matchHeaders: ['Gia xuat HD', 'Giá xuất hóa đơn', 'gia_tri_qt'],
    },
    {
        key: 'thong_tin_kh',
        header: 'Thông tin KH',
        example: 'Công ty ABC',
        matchHeaders: ['Thong tin KH', 'Thông tin chủ đầu tư', 'ten_day_du_chu_dau_tu'],
    },
    { key: 'mst_kh', header: 'MST KH', example: '0123456789', matchHeaders: ['MST', 'Ma so thue'] },
    {
        key: 'so_hd_xuat',
        header: 'Số HĐ',
        example: '0000123',
        matchHeaders: ['So HD xuat', 'Số hóa đơn'],
    },
];

/** Cột chỉ dùng khi nhập file Excel cũ (nhiều cột) — không có trong mẫu tải về. */
const HOP_DONG_EXCEL_IMPORT_EXTRA: ExcelColumnDef[] = [
    { key: 'cdt_thanh_toan', header: 'CĐT thanh toán', matchHeaders: ['CDT thanh toan'] },
    { key: 'cdt_tam_ung', header: 'CĐT tạm ứng', matchHeaders: ['CDT tam ung', 'CĐT tam ứng'] },
    {
        key: 'noi_dung_xuat_hoa_don',
        header: 'Nội dung xuất hóa đơn',
        matchHeaders: ['Noi dung xuat hoa don'],
    },
];

const HOP_DONG_EXCEL_PARSE_COLUMNS: ExcelColumnDef[] = [
    ...HOP_DONG_EXCEL_COLUMNS,
    ...HOP_DONG_EXCEL_IMPORT_EXTRA,
];

function findContractRowForExcelImport(
    cache: ContractRow[],
    soHopDong: string,
    duAnId: string | null | undefined,
    tenGoiThau?: string,
): ContractRow | undefined {
    const normSo = soHopDong.trim().toLowerCase();
    const du = duAnId != null && String(duAnId).trim() !== '' ? String(duAnId).trim() : '';
    const normGoi = normalizeKey(tenGoiThau || '');
    const hits = cache.filter((c) => (c.so_hop_dong || '').trim().toLowerCase() === normSo);
    if (hits.length === 0) return undefined;
    const byDu = du ? hits.filter((c) => String(c.du_an_id || '') === du) : hits;
    const pool = byDu.length > 0 ? byDu : hits;
    if (normGoi) {
        const byGoi = pool.find(
            (c) => normalizeKey(c.ten_goi_thau || '') === normGoi,
        );
        if (byGoi) return byGoi;
    }
    return pool[pool.length - 1];
}

async function syncPhieuThuTuExcelHopDong(
    row: {
        so_hop_dong?: string;
        du_an_id?: string | null;
        project_name?: string | null;
        ten_goi_thau?: string | null;
        ngay_ky_hd?: string | null;
        cdt_thanh_toan?: number;
        cdt_tam_ung?: number;
    },
    cache: ContractRow[],
): Promise<void> {
    const soHd = (row.so_hop_dong || '').trim();
    if (!soHd) return;
    const contract = findContractRowForExcelImport(
        cache,
        soHd,
        row.du_an_id,
        row.ten_goi_thau,
    );
    if (!contract) return;
    const hopDongId = String(contract.hop_dong_row_id ?? contract.id ?? '').trim();
    if (!hopDongId) return;
    const ngay =
        (row.ngay_ky_hd && String(row.ngay_ky_hd).slice(0, 10)) ||
        new Date().toISOString().slice(0, 10);
    const tenDa = String(row.project_name || contract.project_name || '').trim();
    const tenGoi = String(row.ten_goi_thau || contract.ten_goi_thau || '').trim() || null;
    const duAnId = row.du_an_id ?? contract.du_an_id ?? null;
    const thanhToan = Number(row.cdt_thanh_toan) || 0;
    const tamUng = Number(row.cdt_tam_ung) || 0;
    const baseNoiDung = tenDa ? `Nhập Excel HĐ (${tenDa})` : 'Nhập Excel HĐ';
    if (thanhToan > 0) {
        await thuChiService.create({
            loai_phieu: 'Phiếu thu',
            so_tien: thanhToan,
            ngay,
            du_an_id: duAnId,
            hop_dong_id: hopDongId,
            noi_dung: `${baseNoiDung} — CĐT thanh toán`,
            tinh_trang_phieu: 'Thanh toán',
            hang_muc_thu: 'Thanh toán',
            ten_goi_thau: tenGoi,
        });
    }
    if (tamUng > 0) {
        await thuChiService.create({
            loai_phieu: 'Phiếu thu',
            so_tien: tamUng,
            ngay,
            du_an_id: duAnId,
            hop_dong_id: hopDongId,
            noi_dung: `${baseNoiDung} — CĐT tạm ứng`,
            tinh_trang_phieu: 'Tạm ứng',
            hang_muc_thu: 'Tạm ứng',
            ten_goi_thau: tenGoi,
        });
    }
}

function contractThuChiIdSet(contracts: ContractRow[]): Set<string> {
    const ids = new Set<string>();
    for (const c of contracts) {
        const rowPk = String(c.hop_dong_row_id ?? '').trim();
        const logical = String(c.id ?? '').trim();
        if (rowPk) ids.add(rowPk);
        if (logical) ids.add(logical);
    }
    return ids;
}

/** Tổng tiền theo map Thu chi: `hop_dong_id` có thể là PK `hop_dong` hoặc `contract_id`. */
function sumThuChiMapForHopDong(c: ContractRow, amountMap: Map<string, number>): number {
    const rowPk = c.hop_dong_row_id != null ? String(c.hop_dong_row_id).trim() : '';
    const logicalId = c.id != null ? String(c.id).trim() : '';
    const v1 = rowPk ? amountMap.get(rowPk) : undefined;
    const v2 = logicalId ? amountMap.get(logicalId) : undefined;
    if (v1 !== undefined) return v1;
    if (v2 !== undefined) return v2;
    return 0;
}

/** Khóa trùng đúng cột «Hợp đồng / Nội dung» trên bảng: dòng Số HĐ + dòng tên gói thầu. */
function hopDongHopDongNoiDungKey(
    soHopDong: string | null | undefined,
    tenGoiThau: string | null | undefined,
): string {
    return `${normalizeKey(soHopDong || '')}|${normalizeKey(tenGoiThau || '')}`;
}

function contractRowPk(row: ContractRow): string {
    return String(row.hop_dong_row_id ?? row.id ?? '').trim();
}

function contractRowPassesHopDongFilters(
    row: ContractRow,
    projectsMeta: ProjectMetaRow[],
    filters: {
        filterFromUrl: string | null;
        filterHopDongKhachKeys: string[];
        filterHopDongDuAnIds: string[];
        filterHopDongTrangThai: '' | HopDongTienDo;
    },
): boolean {
    if (filters.filterFromUrl && (row.project_name || '').trim() !== filters.filterFromUrl) {
        return false;
    }
    if (
        filters.filterHopDongTrangThai &&
        normalizeHopDongTienDo(row.trang_thai) !== filters.filterHopDongTrangThai
    ) {
        return false;
    }
    if (filters.filterHopDongDuAnIds.length > 0) {
        const pid =
            row.du_an_id != null
                ? String(row.du_an_id).trim()
                : projectsMeta.find((p) => (p.ten_du_an || '').trim() === (row.project_name || '').trim())
                      ?.id;
        if (!pid || !filters.filterHopDongDuAnIds.includes(String(pid))) return false;
    }
    if (isHopDongKhachFilterNone(filters.filterHopDongKhachKeys)) {
        return false;
    }
    if (isHopDongKhachFilterRestricted(filters.filterHopDongKhachKeys)) {
        if (
            !hopDongKhachFilterMatches(
                filters.filterHopDongKhachKeys,
                {
                    duAnId: row.du_an_id,
                    customerLabel: resolveHopDongKhachHangDisplayFromContract(row, projectsMeta) || null,
                    projectName: (row.project_name || '').trim(),
                },
                projectsMeta,
            )
        ) {
            return false;
        }
    }
    return true;
}

function computeHopDongDuplicateDeletes(rows: ContractRow[]): {
    toDeleteIds: string[];
    groupCount: number;
} {
    const groups = new Map<string, ContractRow[]>();
    for (const row of rows) {
        const key = hopDongHopDongNoiDungKey(row.so_hop_dong, row.ten_goi_thau);
        if (key === '|') continue;
        const list = groups.get(key) || [];
        list.push(row);
        groups.set(key, list);
    }

    const toDeleteIds: string[] = [];
    let groupCount = 0;

    for (const list of groups.values()) {
        if (list.length <= 1) continue;
        groupCount += 1;
        const sorted = [...list].sort((a, b) => {
            const ta = Date.parse(String(a.created_at || '')) || 0;
            const tb = Date.parse(String(b.created_at || '')) || 0;
            if (ta !== tb) return ta - tb;
            return contractRowPk(a).localeCompare(contractRowPk(b));
        });
        for (let i = 1; i < sorted.length; i++) {
            const id = contractRowPk(sorted[i]);
            if (id) toDeleteIds.push(id);
        }
    }

    return { toDeleteIds, groupCount };
}

function hopDongGroupCustomerKey(
    group: { duAnId?: string | null; customerLabel?: string | null; projectName: string },
    projectsMeta: ProjectMetaRow[],
): string {
    const display = resolveHopDongKhachHangDisplayFromGroup(group, projectsMeta);
    if (display) return hopDongKhachHangNameKey(display);
    const pm = findHopDongProjectMeta(projectsMeta, group.duAnId, group.projectName);
    if (pm) return hopDongProjectCustomerKey(pm);
    return 'empty:';
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

/** Phiếu thu tạm ứng — hạng mục thu hoặc tình trạng phiếu (dữ liệu Thu chi). */
function isThuChiTamUngRow(tc: ThuChiRow): boolean {
    if (tc.loai_phieu !== 'Phiếu thu') return false;
    if (isTamUngHangMucThu(tc.hang_muc_thu)) return true;
    const st = normalizeHangMucThuLabel(tc.tinh_trang_phieu);
    return st === 'tạm ứng' || st === 'tam ung';
}

/** Phiếu thu CĐT thanh toán — hạng mục thu hoặc tình trạng phiếu. */
function isThuChiThanhToanRow(tc: ThuChiRow): boolean {
    if (tc.loai_phieu !== 'Phiếu thu') return false;
    if (isThanhToanHangMucThu(tc.hang_muc_thu)) return true;
    const st = normalizeHangMucThuLabel(tc.tinh_trang_phieu);
    return st === 'thanh toán' || st === 'thanh toan';
}

/** Tổng «Đã thu» = cộng cột Số tiền khi Loại = Phiếu thu (giống trang Thu chi). */
function buildThuChiPhieuThuMap(rows: ThuChiRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const tc of rows) {
        if (tc.loai_phieu !== 'Phiếu thu') continue;
        const hid = tc.hop_dong_id != null ? String(tc.hop_dong_id).trim() : '';
        if (!hid) continue;
        const amount = Number(tc.so_tien) || 0;
        map.set(hid, (map.get(hid) || 0) + amount);
    }
    return map;
}

function isThanhToanHangMucThu(value: string | null | undefined): boolean {
    const normalized = normalizeHangMucThuLabel(value);
    return normalized === 'thanh toán' || normalized === 'thanh toan';
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

/** Chờ người dùng gõ xong rồi mới gọi API — tránh lag mỗi phím. */
const HOP_DONG_SEARCH_DEBOUNCE_MS = 320;

/** Bỏ tick «Tất cả khách hàng» — ẩn mọi HĐ cho đến khi chọn lại khách cụ thể. */
const HOP_DONG_KHACH_FILTER_NONE = '__hop_dong_khach_none__';

function isHopDongKhachFilterAll(keys: string[]): boolean {
    return keys.length === 0;
}

function isHopDongKhachFilterNone(keys: string[]): boolean {
    return keys.length === 1 && keys[0] === HOP_DONG_KHACH_FILTER_NONE;
}

function isHopDongKhachFilterRestricted(keys: string[]): boolean {
    return keys.length > 0 && !isHopDongKhachFilterNone(keys);
}

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
    const [isListFetching, setIsListFetching] = useState(false);
    const contractsFetchIdRef = useRef(0);
    const allThuChiRef = useRef<ThuChiRow[]>([]);
    const [totalGiaTriQT, setTotalGiaTriQT] = useState(0);
    const [totalDaThu, setTotalDaThu] = useState(0);
    const [deletingAllContracts, setDeletingAllContracts] = useState(false);
    const [allThuChi, setAllThuChi] = useState<ThuChiRow[]>([]);
    const [dongBoThuChiBusy, setDongBoThuChiBusy] = useState(false);

    /** Bộ lọc checkbox: khách + dự án (client-side trên trang hiện tại) */
    const [filterHopDongKhachKeys, setFilterHopDongKhachKeys] = useState<string[]>([]);
    const [hopDongKhachOptionsFetched, setHopDongKhachOptionsFetched] = useState<HopDongKhachFilterOption[]>(
        [],
    );
    const [khachFilterOptionsLoading, setKhachFilterOptionsLoading] = useState(false);
    const khachFilterOptionsFetchRef = useRef(0);
    const [filterHopDongDuAnIds, setFilterHopDongDuAnIds] = useState<string[]>([]);
    const [filterHopDongTrangThai, setFilterHopDongTrangThai] = useState<'' | HopDongTienDo>('');
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
    const [savingTienDoId, setSavingTienDoId] = useState<string | null>(null);
    const [selectedHopDongUuids, setSelectedHopDongUuids] = useState<string[]>([]);
    const [deletingSelectedHopDong, setDeletingSelectedHopDong] = useState(false);
    const [deletingDuplicateHopDong, setDeletingDuplicateHopDong] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [hopDongSortKey, setHopDongSortKey] = useState<HopDongSortKey | null>(null);
    const [hopDongSortDir, setHopDongSortDir] = useState<'asc' | 'desc'>('asc');

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [filterYear, setFilterYear] = useState(() => new Date().getFullYear());

    const hopDongFilterYearOptions = useMemo(() => {
        const base = buildHopDongFilterYears(new Date().getFullYear());
        if (!base.includes(filterYear)) {
            return [...base, filterYear].sort((a, b) => b - a);
        }
        return base;
    }, [filterYear]);

    const prevDebouncedSearchRef = useRef(debouncedSearch);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            const next = searchTerm.trim();
            if (prevDebouncedSearchRef.current !== next) {
                prevDebouncedSearchRef.current = next;
                setPage(1);
            }
            setDebouncedSearch(next);
        }, HOP_DONG_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const isSearchPending = searchTerm.trim() !== debouncedSearch;

    const [tasksByContract, setTasksByContract] = useState<Map<string, TaskRow[]>>(new Map());

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

    useEffect(() => {
        setPage(1);
    }, [dateFrom, dateTo]);

    useEffect(() => {
        setPage(1);
    }, [filterHopDongTrangThai]);

    useEffect(() => {
        setSelectedHopDongUuids([]);
    }, [
        page,
        pageSize,
        debouncedSearch,
        dateFrom,
        dateTo,
        filterHopDongTrangThai,
        filterHopDongKhachKeys,
        filterHopDongDuAnIds,
    ]);

    const applyHopDongMonthYearFilter = (month: string, year: number) => {
        const monthNum = Number(month);
        if (!monthNum || monthNum < 1 || monthNum > 12) return;
        const { from, to } = hopDongMonthRangeIso(monthNum, year);
        setSelectedMonth(month);
        setDateFrom(from);
        setDateTo(to);
    };

    const handleHopDongMonthSelect = (month: string) => {
        if (!month) {
            setSelectedMonth('');
            setDateFrom('');
            setDateTo('');
            return;
        }
        applyHopDongMonthYearFilter(month, filterYear);
    };

    const handleHopDongFilterYearChange = (yearStr: string) => {
        const year = Number(yearStr);
        if (!year || year < 1900 || year > 2100) return;
        setFilterYear(year);
        if (selectedMonth) {
            applyHopDongMonthYearFilter(selectedMonth, year);
        }
    };

    const clearHopDongDateFilters = () => {
        setSelectedMonth('');
        setDateFrom('');
        setDateTo('');
        setFilterYear(new Date().getFullYear());
    };

    const hopDongProjectOptions = useMemo(() => {
        let list = projectsMeta;
        if (isHopDongKhachFilterNone(filterHopDongKhachKeys)) {
            list = [];
        } else if (isHopDongKhachFilterRestricted(filterHopDongKhachKeys)) {
            const allow = new Set(filterHopDongKhachKeys);
            list = list.filter((p) => allow.has(hopDongProjectCustomerKey(p)));
        }
        return list
            .map((p) => ({ id: String(p.id), label: (p.ten_du_an || p.id).trim() || String(p.id) }))
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [projectsMeta, filterHopDongKhachKeys]);

    const hopDongProjectOptionsMatching = useMemo(() => {
        const q = hdDuAnFilterSearch.trim().toLowerCase();
        if (!q) return hopDongProjectOptions;
        return hopDongProjectOptions.filter(
            (o) => o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
        );
    }, [hopDongProjectOptions, hdDuAnFilterSearch]);

    const selectAllVisibleHopDongDuAn = () => {
        const ids = hopDongProjectOptionsMatching.map((o) => o.id);
        if (ids.length === 0) return;
        setFilterHopDongDuAnIds((prev) =>
            prev.length === 0 ? ids : Array.from(new Set([...prev, ...ids])),
        );
    };

    const allVisibleDuAnSelected =
        hopDongProjectOptionsMatching.length > 0 &&
        hopDongProjectOptionsMatching.every(
            (o) => filterHopDongDuAnIds.length > 0 && filterHopDongDuAnIds.includes(o.id),
        );

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
                    taskService.getAll(),
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

    // Thu chi — chỉ tải lại khi đồng bộ / import, không gắn vào mỗi lần gõ tìm kiếm
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const thuChiRows = await thuChiService.getAll();
                if (cancelled) return;
                allThuChiRef.current = thuChiRows;
                setAllThuChi(thuChiRows);
            } catch (error) {
                console.error('[HopDong] Error loading thu chi:', error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    // Gợi ý lọc khách: toàn bộ HĐ khớp bộ lọc bảng (không phân trang), cột «Khách hàng»
    useEffect(() => {
        const fetchId = ++khachFilterOptionsFetchRef.current;
        (async () => {
            try {
                setKhachFilterOptionsLoading(true);
                const res = await contractService.getAll({
                    search: debouncedSearch || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    trangThai: filterHopDongTrangThai || undefined,
                });
                if (fetchId !== khachFilterOptionsFetchRef.current) return;

                const rows = normalizeContractGetAllRows(res);
                setHopDongKhachOptionsFetched(
                    buildHopDongKhachOptionsFromContractRows(rows, projectsMeta, {
                        filterFromUrl,
                        filterTrangThai: filterHopDongTrangThai,
                    }),
                );
            } catch (error) {
                console.error('[HopDong] load khach filter options:', error);
                if (fetchId === khachFilterOptionsFetchRef.current) {
                    setHopDongKhachOptionsFetched([]);
                }
            } finally {
                if (fetchId === khachFilterOptionsFetchRef.current) {
                    setKhachFilterOptionsLoading(false);
                }
            }
        })();
    }, [
        debouncedSearch,
        dateFrom,
        dateTo,
        filterHopDongTrangThai,
        filterFromUrl,
        reloadKey,
        projectsMeta,
    ]);

    // Load paged contracts (tìm kiếm / lọc / phân trang)
    useEffect(() => {
        const fetchId = ++contractsFetchIdRef.current;
        (async () => {
            try {
                setIsListFetching(true);
                if (items.length === 0) setIsLoading(true);

                const response = await contractService.getAll({
                    page,
                    pageSize,
                    search: debouncedSearch || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    trangThai: filterHopDongTrangThai || undefined,
                });

                if (fetchId !== contractsFetchIdRef.current) return;

                const thuChiPhieuThuMap = buildThuChiPhieuThuMap(allThuChiRef.current);

                const contractRows = response.data || [];
                const total = response.total || 0;
                setTotalContracts(total);

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
                        resolveHopDongKhachHangDisplayFromContract(first, projectsMeta) || null;
                    return {
                    id: idCounter++,
                    projectName,
                    duAnId,
                    customerLabel,
                    contracts: contracts.map((c, idx) => {
                        const daThu = sumThuChiMapForHopDong(c, thuChiPhieuThuMap);
                        const giaTriQT = Number(c.gia_tri_qt || 0);
                        const loaiNs = normalizeNguongLoai(c.nguong_chi_nhan_su_loai);
                        const rawNguong = Number(c.nguong_chi_nhan_su ?? 0);
                        return {
                            id: idx + 1,
                            uuid: String(c.hop_dong_row_id ?? c.id ?? '').trim() || undefined,
                            hopDongRowId: String(c.hop_dong_row_id ?? c.id ?? '').trim() || undefined,
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
                            /** CĐT nợ = Giá xuất HĐ − Đã thu (tổng Phiếu thu Thu chi) */
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
                            trangThai: normalizeHopDongTienDo(c.trang_thai),
                        } as Contract;
                    }),
                };
                });

                setItems(projectGroups);
                setExpandedProjects(projectGroups.map(p => p.id));

                // Tổng QT / đã thu chỉ cho các HĐ trên trang hiện tại (tránh nhầm với toàn hệ thống khi phân trang)
                setTotalGiaTriQT(contractRows.reduce((s: number, c: any) => s + Number(c.gia_tri_qt || 0), 0));
                setTotalDaThu(
                    contractRows.reduce(
                        (s: number, c: ContractRow) =>
                            s + sumThuChiMapForHopDong(c, thuChiPhieuThuMap),
                        0,
                    ),
                );

            } catch (error) {
                console.error("[HopDong] Error loading paged data:", error);
            } finally {
                if (fetchId === contractsFetchIdRef.current) {
                    setIsListFetching(false);
                    setIsLoading(false);
                }
            }
        })();
    }, [page, pageSize, debouncedSearch, dateFrom, dateTo, filterHopDongTrangThai, reloadKey, projectsMeta]);

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

                if (isHopDongKhachFilterNone(filterHopDongKhachKeys)) {
                    return false;
                }
                if (
                    isHopDongKhachFilterRestricted(filterHopDongKhachKeys) &&
                    !hopDongKhachFilterMatches(filterHopDongKhachKeys, group, projectsMeta)
                ) {
                    return false;
                }
                if (filterHopDongDuAnIds.length > 0) {
                    const pid =
                        group.duAnId ||
                        projectsMeta.find((p) => p.ten_du_an === group.projectName)?.id;
                    if (!pid || !filterHopDongDuAnIds.includes(String(pid))) return false;
                }
                return true;
            })
            .map((project) => ({
                ...project,
                contracts: project.contracts.filter(
                    (c) => !filterHopDongTrangThai || c.trangThai === filterHopDongTrangThai,
                ),
            }))
            .filter((project) => project.contracts.length > 0);
    }, [items, filterFromUrl, filterHopDongKhachKeys, filterHopDongDuAnIds, filterHopDongTrangThai, projectsMeta]);

    /** Nhóm HĐ như bảng (trừ lọc khách) — nguồn gợi ý khớp cột «Khách hàng». */
    const itemsForKhachFilterOptions = useMemo(() => {
        return items
            .filter((group) => {
                if (filterFromUrl && group.projectName !== filterFromUrl) return false;
                if (filterHopDongDuAnIds.length > 0) {
                    const pid =
                        group.duAnId ||
                        projectsMeta.find((p) => p.ten_du_an === group.projectName)?.id;
                    if (!pid || !filterHopDongDuAnIds.includes(String(pid))) return false;
                }
                return true;
            })
            .map((project) => ({
                ...project,
                contracts: project.contracts.filter(
                    (c) => !filterHopDongTrangThai || c.trangThai === filterHopDongTrangThai,
                ),
            }))
            .filter((project) => project.contracts.length > 0);
    }, [items, filterFromUrl, filterHopDongDuAnIds, filterHopDongTrangThai, projectsMeta]);

    const hopDongKhachOptionsFromTable = useMemo(
        () => buildHopDongKhachOptionsFromProjectGroups(itemsForKhachFilterOptions, projectsMeta),
        [itemsForKhachFilterOptions, projectsMeta],
    );

    const hopDongCustomerOptions = useMemo(
        () => mergeHopDongKhachFilterOptions(hopDongKhachOptionsFromTable, hopDongKhachOptionsFetched),
        [hopDongKhachOptionsFromTable, hopDongKhachOptionsFetched],
    );

    useEffect(() => {
        if (
            isHopDongKhachFilterNone(filterHopDongKhachKeys) ||
            isHopDongKhachFilterAll(filterHopDongKhachKeys) ||
            hopDongCustomerOptions.length === 0
        ) {
            return;
        }
        const allow = new Set(hopDongCustomerOptions.map((o) => o.key));
        setFilterHopDongKhachKeys((prev) => {
            const next = prev.filter((k) => allow.has(k));
            return next.length === prev.length ? prev : next;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cắt key không còn trong gợi ý
    }, [hopDongCustomerOptions]);

    const hopDongKhachOptionsMatching = useMemo(() => {
        const q = hdKhachFilterSearch.trim().toLowerCase();
        if (!q) return hopDongCustomerOptions;
        return hopDongCustomerOptions.filter(
            (o) => o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q),
        );
    }, [hopDongCustomerOptions, hdKhachFilterSearch]);

    const selectAllVisibleHopDongKhach = () => {
        const keys = hopDongKhachOptionsMatching.map((o) => o.key);
        if (keys.length === 0) return;
        setFilterHopDongKhachKeys((prev) =>
            isHopDongKhachFilterAll(prev) || isHopDongKhachFilterNone(prev)
                ? keys
                : Array.from(new Set([...prev, ...keys])),
        );
    };

    const allVisibleKhachSelected =
        hopDongKhachOptionsMatching.length > 0 &&
        (isHopDongKhachFilterAll(filterHopDongKhachKeys) ||
            hopDongKhachOptionsMatching.every((o) => filterHopDongKhachKeys.includes(o.key)));

    /** Trì hoãn render bảng khi đang gõ / đang fetch — ô tìm vẫn mượt. */
    const deferredFilteredItems = useDeferredValue(filteredItems);

    const filteredContractIds = useMemo(() => {
        const ids = new Set<string>();
        for (const group of filteredItems) {
            for (const contract of group.contracts) {
                const id = hopDongRowSelectId(contract);
                if (id) ids.add(id);
            }
        }
        return ids;
    }, [filteredItems]);

    const totalTamUng = useMemo(() => {
        if (filteredContractIds.size === 0) return 0;
        return allThuChi.reduce((sum, tc) => {
            if (!isThuChiTamUngRow(tc)) return sum;
            const hid = String(tc.hop_dong_id || '').trim();
            if (!hid || !filteredContractIds.has(hid)) return sum;
            return sum + (Number(tc.so_tien) || 0);
        }, 0);
    }, [allThuChi, filteredContractIds]);

    const totalDaThanhToan = useMemo(() => {
        if (filteredContractIds.size === 0) return 0;
        return allThuChi.reduce((sum, tc) => {
            if (!isThuChiThanhToanRow(tc)) return sum;
            const hid = String(tc.hop_dong_id || '').trim();
            if (!hid || !filteredContractIds.has(hid)) return sum;
            return sum + (Number(tc.so_tien) || 0);
        }, 0);
    }, [allThuChi, filteredContractIds]);

    const { totalCongNo, demHopDongCongNo, demHopDongHienThi } = useMemo(() => {
        let sum = 0;
        let count = 0;
        let shown = 0;
        for (const group of filteredItems) {
            for (const c of group.contracts) {
                shown += 1;
                const no = Math.max(0, Number(c.conPhaiThu ?? 0));
                sum += no;
                if (no > 0) count += 1;
            }
        }
        return { totalCongNo: sum, demHopDongCongNo: count, demHopDongHienThi: shown };
    }, [filteredItems]);

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

    const patchContractTienDoLocal = (contractUuid: string, trangThai: HopDongTienDo) => {
        setItems((prev) =>
            prev.map((g) => ({
                ...g,
                contracts: g.contracts.map((row) =>
                    row.uuid === contractUuid ? { ...row, trangThai } : row,
                ),
            })),
        );
    };

    const handleHopDongTienDoChange = async (contract: Contract, value: HopDongTienDo) => {
        const id = String(contract.uuid || '').trim();
        if (!id) return;
        const prev = contract.trangThai;
        patchContractTienDoLocal(id, value);
        setSavingTienDoId(id);
        try {
            await contractService.update(id, { trang_thai: value });
        } catch (error) {
            console.error('[HopDong] update tien do:', error);
            patchContractTienDoLocal(id, prev);
            setToast({ message: 'Không lưu được tiến độ hợp đồng', type: 'warning' });
        } finally {
            setSavingTienDoId(null);
        }
    };

    const hopDongFlatRows = useMemo(() => {
        const rows: Array<{
            group: ProjectGroup;
            c: Contract;
            khachDisplay: string;
            duAnDisplay: string;
        }> = [];
        for (const group of deferredFilteredItems) {
            const pm = group.duAnId
                ? projectsMeta.find((p) => String(p.id) === String(group.duAnId))
                : projectsMeta.find((p) => p.ten_du_an === group.projectName);
            const khachDisplay = resolveHopDongKhachHangDisplayFromGroup(group, projectsMeta) || '—';
            const duAnDisplay = group.projectName || '—';
            for (const c of group.contracts) {
                rows.push({ group, c, khachDisplay, duAnDisplay });
            }
        }
        return rows;
    }, [deferredFilteredItems, projectsMeta]);

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
                    cmp = a.c.trangThai.localeCompare(b.c.trangThai, 'vi');
                    break;
                default:
                    return 0;
            }
            return mul * cmp;
        });
        return arr;
    }, [hopDongFlatRows, hopDongSortKey, hopDongSortDir, tasksByContract]);

    const selectableHopDongRows = useMemo(
        () => sortedHopDongRows.filter(({ c }) => hopDongRowSelectId(c)),
        [sortedHopDongRows],
    );

    const selectedHopDongInView = useMemo(
        () =>
            selectableHopDongRows
                .map(({ c }) => hopDongRowSelectId(c))
                .filter((id) => selectedHopDongUuids.includes(id)),
        [selectableHopDongRows, selectedHopDongUuids],
    );

    const isAllHopDongRowsSelected =
        selectableHopDongRows.length > 0 &&
        selectableHopDongRows.every(({ c }) =>
            selectedHopDongUuids.includes(hopDongRowSelectId(c)),
        );

    const toggleSelectAllHopDongRows = () => {
        const viewIds = selectableHopDongRows.map(({ c }) => hopDongRowSelectId(c));
        if (isAllHopDongRowsSelected) {
            setSelectedHopDongUuids((prev) => prev.filter((id) => !viewIds.includes(id)));
        } else {
            setSelectedHopDongUuids((prev) => Array.from(new Set([...prev, ...viewIds])));
        }
    };

    const toggleHopDongRowSelected = (c: Contract) => {
        const id = hopDongRowSelectId(c);
        if (!id) return;
        setSelectedHopDongUuids((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleDongBoThuChi = async () => {
        if (isLoading || dongBoThuChiBusy) return;
        setDongBoThuChiBusy(true);
        try {
            const [thuChiRows, res] = await Promise.all([
                thuChiService.getAll(),
                contractService.getAll({
                    search: debouncedSearch || undefined,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                    trangThai: filterHopDongTrangThai || undefined,
                }),
            ]);
            allThuChiRef.current = thuChiRows;
            setAllThuChi(thuChiRows);

            const contracts = normalizeContractGetAllRows(res).filter((row) =>
                contractRowPassesHopDongFilters(row, projectsMeta, {
                    filterFromUrl,
                    filterHopDongKhachKeys,
                    filterHopDongDuAnIds,
                    filterHopDongTrangThai,
                }),
            );
            const thuChiIds = contractThuChiIdSet(contracts);
            const phieuThuMap = buildThuChiPhieuThuMap(thuChiRows);

            let tongDaThu = 0;
            let tongQt = 0;
            for (const c of contracts) {
                tongDaThu += sumThuChiMapForHopDong(c, phieuThuMap);
                tongQt += Number(c.gia_tri_qt || 0);
            }

            let phieuThuCount = 0;
            let tongTamUng = 0;
            for (const tc of thuChiRows) {
                if (tc.loai_phieu !== 'Phiếu thu') continue;
                const hid = String(tc.hop_dong_id || '').trim();
                if (!hid || !thuChiIds.has(hid)) continue;
                phieuThuCount += 1;
                const amount = Number(tc.so_tien) || 0;
                if (isThuChiTamUngRow(tc)) tongTamUng += amount;
            }

            const tongCongNo = Math.max(0, tongQt - tongDaThu);
            setReloadKey((k) => k + 1);
            setToast({
                type: 'success',
                message:
                    `Đã đồng bộ Thu chi — ${contracts.length} HĐ: Đã thu ${formatCurrency(tongDaThu)} đ ` +
                    `(${phieuThuCount} phiếu thu), Tạm ứng ${formatCurrency(tongTamUng)} đ, ` +
                    `CĐT nợ ${formatCurrency(tongCongNo)} đ.`,
            });
        } catch (e: unknown) {
            setToast({
                type: 'warning',
                message: e instanceof Error ? e.message : 'Không đồng bộ được dữ liệu Thu chi.',
            });
        } finally {
            setDongBoThuChiBusy(false);
        }
    };

    const handleDeleteDuplicateHopDong = async () => {
        if (isLoading || deletingDuplicateHopDong || deletingSelectedHopDong) return;
        setDeletingDuplicateHopDong(true);
        try {
            const res = await contractService.getAll({
                search: debouncedSearch || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                trangThai: filterHopDongTrangThai || undefined,
            });
            const allRows = normalizeContractGetAllRows(res).filter((row) =>
                contractRowPassesHopDongFilters(row, projectsMeta, {
                    filterFromUrl,
                    filterHopDongKhachKeys,
                    filterHopDongDuAnIds,
                    filterHopDongTrangThai,
                }),
            );
            const { toDeleteIds, groupCount } = computeHopDongDuplicateDeletes(allRows);

            if (toDeleteIds.length === 0) {
                setToast({
                    type: 'info',
                    message:
                        'Không có dòng trùng cột «Hợp đồng / Nội dung» (cùng Số HĐ và cùng tên gói thầu) trong bộ lọc hiện tại.',
                });
                return;
            }

            if (
                !window.confirm(
                    `Xóa ${toDeleteIds.length} hợp đồng trùng cột «Hợp đồng / Nội dung» (${groupCount} nhóm, giữ 1 bản)?`,
                )
            ) {
                return;
            }

            let failed = 0;
            const errors: string[] = [];
            for (const id of toDeleteIds) {
                try {
                    await contractService.delete(id);
                } catch (err: unknown) {
                    failed += 1;
                    const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
                    if (errors.length < 2) errors.push(msg);
                }
            }
            setSelectedHopDongUuids((prev) => prev.filter((id) => !toDeleteIds.includes(id)));
            setReloadKey((k) => k + 1);

            const ok = toDeleteIds.length - failed;
            if (failed > 0) {
                setToast({
                    type: 'warning',
                    message: `Đã xóa ${ok}/${toDeleteIds.length} bản ghi trùng. ${errors[0] ?? ''}`,
                });
            } else {
                setToast({
                    type: 'success',
                    message: `Đã xóa ${ok} hợp đồng trùng (${groupCount} nhóm).`,
                });
            }
        } catch (e: unknown) {
            setToast({
                type: 'warning',
                message: e instanceof Error ? e.message : 'Không quét được hợp đồng trùng.',
            });
        } finally {
            setDeletingDuplicateHopDong(false);
        }
    };

    const handleDeleteSelectedHopDong = async () => {
        const ids = [...selectedHopDongInView];
        if (ids.length === 0) return;
        if (
            !window.confirm(
                `Xóa ${ids.length} hợp đồng đã chọn trên trang hiện tại? Hành động không hoàn tác.`,
            )
        ) {
            return;
        }
        setDeletingSelectedHopDong(true);
        let failed = 0;
        const errors: string[] = [];
        for (const id of ids) {
            try {
                await contractService.delete(id);
            } catch (err: unknown) {
                failed += 1;
                const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
                if (errors.length < 2) errors.push(msg);
            }
        }
        setSelectedHopDongUuids((prev) => prev.filter((id) => !ids.includes(id)));
        setDeletingSelectedHopDong(false);
        setReloadKey((k) => k + 1);
        if (failed > 0 && failed < ids.length) {
            setToast({
                type: 'warning',
                message: `Đã xóa ${ids.length - failed}/${ids.length} hợp đồng. ${errors[0] ?? ''}`,
            });
        } else if (failed === ids.length) {
            setToast({
                type: 'warning',
                message: errors[0] || 'Không xóa được hợp đồng đã chọn. Kiểm tra server đang chạy.',
            });
        } else {
            setToast({ type: 'success', message: `Đã xóa ${ids.length} hợp đồng.` });
        }
    };

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

            <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                <div className="bg-[#283044] text-white p-3 rounded-lg shadow-sm min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-white/70 mb-0.5 leading-tight">
                        Tổng hợp đồng
                    </p>
                    <p className="text-xl font-extrabold tabular-nums leading-tight">{totalContracts}</p>
                    {dateFrom || dateTo ? (
                        <p className="text-[9px] text-white/60 mt-1 leading-snug">Lọc theo ngày ký HĐ</p>
                    ) : null}
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 font-semibold leading-tight">
                        Tổng quyết toán
                    </p>
                    <p
                        className="text-lg font-extrabold text-slate-900 tabular-nums leading-tight truncate"
                        title={`${formatCurrency(totalGiaTriQT)} đ`}
                    >
                        {formatCurrency(totalGiaTriQT)} đ
                    </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 font-semibold leading-tight">
                        Đã thu
                    </p>
                    <p
                        className="text-lg font-extrabold text-emerald-700 tabular-nums leading-tight truncate"
                        title={`${formatCurrency(totalDaThu)} đ`}
                    >
                        {formatCurrency(totalDaThu)} đ
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-2">
                        Tổng Số tiền — Loại Phiếu thu (Thu chi)
                    </p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 font-semibold leading-tight">
                        Tạm ứng
                    </p>
                    <p
                        className="text-lg font-extrabold text-amber-700 tabular-nums leading-tight truncate"
                        title={`${formatCurrency(totalTamUng)} đ`}
                    >
                        {formatCurrency(totalTamUng)} đ
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-2">Hạng mục thu = Tạm ứng</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 font-semibold leading-tight">
                        Đã thanh toán
                    </p>
                    <p
                        className="text-lg font-extrabold text-sky-700 tabular-nums leading-tight truncate"
                        title={`${formatCurrency(totalDaThanhToan)} đ`}
                    >
                        {formatCurrency(totalDaThanhToan)} đ
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-2">Hạng mục thu = Thanh toán</p>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-rose-200 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5 font-semibold leading-tight">
                        CĐT nợ
                    </p>
                    <p
                        className="text-lg font-extrabold text-rose-700 tabular-nums leading-tight truncate"
                        title={`${formatCurrency(totalCongNo)} đ`}
                    >
                        {formatCurrency(totalCongNo)} đ
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-2">
                        Giá xuất HĐ − (TT + Tạm ứng)
                    </p>
                    <p className="text-[9px] text-slate-500 leading-snug line-clamp-2">
                        {demHopDongCongNo} HĐ còn nợ
                        {demHopDongHienThi > 0 ? ` / ${demHopDongHienThi} HĐ` : ''}
                    </p>
                </div>
            </section>

            <section className="bg-[#f2f3ff] rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <div className="relative w-full max-w-md min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm tên khách hàng, tên dự án…"
                            className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-full text-sm"
                            aria-busy={isSearchPending || isListFetching}
                        />
                        {isSearchPending || isListFetching ? (
                            <Loader2
                                size={16}
                                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#004bcb]"
                                aria-hidden
                            />
                        ) : null}
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
                                {isHopDongKhachFilterAll(filterHopDongKhachKeys)
                                    ? 'Tất cả khách hàng'
                                    : isHopDongKhachFilterNone(filterHopDongKhachKeys)
                                      ? 'Chưa chọn khách hàng'
                                      : filterHopDongKhachKeys.length === 1
                                        ? hopDongCustomerOptions.find(
                                              (x) => x.key === filterHopDongKhachKeys[0],
                                          )?.label || '1 khách'
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
                                    {hdKhachFilterSearch.trim() &&
                                    hopDongKhachOptionsMatching.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const visible = new Set(
                                                    hopDongKhachOptionsMatching.map((o) => o.key),
                                                );
                                                if (allVisibleKhachSelected) {
                                                    setFilterHopDongKhachKeys((prev) => {
                                                        if (isHopDongKhachFilterAll(prev)) {
                                                            const rest = hopDongCustomerOptions
                                                                .map((o) => o.key)
                                                                .filter((k) => !visible.has(k));
                                                            return rest.length === 0
                                                                ? [HOP_DONG_KHACH_FILTER_NONE]
                                                                : rest;
                                                        }
                                                        const next = prev.filter(
                                                            (k) => !visible.has(k),
                                                        );
                                                        return next.length === 0
                                                            ? [HOP_DONG_KHACH_FILTER_NONE]
                                                            : next;
                                                    });
                                                } else {
                                                    selectAllVisibleHopDongKhach();
                                                }
                                            }}
                                            className="mt-2 w-full rounded-md border border-[#004bcb]/30 bg-[#004bcb]/5 px-2 py-1.5 text-[11px] font-bold text-[#004bcb] hover:bg-[#004bcb]/10"
                                        >
                                            {allVisibleKhachSelected
                                                ? `Bỏ chọn ${hopDongKhachOptionsMatching.length} kết quả`
                                                : `Chọn tất cả đang hiển thị (${hopDongKhachOptionsMatching.length})`}
                                        </button>
                                    ) : null}
                                </div>
                                <div className="max-h-[min(12rem,40vh)] min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                                        <input
                                            type="checkbox"
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                            checked={isHopDongKhachFilterAll(filterHopDongKhachKeys)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFilterHopDongKhachKeys([]);
                                                } else {
                                                    setFilterHopDongKhachKeys([
                                                        HOP_DONG_KHACH_FILTER_NONE,
                                                    ]);
                                                }
                                            }}
                                        />
                                        Tất cả khách hàng
                                    </label>
                                    <div className="mx-2 border-t border-slate-200" />
                                    {khachFilterOptionsLoading &&
                                    hopDongCustomerOptions.length === 0 &&
                                    items.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">
                                            Đang tải danh sách khách…
                                        </p>
                                    ) : hopDongCustomerOptions.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">
                                            Không có khách hàng trên bảng (thử đổi bộ lọc hoặc trang).
                                        </p>
                                    ) : hopDongKhachOptionsMatching.length === 0 ? (
                                        <p className="px-3 py-2 text-[11px] text-slate-500">
                                            Không khớp &quot;{hdKhachFilterSearch.trim()}&quot;.
                                        </p>
                                    ) : (
                                        hopDongKhachOptionsMatching.map((o) => {
                                            const isAllKhachMode =
                                                isHopDongKhachFilterAll(filterHopDongKhachKeys);
                                            const checked =
                                                isAllKhachMode ||
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
                                                                if (isHopDongKhachFilterNone(prev)) {
                                                                    return [o.key];
                                                                }
                                                                if (isHopDongKhachFilterAll(prev)) {
                                                                    const rest = hopDongCustomerOptions
                                                                        .map((x) => x.key)
                                                                        .filter((k) => k !== o.key);
                                                                    return rest.length === 0
                                                                        ? [HOP_DONG_KHACH_FILTER_NONE]
                                                                        : rest;
                                                                }
                                                                if (prev.includes(o.key)) {
                                                                    const next = prev.filter(
                                                                        (x) => x !== o.key,
                                                                    );
                                                                    return next.length === 0
                                                                        ? [HOP_DONG_KHACH_FILTER_NONE]
                                                                        : next;
                                                                }
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
                                    {hdDuAnFilterSearch.trim() &&
                                    hopDongProjectOptionsMatching.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (allVisibleDuAnSelected) {
                                                    const visible = new Set(
                                                        hopDongProjectOptionsMatching.map(
                                                            (o) => o.id,
                                                        ),
                                                    );
                                                    setFilterHopDongDuAnIds((prev) =>
                                                        prev.filter((id) => !visible.has(id)),
                                                    );
                                                } else {
                                                    selectAllVisibleHopDongDuAn();
                                                }
                                            }}
                                            className="mt-2 w-full rounded-md border border-[#004bcb]/30 bg-[#004bcb]/5 px-2 py-1.5 text-[11px] font-bold text-[#004bcb] hover:bg-[#004bcb]/10"
                                        >
                                            {allVisibleDuAnSelected
                                                ? `Bỏ chọn ${hopDongProjectOptionsMatching.length} kết quả`
                                                : `Chọn tất cả đang hiển thị (${hopDongProjectOptionsMatching.length})`}
                                        </button>
                                    ) : null}
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
                    <select
                        value={filterHopDongTrangThai}
                        onChange={(e) =>
                            setFilterHopDongTrangThai(
                                (e.target.value || '') as '' | HopDongTienDo,
                            )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30 min-w-[10.5rem] max-w-[14rem]"
                        aria-label="Lọc theo trạng thái"
                        title="Lọc theo trạng thái (tiến độ HĐ)"
                    >
                        <option value="">Tất cả trạng thái</option>
                        {HOP_DONG_TIEN_DO_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
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
                    <button
                        type="button"
                        onClick={handleDongBoThuChi}
                        disabled={isLoading || dongBoThuChiBusy}
                        title="Tải lại Thu chi và tổng hợp Đã thu / Tạm ứng / CĐT nợ theo bộ lọc HĐ hiện tại"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {dongBoThuChiBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Đồng bộ data
                    </button>
                    <button
                        type="button"
                        disabled={isLoading || deletingDuplicateHopDong}
                        onClick={handleDeleteDuplicateHopDong}
                        title="Xóa HĐ trùng cột Hợp đồng / Nội dung (Số HĐ + tên gói thầu), giữ bản cũ nhất"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {deletingDuplicateHopDong ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Xóa trùng HĐ / Nội dung
                    </button>
                    <ExcelImportExportBar
                        columns={HOP_DONG_EXCEL_COLUMNS}
                        importColumns={HOP_DONG_EXCEL_PARSE_COLUMNS}
                        fetchExportData={async () => {
                            const res = await contractService.getAll({
                                search: debouncedSearch || undefined,
                                dateFrom: dateFrom || undefined,
                                dateTo: dateTo || undefined,
                                trangThai: filterHopDongTrangThai || undefined,
                            });
                            const list = normalizeContractGetAllRows(res);
                            list.sort((a, b) => {
                                const pA = a.project_name || '';
                                const pB = b.project_name || '';
                                if (pA !== pB) return pA.localeCompare(pB);
                                return (a.so_hop_dong || '').localeCompare(b.so_hop_dong || '');
                            });
                            return list.map((c, i) =>
                                mapHopDongContractToExcelRow(c, i, projectsMeta),
                            );
                        }}
                        templateFileName="mau-hop-dong"
                        sheetName="Hop dong"
                        onImport={async (rows, onProgress) => {
                            try {
                                let contractCache: ContractRow[] = [];
                                let contractCacheReady = false;
                                const ensureContractCache = async () => {
                                    if (contractCacheReady) return;
                                    try {
                                        // Không truyền page/pageSize để server tự fetch nhiều batch (vượt giới hạn 1000 dòng/request)
                                        const allRes = await contractService.getAll();
                                        contractCache = allRes?.data ?? [];
                                    } catch {
                                        contractCache = [];
                                    } finally {
                                        contractCacheReady = true;
                                    }
                                };
                                const customerMap = new Map<string, string>();
                                const projectMap = new Map<string, string>();
                                try {
                                    const [existingCustomers, existingProjects] = await Promise.all([
                                        customerService.getAll().catch(() => []),
                                        projectService.getAll().catch(() => []),
                                    ]);
                                    for (const c of existingCustomers as Array<{ id: string; ten_don_vi?: string }>) {
                                        const norm = normalizeKey(c.ten_don_vi || '');
                                        if (norm && c.id) customerMap.set(norm, String(c.id));
                                    }
                                    for (const p of existingProjects as Array<{ id: string; ten_du_an?: string; customer_id?: string | null }>) {
                                        const normProject = normalizeKey(p.ten_du_an || '');
                                        if (!normProject || !p.id) continue;
                                        const ck = String(p.customer_id || '').trim();
                                        projectMap.set(`${normProject}|${ck}`, String(p.id));
                                        if (!projectMap.has(`${normProject}|`)) {
                                            projectMap.set(`${normProject}|`, String(p.id));
                                        }
                                    }
                                } catch {
                                    // fallback: maps để trống, sẽ tự tạo khi import
                                }
                                const getOrCreateCustomer = async (r: Record<string, string>) => {
                                    const customerName = excelRowTenKhachHang(r);
                                    if (!customerName) return null;
                                    const normName = normalizeKey(customerName);
                                    if (customerMap.has(normName)) return customerMap.get(normName);
                                    const newC = await customerService.create({
                                        ten_don_vi: customerName,
                                        mst: (r.mst_kh || '').trim() || undefined,
                                    });
                                    if (newC?.id) customerMap.set(normName, newC.id);
                                    return newC?.id || null;
                                };
                                const getOrCreateProject = async (
                                    r: Record<string, string>,
                                    customerId: string | null,
                                ) => {
                                    const projectName = cleanString(r.ten_da);
                                    if (!projectName) return null;
                                    const normProject = normalizeKey(projectName);
                                    const customerKey = String(customerId || '').trim();
                                    const scopedKey = `${normProject}|${customerKey}`;
                                    const unscopedKey = `${normProject}|`;
                                    if (projectMap.has(scopedKey)) return projectMap.get(scopedKey);
                                    if (projectMap.has(unscopedKey)) return projectMap.get(unscopedKey);
                                    const newP = await projectService.create({
                                        ten_du_an: projectName,
                                        status: 'Đang thực hiện',
                                        progress: 0,
                                        customer_id: customerId,
                                        ten_khach_hang: excelRowTenKhachHang(r) || null,
                                    });
                                    if (newP?.id) {
                                        projectMap.set(scopedKey, String(newP.id));
                                        if (!projectMap.has(unscopedKey)) {
                                            projectMap.set(unscopedKey, String(newP.id));
                                        }
                                    }
                                    return newP?.id || null;
                                };

                                const allErrors: string[] = [];
                                const processedRows: Record<string, unknown>[] = [];

                                for (let i = 0; i < rows.length; i++) {
                                    const r = rows[i];
                                    const soHopDong = (
                                        r.so_ho_plhd ||
                                        r.so_hop_dong ||
                                        ''
                                    ).trim();
                                    if (!soHopDong) {
                                        allErrors.push(
                                            `Excel dòng ${r.__rowNumber || i + 2}: thiếu «Số HĐ & PLHĐ».`,
                                        );
                                        onProgress(i + 1, rows.length);
                                        continue;
                                    }
                                    const customerId = await getOrCreateCustomer(r);
                                    const duAnId = await getOrCreateProject(r, customerId);
                                    const giaTriQt = parseMoneyVi(r.gia_xuat_hd || '0');
                                    const rowPayload: Record<string, unknown> = {
                                        ...r,
                                        __rowNumber: r.__rowNumber,
                                        du_an_id: duAnId,
                                        customer_id: customerId,
                                        gia_tri_hd: parseMoneyVi(r.gia_hd_plhd || '0'),
                                        gia_tri_qt: giaTriQt,
                                        cdt_thanh_toan: parseMoneyVi(r.cdt_thanh_toan || '0'),
                                        cdt_tam_ung: parseMoneyVi(r.cdt_tam_ung || '0'),
                                        so_hop_dong: soHopDong,
                                        project_name: cleanString(r.ten_da),
                                        ten_goi_thau: cleanString(r.ten_goi_thau),
                                        loai_dich_vu: cleanString(r.loai_dv),
                                        customer_name: excelRowTenKhachHang(r) || null,
                                        ten_day_du_chu_dau_tu: cleanString(r.thong_tin_kh),
                                        mst: (r.mst_kh || '').trim(),
                                        ngay_ky_hd: parseExcelDate(r.ngay_ky_hd, r.nam_ky_hd),
                                    };
                                    recalcHopDongThuTuExcel(rowPayload);
                                    processedRows.push(rowPayload);
                                    onProgress(i + 1, rows.length);
                                }

                                // Không gộp dòng trùng Số HĐ — mỗi dòng Excel = một lần ghi DB
                                let contractsSaved = 0;

                                for (let i = 0; i < processedRows.length; i += 50) {
                                    const chunk = processedRows.slice(i, i + 50);
                                    const result = await contractService.bulkImport(chunk);
                                    contractsSaved += result.created + result.updated;
                                    if (result.errors.length > 0) allErrors.push(...result.errors);

                                    for (const imported of chunk) {
                                        if (
                                            (Number(imported.cdt_thanh_toan) || 0) <= 0 &&
                                            (Number(imported.cdt_tam_ung) || 0) <= 0
                                        ) {
                                            continue;
                                        }
                                        await ensureContractCache();
                                        let found = findContractRowForExcelImport(
                                            contractCache,
                                            String(imported.so_hop_dong || ''),
                                            imported.du_an_id as string | null | undefined,
                                            String(imported.ten_goi_thau || ''),
                                        );
                                        if (!found) {
                                            try {
                                                const lookup = await contractService.getAll({
                                                    page: 1,
                                                    pageSize: 20,
                                                    search: String(imported.so_hop_dong || '').trim(),
                                                });
                                                const fresh = (lookup?.data ?? []) as ContractRow[];
                                                contractCache = [...contractCache, ...fresh];
                                                found = findContractRowForExcelImport(
                                                    contractCache,
                                                    String(imported.so_hop_dong || ''),
                                                    imported.du_an_id as string | null | undefined,
                                                    String(imported.ten_goi_thau || ''),
                                                );
                                            } catch {
                                                found = undefined;
                                            }
                                        }
                                        if (!found) {
                                            allErrors.push(
                                                `HĐ «${imported.so_hop_dong}»: không tìm thấy HĐ sau import để ghi phiếu thu.`,
                                            );
                                            continue;
                                        }
                                        try {
                                            await syncPhieuThuTuExcelHopDong(
                                                imported as Parameters<typeof syncPhieuThuTuExcelHopDong>[0],
                                                contractCache,
                                            );
                                        } catch (e: unknown) {
                                            const msg =
                                                e instanceof Error ? e.message : 'Lỗi tạo phiếu thu';
                                            allErrors.push(
                                                `HĐ «${imported.so_hop_dong}»: ${msg}`,
                                            );
                                        }
                                    }
                                }

                                return {
                                    ok: rows.length,
                                    contractsSaved,
                                    errors: allErrors,
                                };
                            } catch (e: unknown) {
                                return {
                                    ok: 0,
                                    errors: [
                                        e instanceof Error ? e.message : 'Lỗi kết nối server',
                                    ],
                                };
                            }
                        }}
                        onDone={() => {
                            setPage(1);
                            setReloadKey((k) => k + 1);
                            setToast({ message: 'Đã xử lý nhập Excel hợp đồng.', type: 'success' });
                        }}
                    />
                </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full">
                        <span className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1">
                            <Calendar size={14} className="text-slate-400" aria-hidden />
                            Ngày ký HĐ:
                        </span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setSelectedMonth('');
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-sm py-1.5 px-2.5 min-w-[9.5rem] [color-scheme:light]"
                            aria-label="Từ ngày"
                        />
                        <span className="text-slate-400 text-xs">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setSelectedMonth('');
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-sm py-1.5 px-2.5 min-w-[9.5rem] [color-scheme:light]"
                            aria-label="Đến ngày"
                        />
                        <span className="text-xs font-semibold text-slate-600 shrink-0">Năm</span>
                        <select
                            value={String(filterYear)}
                            onChange={(e) => handleHopDongFilterYearChange(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-sm py-1.5 px-2.5 min-w-[5.5rem] [color-scheme:light]"
                            aria-label="Chọn năm lọc"
                        >
                            {hopDongFilterYearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs font-semibold text-slate-600 shrink-0">Tháng</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => {
                                const monthValue = e.target.value;
                                if (!monthValue) {
                                    setSelectedMonth('');
                                    setDateFrom('');
                                    setDateTo('');
                                    return;
                                }
                                handleHopDongMonthSelect(monthValue);
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-sm py-1.5 px-2.5 min-w-[11rem] [color-scheme:light]"
                            aria-label="Bộ lọc nhanh theo tháng"
                        >
                            <option value="">Chọn tháng</option>
                            {HOP_DONG_MONTH_QUICK.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        {(dateFrom || dateTo) ? (
                            <button
                                type="button"
                                onClick={clearHopDongDateFilters}
                                className="text-xs font-semibold text-[#004bcb] hover:underline px-1"
                            >
                                Xóa ngày
                            </button>
                        ) : null}
                </div>
            </section>

            <section
                className={cn(
                    'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-opacity duration-150',
                    (isSearchPending || isListFetching) && 'opacity-70',
                )}
            >
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50/90">
                    <button
                        type="button"
                        disabled={
                            selectedHopDongInView.length === 0 ||
                            isLoading ||
                            deletingSelectedHopDong
                        }
                        onClick={handleDeleteSelectedHopDong}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {deletingSelectedHopDong ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Xóa đã chọn
                        {selectedHopDongInView.length > 0
                            ? ` (${selectedHopDongInView.length})`
                            : ''}
                    </button>
                    {selectedHopDongInView.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => setSelectedHopDongUuids([])}
                            className="text-xs font-semibold text-slate-600 hover:text-[#004bcb] hover:underline"
                        >
                            Bỏ chọn
                        </button>
                    ) : null}
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1820px] text-left border-collapse">
                    <thead className="bg-[#283044] border-b border-[#1c2436]">
                        <tr>
                            <th className="px-3 py-3 w-11 text-center">
                                <input
                                    type="checkbox"
                                    checked={isAllHopDongRowsSelected}
                                    disabled={selectableHopDongRows.length === 0 || isLoading}
                                    onChange={toggleSelectAllHopDongRows}
                                    className="h-4 w-4 rounded border-slate-400 bg-white text-[#004bcb] focus:ring-[#004bcb]/40 cursor-pointer disabled:opacity-40"
                                    aria-label="Chọn tất cả hợp đồng trên trang"
                                />
                            </th>
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
                                    <span>Giá xuất HĐ</span>
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
                                    <span>CĐT nợ</span>
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
                            const taskPct = getContractProgress(c.uuid);
                            const savingTienDo = savingTienDoId === c.uuid;
                            const rowId = hopDongRowSelectId(c);
                            const rowChecked = rowId ? selectedHopDongUuids.includes(rowId) : false;
                            return (
                                <tr
                                    key={c.uuid || `${group.id}-${c.id}`}
                                    className={`hover:bg-slate-50/60 transition-colors ${rowChecked ? 'bg-blue-50/40' : ''}`}
                                >
                                    <td className="px-3 py-3 text-center align-top">
                                        <input
                                            type="checkbox"
                                            checked={rowChecked}
                                            disabled={!rowId || isLoading || deletingSelectedHopDong}
                                            onChange={() => toggleHopDongRowSelected(c)}
                                            className="h-4 w-4 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]/40 cursor-pointer disabled:opacity-40"
                                            aria-label={`Chọn hợp đồng ${c.soHopDong || ''}`}
                                        />
                                    </td>
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
                                    <td className="px-4 py-4 min-w-[9.5rem]">
                                        <select
                                            value={c.trangThai}
                                            disabled={savingTienDo || !c.uuid}
                                            onChange={(e) =>
                                                handleHopDongTienDoChange(
                                                    c,
                                                    e.target.value as HopDongTienDo,
                                                )
                                            }
                                            className={`w-full min-w-[8.5rem] rounded-lg border px-2.5 py-1.5 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 ${hopDongTienDoSelectClass(c.trangThai)}`}
                                            title="Tiến độ hợp đồng"
                                        >
                                            {HOP_DONG_TIEN_DO_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                        {taskPct > 0 ? (
                                            <p className="text-[9px] text-slate-500 mt-1 tabular-nums">
                                                Task: {taskPct}%
                                            </p>
                                        ) : null}
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
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openDelete({
                                                        id: c.id,
                                                        uuid: hopDongRowSelectId(c) || c.uuid,
                                                        soHopDong: c.soHopDong,
                                                    })
                                                }
                                                className="p-1.5 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50"
                                            >
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
                                disabled={isListFetching}
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
                            disabled={page <= 1 || isListFetching}
                            onClick={() => setPage(1)}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang đầu"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            type="button"
                            disabled={page <= 1 || isListFetching}
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
                                    disabled={isListFetching}
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
                            disabled={page >= totalPages || isListFetching}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            className="rounded border border-slate-300 p-1.5 text-slate-400 hover:bg-white disabled:opacity-50"
                            title="Trang sau"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages || isListFetching}
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
