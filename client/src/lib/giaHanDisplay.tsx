import { cn } from './utils';

/** Chuẩn hóa ISO / YYYY-MM-DD → Date (0h địa phương). */
export function calendarDayFromIso(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const s = iso.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatGiaHanVi(iso: string | null | undefined): string {
  const d = calendarDayFromIso(iso);
  if (!d) return '';
  return d.toLocaleDateString('vi-VN');
}

/** Hạn hiệu lực = gia hạn lần 3 → 2 → 1 (lần sau ghi đè hạn trước). */
export function effectiveGiaHanDeadline(
  g1?: string | null,
  g2?: string | null,
  g3?: string | null,
): Date | null {
  if (g3?.trim()) return calendarDayFromIso(g3);
  if (g2?.trim()) return calendarDayFromIso(g2);
  if (g1?.trim()) return calendarDayFromIso(g1);
  return null;
}

export function isPastGiaHanDeadline(deadline: Date | null): boolean {
  if (!deadline) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return deadline.getTime() < today.getTime();
}

export function collectGiaHanLabels(
  g1?: string | null,
  g2?: string | null,
  g3?: string | null,
): string[] {
  return [g1, g2, g3].map(formatGiaHanVi).filter(Boolean);
}

type GiaHanCellProps = {
  ngay_gia_han_1?: string | null;
  ngay_gia_han_2?: string | null;
  ngay_gia_han_3?: string | null;
  /** Đã xong / duyệt → không cảnh báo */
  suppressWarning?: boolean;
  className?: string;
};

/** Hiển thị tối đa 3 mốc gia hạn (dd/MM/yyyy · …), đỏ + nhấp nháy nếu quá hạn cuối. */
export function GiaHanCell({
  ngay_gia_han_1,
  ngay_gia_han_2,
  ngay_gia_han_3,
  suppressWarning = false,
  className,
}: GiaHanCellProps) {
  const labels = collectGiaHanLabels(ngay_gia_han_1, ngay_gia_han_2, ngay_gia_han_3);
  const deadline = effectiveGiaHanDeadline(ngay_gia_han_1, ngay_gia_han_2, ngay_gia_han_3);
  const overdue = !suppressWarning && isPastGiaHanDeadline(deadline);

  if (labels.length === 0) {
    return <span className={cn('text-slate-400 text-[11px]', className)}>—</span>;
  }

  const text = labels.join(' · ');

  if (labels.length === 1) {
    return (
      <span
        className={cn(
          'text-[11px] font-bold tabular-nums whitespace-nowrap',
          overdue
            ? 'text-red-700 bg-red-50 px-1.5 py-0.5 rounded gia-han-overdue-blink'
            : 'text-slate-900',
          className,
        )}
        title={text}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-[11px] tabular-nums truncate max-w-[11rem] inline-block align-middle',
        overdue ? 'text-red-700 font-semibold gia-han-overdue-blink' : 'text-slate-900',
        className,
      )}
      title={text}
    >
      {text}
    </span>
  );
}
