/** Tình trạng phiếu thu CĐT — giá trị chuẩn lưu DB / hiển thị danh sách Thu chi. */
export const THU_CHI_TINH_TRANG_PHIEU_OPTIONS = ['Tạm ứng', 'Thanh toán', 'Xuất hóa đơn'] as const;

/** Trạng thái HĐ — cột `trang_thai_hd` trên bảng thu_chi. */
export const TRANG_THAI_HD_CO = 'Có hóa đơn';
export const TRANG_THAI_HD_PHAT_SINH = 'Phát sinh';
export const THU_CHI_TRANG_THAI_HD_OPTIONS = [TRANG_THAI_HD_CO, TRANG_THAI_HD_PHAT_SINH] as const;

export type ThuChiTinhTrangPhieu = (typeof THU_CHI_TINH_TRANG_PHIEU_OPTIONS)[number];

function normalizeKey(value: string | null | undefined): string {
    return String(value ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** Chuẩn hóa nhập Excel / legacy `thanh_toan` → nhãn hiển thị. */
export function normalizeTinhTrangPhieuInput(raw: string | null | undefined): string {
    const t = String(raw ?? '').trim();
    if (!t) return '';
    const n = normalizeKey(t);
    if (n === 'thanh_toan' || n === 'thanh toan' || n === 'thanh toán') return 'Thanh toán';
    if (n === 'tam_ung' || n === 'tam ung' || n === 'tạm ứng') return 'Tạm ứng';
    if (
        n === 'xuat_hoa_don' ||
        n === 'xuat hoa don' ||
        n === 'xuất hóa đơn' ||
        n === 'co hoa don' ||
        n === 'có hóa đơn' ||
        n.includes('xuat hoa don') ||
        n.includes('xuất hóa đơn') ||
        n.includes('co hoa don') ||
        n.includes('có hóa đơn')
    ) {
        return 'Xuất hóa đơn';
    }
    return t;
}

/** Chuẩn hóa cột «Hạng mục thu» (file CĐT / Thu chi). */
export function normalizeHangMucThuInput(raw: string | null | undefined): string {
    const t = String(raw ?? '').trim();
    if (!t) return '';
    const mapped = normalizeTinhTrangPhieuInput(t);
    if (mapped && isKnownTinhTrangPhieu(mapped)) return mapped;
    return t;
}

/** Hàng file mẫu CĐT: «Ghi chú/Có», số HĐ xuất, ngày xuất HĐ → đã có hóa đơn. */
export function isCdtExcelRowCoHoaDon(r: Record<string, string>): boolean {
    const co = String(r.ghi_chu_co ?? '').trim();
    const chua = String(r.ghi_chu_chua_co ?? '').trim();
    if (co.length > 0 && chua.length === 0) return true;
    if (co.length > 0) {
        const nk = normalizeKey(co);
        if (!nk.includes('chua') && !nk.includes('chưa')) return true;
    }
    if (String(r.so_hd ?? '').trim().length > 0) return true;
    if (String(r.ngay_xuat_hd ?? '').trim().length > 0) return true;
    return false;
}

/** Hiển thị cột Tình trạng: ưu tiên `tinh_trang_phieu`, sau đó `hang_muc_thu`. */
export function resolveThuChiTinhTrangDisplay(item: {
    tinh_trang_phieu?: string | null;
    hang_muc_thu?: string | null;
}): string {
    const fromPhieu = normalizeTinhTrangPhieuInput(item.tinh_trang_phieu);
    if (fromPhieu) return fromPhieu;
    const fromHangMuc = normalizeHangMucThuInput(item.hang_muc_thu);
    if (fromHangMuc && isKnownTinhTrangPhieu(fromHangMuc)) return fromHangMuc;
    return fromHangMuc;
}

export function normalizeTrangThaiHdInput(raw: string | null | undefined): string {
    const t = String(raw ?? '').trim();
    if (!t) return '';
    const n = normalizeKey(t);
    if (n === 'co hoa don' || n === 'có hóa đơn' || n.includes('co hoa don') || n.includes('có hóa đơn')) {
        return TRANG_THAI_HD_CO;
    }
    if (
        n === 'phat sinh' ||
        n === 'phát sinh' ||
        n.includes('phat sinh') ||
        n.includes('phát sinh')
    ) {
        return TRANG_THAI_HD_PHAT_SINH;
    }
    if (n === 'chua co hoa don' || n === 'chưa có hóa đơn' || n.includes('chua co') || n.includes('chưa có')) {
        return TRANG_THAI_HD_PHAT_SINH;
    }
    return t;
}

export function isKnownTrangThaiHd(display: string): boolean {
    return (THU_CHI_TRANG_THAI_HD_OPTIONS as readonly string[]).includes(display);
}

/** Hiển thị cột Trạng thái HĐ — ưu tiên DB, suy ra từ tình trạng phiếu. */
export function resolveTrangThaiHdDisplay(item: {
    trang_thai_hd?: string | null;
    loai_phieu?: string | null;
    tinh_trang_phieu?: string | null;
    hang_muc_thu?: string | null;
}): string {
    const stored = normalizeTrangThaiHdInput(item.trang_thai_hd);
    if (stored) return stored;
    const loai = normalizeKey(item.loai_phieu);
    if (loai !== 'phiếu thu' && loai !== 'phieu thu') return '';
    if (resolveThuChiTinhTrangDisplay(item) === 'Xuất hóa đơn') return TRANG_THAI_HD_CO;
    return '';
}

export function trangThaiHdBadgeClass(display: string): string {
    if (display === TRANG_THAI_HD_CO) return 'bg-violet-100 text-violet-900';
    if (display === TRANG_THAI_HD_PHAT_SINH) return 'bg-sky-100 text-sky-900';
    return 'bg-slate-50 text-slate-400';
}

/** Đồng bộ `tinh_trang_phieu` ↔ `trang_thai_hd` khi lưu / import. */
export function syncThuChiTrangThaiHdFields(
    tinhTrang: string | null | undefined,
    trangThaiHd: string | null | undefined,
): { tinh_trang_phieu: string | null; trang_thai_hd: string | null } {
    let tt = normalizeTinhTrangPhieuInput(tinhTrang) || null;
    let hd = normalizeTrangThaiHdInput(trangThaiHd) || null;
    if (tt === 'Xuất hóa đơn') hd = TRANG_THAI_HD_CO;
    if (hd === TRANG_THAI_HD_CO && !tt) tt = 'Xuất hóa đơn';
    return { tinh_trang_phieu: tt, trang_thai_hd: hd };
}

/** Phiếu thu ghi nhận giá trị đã xuất HĐ (có hóa đơn) — không cộng vào Đã thu tiền về. */
export function isThuChiXuatHoaDonRow(item: {
    loai_phieu?: string | null;
    tinh_trang_phieu?: string | null;
    hang_muc_thu?: string | null;
    trang_thai_hd?: string | null;
}): boolean {
    const loai = normalizeKey(item.loai_phieu);
    if (loai !== 'phiếu thu' && loai !== 'phieu thu') return false;
    if (normalizeTrangThaiHdInput(item.trang_thai_hd) === TRANG_THAI_HD_CO) return true;
    return resolveThuChiTinhTrangDisplay(item) === 'Xuất hóa đơn';
}

/** Đồng bộ hạng mục thu khi lưu phiếu thu theo tình trạng chuẩn. */
export function hangMucThuForTinhTrangPhieu(
    tinhTrang: string | null | undefined,
    existingHangMuc?: string | null,
): string | null {
    const tt = normalizeTinhTrangPhieuInput(tinhTrang);
    if (tt && isKnownTinhTrangPhieu(tt)) return tt;
    const hm = normalizeHangMucThuInput(existingHangMuc);
    return hm || null;
}

export function tinhTrangPhieuFromInitial(raw: unknown, fallback = 'Tạm ứng'): string {
    const normalized = normalizeTinhTrangPhieuInput(String(raw ?? '').trim());
    return normalized || fallback;
}

/** Nhãn cột Tình trạng trên danh sách Thu chi (thu CĐT). */
export function tinhTrangThuCdtLabel(display: string): string {
    if (display === 'Thanh toán') return 'CĐT thanh toán';
    if (display === 'Tạm ứng') return 'CĐT tạm ứng';
    if (display === 'Xuất hóa đơn') return 'Có hóa đơn';
    return display;
}

export function tinhTrangPhieuBadgeClass(display: string): string {
    if (display === 'Thanh toán') return 'bg-emerald-100 text-emerald-900';
    if (display === 'Tạm ứng') return 'bg-amber-100 text-amber-900';
    if (display === 'Xuất hóa đơn') return 'bg-violet-100 text-violet-900';
    return 'bg-slate-100 text-slate-700';
}

export function isKnownTinhTrangPhieu(display: string): boolean {
    return (THU_CHI_TINH_TRANG_PHIEU_OPTIONS as readonly string[]).includes(display);
}
