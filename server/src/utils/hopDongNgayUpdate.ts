/** Ngày hôm nay (YYYY-MM-DD) — cột `hop_dong.ngay_update`. */
export function hopDongNgayUpdateDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mọi cập nhật HĐ đều ghi ngày thay đổi mới nhất (trừ khi `skipNgayUpdate: true`). */
export function applyHopDongNgayUpdateToPayload<T extends Record<string, unknown>>(payload: T): T {
  if (payload.skipNgayUpdate === true) {
    const { skipNgayUpdate: _s, ...rest } = payload;
    return rest as T;
  }
  const raw = payload.ngay_update;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return payload;
  }
  return { ...payload, ngay_update: hopDongNgayUpdateDateToday() };
}
