/** Đồng bộ cột "Lịch sử HS" trên trang Hợp đồng sau khi ghi `ngay_update` (xem/sửa). */
export const HOPDONG_PROFILE_ACCESS_EVENT = 'hopdong-profile-access';

export type HopDongProfileAccessDetail = { uuid: string; ngayUpdate: string };

export function emitHopDongProfileAccess(uuid: string, ngayUpdateVi: string) {
    if (!uuid) return;
    window.dispatchEvent(
        new CustomEvent(HOPDONG_PROFILE_ACCESS_EVENT, {
            detail: { uuid, ngayUpdate: ngayUpdateVi } satisfies HopDongProfileAccessDetail,
        }),
    );
}
