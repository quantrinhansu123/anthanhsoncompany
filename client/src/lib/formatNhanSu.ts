/** Hiển thị & khớp chuỗi tham chiếu nhân sự (dữ liệu cũ). */

export type NhanSuOption = {
    id: string;
    full_name: string;
    code: string;
    anh_nhan_su?: string | null;
};

/** Định dạng cũ khi lưu có mã — dùng để khớp dữ liệu cũ */
function legacyLabelWithCode(emp: NhanSuOption): string {
    const n = emp.full_name?.trim() || '';
    return emp.code ? `[${emp.code}] ${n}` : n;
}

/** Chuỗi lưu DB: chỉ họ tên, không mã */
export function tenLuuNguoiNhan(emp: NhanSuOption): string {
    return emp.full_name?.trim() || '';
}

/** Hiển thị UI: chỉ họ tên (bỏ mã / định dạng cũ "[MÃ] Tên"). */
export function displayNhanSuTen(
    emp: (Partial<NhanSuOption> & { name?: string; hoTen?: string }) | null | undefined,
): string {
    const raw = (emp?.full_name || emp?.name || emp?.hoTen || '').trim();
    if (!raw) return '';
    const legacy = raw.match(/^\[[^\]]+\]\s*(.+)$/);
    return (legacy ? legacy[1] : raw).trim();
}

/** @deprecated Dùng tenLuuNguoiNhan; giữ cho chỗ còn hiển thị mã */
export function labelNhanSu(emp: NhanSuOption): string {
    return legacyLabelWithCode(emp);
}

/** Khớp chuỗi đã lưu với id nhân sự khi mở sửa. */
export function resolveNguoiNhanId(saved: string | null | undefined, emps: NhanSuOption[]): string {
    const s = (saved || '').trim();
    if (!s) return '';
    const byName = emps.find((e) => (e.full_name || '').trim() === s);
    if (byName) return byName.id;
    const byLegacy = emps.find((e) => legacyLabelWithCode(e) === s);
    if (byLegacy) return byLegacy.id;
    const fuzzy = emps.find((e) => e.full_name && s.includes((e.full_name || '').trim()));
    return fuzzy?.id || '';
}
