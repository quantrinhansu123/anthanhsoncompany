import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { employeeService, type Employee } from '../../lib/services/employeeService';
import {
  workScheduleService,
  type WorkSchedule
} from '../../lib/services/workScheduleService';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const LOAI_OPTIONS: { value: string; label: string }[] = [
  { value: 'ca', label: 'Ca làm việc' },
  { value: 'nghi_phep', label: 'Nghỉ phép' },
  { value: 'nghi_le', label: 'Nghỉ lễ' },
  { value: 'lam_tu_xa', label: 'Làm từ xa' },
  { value: 'dao_tao', label: 'Đào tạo' },
  { value: 'hop', label: 'Họp' },
  { value: 'khac', label: 'Khác' }
];

function loaiLabel(value: string): string {
  return LOAI_OPTIONS.find((o) => o.value === value)?.label || value;
}

function loaiStyle(loai: string): string {
  switch (loai) {
    case 'ca':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'nghi_phep':
    case 'nghi_le':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'lam_tu_xa':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'dao_tao':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'hop':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function formatTimeShort(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

function empDisplayName(emp: Employee | undefined): string {
  if (!emp) return '—';
  return (
    emp.full_name ||
    emp.hoTen ||
    emp.name ||
    String(emp.code || '')
  );
}

export function LichLamViec() {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(true);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loadingSched, setLoadingSched] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterIds, setFilterIds] = useState<string[]>([]);
  const [dayPanelDate, setDayPanelDate] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [formDate, setFormDate] = useState<string>('');

  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 1 });
    return {
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
      days: eachDayOfInterval({ start, end })
    };
  }, [monthAnchor]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmp(true);
      const raw = await employeeService.getAll();
      const list = Array.isArray(raw) ? raw : [];
      const normalized = list.map((emp: any) => ({
        ...emp,
        id: emp.id,
        full_name: emp.full_name || emp.name || emp.hoTen || '',
        phongBan: emp.phong_ban || emp.phongBan || emp.department || ''
      })) as Employee[];
      setEmployees(normalized.filter((e) => e.status !== 'inactive'));
    } catch (e: any) {
      setError(e.message || 'Không tải được danh sách nhân sự');
    } finally {
      setLoadingEmp(false);
    }
  }, []);

  const loadSchedules = useCallback(async () => {
    try {
      setLoadingSched(true);
      setError(null);
      const data = await workScheduleService.list(range.from, range.to);
      setSchedules(data);
    } catch (e: any) {
      setError(e.message || 'Không tải được lịch làm việc');
      setSchedules([]);
    } finally {
      setLoadingSched(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const visibleSchedules = useMemo(() => {
    if (filterIds.length === 0) return schedules;
    const set = new Set(filterIds.map(String));
    return schedules.filter((s) => set.has(String(s.nhan_su_id)));
  }, [schedules, filterIds]);

  const byNgay = useMemo(() => {
    const m: Record<string, WorkSchedule[]> = {};
    for (const s of visibleSchedules) {
      m[s.ngay] = m[s.ngay] || [];
      m[s.ngay].push(s);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => {
        const ta = a.gio_bat_dau || '';
        const tb = b.gio_bat_dau || '';
        return ta.localeCompare(tb);
      });
    }
    return m;
  }, [visibleSchedules]);

  const empById = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) {
      m.set(String(e.id), e);
    }
    return m;
  }, [employees]);

  const toggleFilter = (id: string) => {
    setFilterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setFilterIds([]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-700 uppercase flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Lịch làm việc
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi ca làm, nghỉ phép, họp và đào tạo theo nhân sự. Mỗi mục có trạng thái{' '}
              <span className="font-semibold text-amber-800">Đang làm</span> (ô lịch và khi mở chi
              tiết ngày).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/nhan-su"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Danh sách nhân sự
            </Link>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormDate(format(new Date(), 'yyyy-MM-dd'));
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm"
            >
              <Plus size={18} /> Thêm lịch
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthAnchor(subMonths(monthAnchor, 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[200px] text-center font-bold text-slate-800 capitalize">
              {format(monthAnchor, 'MMMM yyyy', { locale: vi })}
            </div>
            <button
              type="button"
              onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMonthAnchor(startOfMonth(new Date()))}
              className="ml-1 px-3 py-1.5 text-xs font-semibold border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50"
            >
              Hôm nay
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Users size={14} /> Lọc nhân sự:
            </span>
            {loadingEmp ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <>
                <div className="flex flex-wrap gap-1 max-w-xl">
                  {employees.slice(0, 12).map((e) => {
                    const id = String(e.id);
                    const on = filterIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFilter(id)}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          on
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {empDisplayName(e)}
                      </button>
                    );
                  })}
                  {employees.length > 12 && (
                    <span className="text-xs text-slate-400 py-1">
                      +{employees.length - 12} người (chọn trong form)
                    </span>
                  )}
                </div>
                {filterIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilter}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Xóa lọc
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
            {error}
            <button
              type="button"
              className="ml-2 underline font-semibold"
              onClick={() => {
                loadSchedules();
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="px-4 md:px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          {LOAI_OPTIONS.slice(0, 6).map((o) => (
            <span
              key={o.value}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${loaiStyle(o.value)}`}
            >
              {o.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border font-bold bg-amber-100 text-amber-900 border-amber-300">
              Đang làm
            </span>
            trạng thái công việc
          </span>
        </div>

        {/* Calendar grid */}
        <div className="p-2 md:p-4">
          {loadingSched && (
            <div className="flex justify-center py-16 text-slate-500 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang tải lịch…
            </div>
          )}
          {!loadingSched && (
            <>
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                {WEEKDAYS.map((d) => (
                  <div
                    key={d}
                    className="bg-slate-100 text-center text-xs font-bold text-slate-600 py-2"
                  >
                    {d}
                  </div>
                ))}
                {range.days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(day, monthAnchor);
                  const list = byNgay[key] || [];
                  const isToday =
                    format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDayPanelDate(day)}
                      className={`min-h-[100px] md:min-h-[120px] text-left p-1.5 md:p-2 bg-white hover:bg-slate-50 transition-colors flex flex-col gap-1 ${
                        inMonth ? '' : 'opacity-40'
                      } ${isToday ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          isToday ? 'text-blue-600' : 'text-slate-700'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                        {list.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className={`text-[10px] md:text-[11px] leading-tight px-1 py-0.5 rounded border flex items-center gap-1 min-w-0 ${loaiStyle(
                              ev.loai
                            )}`}
                            title={`${empDisplayName(empById.get(String(ev.nhan_su_id)))} — ${loaiLabel(ev.loai)} · Đang làm`}
                          >
                            <span className="opacity-90 truncate min-w-0 flex-1">
                              {empDisplayName(empById.get(String(ev.nhan_su_id)))}
                            </span>
                            <span className="shrink-0 text-[8px] font-bold text-amber-900 whitespace-nowrap">
                              ĐL
                            </span>
                          </div>
                        ))}
                        {list.length > 3 && (
                          <span className="text-[10px] text-slate-500 pl-0.5">
                            +{list.length - 3}…
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Day detail panel */}
      {dayPanelDate && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-800 capitalize">
                  {format(dayPanelDate, "EEEE, dd/MM/yyyy", { locale: vi })}
                </p>
                <p className="text-xs text-slate-500">
                  {visibleSchedules.filter(
                    (s) => s.ngay === format(dayPanelDate, 'yyyy-MM-dd')
                  ).length}{' '}
                  mục
                </p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                onClick={() => setDayPanelDate(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {(byNgay[format(dayPanelDate, 'yyyy-MM-dd')] || []).length ===
              0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  Chưa có lịch trong ngày này.
                </p>
              ) : (
                (byNgay[format(dayPanelDate, 'yyyy-MM-dd')] || []).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/80"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {ev.tieu_de?.trim() || loaiLabel(ev.loai)}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 bg-amber-100 text-amber-900 border-amber-300">
                          Đang làm
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {empDisplayName(empById.get(String(ev.nhan_su_id)))}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formatTimeShort(ev.gio_bat_dau) &&
                        formatTimeShort(ev.gio_ket_thuc)
                          ? `${formatTimeShort(ev.gio_bat_dau)} – ${formatTimeShort(ev.gio_ket_thuc)}`
                          : 'Cả ngày'}
                        {' · '}
                        {loaiLabel(ev.loai)}
                      </p>
                      {ev.ghi_chu && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-3">
                          {ev.ghi_chu}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-600"
                        onClick={() => {
                          setEditing(ev);
                          setFormDate(ev.ngay);
                          setFormOpen(true);
                          setDayPanelDate(null);
                        }}
                        aria-label="Sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                type="button"
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                onClick={() => {
                  setEditing(null);
                  setFormDate(format(dayPanelDate, 'yyyy-MM-dd'));
                  setFormOpen(true);
                  setDayPanelDate(null);
                }}
              >
                <Plus size={18} /> Thêm lịch cho ngày này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <ScheduleFormModal
          key={editing?.id || `new-${formDate}`}
          employees={employees}
          initial={editing}
          defaultNgay={formDate}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={async () => {
            await loadSchedules();
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleFormModal({
  employees,
  initial,
  defaultNgay,
  onClose,
  onSaved
}: {
  employees: Employee[];
  initial: WorkSchedule | null;
  defaultNgay: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [nhanSuId, setNhanSuId] = useState(
    initial ? String(initial.nhan_su_id) : ''
  );
  const [ngay, setNgay] = useState(initial?.ngay || defaultNgay);
  const [gioBatDau, setGioBatDau] = useState(
    formatTimeShort(initial?.gio_bat_dau || null) || ''
  );
  const [gioKetThuc, setGioKetThuc] = useState(
    formatTimeShort(initial?.gio_ket_thuc || null) || ''
  );
  const [loai, setLoai] = useState(initial?.loai || 'ca');
  const [tieuDe, setTieuDe] = useState(initial?.tieu_de || '');
  const [ghiChu, setGhiChu] = useState(initial?.ghi_chu || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nhanSuId || !ngay) {
      alert('Chọn nhân sự và ngày.');
      return;
    }
    const hasStart = gioBatDau.trim().length > 0;
    const hasEnd = gioKetThuc.trim().length > 0;
    if (hasStart !== hasEnd) {
      alert('Nhập cả giờ bắt đầu và kết thúc, hoặc để trống cả hai (cả ngày).');
      return;
    }
    const payload = {
      nhan_su_id: nhanSuId,
      ngay,
      gio_bat_dau: hasStart ? `${gioBatDau}:00` : null,
      gio_ket_thuc: hasEnd ? `${gioKetThuc}:00` : null,
      loai,
      tieu_de: tieuDe.trim() || null,
      ghi_chu: ghiChu.trim() || null
    };
    try {
      setSaving(true);
      if (initial) {
        await workScheduleService.update(initial.id, payload);
      } else {
        await workScheduleService.create(payload);
      }
      await onSaved();
    } catch (err: any) {
      alert(err.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial || !window.confirm('Xóa mục lịch này?')) return;
    try {
      setSaving(true);
      await workScheduleService.delete(initial.id);
      await onSaved();
    } catch (err: any) {
      alert(err.message || 'Xóa thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">
            {initial ? 'Sửa lịch' : 'Thêm lịch làm việc'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Nhân sự *
            </label>
            <select
              required
              value={nhanSuId}
              onChange={(e) => setNhanSuId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Chọn —</option>
              {employees.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>
                  {empDisplayName(e)}
                  {e.phongBan ? ` (${e.phongBan})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ngày *
            </label>
            <input
              type="date"
              required
              value={ngay}
              onChange={(e) => setNgay(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={gioBatDau}
                onChange={(e) => setGioBatDau(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={gioKetThuc}
                onChange={(e) => setGioKetThuc(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Để trống giờ nếu là sự kiện cả ngày (nghỉ, lễ…).
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Loại
            </label>
            <select
              value={loai}
              onChange={(e) => setLoai(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {LOAI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tiêu đề
            </label>
            <input
              type="text"
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              placeholder="Tuỳ chọn, ví dụ: Ca sáng tại công trường"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ghi chú
            </label>
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-w-[120px] py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
            {initial && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="py-2.5 px-4 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 size={16} /> Xóa
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Huỷ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
