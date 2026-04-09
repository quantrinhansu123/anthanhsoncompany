import { supabase } from '../supabase';
import { thuChiService, type ThuChiRow } from './thuChiService';

export type DashboardThuChiLedgerRow = {
  loai_phieu: string;
  so_tien: number;
  ngay: string | null;
};

export type DashboardPayload = {
  stats: {
    employees: number;
    customers: number;
    projects: number;
    totalThu: number;
    totalChi: number;
  };
  thuChiLedger: DashboardThuChiLedgerRow[];
  recentThuChi: ThuChiRow[];
  projectStatuses: { status: string }[];
};

/**
 * Tải dữ liệu tổng quan: đếm bảng (head), thu chi tối giản cho biểu đồ, vài phiếu mới nhất, trạng thái dự án.
 * Tránh gọi getAll nhân sự / khách hàng / dự án đầy đủ chỉ để đếm hoặc vẽ biểu đồ.
 */
export async function loadDashboardData(): Promise<DashboardPayload> {
  const [
    nhanSuCount,
    khCount,
    duAnCount,
    thuChiLedger,
    recentThuChi,
    projectRows,
  ] = await Promise.all([
    supabase.from('nhan_su').select('*', { count: 'exact', head: true }),
    supabase.from('khach_hang').select('*', { count: 'exact', head: true }),
    supabase.from('du_an').select('*', { count: 'exact', head: true }),
    thuChiService.fetchLedgerThin(),
    thuChiService.fetchRecentJoined(5),
    supabase.from('du_an').select('status'),
  ]);

  if (nhanSuCount.error) throw nhanSuCount.error;
  if (khCount.error) throw khCount.error;
  if (duAnCount.error) throw duAnCount.error;
  if (projectRows.error) throw projectRows.error;

  let totalThu = 0;
  let totalChi = 0;
  for (const r of thuChiLedger) {
    if (r.loai_phieu === 'Phiếu thu') totalThu += r.so_tien || 0;
    else if (r.loai_phieu === 'Phiếu chi') totalChi += r.so_tien || 0;
  }

  return {
    stats: {
      employees: nhanSuCount.count ?? 0,
      customers: khCount.count ?? 0,
      projects: duAnCount.count ?? 0,
      totalThu,
      totalChi,
    },
    thuChiLedger,
    recentThuChi,
    projectStatuses: (projectRows.data || []).map((p: { status?: string }) => ({
      status: p.status || 'Khác',
    })),
  };
}
