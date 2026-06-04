/** Đồng bộ cột "Lịch sử HS" trên trang Hợp đồng sau khi ghi `ngay_update` (xem/sửa). */
export const HOPDONG_PROFILE_ACCESS_EVENT = 'hopdong-profile-access';

export type HopDongProfileAccessDetail = { uuid: string; ngayUpdate: string };

/** Ngày hôm nay (YYYY-MM-DD) — khớp cột `hop_dong.ngay_update` kiểu DATE. */
export function hopDongNgayUpdateDateToday(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Hiển thị ngày cập nhật lần cuốu (vi-VN). */
export function formatHopDongNgayUpdateDisplay(raw: string | null | undefined): string {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
}

export function emitHopDongProfileAccess(uuid: string, ngayUpdateDate?: string) {
    if (!uuid) return;
    const date = String(ngayUpdateDate ?? '').trim() || hopDongNgayUpdateDateToday();
    window.dispatchEvent(
        new CustomEvent(HOPDONG_PROFILE_ACCESS_EVENT, {
            detail: {
                uuid,
                ngayUpdate: formatHopDongNgayUpdateDisplay(date),
            } satisfies HopDongProfileAccessDetail,
        }),
    );
}
