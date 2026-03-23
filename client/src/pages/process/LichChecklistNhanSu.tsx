import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  differenceInMinutes,
  endOfMonth,
  format,
  startOfMonth,
  isValid,
  parseISO
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Loader2
} from 'lucide-react';
import {
  congViecNhatKyService,
  type CongViecNhatKyRow
} from '../../lib/services/congViecNhatKyService';
import { supabase } from '../../lib/supabase';
import { contractService, type ContractRow } from '../../lib/services/contractService';

type ChecklistHopDuAnLabel = {
  tenDuAn: string;
  tenHopDong: string;
  soHopDong: string;
};

function partsFromCreatedAt(iso: string): { ngay: string; gio: string } {
  const d = parseISO(iso);
  if (!isValid(d)) return { ngay: '—', gio: '—' };
  return {
    ngay: format(d, 'dd/MM/yyyy', { locale: vi }),
    gio: format(d, 'HH:mm')
  };
}

function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  if (!isValid(d)) return '—';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
}

/** Khoảng thời gian từ tạo → hoàn thành (chỉ khi có completed_at). */
function formatCompletionDuration(createdIso: string, completedIso: string | null): string {
  if (!completedIso) return '—';
  const start = parseISO(createdIso);
  const end = parseISO(completedIso);
  if (!isValid(start) || !isValid(end)) return '—';
  let mins = differenceInMinutes(end, start);
  if (mins < 0) mins = 0;
  if (mins === 0) return '< 1 phút';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hoursDec = (mins / 60).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  if (h === 0) return `${m} phút · ${hoursDec} giờ`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút · ${hoursDec} giờ`;
}

function minutesCompletion(createdIso: string, completedIso: string | null): number {
  if (!completedIso) return 0;
  const start = parseISO(createdIso);
  const end = parseISO(completedIso);
  if (!isValid(start) || !isValid(end)) return 0;
  const mins = differenceInMinutes(end, start);
  return mins < 0 ? 0 : mins;
}

function formatTotalMinutes(mins: number): string {
  if (mins <= 0) return '0 giờ';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dec = (mins / 60).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  if (h === 0) return `${m} phút (tổng ${dec} giờ)`;
  if (m === 0) return `${h} giờ (${dec} giờ)`;
  return `${h} giờ ${m} phút (tổng ${dec} giờ)`;
}

function buildContractLookup(contracts: ContractRow[]): Map<string, ContractRow> {
  const m = new Map<string, ContractRow>();
  for (const c of contracts) {
    if (c.id != null && String(c.id).trim() !== '') m.set(String(c.id), c);
    const cid = (c as { contract_id?: string }).contract_id;
    if (cid != null && String(cid).trim() !== '') m.set(String(cid), c);
  }
  return m;
}

export function LichChecklistNhanSu() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [rows, setRows] = useState<CongViecNhatKyRow[]>([]);
  const [hopDuAnByChiTietId, setHopDuAnByChiTietId] = useState<
    Record<string, ChecklistHopDuAnLabel>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeIso = useMemo(() => {
    const start = startOfMonth(monthAnchor);
    const end = endOfMonth(monthAnchor);
    return { fromIso: start.toISOString(), toIso: end.toISOString() };
  }, [monthAnchor]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await congViecNhatKyService.listByCreatedAtRange(
        rangeIso.fromIso,
        rangeIso.toIso,
      );
      setRows(data);

      const chiIds = [...new Set(data.map((r) => String(r.cong_viec_chi_tiet_id)).filter(Boolean))];
      if (chiIds.length === 0) {
        setHopDuAnByChiTietId({});
      } else {
        const { data: details, error: dErr } = await supabase
          .from('cong_viec_chi_tiet')
          .select('id, hop_dong_id')
          .in('id', chiIds);
        if (dErr) {
          console.warn('[LichChecklistNhanSu] cong_viec_chi_tiet:', dErr);
          setHopDuAnByChiTietId({});
        } else {
          const contracts = await contractService.getAll();
          const byHop = buildContractLookup(contracts);
          const next: Record<string, ChecklistHopDuAnLabel> = {};
          for (const d of details || []) {
            const id = String((d as { id: string }).id);
            const hid = (d as { hop_dong_id?: string | null }).hop_dong_id;
            if (!hid) {
              next[id] = { tenDuAn: '—', tenHopDong: '—', soHopDong: '—' };
              continue;
            }
            const c = byHop.get(String(hid));
            next[id] = {
              tenDuAn: c?.project_name?.trim() || '—',
              tenHopDong: c?.ten_goi_thau?.trim() || '—',
              soHopDong: c?.so_hop_dong?.trim() || '—',
            };
          }
          setHopDuAnByChiTietId(next);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu');
      setRows([]);
      setHopDuAnByChiTietId({});
    } finally {
      setLoading(false);
    }
  }, [rangeIso.fromIso, rangeIso.toIso]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [rows]);

  const totalCompletionMinutes = useMemo(() => {
    return sorted.reduce(
      (acc, r) => acc + minutesCompletion(r.created_at, r.completed_at),
      0,
    );
  }, [sorted]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-600" />
            Tổng kết checklist
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/quy-trinh"
              className="text-slate-600 hover:text-blue-600 font-medium"
            >
              ← Quy trình
            </Link>
            <button
              type="button"
              onClick={() => setMonthAnchor((d) => addMonths(d, -1))}
              className="p-1 rounded border border-slate-200 hover:bg-white"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-slate-800 min-w-[7.5rem] text-center capitalize">
              {format(monthAnchor, 'MM/yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setMonthAnchor((d) => addMonths(d, 1))}
              className="p-1 rounded border border-slate-200 hover:bg-white"
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setMonthAnchor(startOfMonth(new Date()))}
              className="text-blue-600 font-semibold hover:underline"
            >
              Hiện tại
            </button>
          </div>
        </div>

        <p className="px-4 py-2 text-[11px] text-slate-500 border-b border-slate-100">
          Dữ liệu từ <code className="text-slate-700">cong_viec_nhat_ky_nhan_su</code>.{' '}
          <span className="font-medium">Số giờ hoàn thành</span> = khoảng thời gian từ{' '}
          <span className="font-medium">created_at</span> đến{' '}
          <span className="font-medium">completed_at</span> (chỉ dòng đã hoàn thành).
        </p>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs">
            {error}{' '}
            <button type="button" className="underline font-semibold" onClick={() => load()}>
              Thử lại
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-500 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang tải…
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Không có dòng trong tháng.</p>
          ) : (
            <table className="w-full text-sm text-left min-w-[1020px]">
              <thead className="bg-slate-100 text-slate-600 text-[10px] sm:text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Ngày</th>
                  <th className="px-3 py-2 font-semibold w-16 whitespace-nowrap">Giờ</th>
                  <th className="px-3 py-2 font-semibold min-w-[8rem]">Dự án</th>
                  <th className="px-3 py-2 font-semibold min-w-[8rem]">Hợp đồng</th>
                  <th className="px-3 py-2 font-semibold min-w-[7rem]">Nhân sự</th>
                  <th className="px-3 py-2 font-semibold min-w-[12rem]">Nội dung</th>
                  <th className="px-3 py-2 font-semibold min-w-[8rem]">Ghi chú</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Trạng thái</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Hoàn thành lúc</th>
                  <th className="px-3 py-2 font-semibold min-w-[10rem]">Số giờ hoàn thành</th>
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Công việc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {sorted.map((r) => {
                  const { ngay, gio } = partsFromCreatedAt(r.created_at);
                  const tt = (r.trang_thai || '').trim() || '—';
                  const doing = tt === 'Đang làm';
                  const hd =
                    hopDuAnByChiTietId[String(r.cong_viec_chi_tiet_id)] || null;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                      <td className="px-3 py-2 text-slate-800 tabular-nums whitespace-nowrap">
                        {ngay}
                      </td>
                      <td className="px-3 py-2 text-slate-800 tabular-nums font-medium whitespace-nowrap">
                        {gio}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[10rem]">
                        <span className="line-clamp-2 break-words text-[11px] sm:text-xs">
                          {hd?.tenDuAn || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[11rem]">
                        <div className="text-[11px] sm:text-xs space-y-0.5">
                          <div className="font-medium line-clamp-2 break-words">
                            {hd?.tenHopDong || '—'}
                          </div>
                          {hd?.soHopDong && hd.soHopDong !== '—' ? (
                            <div className="text-slate-500 tabular-nums">Số: {hd.soHopDong}</div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        {r.nhan_su_ten?.trim() || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[28rem]">
                        <span className="line-clamp-4 whitespace-pre-wrap break-words">
                          {r.noi_dung?.trim() || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[16rem]">
                        <span className="line-clamp-3 whitespace-pre-wrap break-words">
                          {r.ghi_chu?.trim() || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border ${
                            doing
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {tt}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 tabular-nums text-[11px] sm:text-xs whitespace-nowrap">
                        {formatDateTimeLocal(r.completed_at)}
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-[11px] sm:text-xs max-w-[14rem]">
                        {formatCompletionDuration(r.created_at, r.completed_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.task_id ? (
                          <Link
                            to={`/quy-trinh/quan-ly-cong-viec?taskId=${encodeURIComponent(r.task_id)}`}
                            className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline text-[11px] sm:text-xs"
                          >
                            Mở
                            <ExternalLink size={12} className="shrink-0 opacity-80" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && sorted.length > 0 && totalCompletionMinutes > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-700">
              <span className="font-semibold text-slate-800">Tổng thời gian hoàn thành (tháng):</span>{' '}
              {formatTotalMinutes(totalCompletionMinutes)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
