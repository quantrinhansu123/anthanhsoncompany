/** Ngưỡng chi nhân sự: theo tiền (VNĐ) hoặc % trên giá trị quyết toán */

export type NguongChiNhanSuLoai = 'tien' | 'phan_tram';

export function normalizeNguongLoai(v: string | null | undefined): NguongChiNhanSuLoai {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'phan_tram' || s === 'percent' || s === '%') return 'phan_tram';
  return 'tien';
}

/** Giá trị lưu trong DB: VND hoặc phần trăm (0–100, có thể lẻ) tùy loại */
export function tienQuyDoiNguongChiNhanSu(
  loai: NguongChiNhanSuLoai | undefined,
  giaTriQT: number,
  stored: number,
): number {
  if (!stored || stored <= 0) return 0;
  if (loai === 'phan_tram') return Math.round((Number(giaTriQT) * stored) / 100);
  return Math.round(Number(stored));
}
