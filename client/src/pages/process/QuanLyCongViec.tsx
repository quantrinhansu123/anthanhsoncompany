import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  X,
  Pencil,
  Trash2,
  BookOpen,
  ChevronDown,
  Eye,
} from 'lucide-react';
import type { TaskRow } from '../../lib/services/taskService';
import { GiaHanCell } from '../../lib/giaHanDisplay';
import { contractService } from '../../lib/services/contractService';
import { customerService, type Customer } from '../../lib/services/customerService';
import { projectService, type Project } from '../../lib/services/projectService';
import { employeeService } from '../../lib/services/employeeService';
import {
  thuVienLoiService,
  type ThuVienLoiRow,
} from '../../lib/services/thuVienLoiService';
import {
  taskDetailService,
  type TaskDetailRow,
  type TaskDetailComment,
  type TaskDetailDocument,
  type TaskDetailHistory,
  type DanhSachCongViecItem,
  type TrangThaiDanhSachCongViec,
} from '../../lib/services/taskDetailService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PreviewLinkModal } from '../../components/PreviewLinkModal';

type StatusTab = 'all' | 'doing' | 'done' | 'pending';

const TV_FIELD_EMPTY = '__EMPTY__';

function thuVienFieldKey(v: string | null | undefined): string {
  const t = String(v ?? '').trim();
  return t === '' ? TV_FIELD_EMPTY : t;
}

function thuVienFieldLabel(k: string): string {
  return k === TV_FIELD_EMPTY ? '(Trống)' : k;
}

function isTrangThaiDaXong(s?: string | null): boolean {
  const t = String(s ?? '').trim();
  return t === 'Đã xong' || t === 'Hoàn thành';
}

function isTrangThaiChoDuyet(s?: string | null): boolean {
  return String(s ?? '').trim() === 'Chờ duyệt';
}

/** Hiển thị trạng thái ở danh sách trái (đồng bộ nhãn với giao diện mẫu). */
function displayTrangThaiList(s: string | null | undefined): string {
  const t = String(s ?? '').trim();
  if (t === 'Đang thực hiện') return 'Đang làm';
  return t || '—';
}

/** Hiển thị mô tả: giữ \n từ DB; tách các cụm bắt đầu bằng "+)" (sau khoảng trắng) xuống dòng. */
function formatMoTaDisplay(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  return t.replace(/(\s)\+\)\s*/g, '\n+) ');
}

function loiViPhamSelectButtonLabel(
  ids: string[],
  employees: Array<{ id: string; full_name: string; code: string }>,
): string {
  if (employees.length === 0) return 'Chưa có nhân sự';
  if (ids.length === 0) return '— Chọn —';
  if (ids.length === 1) {
    const e = employees.find((x) => x.id === ids[0]);
    return e?.full_name || e?.code || ids[0];
  }
  if (ids.length === 2) {
    const a = employees.find((x) => x.id === ids[0]);
    const b = employees.find((x) => x.id === ids[1]);
    const na = a?.full_name || a?.code || ids[0];
    const nb = b?.full_name || b?.code || ids[1];
    return `${na} · ${nb}`;
  }
  return `${ids.length} người đã chọn`;
}

function uniqueSortedThuVienKeys(
  rows: ThuVienLoiRow[],
  get: (r: ThuVienLoiRow) => string | null | undefined,
): string[] {
  const set = new Set(rows.map((r) => thuVienFieldKey(get(r))));
  return Array.from(set).sort((a, b) => {
    if (a === TV_FIELD_EMPTY) return -1;
    if (b === TV_FIELD_EMPTY) return 1;
    return a.localeCompare(b, 'vi');
  });
}

type DocDraftRow = { key: string; ten: string; link: string; mota: string };

function newDocDraftRow(): DocDraftRow {
  const key =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { key, ten: '', link: '', mota: '' };
}

function taiLieuToDraft(docs: TaskDetailDocument[] | undefined): DocDraftRow[] {
  const arr = Array.isArray(docs) && docs.length > 0 ? docs : [];
  if (arr.length === 0) return [newDocDraftRow()];
  return arr.map((d) => {
    const row = newDocDraftRow();
    return { ...row, ten: d.ten || '', link: d.link || '', mota: d.mota ?? '' };
  });
}

const LIST_CV_TRANG_THAI_OPTIONS: TrangThaiDanhSachCongViec[] = [
  'Đang làm',
  'Hoàn thành',
  'Duyệt',
  'Từ chối',
];

type ListCongViecDraftRow = {
  key: string;
  noi_dung: string;
  trang_thai: TrangThaiDanhSachCongViec;
  ly_do_tu_choi: string;
  ngay_gio_hoan_thanh: string;
  ghi_chu: string;
  /** Id nhân sự — chỉ chọn trong danh sách người phụ trách của công việc */
  nhan_su_phu_trach_ids: string[];
  ngay_gia_han_1: string;
  ngay_gia_han_2: string;
  ngay_gia_han_3: string;
};

function isListCvTrangThaiDone(st: TrangThaiDanhSachCongViec): boolean {
  return st === 'Hoàn thành' || st === 'Duyệt';
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  const s = local.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function newListCongViecDraftRow(): ListCongViecDraftRow {
  const key =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `lcv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    key,
    noi_dung: '',
    trang_thai: 'Đang làm',
    ly_do_tu_choi: '',
    ngay_gio_hoan_thanh: '',
    ghi_chu: '',
    nhan_su_phu_trach_ids: [],
    ngay_gia_han_1: '',
    ngay_gia_han_2: '',
    ngay_gia_han_3: '',
  };
}

/** Nhân sự khớp chuỗi «Người phụ trách» của công việc (tên / mã / id). */
function listCongViecPhuTrachOptions(
  task: TaskRow | null,
  employees: Array<{ id: string; full_name: string; code: string }>,
): Array<{ id: string; full_name: string; code: string }> {
  if (!task) return [];
  const raw = (task.nguoi_phu_trach || '').trim();
  if (!raw) return [];
  const tokens = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (tokens.length === 0) return [];
  const allowed = new Set(tokens.map((t) => String(t)));
  return employees.filter((e) => {
    const id = String(e.id ?? '');
    return allowed.has(e.full_name) || allowed.has(e.code) || allowed.has(id);
  });
}

function listCvPhuTrachDropdownLabel(
  ids: string[],
  options: Array<{ id: string; full_name: string; code: string }>,
): string {
  if (options.length === 0) return 'Chưa có người phụ trách ở công việc';
  if (ids.length === 0) return '— Chọn nhân sự —';
  const labels = ids.map((id) => {
    const e = options.find((x) => x.id === id);
    return e ? e.full_name || e.code || id : id;
  });
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} · ${labels[1]}`;
  return `${ids.length} người đã chọn`;
}

function listCvStatusBadgeClass(st: TrangThaiDanhSachCongViec): string {
  switch (st) {
    case 'Đang làm':
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 'Hoàn thành':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'Duyệt':
      return 'bg-violet-100 text-violet-900 border-violet-300';
    case 'Từ chối':
      return 'bg-red-100 text-red-900 border-red-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}

/** `datetime-local` → hiển thị ngắn */
function formatListCvDatetimeLocalShort(ymdhm: string): string {
  if (!ymdhm.trim()) return '';
  const d = new Date(ymdhm);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function danhSachCongViecToDraft(
  items: DanhSachCongViecItem[] | undefined,
): ListCongViecDraftRow[] {
  const arr = Array.isArray(items) && items.length > 0 ? items : [];
  if (arr.length === 0) return [newListCongViecDraftRow()];
  return arr.map((it) => ({
    key: it.id,
    noi_dung: it.noi_dung || '',
    trang_thai: it.trang_thai,
    ly_do_tu_choi: it.ly_do_tu_choi?.trim() ? it.ly_do_tu_choi : '',
    ngay_gio_hoan_thanh: isoToDatetimeLocal(it.ngay_gio_hoan_thanh),
    ghi_chu: it.ghi_chu?.trim() ? it.ghi_chu : '',
    nhan_su_phu_trach_ids: Array.isArray(it.nhan_su_phu_trach_ids)
      ? it.nhan_su_phu_trach_ids.map(String).filter(Boolean)
      : [],
    ngay_gia_han_1: it.ngay_gia_han_1?.trim() ? it.ngay_gia_han_1.trim().slice(0, 10) : '',
    ngay_gia_han_2: it.ngay_gia_han_2?.trim() ? it.ngay_gia_han_2.trim().slice(0, 10) : '',
    ngay_gia_han_3: it.ngay_gia_han_3?.trim() ? it.ngay_gia_han_3.trim().slice(0, 10) : '',
  }));
}

/** Thanh tiến độ danh sách trái: có `quy_trinh_items` thì % = bước Đạt / tổng bước; không thì dùng `tien_do` trong DB. */
function listProgressPercent(task: TaskRow): number {
  const items = task.ten_task_detail?.quy_trinh_items ?? [];
  if (items.length === 0) {
    const n = Number(task.tien_do ?? 0);
    if (Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }
  const done = items.filter((it) => (it.trang_thai || '').trim() === 'Đạt').length;
  return Math.round((done / items.length) * 100);
}

/** Ngày lịch địa phương (bỏ giờ) để đếm ngày khớp UI `toLocaleDateString('vi-VN')`. */
function taskCalendarDay(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Chuỗi `YYYY-MM-DD` từ input type=date → Date địa phương (0h). */
function parseDateInputYmd(ymd: string): Date | null {
  const s = ymd.trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function taskMatchesAssigneeFilter(
  task: TaskRow,
  employeeId: string,
  employees: Array<{ id: string; full_name: string; code: string }>,
): boolean {
  if (!employeeId.trim()) return true;
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return false;
  const raw = (task.nguoi_phu_trach || '').trim();
  if (!raw) return false;
  for (const tok of raw.split(',').map((x) => x.trim()).filter(Boolean)) {
    if (tok === emp.full_name || tok === emp.code || tok === emp.id) return true;
  }
  return false;
}

type ContractFilterRow = {
  id: string;
  so_hop_dong: string;
  ten_goi_thau: string;
  du_an_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  /** Tên chủ đầu tư (text) — dùng ghép với danh mục khách khi thiếu UUID */
  ten_day_du_chu_dau_tu?: string | null;
  nhan_su_ids?: string[] | null;
};

function normalizeTenDonVi(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Khớp tên đơn vị với bảng khách hàng (khi hợp đồng/dự án chỉ có text, không có customer_id). */
function findCustomerIdByTenDonVi(
  raw: string | null | undefined,
  catalog: Customer[],
): string | null {
  const n = normalizeTenDonVi(raw);
  if (!n) return null;
  for (const row of catalog) {
    if (normalizeTenDonVi(row.ten_don_vi) === n) return String(row.id);
  }
  return null;
}

/** `customer_id` trên dự án hoặc suy từ `ten_khach_hang` + bảng khách hàng */
function projectResolvedCustomerId(
  p: Project,
  catalog: Customer[],
): string | null {
  const cid = String(p.customer_id ?? '').trim();
  if (cid) return cid;
  if (catalog.length > 0) {
    const g = findCustomerIdByTenDonVi(p.ten_khach_hang, catalog);
    if (g) return g;
  }
  return null;
}

/** Khách hàng từ hợp đồng, dự án, hoặc ghép tên với danh mục khách_hang */
function resolveCustomerIdAndLabel(
  c: ContractFilterRow,
  projects: Project[],
  catalog: Customer[],
): { customerId: string; label: string } | null {
  let id = (c.customer_id || '').trim();
  let name = (c.customer_name || '').trim();

  if (!id && c.du_an_id) {
    const p = projects.find((x) => String(x.id) === String(c.du_an_id));
    if (p) {
      if (p.customer_id) {
        id = String(p.customer_id).trim();
        name = (p.customer_name || p.ten_khach_hang || '').trim() || name;
      } else if (catalog.length > 0) {
        const guess = findCustomerIdByTenDonVi(p.ten_khach_hang, catalog);
        if (guess) {
          id = guess;
          name = (p.ten_khach_hang || '').trim() || name;
        }
      }
    }
  }

  if (!id && name && catalog.length > 0) {
    const guess = findCustomerIdByTenDonVi(name, catalog);
    if (guess) id = guess;
  }

  if (!id && (c.ten_day_du_chu_dau_tu || '').trim() && catalog.length > 0) {
    const guess = findCustomerIdByTenDonVi(c.ten_day_du_chu_dau_tu, catalog);
    if (guess) {
      id = guess;
      name = name || String(c.ten_day_du_chu_dau_tu).trim();
    }
  }

  if (!id) return null;

  const catRow = catalog.find((x) => String(x.id) === id);
  if (catRow?.ten_don_vi) name = catRow.ten_don_vi;

  return { customerId: id, label: (name || '').trim() || id };
}

function taskMatchesKhachHangFilter(
  task: TaskRow,
  filterCustomerId: string,
  contracts: ContractFilterRow[],
  projects: Project[],
  catalog: Customer[],
): boolean {
  if (!filterCustomerId.trim()) return true;
  const hid = (task.hop_dong_id || '').trim();
  if (!hid) return false;
  const c = contracts.find((x) => x.id === hid);
  if (!c) return false;
  const resolved = resolveCustomerIdAndLabel(c, projects, catalog);
  return resolved?.customerId === filterCustomerId;
}

/** Id nhân sự gán cho dự án (QLDA / Thực hiện / mảng) */
function collectProjectPhuTrachIds(p: Project | null | undefined): Set<string> {
  const s = new Set<string>();
  if (!p) return s;
  const add = (x: string | null | undefined) => {
    const t = String(x ?? '').trim();
    if (t) s.add(t);
  };
  add(p.manager_id as string | undefined);
  add(p.executor_id as string | undefined);
  (p.manager_ids || []).forEach((x) => add(x));
  (p.executor_ids || []).forEach((x) => add(x));
  return s;
}

function taskNgayKetThucInRange(task: TaskRow, tu: string, den: string): boolean {
  const hasTu = tu.trim().length > 0;
  const hasDen = den.trim().length > 0;
  if (!hasTu && !hasDen) return true;
  const end = taskCalendarDay(task.ngay_ket_thuc);
  if (!end) return false;
  const tuD = hasTu ? parseDateInputYmd(tu) : null;
  const denD = hasDen ? parseDateInputYmd(den) : null;
  if (tuD && end.getTime() < tuD.getTime()) return false;
  if (denD && end.getTime() > denD.getTime()) return false;
  return true;
}

/** Số ngày từ ngày bắt đầu đến ngày kết thúc (tính cả hai mốc). */
function inclusiveCalendarDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** Số ngày từ hôm nay đến ngày kết thúc (âm = đã quá hạn). */
function calendarDaysFromTodayTo(end: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((end.getTime() - today.getTime()) / 86400000);
}

type TaskListScrollBodyProps = {
  loading: boolean;
  filtered: TaskRow[];
  selectedId: string | undefined;
  onSelectTask: (task: TaskRow) => void;
  contractLabelById: (id: string | null | undefined) => string;
  onOpenEditModal: (task: TaskRow) => void;
  onDeleteTask: (task: TaskRow) => void;
};

/** Tránh render lại cả danh sách khi chỉ state form / panel phải đổi (gõ phím mượt hơn). */
const QuanLyCongViecTaskListScrollBody = React.memo(function QuanLyCongViecTaskListScrollBody({
  loading,
  filtered,
  selectedId,
  onSelectTask,
  contractLabelById,
  onOpenEditModal,
  onDeleteTask,
}: TaskListScrollBodyProps) {
  if (loading) {
    return <p className="px-2 py-2 text-[11px] text-slate-600">Đang tải…</p>;
  }
  if (filtered.length === 0) {
    return (
      <p className="px-2 py-2 text-[11px] text-slate-600">Không có công việc.</p>
    );
  }
  return (
    <div className="space-y-1 px-0.5">
      {filtered.map((task, index) => {
        const isActive = selectedId != null && selectedId === task.id;
        const listPct = listProgressPercent(task);
        const hopDongLabel = task.hop_dong_id
          ? contractLabelById(task.hop_dong_id)
          : '';
        return (
          <div
            key={`${task.id}-${index}`}
            className={`w-full px-2 py-2 border-l-[3px] rounded-r-md flex items-start justify-between gap-1.5 ${
              isActive
                ? 'bg-blue-100 border-blue-700 shadow-sm ring-1 ring-blue-200/80'
                : 'bg-slate-50/90 border-transparent hover:bg-slate-200/90 ring-1 ring-slate-200/80'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectTask(task)}
              className="flex-1 min-w-0 text-left flex flex-col gap-1"
            >
              <span
                className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight"
                title={task.ten_task}
              >
                {task.ten_task}
              </span>
              {task.hop_dong_id ? (
                <span
                  className="text-[9px] font-medium text-slate-600 line-clamp-1 leading-tight"
                  title={hopDongLabel}
                >
                  {hopDongLabel}
                </span>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="flex-1 min-w-0 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                      style={{ width: `${listPct}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-emerald-800 tabular-nums shrink-0 w-7 text-right">
                    {listPct}%
                  </span>
                </div>
                <span
                  className="text-[9px] font-bold text-slate-800 shrink-0 max-w-[4.5rem] truncate"
                  title={task.trang_thai}
                >
                  {task.trang_thai}
                </span>
              </div>
            </button>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                title="Sửa công việc"
                aria-label="Sửa công việc"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditModal(task);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-amber-600 bg-amber-100 text-amber-900 hover:bg-amber-200"
              >
                <Pencil className="w-3 h-3" aria-hidden />
              </button>
              <button
                type="button"
                title="Xóa công việc"
                aria-label="Xóa công việc"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full border border-red-600 bg-red-100 text-red-800 hover:bg-red-200"
              >
                <Trash2 className="w-3 h-3" aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export function QuanLyCongViec() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  /** Rỗng = tất cả hợp đồng; có phần tử = chỉ công việc thuộc các hợp đồng đã chọn */
  const [filterHopDongIds, setFilterHopDongIds] = useState<string[]>([]);
  /** Rỗng = tất cả khách hàng (theo hợp đồng / dự án) */
  const [filterKhachHangId, setFilterKhachHangId] = useState('');
  /** Rỗng = tất cả nhân sự; khớp với `nguoi_phu_trach` (tên/code đã lưu) */
  const [filterNhanSuId, setFilterNhanSuId] = useState('');
  /** Lọc theo ngày kết thúc (YYYY-MM-DD), để trống = không giới hạn cạnh đó */
  const [filterKetThucTu, setFilterKetThucTu] = useState('');
  const [filterKetThucDen, setFilterKetThucDen] = useState('');
  const [contractFilterOpen, setContractFilterOpen] = useState(false);
  const [contractFilterSearch, setContractFilterSearch] = useState('');
  const contractFilterRef = useRef<HTMLDivElement>(null);
  const contractFilterSearchRef = useRef<HTMLInputElement>(null);
  const [khachHangFilterOpen, setKhachHangFilterOpen] = useState(false);
  const [khachHangFilterSearch, setKhachHangFilterSearch] = useState('');
  const khachHangFilterRef = useRef<HTMLDivElement>(null);
  const khachHangFilterSearchRef = useRef<HTMLInputElement>(null);
  const [nhanSuFilterOpen, setNhanSuFilterOpen] = useState(false);
  const [nhanSuFilterSearch, setNhanSuFilterSearch] = useState('');
  const nhanSuFilterRef = useRef<HTMLDivElement>(null);
  const nhanSuFilterSearchRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const [contracts, setContracts] = useState<ContractFilterRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  /** Danh mục khách từ bảng khach_hang — đủ mục lọc; ghép thêm từ hợp đồng/dự án nếu thiếu */
  const [customersCatalog, setCustomersCatalog] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** `null` = thêm mới; có giá trị = đang sửa công việc (id hiển thị trong list = task_id hoặc id chi tiết) */
  const [taskModalEditingId, setTaskModalEditingId] = useState<string | null>(null);
  /** Form thêm/sửa CV: cascade Khách hàng → Dự án → Hợp đồng */
  const [modalKhachHangId, setModalKhachHangId] = useState('');
  const [modalDuAnId, setModalDuAnId] = useState('');
  const [modalKhachHangOpen, setModalKhachHangOpen] = useState(false);
  const [modalKhachHangSearch, setModalKhachHangSearch] = useState('');
  const modalKhachHangPickerRef = useRef<HTMLDivElement>(null);
  const modalKhachHangSearchRef = useRef<HTMLInputElement>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docDraftRows, setDocDraftRows] = useState<DocDraftRow[]>([newDocDraftRow()]);
  const [docSaving, setDocSaving] = useState(false);
  const [listCongViecDraftRows, setListCongViecDraftRows] = useState<ListCongViecDraftRow[]>([
    newListCongViecDraftRow(),
  ]);
  const [listCongViecSaving, setListCongViecSaving] = useState(false);
  /** Popup nhập lý do khi chọn trạng thái Từ chối */
  const [listCvTuChoiModal, setListCvTuChoiModal] = useState<{
    rowKey: string;
    lyDo: string;
  } | null>(null);
  /** Dòng nào đang mở dropdown chọn nhân sự phụ trách (list công việc) */
  const [listCvPhuTrachOpenRow, setListCvPhuTrachOpenRow] = useState<string | null>(null);
  /** Dòng list công việc đang mở rộng (chỉnh sửa đầy đủ) */
  const [listCvRowExpanded, setListCvRowExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<
    Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>
  >({
    hop_dong_id: '',
    ten_task: '',
    mo_ta: '',
    trang_thai: 'Chờ duyệt',
    uu_tien: 'Trung bình',
    ngay_bat_dau: '',
    ngay_ket_thuc: '',
    ngay_hoan_thanh: '',
    nguoi_phu_trach: '',
    tien_do: 0,
    ghi_chu: '',
  });
  const [employees, setEmployees] = useState<
    Array<{ id: string; full_name: string; code: string; avatar?: string | null }>
  >([]);
  const [thuVienLoiList, setThuVienLoiList] = useState<ThuVienLoiRow[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [detailTabState, setDetailTabState] = useState<
    'NOI_DUNG' | 'BINH_LUAN' | 'TAI_LIEU' | 'LIST_CONG_VIEC' | 'LICH_SU' | 'LOI_GHI_NHAN'
  >('NOI_DUNG');
  /** Giá trị option = chuỗi thật hoặc `__EMPTY__` nếu trống */
  const [loiCascadeChuyen, setLoiCascadeChuyen] = useState('');
  const [loiCascadeBoMon, setLoiCascadeBoMon] = useState('');
  const [loiCascadeCanhBao, setLoiCascadeCanhBao] = useState('');
  const [loiCascadeHangMuc, setLoiCascadeHangMuc] = useState('');
  const [loiCascadeNoiDung, setLoiCascadeNoiDung] = useState('');
  /** Khi >1 dòng thư viện khớp cả 5 cấp — chọn đúng id */
  const [loiCascadePickId, setLoiCascadePickId] = useState('');
  const [loiFormNguoiIds, setLoiFormNguoiIds] = useState<string[]>([]);
  const [loiFormGhiChu, setLoiFormGhiChu] = useState('');
  const [loiSaving, setLoiSaving] = useState(false);
  const [loiNguoiViPhamOpen, setLoiNguoiViPhamOpen] = useState(false);
  const loiNguoiViPhamRef = useRef<HTMLDivElement>(null);
  const loiNguoiViPhamTriggerRef = useRef<HTMLButtonElement>(null);
  const loiNguoiViPhamMenuRef = useRef<HTMLDivElement>(null);
  const [loiNguoiMenuBox, setLoiNguoiMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [commentsByTask, setCommentsByTask] = useState<
    Record<
      string,
      { id: string; nhan_su: string; noi_dung: string; time: string }[]
    >
  >({});
  const [detailByTask, setDetailByTask] = useState<Record<string, TaskDetailRow>>({});
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  useEffect(() => {
    if (!selected?.id) {
      setDocDraftRows([newDocDraftRow()]);
      return;
    }
    const docs = (detailByTask[selected.id]?.tai_lieu || []) as TaskDetailDocument[];
    setDocDraftRows(taiLieuToDraft(docs));
  }, [selected?.id, detailByTask[selected?.id || '']?.tai_lieu]);

  useEffect(() => {
    if (!selected?.id) {
      setListCongViecDraftRows([newListCongViecDraftRow()]);
      return;
    }
    const items = detailByTask[selected.id]?.danh_sach_cong_viec;
    setListCongViecDraftRows(danhSachCongViecToDraft(items));
  }, [selected?.id, detailByTask[selected?.id || '']?.danh_sach_cong_viec]);

  useEffect(() => {
    if (!contractFilterOpen) {
      setContractFilterSearch('');
      return;
    }
    const t = window.setTimeout(() => contractFilterSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [contractFilterOpen]);

  useEffect(() => {
    if (!contractFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (contractFilterRef.current?.contains(el)) return;
      setContractFilterOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [contractFilterOpen]);

  useEffect(() => {
    if (!khachHangFilterOpen) {
      setKhachHangFilterSearch('');
      return;
    }
    const t = window.setTimeout(() => khachHangFilterSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [khachHangFilterOpen]);

  useEffect(() => {
    if (!khachHangFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (khachHangFilterRef.current?.contains(el)) return;
      setKhachHangFilterOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [khachHangFilterOpen]);

  useEffect(() => {
    if (!nhanSuFilterOpen) {
      setNhanSuFilterSearch('');
      return;
    }
    const t = window.setTimeout(() => nhanSuFilterSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [nhanSuFilterOpen]);

  useEffect(() => {
    if (!nhanSuFilterOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (nhanSuFilterRef.current?.contains(el)) return;
      setNhanSuFilterOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [nhanSuFilterOpen]);

  /** Hợp đồng thuộc khách đang chọn (hoặc tất cả nếu chưa chọn khách) */
  const contractsScopedByKhach = useMemo(() => {
    const kid = filterKhachHangId.trim();
    if (!kid) return contracts;
    return contracts.filter((c) => {
      const r = resolveCustomerIdAndLabel(c, projects, customersCatalog);
      return r?.customerId === kid;
    });
  }, [contracts, filterKhachHangId, projects, customersCatalog]);

  const contractsMatchingFilter = useMemo(() => {
    const q = contractFilterSearch.trim().toLowerCase();
    const base = contractsScopedByKhach;
    if (!q) return base;
    return base.filter((c) => {
      const label = (c.ten_goi_thau || c.so_hop_dong || c.id).toLowerCase();
      return label.includes(q) || String(c.id).toLowerCase().includes(q);
    });
  }, [contractsScopedByKhach, contractFilterSearch]);

  useEffect(() => {
    const kid = filterKhachHangId.trim();
    setFilterHopDongIds((prev) => {
      if (prev.length === 0) return prev;
      const allowed = new Set(
        contracts
          .filter((c) => {
            if (!kid) return true;
            const r = resolveCustomerIdAndLabel(c, projects, customersCatalog);
            return r?.customerId === kid;
          })
          .map((c) => c.id),
      );
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [filterKhachHangId, contracts, projects, customersCatalog]);

  useLayoutEffect(() => {
    if (!loiNguoiViPhamOpen) {
      setLoiNguoiMenuBox(null);
      return;
    }
    const btn = loiNguoiViPhamTriggerRef.current;
    if (!btn) return;
    const place = () => {
      const r = btn.getBoundingClientRect();
      const gap = 4;
      const top = r.bottom + gap;
      const maxHeight = Math.max(140, window.innerHeight - top - 12);
      setLoiNguoiMenuBox({
        top,
        left: r.left,
        width: r.width,
        maxHeight,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [loiNguoiViPhamOpen]);

  useEffect(() => {
    if (!loiNguoiViPhamOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (loiNguoiViPhamRef.current?.contains(el)) return;
      if (loiNguoiViPhamMenuRef.current?.contains(el)) return;
      setLoiNguoiViPhamOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [loiNguoiViPhamOpen]);

  const [hopDongDraft, setHopDongDraft] = useState('');
  const [contractAssignSaving, setContractAssignSaving] = useState(false);
  const [duyetSaving, setDuyetSaving] = useState(false);

  useEffect(() => {
    setHopDongDraft(selected?.hop_dong_id ?? '');
  }, [selected?.id, selected?.hop_dong_id]);

  useEffect(() => {
    setLoiCascadeChuyen('');
    setLoiCascadeBoMon('');
    setLoiCascadeCanhBao('');
    setLoiCascadeHangMuc('');
    setLoiCascadeNoiDung('');
    setLoiCascadePickId('');
    setLoiFormNguoiIds([]);
    setLoiFormGhiChu('');
    setLoiNguoiViPhamOpen(false);
  }, [selected?.id]);

  const loiOptsChuyen = useMemo(
    () => uniqueSortedThuVienKeys(thuVienLoiList, (r) => r.chuyen_nganh),
    [thuVienLoiList],
  );

  const loiFilteredChuyen = useMemo(() => {
    if (!loiCascadeChuyen) return [] as ThuVienLoiRow[];
    return thuVienLoiList.filter(
      (r) => thuVienFieldKey(r.chuyen_nganh) === loiCascadeChuyen,
    );
  }, [thuVienLoiList, loiCascadeChuyen]);

  const loiOptsBoMon = useMemo(
    () => uniqueSortedThuVienKeys(loiFilteredChuyen, (r) => r.bo_mon),
    [loiFilteredChuyen],
  );

  const loiFilteredBoMon = useMemo(() => {
    if (!loiCascadeBoMon) return [] as ThuVienLoiRow[];
    return loiFilteredChuyen.filter(
      (r) => thuVienFieldKey(r.bo_mon) === loiCascadeBoMon,
    );
  }, [loiFilteredChuyen, loiCascadeBoMon]);

  const loiOptsCanhBao = useMemo(
    () => uniqueSortedThuVienKeys(loiFilteredBoMon, (r) => r.canh_bao_loi),
    [loiFilteredBoMon],
  );

  const loiFilteredCanhBao = useMemo(() => {
    if (!loiCascadeCanhBao) return [] as ThuVienLoiRow[];
    return loiFilteredBoMon.filter(
      (r) => thuVienFieldKey(r.canh_bao_loi) === loiCascadeCanhBao,
    );
  }, [loiFilteredBoMon, loiCascadeCanhBao]);

  const loiOptsHangMuc = useMemo(
    () =>
      uniqueSortedThuVienKeys(loiFilteredCanhBao, (r) => r.hang_muc_kiem_tra),
    [loiFilteredCanhBao],
  );

  const loiFilteredHangMuc = useMemo(() => {
    if (!loiCascadeHangMuc) return [] as ThuVienLoiRow[];
    return loiFilteredCanhBao.filter(
      (r) => thuVienFieldKey(r.hang_muc_kiem_tra) === loiCascadeHangMuc,
    );
  }, [loiFilteredCanhBao, loiCascadeHangMuc]);

  const loiOptsNoiDung = useMemo(
    () =>
      uniqueSortedThuVienKeys(loiFilteredHangMuc, (r) => r.noi_dung_kiem_tra),
    [loiFilteredHangMuc],
  );

  const loiMatchingRows = useMemo(() => {
    if (!loiCascadeNoiDung) return [] as ThuVienLoiRow[];
    return loiFilteredHangMuc.filter(
      (r) => thuVienFieldKey(r.noi_dung_kiem_tra) === loiCascadeNoiDung,
    );
  }, [loiFilteredHangMuc, loiCascadeNoiDung]);

  const loiResolvedThuVien = useMemo((): ThuVienLoiRow | null => {
    if (loiMatchingRows.length === 1) return loiMatchingRows[0];
    if (loiMatchingRows.length > 1) {
      if (!loiCascadePickId) return null;
      return loiMatchingRows.find((r) => r.id === loiCascadePickId) ?? null;
    }
    return null;
  }, [loiMatchingRows, loiCascadePickId]);

  useEffect(() => {
    const ids = new Set(loiMatchingRows.map((r) => r.id));
    if (loiCascadePickId && !ids.has(loiCascadePickId)) {
      setLoiCascadePickId('');
    }
  }, [loiMatchingRows, loiCascadePickId]);

  const contractLabelById = useCallback(
    (id: string | null | undefined) => {
      if (!id) return '';
      const c = contracts.find((ct) => ct.id === id);
      return c ? c.ten_goi_thau || c.so_hop_dong || c.id : id;
    },
    [contracts],
  );

  const handleOpenTaskEditModal = useCallback(
    (task: TaskRow) => {
      setFormData({
        hop_dong_id: task.hop_dong_id || '',
        ten_task: task.ten_task,
        mo_ta: task.mo_ta || '',
        trang_thai: task.trang_thai,
        uu_tien: task.uu_tien,
        ngay_bat_dau: task.ngay_bat_dau || '',
        ngay_ket_thuc: task.ngay_ket_thuc || '',
        ngay_hoan_thanh: task.ngay_hoan_thanh || '',
        nguoi_phu_trach: task.nguoi_phu_trach || '',
        tien_do: task.tien_do ?? 0,
        ghi_chu: task.ghi_chu || '',
      });
      const epIds: string[] = [];
      for (const n of (task.nguoi_phu_trach || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        const emp = employees.find((e) => e.full_name === n || e.code === n);
        if (emp && !epIds.includes(emp.id)) epIds.push(emp.id);
      }
      setSelectedEmployeeIds(epIds);
      const ct = contracts.find((x) => x.id === (task.hop_dong_id || ''));
      if (ct) {
        const r = resolveCustomerIdAndLabel(ct, projects, customersCatalog);
        setModalKhachHangId(r?.customerId ?? '');
        setModalDuAnId(ct.du_an_id != null ? String(ct.du_an_id) : '');
      } else {
        setModalKhachHangId('');
        setModalDuAnId('');
      }
      setTaskModalEditingId(task.id);
      setIsModalOpen(true);
    },
    [employees, contracts, projects, customersCatalog],
  );

  useEffect(() => {
    let cancelled = false;

    void thuVienLoiService
      .getAll()
      .then((rows) => {
        if (!cancelled) setThuVienLoiList(rows || []);
      })
      .catch((err) => {
        console.warn('[QuanLyCongViec] thu_vien_loi:', err);
        if (!cancelled) setThuVienLoiList([]);
      });

    (async () => {
      try {
        setLoading(true);
        const [data, contractsData, projectsData, employeesData, khachHangData] =
          await Promise.all([
            taskDetailService.getAllAsTasks(),
            contractService.getAll(),
            projectService.getAll().catch((err) => {
              console.warn('[QuanLyCongViec] projects:', err);
              return [] as Project[];
            }),
            employeeService.getAll(),
            customerService.getAll().catch((err) => {
              console.warn('[QuanLyCongViec] khach_hang:', err);
              return [] as Customer[];
            }),
          ]);
        if (cancelled) return;

        setTasks(data || []);
        setProjects(projectsData || []);
        setCustomersCatalog(Array.isArray(khachHangData) ? khachHangData : []);
        setContracts(
          (contractsData || []).map((c) => ({
            id: c.id!,
            so_hop_dong: c.so_hop_dong || '',
            ten_goi_thau: c.ten_goi_thau || '',
            du_an_id: c.du_an_id != null ? String(c.du_an_id) : null,
            customer_id:
              c.customer_id != null && String(c.customer_id).trim() !== ''
                ? String(c.customer_id).trim()
                : null,
            customer_name: c.customer_name?.trim() ? c.customer_name : null,
            ten_day_du_chu_dau_tu: (c.ten_day_du_chu_dau_tu || '').trim()
              ? String(c.ten_day_du_chu_dau_tu).trim()
              : null,
            nhan_su_ids: Array.isArray((c as any).nhan_su_ids)
              ? (c as any).nhan_su_ids
                  .map((x: any) => String(x))
                  .filter(Boolean)
              : (c as any).nhan_su_id
                ? [(c as any).nhan_su_id].map((x: any) => String(x)).filter(Boolean)
                : [],
          })),
        );
        setEmployees(
          (employeesData || []).map((e: any) => ({
            id: e.id?.toString(),
            full_name: e.full_name || e.name || e.hoTen || '',
            code: e.code || '',
            avatar: (e as any).anh_nhan_su || e.anh_nhan_su || null,
          })),
        );

        if (data && data.length > 0) {
          const first = data[0];
          setSelected(first);
          const firstId = first.id;
          void taskDetailService.getOrCreateByTaskId(firstId).then((detail) => {
            if (cancelled || !detail) return;
            setDetailByTask((prev) => ({ ...prev, [firstId]: detail }));
            setCommentsByTask((prev) => ({
              ...prev,
              [firstId]: (detail.binh_luan || []) as any,
            }));
          });
        }
      } catch (error) {
        console.error('[QuanLyCongViec] Error loading tasks:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const tasksInContractScope = useMemo(() => {
    if (filterHopDongIds.length === 0) return tasks;
    const set = new Set(filterHopDongIds.map((x) => x.trim()).filter(Boolean));
    return tasks.filter((t) => set.has((t.hop_dong_id || '').trim()));
  }, [tasks, filterHopDongIds]);

  const khachHangFilterOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of customersCatalog) {
      const id = String(row.id ?? '').trim();
      if (!id) continue;
      const label = (row.ten_don_vi || '').trim() || id;
      byId.set(id, label);
    }
    for (const c of contracts) {
      const r = resolveCustomerIdAndLabel(c, projects, customersCatalog);
      if (r && !byId.has(r.customerId)) byId.set(r.customerId, r.label);
    }
    for (const p of projects) {
      const cid = String(p.customer_id ?? '').trim();
      if (!cid) continue;
      const plab = (p.customer_name || p.ten_khach_hang || '').trim() || cid;
      if (!byId.has(cid)) byId.set(cid, plab);
    }
    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [customersCatalog, contracts, projects]);

  const khachHangMatchingFilter = useMemo(() => {
    const q = khachHangFilterSearch.trim().toLowerCase();
    if (!q) return khachHangFilterOptions;
    return khachHangFilterOptions.filter(
      (k) =>
        k.label.toLowerCase().includes(q) || String(k.id).toLowerCase().includes(q),
    );
  }, [khachHangFilterOptions, khachHangFilterSearch]);

  /** Ô tìm trong modal Thêm/Sửa công việc */
  const khachHangModalSearchMatching = useMemo(() => {
    const q = modalKhachHangSearch.trim().toLowerCase();
    if (!q) return khachHangFilterOptions;
    return khachHangFilterOptions.filter(
      (k) =>
        k.label.toLowerCase().includes(q) || String(k.id).toLowerCase().includes(q),
    );
  }, [khachHangFilterOptions, modalKhachHangSearch]);

  const khachHangLabelById = (id: string) =>
    khachHangFilterOptions.find((x) => x.id === id)?.label || id;

  const employeesSorted = useMemo(
    () =>
      employees
        .slice()
        .sort((a, b) =>
          (a.full_name || a.code).localeCompare(b.full_name || b.code, 'vi'),
        ),
    [employees],
  );

  const nhanSuMatchingFilter = useMemo(() => {
    const q = nhanSuFilterSearch.trim().toLowerCase();
    if (!q) return employeesSorted;
    return employeesSorted.filter((e) => {
      const name = (e.full_name || '').toLowerCase();
      const code = (e.code || '').toLowerCase();
      const id = String(e.id || '').toLowerCase();
      return name.includes(q) || code.includes(q) || id.includes(q);
    });
  }, [employeesSorted, nhanSuFilterSearch]);

  const nhanSuLabelById = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? e.full_name || e.code || id : id;
  };

  const projectsForTaskModal = useMemo(() => {
    const kid = modalKhachHangId.trim();
    if (!kid) return [] as Project[];
    return projects
      .filter((p) => projectResolvedCustomerId(p, customersCatalog) === kid)
      .slice()
      .sort((a, b) =>
        (a.ten_du_an || '').localeCompare(b.ten_du_an || '', 'vi'),
      );
  }, [projects, modalKhachHangId, customersCatalog]);

  const contractsForTaskModal = useMemo(() => {
    const du = modalDuAnId.trim();
    if (!du) return [] as ContractFilterRow[];
    const kid = modalKhachHangId.trim();
    return contracts.filter((c) => {
      if (String(c.du_an_id ?? '').trim() !== du) return false;
      if (!kid) return true;
      const r = resolveCustomerIdAndLabel(c, projects, customersCatalog);
      return r?.customerId === kid;
    });
  }, [contracts, modalDuAnId, modalKhachHangId, projects, customersCatalog]);

  useEffect(() => {
    if (!isModalOpen) {
      setModalKhachHangId('');
      setModalDuAnId('');
      setModalKhachHangOpen(false);
      setModalKhachHangSearch('');
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!modalKhachHangOpen) {
      setModalKhachHangSearch('');
      return;
    }
    const t = window.setTimeout(() => modalKhachHangSearchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [modalKhachHangOpen]);

  useEffect(() => {
    if (!modalKhachHangOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (modalKhachHangPickerRef.current?.contains(el)) return;
      setModalKhachHangOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [modalKhachHangOpen]);

  const tasksInCustomerScope = useMemo(() => {
    if (!filterKhachHangId.trim()) return tasksInContractScope;
    return tasksInContractScope.filter((t) =>
      taskMatchesKhachHangFilter(t, filterKhachHangId, contracts, projects, customersCatalog),
    );
  }, [tasksInContractScope, filterKhachHangId, contracts, projects, customersCatalog]);

  const tasksAfterAssigneeAndDate = useMemo(() => {
    let list = tasksInCustomerScope;
    if (filterNhanSuId.trim()) {
      list = list.filter((t) => taskMatchesAssigneeFilter(t, filterNhanSuId, employees));
    }
    if (filterKetThucTu.trim() || filterKetThucDen.trim()) {
      list = list.filter((t) => taskNgayKetThucInRange(t, filterKetThucTu, filterKetThucDen));
    }
    return list;
  }, [
    tasksInCustomerScope,
    filterNhanSuId,
    filterKetThucTu,
    filterKetThucDen,
    employees,
  ]);

  const filtered = useMemo(() => {
    let list = tasksAfterAssigneeAndDate;
    if (activeTab === 'doing') {
      list = list.filter((t) => t.trang_thai === 'Đang thực hiện');
    } else if (activeTab === 'done') {
      list = list.filter((t) => isTrangThaiDaXong(t.trang_thai));
    } else if (activeTab === 'pending') {
      list = list.filter((t) => isTrangThaiChoDuyet(t.trang_thai));
    }
    if (deferredSearch.trim()) {
      const term = deferredSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.ten_task.toLowerCase().includes(term) ||
          (t.mo_ta || '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [tasksAfterAssigneeAndDate, activeTab, deferredSearch]);

  const handleDeleteTaskFromList = useCallback(
    (task: TaskRow) => {
      if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
        return;
      }
      (async () => {
        try {
          await taskDetailService.deleteByTaskId(task.id);
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          setSelected((prev) => {
            if (!prev || prev.id !== task.id) return prev;
            return filtered.find((t) => t.id !== task.id) || null;
          });
        } catch (err) {
          console.error('[QuanLyCongViec] Error deleting task:', err);
          alert('Lỗi khi xóa công việc');
        }
      })();
    },
    [filtered],
  );

  // Nếu có truyền `taskId` qua URL, tự chọn đúng task để người dùng bấm từ nơi khác.
  useEffect(() => {
    if (!taskIdFromUrl) return;
    // Đảm bảo task nằm trong filtered list.
    setActiveTab('all');
    setSearch('');
    setFilterHopDongIds([]);
    setFilterKhachHangId('');
    setFilterNhanSuId('');
    setFilterKetThucTu('');
    setFilterKetThucDen('');

    const found = tasks.find((t) => String(t.id) === String(taskIdFromUrl));
    if (!found) return;

    setSelected(found);
    setDetailTabState('NOI_DUNG');

    (async () => {
      if (!detailByTask[found.id]) {
        const detail = await taskDetailService.getOrCreateByTaskId(found.id);
        if (detail) {
          setDetailByTask((prev) => ({ ...prev, [found.id]: detail }));
          setCommentsByTask((prev) => ({
            ...prev,
            [found.id]: (detail.binh_luan || []) as any,
          }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdFromUrl, tasks]);

  useEffect(() => {
    (async () => {
      // Nếu đang deep-link theo `taskId`, không tự đổi selected theo filtered.
      if (taskIdFromUrl) return;

      if (selected && !filtered.find((t) => t.id === selected.id)) {
        const next = filtered[0] || null;
        setSelected(next);
        setDetailTabState('NOI_DUNG');
        if (next && !detailByTask[next.id]) {
          const detail = await taskDetailService.getOrCreateByTaskId(next.id);
          if (detail) {
            setDetailByTask((prev) => ({ ...prev, [next.id]: detail }));
            setCommentsByTask((prev) => ({
              ...prev,
              [next.id]: (detail.binh_luan || []) as any,
            }));
          }
        }
      }
    })();
  }, [filtered, selected, detailByTask, taskIdFromUrl]);

  // Load detail khi đổi công việc (tab chi tiết + quy trình)
  useEffect(() => {
    if (!selected) return;
    if (detailByTask[selected.id]) return;
    (async () => {
      const detail = await taskDetailService.getOrCreateByTaskId(selected.id);
      if (detail) {
        setDetailByTask((prev) => ({ ...prev, [selected.id]: detail }));
        setCommentsByTask((prev) => ({
          ...prev,
          [selected.id]: (detail.binh_luan || []) as any,
        }));
      }
    })();
  }, [selected?.id]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Chờ duyệt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-amber-950 border border-amber-700 shadow-sm">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </span>
        );
      case 'Đã xong':
      case 'Hoàn thành':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white border border-emerald-700 shadow-sm">
            <CheckCircle2 className="w-3 h-3" />
            {status === 'Hoàn thành' ? 'Hoàn thành' : 'Đã xong'}
          </span>
        );
      case 'Đang thực hiện':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-800 text-white border border-blue-950 shadow-sm">
            <Clock className="w-3 h-3" />
            Đang làm
          </span>
        );
      case 'Tạm dừng':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-amber-950 border border-amber-700 shadow-sm">
            <AlertCircle className="w-3 h-3" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-600 text-white border border-slate-800 shadow-sm">
            <Clock className="w-3 h-3" />
            Chưa bắt đầu
          </span>
        );
    }
  };

  const statusCounts = useMemo(() => {
    const list = tasksAfterAssigneeAndDate;
    const all = list.length;
    const doing = list.filter((t) => t.trang_thai === 'Đang thực hiện').length;
    const done = list.filter((t) => isTrangThaiDaXong(t.trang_thai)).length;
    const pending = list.filter((t) => isTrangThaiChoDuyet(t.trang_thai)).length;
    return { all, doing, done, pending };
  }, [tasksAfterAssigneeAndDate]);

  /** Tab Lịch sử: sự kiện hệ thống (tạo/sửa công việc…), mới nhất trước */
  const lichSuTimelineItems = useMemo(() => {
    if (!selected?.id) return [];
    const hist = (detailByTask[selected.id]?.lich_su || []) as TaskDetailHistory[];
    return hist
      .map((h) => ({
        kind: 'system' as const,
        time: h.time ? new Date(h.time).getTime() : 0,
        h,
      }))
      .sort((a, b) => b.time - a.time);
  }, [selected?.id, detailByTask]);

  const selectedNgayThongKe = useMemo(() => {
    if (!selected) {
      return {
        soNgayThucHien: null as number | null,
        conLaiText: '—',
        conLaiClass: 'text-slate-950',
      };
    }
    const s = taskCalendarDay(selected.ngay_bat_dau);
    const e = taskCalendarDay(selected.ngay_ket_thuc);
    let soNgayThucHien: number | null = null;
    if (s && e && e >= s) {
      soNgayThucHien = inclusiveCalendarDays(s, e);
    }
    let conLaiText = '—';
    let conLaiClass = 'text-slate-950';
    if (isTrangThaiDaXong(selected.trang_thai)) {
      conLaiText = '—';
    } else if (e) {
      const d = calendarDaysFromTodayTo(e);
      if (d < 0) {
        conLaiText = `Quá hạn ${Math.abs(d)} ngày`;
        conLaiClass = 'text-red-700';
      } else if (d === 0) {
        conLaiText = '0 (hôm nay)';
        conLaiClass = 'text-amber-800';
      } else {
        conLaiText = `${d} ngày`;
      }
    }
    return { soNgayThucHien, conLaiText, conLaiClass };
  }, [selected]);

  const listCvPhuTrachOptions = useMemo(
    () => listCongViecPhuTrachOptions(selected, employees),
    [selected?.id, selected?.nguoi_phu_trach, employees],
  );

  useEffect(() => {
    if (listCvPhuTrachOpenRow == null) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-list-cv-phu-trach]')) return;
      setListCvPhuTrachOpenRow(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [listCvPhuTrachOpenRow]);

  useEffect(() => {
    setListCvPhuTrachOpenRow(null);
  }, [selected?.id]);

  useEffect(() => {
    setListCvRowExpanded({});
  }, [selected?.id]);

  const handleSendComment = async () => {
    const content = commentDraft.trim();
    if (!content || !selected) return;
    try {
      const detail = detailByTask[selected.id]
        ? detailByTask[selected.id]
        : await taskDetailService.getOrCreateByTaskId(selected.id);
      if (!detail) return;
      const comment: TaskDetailComment = {
        nhan_su: 'Bạn',
        anh: null,
        noi_dung: content,
        time: new Date().toISOString(),
      };
      const updated = await taskDetailService.appendComment(detail.id, comment);
      setDetailByTask((prev) => ({ ...prev, [selected.id]: updated }));
      setCommentsByTask((prev) => ({
        ...prev,
        [selected.id]: (updated.binh_luan || []) as any,
      }));
      setCommentDraft('');
    } catch (err) {
      console.error('[QuanLyCongViec] Error saving comment:', err);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col min-h-0 h-[calc(100vh-96px)] max-w-[100vw] rounded-xl border border-slate-200 bg-[#f0f2f5] shadow-sm overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <h1 className="text-xl font-bold text-[#1e293b] uppercase tracking-tight">
          Quản Lý Công Việc
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate('/quy-trinh/thu-vien-loi')}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border border-[#3b82f6] text-[#3b82f6] rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
            title="Mở Thư viện lỗi"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Thư viện lỗi</span>
          </button>
          <button
            type="button"
            onClick={() => {
              /** Gợi ý form từ lọc trái: Khách hàng + (nếu chỉ 1 HĐ) Hợp đồng & Dự án */
              let nextKhachHangId = filterKhachHangId.trim();
              let nextDuAnId = '';
              let nextHopDongId = '';
              if (filterHopDongIds.length === 1) {
                const hid = filterHopDongIds[0];
                const ct = contracts.find((x) => x.id === hid);
                if (ct) {
                  nextHopDongId = ct.id;
                  if (ct.du_an_id != null && String(ct.du_an_id).trim() !== '') {
                    nextDuAnId = String(ct.du_an_id);
                  }
                  const r = resolveCustomerIdAndLabel(
                    ct,
                    projects,
                    customersCatalog,
                  );
                  if (r?.customerId) nextKhachHangId = r.customerId;
                }
              }
              setModalKhachHangId(nextKhachHangId);
              setModalDuAnId(nextDuAnId);
              setFormData({
                hop_dong_id: nextHopDongId,
                ten_task: '',
                mo_ta: '',
                trang_thai: 'Chờ duyệt',
                uu_tien: 'Trung bình',
                ngay_bat_dau: '',
                ngay_ket_thuc: '',
                ngay_hoan_thanh: '',
                nguoi_phu_trach: '',
                tien_do: 0,
                ghi_chu: '',
              });
              setSelectedEmployeeIds([]);
              setTaskModalEditingId(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[#2563eb] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-md"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Thêm mới
          </button>
        </div>
      </header>

      <main className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        {/* Danh sách — ~20% */}
        <section className="task-explorer-section flex flex-col border-r border-slate-200 bg-white w-full lg:w-[20%] lg:min-w-[220px] lg:max-w-[22rem] shrink-0 min-h-0 min-w-0">
          <div className="p-4 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
            <div className="relative w-full">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên công việc..."
                type="search"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex flex-col space-y-1">
              {(
                [
                  { id: 'all' as const, label: 'Tất cả', count: statusCounts.all },
                  { id: 'doing' as const, label: 'Đang làm', count: statusCounts.doing },
                  { id: 'pending' as const, label: 'Chờ duyệt', count: statusCounts.pending },
                  { id: 'done' as const, label: 'Đã xong', count: statusCounts.done },
                ] as const
              ).map((tab) => {
                const isOn = activeTab === tab.id;
                const pillClass =
                  tab.id === 'done'
                    ? 'bg-emerald-500 text-white'
                    : tab.id === 'doing'
                      ? 'bg-blue-600 text-white'
                      : tab.id === 'pending'
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-white';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded flex items-center justify-between transition-colors ${
                      isOn
                        ? 'bg-[#1e293b] text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${
                        isOn && tab.id === 'all' ? 'bg-white text-[#1e293b]' : pillClass
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
            <div className="relative min-w-0" ref={khachHangFilterRef}>
              <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                Khách hàng
              </label>
              <button
                type="button"
                onClick={() => {
                  setKhachHangFilterOpen((o) => !o);
                  setContractFilterOpen(false);
                  setNhanSuFilterOpen(false);
                }}
                className="w-full flex items-center justify-between gap-1 rounded-md border border-slate-400 px-2 py-1 text-[11px] bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600/40 focus:border-blue-600 text-slate-900 font-semibold text-left"
                title="Chỉ hiện công việc thuộc hợp đồng của khách đã chọn — gõ để tìm"
                aria-expanded={khachHangFilterOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate min-w-0">
                  {!filterKhachHangId.trim()
                    ? 'Tất cả khách hàng'
                    : khachHangLabelById(filterKhachHangId)}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-slate-600 transition-transform ${
                    khachHangFilterOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {khachHangFilterOpen ? (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 flex flex-col rounded-lg border-2 border-slate-400 bg-white shadow-lg overflow-hidden"
                  role="listbox"
                  aria-label="Lọc theo khách hàng"
                >
                  <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                      <Search
                        className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden
                      />
                      <input
                        ref={khachHangFilterSearchRef}
                        type="search"
                        value={khachHangFilterSearch}
                        onChange={(e) => setKhachHangFilterSearch(e.target.value)}
                        placeholder="Tìm khách hàng…"
                        autoComplete="off"
                        className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 py-1 max-h-[min(13rem,50vh)] [scrollbar-gutter:stable]">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!filterKhachHangId.trim()}
                      onClick={() => {
                        setFilterKhachHangId('');
                        setKhachHangFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-100 ${
                        !filterKhachHangId.trim() ? 'bg-slate-100 text-blue-900' : 'text-slate-900'
                      }`}
                    >
                      Tất cả khách hàng
                    </button>
                    <div className="mx-2 border-t border-slate-200" />
                    {khachHangFilterOptions.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">
                        Chưa có dữ liệu khách hàng (bảng khách hàng và hợp đồng).
                      </p>
                    ) : khachHangMatchingFilter.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">
                        Không có khách hàng khớp &quot;{khachHangFilterSearch.trim()}&quot;.
                      </p>
                    ) : (
                      khachHangMatchingFilter.map((k) => {
                        const isKhachChosen = filterKhachHangId === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            role="option"
                            aria-selected={isKhachChosen}
                            onClick={() => {
                              setFilterKhachHangId(k.id);
                              setKhachHangFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 break-words ${
                              isKhachChosen ? 'bg-slate-100 text-blue-900 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {k.label}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative min-w-0" ref={contractFilterRef}>
              <label className="sr-only">Lọc theo hợp đồng</label>
              <button
                type="button"
                onClick={() => {
                  setContractFilterOpen((o) => !o);
                  setKhachHangFilterOpen(false);
                  setNhanSuFilterOpen(false);
                }}
                className="w-full flex items-center justify-between gap-1 rounded-md border border-slate-400 px-2 py-1 text-[11px] bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600/40 focus:border-blue-600 text-slate-900 font-semibold text-left"
                title={
                  filterKhachHangId.trim()
                    ? 'Chỉ các hợp đồng của khách đang chọn — có thể chọn một hoặc nhiều'
                    : 'Lọc danh sách theo một hoặc nhiều hợp đồng'
                }
                aria-expanded={contractFilterOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate min-w-0">
                  {filterHopDongIds.length === 0
                    ? filterKhachHangId.trim()
                      ? 'Tất cả hợp đồng (khách này)'
                      : 'Tất cả hợp đồng'
                    : filterHopDongIds.length === 1
                      ? contractLabelById(filterHopDongIds[0])
                      : `${filterHopDongIds.length} hợp đồng đã chọn`}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-slate-600 transition-transform ${
                    contractFilterOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {contractFilterOpen ? (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 flex flex-col rounded-lg border-2 border-slate-400 bg-white shadow-lg overflow-hidden"
                  role="listbox"
                  aria-label="Lọc theo hợp đồng"
                >
                  <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                      <Search
                        className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden
                      />
                      <input
                        ref={contractFilterSearchRef}
                        type="search"
                        value={contractFilterSearch}
                        onChange={(e) => setContractFilterSearch(e.target.value)}
                        placeholder="Tìm hợp đồng…"
                        autoComplete="off"
                        className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 py-1 max-h-[min(13rem,50vh)] [scrollbar-gutter:stable]">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-400 text-blue-800 focus:ring-blue-600"
                        checked={filterHopDongIds.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) setFilterHopDongIds([]);
                        }}
                      />
                      Tất cả hợp đồng
                    </label>
                    <div className="mx-2 border-t border-slate-200" />
                    {contracts.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">Chưa có hợp đồng.</p>
                    ) : contractsScopedByKhach.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">
                        Không có hợp đồng thuộc khách hàng đã chọn.
                      </p>
                    ) : contractsMatchingFilter.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">
                        Không có hợp đồng khớp &quot;{contractFilterSearch.trim()}&quot;.
                      </p>
                    ) : (
                      contractsMatchingFilter.map((c) => {
                        const label = c.ten_goi_thau || c.so_hop_dong || c.id;
                        const checked =
                          filterHopDongIds.length > 0 && filterHopDongIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-400 text-blue-800 focus:ring-blue-600"
                              checked={checked}
                              onChange={() => {
                                setFilterHopDongIds((prev) => {
                                  if (prev.length === 0) return [c.id];
                                  if (prev.includes(c.id))
                                    return prev.filter((x) => x !== c.id);
                                  return [...prev, c.id];
                                });
                              }}
                            />
                            <span className="min-w-0 break-words">{label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative min-w-0" ref={nhanSuFilterRef}>
              <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                Nhân sự phụ trách
              </label>
              <button
                type="button"
                onClick={() => {
                  setNhanSuFilterOpen((o) => !o);
                  setContractFilterOpen(false);
                  setKhachHangFilterOpen(false);
                }}
                className="w-full flex items-center justify-between gap-1 rounded-md border border-slate-400 px-2 py-1 text-[11px] bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600/40 focus:border-blue-600 text-slate-900 font-semibold text-left"
                title="Chỉ hiện công việc có người phụ trách đã chọn — gõ để tìm"
                aria-expanded={nhanSuFilterOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate min-w-0">
                  {!filterNhanSuId.trim()
                    ? 'Tất cả nhân sự'
                    : nhanSuLabelById(filterNhanSuId)}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-slate-600 transition-transform ${
                    nhanSuFilterOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {nhanSuFilterOpen ? (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 flex flex-col rounded-lg border-2 border-slate-400 bg-white shadow-lg overflow-hidden"
                  role="listbox"
                  aria-label="Lọc theo nhân sự phụ trách"
                >
                  <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                    <div className="relative">
                      <Search
                        className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden
                      />
                      <input
                        ref={nhanSuFilterSearchRef}
                        type="search"
                        value={nhanSuFilterSearch}
                        onChange={(e) => setNhanSuFilterSearch(e.target.value)}
                        placeholder="Tìm nhân sự…"
                        autoComplete="off"
                        className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 py-1 max-h-[min(13rem,50vh)] [scrollbar-gutter:stable]">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!filterNhanSuId.trim()}
                      onClick={() => {
                        setFilterNhanSuId('');
                        setNhanSuFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-100 ${
                        !filterNhanSuId.trim() ? 'bg-slate-100 text-blue-900' : 'text-slate-900'
                      }`}
                    >
                      Tất cả nhân sự
                    </button>
                    <div className="mx-2 border-t border-slate-200" />
                    {employeesSorted.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">Chưa có nhân sự.</p>
                    ) : nhanSuMatchingFilter.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-slate-600">
                        Không có nhân sự khớp &quot;{nhanSuFilterSearch.trim()}&quot;.
                      </p>
                    ) : (
                      nhanSuMatchingFilter.map((e) => {
                        const isNsChosen = filterNhanSuId === e.id;
                        const lab = e.full_name || e.code || e.id;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            role="option"
                            aria-selected={isNsChosen}
                            onClick={() => {
                              setFilterNhanSuId(e.id);
                              setNhanSuFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 break-words ${
                              isNsChosen ? 'bg-slate-100 text-blue-900 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {lab}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                Kết thúc (từ — đến)
              </label>
              <div className="flex items-center gap-0.5">
                <input
                  type="date"
                  value={filterKetThucTu}
                  onChange={(e) => setFilterKetThucTu(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-400 px-0.5 py-1 text-[9px] bg-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600/40 focus:border-blue-600"
                  title="Từ ngày kết thúc"
                />
                <span className="text-[8px] font-bold text-slate-500 shrink-0">—</span>
                <input
                  type="date"
                  value={filterKetThucDen}
                  onChange={(e) => setFilterKetThucDen(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-slate-400 px-0.5 py-1 text-[9px] bg-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600/40 focus:border-blue-600"
                  title="Đến ngày kết thúc"
                />
              </div>
            </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-1 overscroll-contain">
            <QuanLyCongViecTaskListScrollBody
              loading={loading}
              filtered={filtered}
              selectedId={selected?.id}
              onSelectTask={setSelected}
              contractLabelById={contractLabelById}
              onOpenEditModal={handleOpenTaskEditModal}
              onDeleteTask={handleDeleteTaskFromList}
            />
          </div>
        </section>

        {/* Chi tiết — ~80% */}
        <aside className="task-detail-sidebar flex flex-col bg-white overflow-hidden flex-1 min-w-0 min-h-0">
          <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-3 bg-white shrink-0">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Chi tiết nhiệm vụ
                </span>
                {selected ? (
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {selected.trang_thai}
                  </span>
                ) : null}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-snug line-clamp-2">
                {selected ? selected.ten_task : 'Chọn một công việc ở bên trái'}
              </h2>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 flex-wrap justify-end">
              {selected &&
              !isTrangThaiDaXong(selected.trang_thai) &&
              selected.trang_thai !== 'Đang thực hiện' ? (
                <button
                  type="button"
                  disabled={duyetSaving}
                  title="Duyệt và chuyển công việc sang Đang làm (Đang thực hiện)"
                  onClick={async () => {
                    if (!selected?.id) return;
                    if (
                      !window.confirm(
                        'Duyệt công việc này và chuyển trạng thái sang Đang thực hiện?',
                      )
                    ) {
                      return;
                    }
                    setDuyetSaving(true);
                    try {
                      await taskDetailService.setTrangThaiFromQuanLy(
                        selected.id,
                        'Đang thực hiện',
                      );
                      const data = await taskDetailService.getAllAsTasks();
                      setTasks(data || []);
                      const next = (data || []).find((t) => t.id === selected.id);
                      if (next) setSelected(next);
                    } catch (err) {
                      console.error('[QuanLyCongViec] duyệt công việc:', err);
                      alert(
                        err instanceof Error
                          ? err.message
                          : 'Không duyệt được. Kiểm tra API / quyền cập nhật task.',
                      );
                    } finally {
                      setDuyetSaving(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-900 bg-blue-800 text-white text-[10px] font-bold hover:bg-blue-950 disabled:opacity-45"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {duyetSaving ? 'Đang duyệt...' : 'Duyệt'}
                </button>
              ) : null}
              {selected ? (
                <>
                  <button
                    type="button"
                    title="Sửa công việc"
                    aria-label="Sửa công việc"
                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    onClick={() => {
                      const task = selected;
                      setFormData({
                        hop_dong_id: task.hop_dong_id || '',
                        ten_task: task.ten_task,
                        mo_ta: task.mo_ta || '',
                        trang_thai: task.trang_thai,
                        uu_tien: task.uu_tien,
                        ngay_bat_dau: task.ngay_bat_dau || '',
                        ngay_ket_thuc: task.ngay_ket_thuc || '',
                        ngay_hoan_thanh: task.ngay_hoan_thanh || '',
                        nguoi_phu_trach: task.nguoi_phu_trach || '',
                        tien_do: task.tien_do ?? 0,
                        ghi_chu: task.ghi_chu || '',
                      });
                      const epIds: string[] = [];
                      for (const n of (task.nguoi_phu_trach || '')
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)) {
                        const emp = employees.find(
                          (e) => e.full_name === n || e.code === n,
                        );
                        if (emp && !epIds.includes(emp.id)) epIds.push(emp.id);
                      }
                      setSelectedEmployeeIds(epIds);
                      const ct = contracts.find(
                        (x) => x.id === (task.hop_dong_id || ''),
                      );
                      if (ct) {
                        const r = resolveCustomerIdAndLabel(
                          ct,
                          projects,
                          customersCatalog,
                        );
                        setModalKhachHangId(r?.customerId ?? '');
                        setModalDuAnId(
                          ct.du_an_id != null ? String(ct.du_an_id) : '',
                        );
                      } else {
                        setModalKhachHangId('');
                        setModalDuAnId('');
                      }
                      setTaskModalEditingId(task.id);
                      setIsModalOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Xóa công việc"
                    aria-label="Xóa công việc"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!selected?.id) return;
                      if (
                        !window.confirm(
                          'Bạn có chắc chắn muốn xóa công việc này?',
                        )
                      )
                        return;
                      (async () => {
                        const sid = selected.id;
                        try {
                          await taskDetailService.deleteByTaskId(sid);
                          setTasks((prev) =>
                            prev.filter((t) => t.id !== sid),
                          );
                          setDetailByTask((prev) => {
                            const n = { ...prev };
                            delete n[sid];
                            return n;
                          });
                          setCommentsByTask((prev) => {
                            const n = { ...prev };
                            delete n[sid];
                            return n;
                          });
                          const next =
                            filtered.find((t) => t.id !== sid) || null;
                          setSelected(next);
                        } catch (err) {
                          console.error(
                            '[QuanLyCongViec] Error deleting task:',
                            err,
                          );
                          alert('Lỗi khi xóa công việc');
                        }
                      })();
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div
            className={`flex flex-col flex-1 min-h-0 text-xs text-slate-800 font-bold bg-slate-50/30 ${
              selected ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain p-5 sm:p-8'
            }`}
          >
            {selected ? (
              <>
                <div className="shrink-0 px-3 sm:px-4 pt-2 pb-2 space-y-2 border-b border-slate-200/90">
                  <div className="rounded-md border border-slate-200 bg-slate-100/90 px-2 py-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-0.5 leading-tight">
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-wide text-slate-500 font-bold">
                          Ngày bắt đầu
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-950 tabular-nums">
                          {selected.ngay_bat_dau
                            ? new Date(selected.ngay_bat_dau).toLocaleDateString('vi-VN')
                            : '—'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-wide text-slate-500 font-bold">
                          Ngày kết thúc
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-950 tabular-nums">
                          {selected.ngay_ket_thuc
                            ? new Date(selected.ngay_ket_thuc).toLocaleDateString('vi-VN')
                            : '—'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-wide text-slate-500 font-bold">
                          Số ngày TH
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-950 tabular-nums">
                          {selectedNgayThongKe.soNgayThucHien != null
                            ? `${selectedNgayThongKe.soNgayThucHien}d`
                            : '—'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] uppercase tracking-wide text-slate-500 font-bold">
                          Còn lại
                        </div>
                        <div
                          className={`text-[10px] font-extrabold tabular-nums ${selectedNgayThongKe.conLaiClass}`}
                        >
                          {selectedNgayThongKe.conLaiText}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">
                        Người phụ trách
                      </span>
                      {selected.nguoi_phu_trach ? (
                        <div className="flex flex-wrap gap-1">
                          {selected.nguoi_phu_trach
                            .split(',')
                            .map((name) => name.trim())
                            .filter(Boolean)
                            .map((name) => {
                              const emp =
                                employees.find(
                                  (e) =>
                                    e.full_name === name ||
                                    e.code === name,
                                ) || null;
                              const initials =
                                name
                                  .split(' ')
                                  .map((p) => p[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase() || '?';
                              return (
                                <span
                                  key={name}
                                  className="inline-flex items-center"
                                  title={name}
                                >
                                  {emp?.avatar ? (
                                    <img
                                      src={emp.avatar}
                                      alt={name}
                                      className="h-6 w-6 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-800 text-[8px] font-bold text-white">
                                      {initials}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Chưa gán
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-[min(100%,14rem)]">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">
                        Hợp đồng
                      </span>
                      <select
                        value={hopDongDraft}
                        onChange={(e) => setHopDongDraft(e.target.value)}
                        disabled={contractAssignSaving}
                        className="flex-1 min-w-0 max-w-md rounded-md border border-slate-200 px-2 py-1 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-700/40 focus:border-blue-700"
                      >
                        <option value="">— Chưa gán —</option>
                        {contracts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.ten_goi_thau || c.so_hop_dong || c.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={
                          contractAssignSaving ||
                          hopDongDraft === (selected.hop_dong_id || '')
                        }
                        onClick={async () => {
                          if (!selected?.id) return;
                          setContractAssignSaving(true);
                          try {
                            const detailRow =
                              await taskDetailService.updateHopDongByTaskLookup(
                                selected.id,
                                hopDongDraft || null,
                              );
                            const taskRow = taskDetailService.mapToTaskRow(
                              detailRow as any,
                            );
                            setTasks((prev) =>
                              prev.map((t) => (t.id === taskRow.id ? taskRow : t)),
                            );
                            setSelected(taskRow);
                            setDetailByTask((prev) => ({
                              ...prev,
                              [taskRow.id]: detailRow,
                            }));
                          } catch (err) {
                            console.error('[QuanLyCongViec] update hop_dong:', err);
                            alert(
                              err instanceof Error
                                ? err.message
                                : 'Không thể lưu hợp đồng (kiểm tra cột hop_dong_id trên Supabase).',
                            );
                          } finally {
                            setContractAssignSaving(false);
                          }
                        }}
                        className="px-2 py-1 rounded-md bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-900 disabled:opacity-40 shrink-0"
                      >
                        {contractAssignSaving ? '…' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs: thanh tab cố định, nội dung tab cuộn riêng — ưu tiên chiều cao LIST */}
                <div
                  className="flex flex-col flex-1 min-h-0 overflow-hidden"
                  data-purpose="detail-tabs"
                >
                  <div className="shrink-0 border-b border-slate-100 flex flex-wrap gap-x-3 sm:gap-x-5 px-3 sm:px-4 bg-white/60">
                    {[
                      { id: 'NOI_DUNG', label: 'NỘI DUNG' },
                      { id: 'BINH_LUAN', label: 'BÌNH LUẬN' },
                      { id: 'TAI_LIEU', label: 'TỆP ĐÍNH KÈM' },
                      { id: 'LIST_CONG_VIEC', label: 'LIST CÔNG VIỆC' },
                      { id: 'LOI_GHI_NHAN', label: 'GHI NHẬN LỖI' },
                      { id: 'LICH_SU', label: 'LỊCH SỬ' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDetailTabState(tab.id as any)}
                        className={`py-2 sm:py-2.5 text-[11px] font-bold border-b-2 transition-colors -mb-px ${
                          detailTabState === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {tab.label}
                        {tab.id === 'BINH_LUAN' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5">
                            {(
                              (detailByTask[selected.id]?.binh_luan as
                                | TaskDetailComment[]
                                | undefined) ||
                              commentsByTask[selected.id] ||
                              []
                            ).length}
                          </span>
                        )}
                        {tab.id === 'TAI_LIEU' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5">
                            {
                              (detailByTask[selected.id]?.tai_lieu || []).filter(
                                (d: TaskDetailDocument) => String(d?.link || '').trim(),
                              ).length
                            }
                          </span>
                        )}
                        {tab.id === 'LIST_CONG_VIEC' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-900 text-[9px] px-1.5">
                            {(detailByTask[selected.id]?.danh_sach_cong_viec || []).filter((x) =>
                              String(x?.noi_dung || '').trim(),
                            ).length}
                          </span>
                        )}
                        {tab.id === 'LOI_GHI_NHAN' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[9px] px-1.5">
                            {detailByTask[selected.id]?.loi_ghi_nhan?.length ?? 0}
                          </span>
                        )}
                        {tab.id === 'LICH_SU' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5">
                            {(detailByTask[selected.id]?.lich_su || []).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div
                    className={`flex flex-col flex-1 min-h-0 min-w-0 px-3 sm:px-4 py-1.5 ${
                      detailTabState === 'LIST_CONG_VIEC'
                        ? 'overflow-hidden'
                        : 'overflow-y-auto overscroll-contain'
                    }`}
                  >
                  {detailTabState === 'NOI_DUNG' && (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-200 px-3 py-3 text-xs text-slate-700 min-h-[80px] whitespace-pre-line">
                      {(() => {
                        const text = formatMoTaDisplay(selected.mo_ta);
                        return text || 'Chưa có mô tả cho công việc này.';
                      })()}
                    </div>
                  )}

                  {detailTabState === 'TAI_LIEU' && selected && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-200 px-3 py-3 text-xs text-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">
                            Tài liệu và link
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            Thêm nhiều dòng; chỉ các dòng có link mới được lưu. Mô tả tuỳ chọn.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={docSaving}
                            onClick={() =>
                              setDocDraftRows((rows) => [...rows, newDocDraftRow()])
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          >
                            + Thêm link
                          </button>
                          <button
                            type="button"
                            disabled={docSaving}
                            onClick={async () => {
                              if (!selected?.id) return;
                              const payload: TaskDetailDocument[] = docDraftRows
                                .filter((r) => r.link.trim())
                                .map((r) => ({
                                  ten: r.ten.trim() || 'Tài liệu đính kèm',
                                  link: r.link.trim(),
                                  mota: r.mota.trim() ? r.mota.trim() : null,
                                }));
                              setDocSaving(true);
                              try {
                                const detail = await taskDetailService.getOrCreateByTaskId(
                                  selected.id,
                                );
                                if (!detail) {
                                  alert('Không tìm thấy bản ghi công việc chi tiết.');
                                  return;
                                }
                                const updatedDetail = await taskDetailService.updateDocuments(
                                  detail.id,
                                  payload,
                                );
                                const taskRow = taskDetailService.mapToTaskRow(
                                  updatedDetail as any,
                                );
                                setDetailByTask((p) => ({
                                  ...p,
                                  [taskRow.id]: updatedDetail,
                                }));
                                setTasks((prev) =>
                                  prev.map((t) => (t.id === taskRow.id ? taskRow : t)),
                                );
                                setSelected((s) =>
                                  s?.id === taskRow.id ? taskRow : s,
                                );
                              } catch (err) {
                                console.error('[QuanLyCongViec] updateDocuments:', err);
                                alert(
                                  'Không lưu được tài liệu. Kiểm tra migration cột tai_lieu (JSON) trên Supabase.',
                                );
                              } finally {
                                setDocSaving(false);
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-800 text-white text-[11px] font-bold hover:bg-blue-950 disabled:opacity-50"
                          >
                            {docSaving ? 'Đang lưu...' : 'Lưu tài liệu'}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-[min(420px,55vh)] overflow-y-auto pr-0.5">
                        {docDraftRows.map((row, idx) => (
                          <div
                            key={row.key}
                            className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-600 uppercase shrink-0">
                                Tài liệu {idx + 1}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {row.link.trim() ? (
                                  <>
                                    <button
                                      type="button"
                                      className="p-1 rounded text-slate-600 hover:bg-slate-200"
                                      title="Xem trong khung"
                                      onClick={() => setDocPreviewUrl(row.link.trim())}
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className="text-[10px] font-bold text-blue-600 hover:underline px-1"
                                      onClick={() => setDocPreviewUrl(row.link.trim())}
                                    >
                                      Xem modal
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={docSaving || docDraftRows.length <= 1}
                                  className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-30"
                                  title="Xóa dòng"
                                  onClick={() =>
                                    setDocDraftRows((rows) =>
                                      rows.length <= 1
                                        ? [newDocDraftRow()]
                                        : rows.filter((r) => r.key !== row.key),
                                    )
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                              <div className="md:col-span-3 min-w-0">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Tên hiển thị
                                </label>
                                <input
                                  value={row.ten}
                                  onChange={(e) =>
                                    setDocDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key
                                          ? { ...r, ten: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  disabled={docSaving}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-200/70"
                                  placeholder="Tên tài liệu..."
                                />
                              </div>
                              <div className="md:col-span-5 min-w-0">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Link *
                                </label>
                                <input
                                  value={row.link}
                                  onChange={(e) =>
                                    setDocDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key
                                          ? { ...r, link: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  disabled={docSaving}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-200/70"
                                  placeholder="https://..."
                                />
                              </div>
                              <div className="md:col-span-4 min-w-0">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Mô tả
                                </label>
                                <input
                                  value={row.mota}
                                  onChange={(e) =>
                                    setDocDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key
                                          ? { ...r, mota: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  disabled={docSaving}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-200/70"
                                  placeholder="Tuỳ chọn"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailTabState === 'LIST_CONG_VIEC' && selected && (
                    <div className="mt-1 flex flex-col flex-1 min-h-0 rounded-xl border border-slate-200 bg-slate-200 px-3 py-2 text-xs text-slate-700 gap-2">
                      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">
                            Danh sách việc cần làm
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            Chỉnh trạng thái và nội dung ngay trên dòng; bấm{' '}
                            <span className="font-semibold">Xem</span> để chỉnh nhân sự, ngày giờ, ghi chú.
                            Dòng mới thêm sẽ tự mở. Lưu chỉ ghi các dòng có nội dung.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={listCongViecSaving}
                            onClick={() => {
                              const nr = newListCongViecDraftRow();
                              setListCongViecDraftRows((rows) => [...rows, nr]);
                              setListCvRowExpanded((p) => ({ ...p, [nr.key]: true }));
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            + Thêm việc
                          </button>
                          <button
                            type="button"
                            disabled={listCongViecSaving}
                            onClick={async () => {
                              const detailId = detailByTask[selected.id]?.id;
                              if (!detailId) {
                                alert('Chưa có bản ghi chi tiết. Thử tải lại trang.');
                                return;
                              }
                              for (const r of listCongViecDraftRows) {
                                if (!r.noi_dung.trim()) continue;
                                if (r.trang_thai === 'Từ chối' && !r.ly_do_tu_choi.trim()) {
                                  alert('Các việc “Từ chối” cần có lý do — chọn lại trạng thái và nhập lý do.');
                                  return;
                                }
                              }
                              const allowedNs = new Set(listCvPhuTrachOptions.map((e) => e.id));
                              const payload: DanhSachCongViecItem[] = listCongViecDraftRows
                                .filter((r) => r.noi_dung.trim())
                                .map((r) => ({
                                  id: r.key,
                                  noi_dung: r.noi_dung.trim(),
                                  trang_thai: r.trang_thai,
                                  ly_do_tu_choi:
                                    r.trang_thai === 'Từ chối'
                                      ? r.ly_do_tu_choi.trim()
                                      : null,
                                  ngay_gio_hoan_thanh: datetimeLocalToIso(r.ngay_gio_hoan_thanh),
                                  ghi_chu: r.ghi_chu.trim() ? r.ghi_chu.trim() : null,
                                  nhan_su_phu_trach_ids: r.nhan_su_phu_trach_ids.filter((id) =>
                                    allowedNs.has(id),
                                  ),
                                  ngay_gia_han_1: r.ngay_gia_han_1.trim()
                                    ? r.ngay_gia_han_1.trim().slice(0, 10)
                                    : null,
                                  ngay_gia_han_2: r.ngay_gia_han_2.trim()
                                    ? r.ngay_gia_han_2.trim().slice(0, 10)
                                    : null,
                                  ngay_gia_han_3: r.ngay_gia_han_3.trim()
                                    ? r.ngay_gia_han_3.trim().slice(0, 10)
                                    : null,
                                }));
                              setListCongViecSaving(true);
                              try {
                                const updated = await taskDetailService.updateDanhSachCongViec(
                                  detailId,
                                  payload,
                                );
                                setDetailByTask((prev) => ({ ...prev, [selected.id]: updated }));
                              } catch (err) {
                                console.error('[QuanLyCongViec] updateDanhSachCongViec:', err);
                                alert(
                                  err instanceof Error
                                    ? err.message
                                    : 'Không lưu được. Chạy SQL add_cong_viec_danh_sach_cong_viec.sql trên Supabase nếu chưa có cột danh_sach_cong_viec.',
                                );
                              } finally {
                                setListCongViecSaving(false);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-800 text-white text-[11px] font-bold hover:bg-indigo-950 disabled:opacity-50"
                          >
                            {listCongViecSaving ? 'Đang lưu...' : 'Lưu danh sách'}
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 hidden sm:grid grid-cols-[minmax(0,1fr)_7rem_minmax(8rem,11rem)_auto] gap-2 px-2.5 py-1.5 border-b border-slate-300 bg-slate-100/90 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        <span>Nội dung</span>
                        <span>Trạng thái</span>
                        <span>Gia hạn</span>
                        <span className="text-right">Thao tác</span>
                      </div>
                      <ul className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5 [scrollbar-gutter:stable]">
                        {listCongViecDraftRows.map((row, idx) => {
                          const listCvDone = isListCvTrangThaiDone(row.trang_thai);
                          const listCvExpanded = Boolean(listCvRowExpanded[row.key]);
                          return (
                          <li
                            key={row.key}
                            className={`rounded-lg border border-slate-200 bg-white ${
                              listCvExpanded ? 'p-2.5 space-y-2' : 'px-2.5 py-2'
                            }`}
                          >
                            {!listCvExpanded ? (
                              <div className="space-y-1">
                                <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_minmax(8rem,11rem)_auto] sm:items-center gap-2 min-w-0">
                                  <input
                                    type="text"
                                    value={row.noi_dung}
                                    disabled={listCongViecSaving}
                                    onChange={(e) =>
                                      setListCongViecDraftRows((rows) =>
                                        rows.map((r) =>
                                          r.key === row.key ? { ...r, noi_dung: e.target.value } : r,
                                        ),
                                      )
                                    }
                                    className="w-full min-w-0 text-[11px] font-semibold text-slate-900 rounded-md border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200/80 px-1.5 py-0.5 bg-white/80"
                                    placeholder={`Dòng ${idx + 1} — nhập nội dung`}
                                    title={row.noi_dung.trim() || undefined}
                                  />
                                  <select
                                    value={row.trang_thai}
                                    disabled={listCongViecSaving}
                                    title="Trạng thái"
                                    onChange={(e) => {
                                      const v = e.target.value as TrangThaiDanhSachCongViec;
                                      if (v === 'Từ chối') {
                                        setListCvTuChoiModal({
                                          rowKey: row.key,
                                          lyDo: row.ly_do_tu_choi || '',
                                        });
                                        return;
                                      }
                                      setListCongViecDraftRows((rows) =>
                                        rows.map((r) =>
                                          r.key === row.key
                                            ? { ...r, trang_thai: v, ly_do_tu_choi: '' }
                                            : r,
                                        ),
                                      );
                                    }}
                                    className={`w-full sm:w-auto shrink-0 max-w-none text-[9px] font-bold px-1.5 py-0.5 rounded border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${listCvStatusBadgeClass(row.trang_thai)}`}
                                  >
                                    {LIST_CV_TRANG_THAI_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="min-w-0 px-0.5">
                                    <span className="sm:hidden text-[9px] font-bold text-slate-500 uppercase">
                                      Gia hạn
                                    </span>
                                    <GiaHanCell
                                      ngay_gia_han_1={row.ngay_gia_han_1}
                                      ngay_gia_han_2={row.ngay_gia_han_2}
                                      ngay_gia_han_3={row.ngay_gia_han_3}
                                      suppressWarning={listCvDone}
                                    />
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 shrink-0 text-[9px] text-slate-500 tabular-nums">
                                    {row.nhan_su_phu_trach_ids.length > 0 ? (
                                      <span title="Nhân sự phụ trách">
                                        {row.nhan_su_phu_trach_ids.length} NS
                                      </span>
                                    ) : null}
                                    {row.ngay_gio_hoan_thanh ? (
                                      <span
                                        className="max-w-[6.5rem] truncate"
                                        title={formatListCvDatetimeLocalShort(
                                          row.ngay_gio_hoan_thanh,
                                        )}
                                      >
                                        {formatListCvDatetimeLocalShort(row.ngay_gio_hoan_thanh)}
                                      </span>
                                    ) : null}
                                    {row.ghi_chu.trim() ? (
                                      <BookOpen
                                        className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                        aria-label="Có ghi chú"
                                      />
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={listCongViecSaving}
                                    onClick={() =>
                                      setListCvRowExpanded((p) => ({ ...p, [row.key]: true }))
                                    }
                                    className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Xem
                                  </button>
                                  <button
                                    type="button"
                                    disabled={listCongViecSaving}
                                    onClick={() => {
                                      setListCongViecDraftRows((rows) => {
                                        const next = rows.filter((r) => r.key !== row.key);
                                        return next.length === 0 ? [newListCongViecDraftRow()] : next;
                                      });
                                      setListCvRowExpanded((p) => {
                                        const n = { ...p };
                                        delete n[row.key];
                                        return n;
                                      });
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 shrink-0"
                                    title="Xóa dòng"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {row.trang_thai === 'Từ chối' && row.ly_do_tu_choi.trim() ? (
                                  <p
                                    className="text-[9px] text-red-700 truncate pl-0.5"
                                    title={row.ly_do_tu_choi}
                                  >
                                    Lý do: {row.ly_do_tu_choi}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <>
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                Chi tiết
                              </span>
                              <button
                                type="button"
                                disabled={listCongViecSaving}
                                onClick={() =>
                                  setListCvRowExpanded((p) => ({ ...p, [row.key]: false }))
                                }
                                className="text-[10px] font-bold text-indigo-800 hover:underline"
                              >
                                Thu gọn
                              </button>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                              <div className="shrink-0 w-full sm:w-36">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Trạng thái
                                </label>
                                <select
                                  value={row.trang_thai}
                                  disabled={listCongViecSaving}
                                  onChange={(e) => {
                                    const v = e.target.value as TrangThaiDanhSachCongViec;
                                    if (v === 'Từ chối') {
                                      setListCvTuChoiModal({
                                        rowKey: row.key,
                                        lyDo: row.ly_do_tu_choi || '',
                                      });
                                      return;
                                    }
                                    setListCongViecDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key
                                          ? { ...r, trang_thai: v, ly_do_tu_choi: '' }
                                          : r,
                                      ),
                                    );
                                  }}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
                                >
                                  {LIST_CV_TRANG_THAI_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex-1 min-w-0">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Nội dung công việc
                                </label>
                                <input
                                  type="text"
                                  value={row.noi_dung}
                                  disabled={listCongViecSaving}
                                  onChange={(e) =>
                                    setListCongViecDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key ? { ...r, noi_dung: e.target.value } : r,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
                                  placeholder={`Việc ${idx + 1}…`}
                                />
                              </div>
                              <button
                                type="button"
                                disabled={listCongViecSaving}
                                onClick={() => {
                                  setListCongViecDraftRows((rows) => {
                                    const next = rows.filter((r) => r.key !== row.key);
                                    return next.length === 0 ? [newListCongViecDraftRow()] : next;
                                  });
                                  setListCvRowExpanded((p) => {
                                    const n = { ...p };
                                    delete n[row.key];
                                    return n;
                                  });
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 shrink-0 self-end sm:self-start sm:mt-5"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="relative" data-list-cv-phu-trach>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Nhân sự phụ trách
                              </label>
                              <button
                                type="button"
                                disabled={
                                  listCongViecSaving || listCvPhuTrachOptions.length === 0
                                }
                                onClick={() =>
                                  setListCvPhuTrachOpenRow((k) =>
                                    k === row.key ? null : row.key,
                                  )
                                }
                                className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50 text-left font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="truncate">
                                  {listCvPhuTrachDropdownLabel(
                                    row.nhan_su_phu_trach_ids,
                                    listCvPhuTrachOptions,
                                  )}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                                    listCvPhuTrachOpenRow === row.key ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              {listCvPhuTrachOpenRow === row.key ? (
                                <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                  {listCvPhuTrachOptions.length === 0 ? (
                                    <p className="px-2 py-2 text-[10px] text-slate-500">
                                      Gán «Người phụ trách» cho công việc trước để chọn tại đây.
                                    </p>
                                  ) : (
                                    listCvPhuTrachOptions.map((e) => {
                                      const checked = row.nhan_su_phu_trach_ids.includes(e.id);
                                      return (
                                        <label
                                          key={e.id}
                                          className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-slate-100"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={listCongViecSaving}
                                            onChange={() => {
                                              setListCongViecDraftRows((rows) =>
                                                rows.map((r) => {
                                                  if (r.key !== row.key) return r;
                                                  const set = new Set(r.nhan_su_phu_trach_ids);
                                                  if (set.has(e.id)) set.delete(e.id);
                                                  else set.add(e.id);
                                                  return {
                                                    ...r,
                                                    nhan_su_phu_trach_ids: Array.from(set),
                                                  };
                                                }),
                                              );
                                            }}
                                            className="rounded border-slate-300 text-indigo-800 focus:ring-indigo-700"
                                          />
                                          <span className="min-w-0 truncate">
                                            {e.full_name || e.code || e.id}
                                          </span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>
                              ) : null}
                            </div>
                            {row.trang_thai === 'Từ chối' && row.ly_do_tu_choi.trim() ? (
                              <div className="space-y-1">
                                <p className="text-[10px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                                  <span className="font-bold">Lý do từ chối:</span> {row.ly_do_tu_choi}
                                </p>
                                <button
                                  type="button"
                                  disabled={listCongViecSaving}
                                  onClick={() =>
                                    setListCvTuChoiModal({
                                      rowKey: row.key,
                                      lyDo: row.ly_do_tu_choi,
                                    })
                                  }
                                  className="text-[10px] font-bold text-red-700 underline hover:text-red-900 disabled:opacity-50"
                                >
                                  Sửa lý do
                                </button>
                              </div>
                            ) : null}
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                                Gia hạn (tối đa 3 lần)
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {(
                                  [
                                    ['ngay_gia_han_1', 'Lần 1'],
                                    ['ngay_gia_han_2', 'Lần 2'],
                                    ['ngay_gia_han_3', 'Lần 3'],
                                  ] as const
                                ).map(([field, label]) => (
                                  <div key={field}>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                      {label}
                                    </label>
                                    <input
                                      type="date"
                                      value={row[field]}
                                      disabled={listCongViecSaving}
                                      onChange={(e) =>
                                        setListCongViecDraftRows((rows) =>
                                          rows.map((r) =>
                                            r.key === row.key
                                              ? { ...r, [field]: e.target.value }
                                              : r,
                                          ),
                                        )
                                      }
                                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 min-h-[1.25rem]">
                                <span className="text-[10px] text-slate-500">Hiển thị:</span>
                                <GiaHanCell
                                  ngay_gia_han_1={row.ngay_gia_han_1}
                                  ngay_gia_han_2={row.ngay_gia_han_2}
                                  ngay_gia_han_3={row.ngay_gia_han_3}
                                  suppressWarning={listCvDone}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Ngày giờ hoàn thành
                                </label>
                                <input
                                  type="datetime-local"
                                  value={row.ngay_gio_hoan_thanh}
                                  disabled={listCongViecSaving}
                                  onChange={(e) =>
                                    setListCongViecDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key
                                          ? { ...r, ngay_gio_hoan_thanh: e.target.value }
                                          : r,
                                      ),
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Ghi chú
                                </label>
                                <textarea
                                  value={row.ghi_chu}
                                  disabled={listCongViecSaving}
                                  onChange={(e) =>
                                    setListCongViecDraftRows((rows) =>
                                      rows.map((r) =>
                                        r.key === row.key ? { ...r, ghi_chu: e.target.value } : r,
                                      ),
                                    )
                                  }
                                  rows={2}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-slate-50 resize-y min-h-[2.5rem]"
                                  placeholder="Tuỳ chọn"
                                />
                              </div>
                            </div>
                              </>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {listCvTuChoiModal && (
                    <div
                      className="fixed inset-0 z-[134] flex items-center justify-center bg-black/50 p-4"
                      role="presentation"
                      onClick={() => setListCvTuChoiModal(null)}
                    >
                      <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="list-cv-tu-choi-title"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                          <h2
                            id="list-cv-tu-choi-title"
                            className="text-sm font-bold text-slate-800"
                          >
                            Lý do từ chối
                          </h2>
                          <button
                            type="button"
                            onClick={() => setListCvTuChoiModal(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
                            aria-label="Đóng"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-5 space-y-3">
                          <p className="text-[11px] text-slate-600">
                            Vui lòng nhập lý do từ chối cho việc này.
                          </p>
                          <textarea
                            value={listCvTuChoiModal.lyDo}
                            onChange={(e) =>
                              setListCvTuChoiModal((m) =>
                                m ? { ...m, lyDo: e.target.value } : m,
                              )
                            }
                            rows={4}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Nhập lý do…"
                            autoFocus
                          />
                        </div>
                        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 shrink-0">
                          <button
                            type="button"
                            onClick={() => setListCvTuChoiModal(null)}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const m = listCvTuChoiModal;
                              if (!m) return;
                              if (!m.lyDo.trim()) {
                                alert('Vui lòng nhập lý do từ chối.');
                                return;
                              }
                              setListCongViecDraftRows((rows) =>
                                rows.map((r) =>
                                  r.key === m.rowKey
                                    ? {
                                        ...r,
                                        trang_thai: 'Từ chối' as const,
                                        ly_do_tu_choi: m.lyDo.trim(),
                                      }
                                    : r,
                                ),
                              );
                              setListCvTuChoiModal(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-900"
                          >
                            Xác nhận từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailTabState === 'BINH_LUAN' && selected && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white rounded-xl text-xs text-slate-700 min-h-[120px] flex flex-col">
                      <div className="flex-1 max-h-60 overflow-y-auto px-3 pt-3 space-y-2">
                        {(commentsByTask[selected.id] || []).length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">
                            Chưa có bình luận nào cho công việc này.
                          </p>
                        ) : (
                          (commentsByTask[selected.id] || [])
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(a.time).getTime() -
                                new Date(b.time).getTime(),
                            )
                            .map((c, idx) => (
                              <div
                                key={(c as any).id || `${c.time}-${idx}`}
                                className="flex items-start gap-2"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white">
                                  {c.nhan_su
                                    .split(' ')
                                    .map((p) => p[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-slate-700">
                                      {c.nhan_su}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(c.time).toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-slate-700">
                                    {c.noi_dung}
                                  </p>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                      <div className="border-t border-slate-200 mt-2 px-3 py-2 flex gap-2">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment();
                            }
                          }}
                          rows={2}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700 resize-none"
                          placeholder="Nhập bình luận và nhấn Enter hoặc Gửi..."
                        />
                        <button
                          type="button"
                          onClick={handleSendComment}
                          disabled={!commentDraft.trim()}
                          className="self-end px-3 py-1.5 rounded-lg bg-blue-800 text-white text-[11px] font-bold hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  )}

                  {detailTabState === 'LOI_GHI_NHAN' && selected && (
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 px-3 py-3 space-y-2">
                        <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                          Thêm ghi nhận lỗi
                        </p>
                        <p className="text-[10px] text-amber-900/80 leading-snug">
                          Lọc theo thứ tự ①→⑤; nếu trùng nhiều dòng thì chọn bản ghi; tick một hoặc nhiều người vi
                          phạm — mỗi người một dòng ghi nhận; ghi chú áp dụng chung.
                        </p>
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                1. Chuyên ngành *
                              </label>
                              <select
                                value={loiCascadeChuyen}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLoiCascadeChuyen(v);
                                  setLoiCascadeBoMon('');
                                  setLoiCascadeCanhBao('');
                                  setLoiCascadeHangMuc('');
                                  setLoiCascadeNoiDung('');
                                  setLoiCascadePickId('');
                                }}
                                disabled={loiSaving}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
                              >
                                <option value="">-- Chọn chuyên ngành --</option>
                                {loiOptsChuyen.map((k) => (
                                  <option key={k} value={k}>
                                    {thuVienFieldLabel(k)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                2. Bộ môn *
                              </label>
                              <select
                                value={loiCascadeBoMon}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLoiCascadeBoMon(v);
                                  setLoiCascadeCanhBao('');
                                  setLoiCascadeHangMuc('');
                                  setLoiCascadeNoiDung('');
                                  setLoiCascadePickId('');
                                }}
                                disabled={loiSaving || !loiCascadeChuyen}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white disabled:bg-slate-300"
                              >
                                <option value="">-- Chọn bộ môn --</option>
                                {loiOptsBoMon.map((k) => (
                                  <option key={k} value={k}>
                                    {thuVienFieldLabel(k)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                3. Cảnh báo lỗi *
                              </label>
                              <select
                                value={loiCascadeCanhBao}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLoiCascadeCanhBao(v);
                                  setLoiCascadeHangMuc('');
                                  setLoiCascadeNoiDung('');
                                  setLoiCascadePickId('');
                                }}
                                disabled={loiSaving || !loiCascadeBoMon}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white disabled:bg-slate-300"
                              >
                                <option value="">-- Chọn cảnh báo lỗi --</option>
                                {loiOptsCanhBao.map((k) => (
                                  <option key={k} value={k}>
                                    {thuVienFieldLabel(k)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                4. Hạng mục kiểm tra *
                              </label>
                              <select
                                value={loiCascadeHangMuc}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLoiCascadeHangMuc(v);
                                  setLoiCascadeNoiDung('');
                                  setLoiCascadePickId('');
                                }}
                                disabled={loiSaving || !loiCascadeCanhBao}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white disabled:bg-slate-300"
                              >
                                <option value="">-- Chọn hạng mục kiểm tra --</option>
                                {loiOptsHangMuc.map((k) => (
                                  <option key={k} value={k}>
                                    {thuVienFieldLabel(k)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                5. Nội dung kiểm tra *
                              </label>
                              <select
                                value={loiCascadeNoiDung}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setLoiCascadeNoiDung(v);
                                  setLoiCascadePickId('');
                                }}
                                disabled={loiSaving || !loiCascadeHangMuc}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white disabled:bg-slate-300"
                              >
                                <option value="">-- Chọn nội dung kiểm tra --</option>
                                {loiOptsNoiDung.map((k) => (
                                  <option key={k} value={k}>
                                    {thuVienFieldLabel(k)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="relative" ref={loiNguoiViPhamRef}>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Người vi phạm *
                            </label>
                            <button
                              ref={loiNguoiViPhamTriggerRef}
                              type="button"
                              disabled={loiSaving || employees.length === 0}
                              onClick={() => setLoiNguoiViPhamOpen((o) => !o)}
                              title="Chọn một hoặc nhiều người — bấm để mở danh sách"
                              aria-expanded={loiNguoiViPhamOpen}
                              aria-haspopup="listbox"
                              className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white text-left font-bold text-slate-800 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                            >
                              <span className="truncate min-w-0">
                                {loiViPhamSelectButtonLabel(loiFormNguoiIds, employees)}
                              </span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform ${
                                  loiNguoiViPhamOpen ? 'rotate-180' : ''
                                }`}
                                aria-hidden
                              />
                            </button>
                            {loiNguoiViPhamOpen &&
                            employees.length > 0 &&
                            loiNguoiMenuBox &&
                            createPortal(
                              <div
                                ref={loiNguoiViPhamMenuRef}
                                className="fixed z-[200] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-xl [scrollbar-gutter:stable]"
                                style={{
                                  top: loiNguoiMenuBox.top,
                                  left: loiNguoiMenuBox.left,
                                  width: loiNguoiMenuBox.width,
                                  maxHeight: loiNguoiMenuBox.maxHeight,
                                }}
                                role="listbox"
                                aria-label="Danh sách người vi phạm"
                              >
                                {employees.map((e) => {
                                  const checked = loiFormNguoiIds.includes(e.id);
                                  return (
                                    <label
                                      key={e.id}
                                      className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-800 hover:bg-slate-100"
                                    >
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
                                        checked={checked}
                                        disabled={loiSaving}
                                        onChange={() => {
                                          setLoiFormNguoiIds((prev) =>
                                            checked
                                              ? prev.filter((id) => id !== e.id)
                                              : [...prev, e.id],
                                          );
                                        }}
                                      />
                                      <span className="min-w-0 truncate font-semibold">
                                        {e.full_name || e.code || e.id}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>,
                              document.body,
                            )}
                          </div>
                          {loiMatchingRows.length > 1 && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                Chọn bản ghi thư viện * ({loiMatchingRows.length} dòng trùng)
                              </label>
                              <select
                                value={loiCascadePickId}
                                onChange={(e) => setLoiCascadePickId(e.target.value)}
                                disabled={loiSaving}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white"
                              >
                                <option value="">-- Chọn một dòng --</option>
                                {loiMatchingRows.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    STT {r.stt ?? '—'} · {(r.noi_dung_kiem_tra || '').slice(0, 56)}
                                    {(r.noi_dung_kiem_tra || '').length > 56 ? '…' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {loiCascadeChuyen &&
                            loiCascadeBoMon &&
                            loiCascadeCanhBao &&
                            loiCascadeHangMuc &&
                            loiCascadeNoiDung &&
                            loiMatchingRows.length === 0 && (
                              <p className="text-[10px] text-red-600">
                                Không có bản ghi khớp toàn bộ lựa chọn — hãy đổi một mức phía trên.
                              </p>
                            )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Ghi chú
                          </label>
                          <textarea
                            rows={2}
                            value={loiFormGhiChu}
                            onChange={(e) => setLoiFormGhiChu(e.target.value)}
                            disabled={loiSaving}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] bg-white resize-none"
                            placeholder="Mô tả thêm (tuỳ chọn)"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={
                            loiSaving ||
                            !loiResolvedThuVien ||
                            loiFormNguoiIds.length === 0
                          }
                          onClick={async () => {
                            if (!selected?.id) return;
                            const tv = loiResolvedThuVien;
                            if (!tv) {
                              alert(
                                'Chọn đủ các bước thư viện lỗi (và bản ghi nếu có nhiều dòng).',
                              );
                              return;
                            }
                            const violators = loiFormNguoiIds
                              .map((id) => {
                                const emp = employees.find((x) => x.id === id);
                                if (!emp) return null;
                                return {
                                  id: emp.id,
                                  ten: emp.full_name || emp.code || emp.id,
                                };
                              })
                              .filter(Boolean) as { id: string; ten: string }[];
                            if (violators.length === 0) {
                              alert('Chọn ít nhất một người vi phạm.');
                              return;
                            }
                            setLoiSaving(true);
                            try {
                              const updated = await taskDetailService.appendLoiGhiNhanMany(
                                selected.id,
                                {
                                  thu_vien_loi_id: tv.id,
                                  chuyen_nganh: tv.chuyen_nganh || '',
                                  bo_mon: tv.bo_mon || '',
                                  canh_bao_loi: tv.canh_bao_loi || '',
                                  hang_muc_kiem_tra: tv.hang_muc_kiem_tra || '',
                                  noi_dung_kiem_tra: tv.noi_dung_kiem_tra || '',
                                  ghi_chu: loiFormGhiChu,
                                },
                                violators,
                              );
                              setDetailByTask((prev) => ({
                                ...prev,
                                [selected.id]: updated,
                              }));
                              setLoiCascadeChuyen('');
                              setLoiCascadeBoMon('');
                              setLoiCascadeCanhBao('');
                              setLoiCascadeHangMuc('');
                              setLoiCascadeNoiDung('');
                              setLoiCascadePickId('');
                              setLoiFormNguoiIds([]);
                              setLoiFormGhiChu('');
                              setLoiNguoiViPhamOpen(false);
                            } catch (err) {
                              console.error('[QuanLyCongViec] appendLoiGhiNhan:', err);
                              alert(
                                err instanceof Error
                                  ? err.message
                                  : 'Không lưu được. Chạy SQL add_cong_viec_loi_ghi_nhan.sql trên Supabase.',
                              );
                            } finally {
                              setLoiSaving(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold hover:bg-amber-800 disabled:opacity-50"
                        >
                          {loiSaving ? 'Đang lưu...' : 'Ghi nhận lỗi'}
                        </button>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-200/70 px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">
                          Đã ghi nhận ({detailByTask[selected.id]?.loi_ghi_nhan?.length ?? 0})
                        </p>
                        {(detailByTask[selected.id]?.loi_ghi_nhan || []).length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic py-2">
                            Chưa có ghi nhận lỗi cho công việc này.
                          </p>
                        ) : (
                          <ul className="space-y-2 max-h-72 overflow-y-auto">
                            {(detailByTask[selected.id]?.loi_ghi_nhan || [])
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(b.ngay_gio).getTime() -
                                  new Date(a.ngay_gio).getTime(),
                              )
                              .map((loi) => (
                                <li
                                  key={loi.id}
                                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-700"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <p
                                        className="font-bold text-slate-900 leading-snug"
                                        title="Người vi phạm"
                                      >
                                        {loi.nguoi_vi_pham_ten || '—'}
                                      </p>
                                      <p className="text-slate-800 leading-snug" title="Nội dung kiểm tra">
                                        {loi.noi_dung_kiem_tra || '—'}
                                      </p>
                                      <p className="text-slate-700 leading-snug" title="Ghi chú">
                                        {loi.ghi_chu?.trim() ? loi.ghi_chu : '—'}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      title="Xóa ghi nhận"
                                      disabled={loiSaving}
                                      onClick={async () => {
                                        if (!window.confirm('Xóa ghi nhận lỗi này?')) return;
                                        setLoiSaving(true);
                                        try {
                                          const updated =
                                            await taskDetailService.removeLoiGhiNhan(
                                              selected.id,
                                              loi.id,
                                            );
                                          setDetailByTask((prev) => ({
                                            ...prev,
                                            [selected.id]: updated,
                                          }));
                                        } catch (err) {
                                          console.error(
                                            '[QuanLyCongViec] removeLoiGhiNhan:',
                                            err,
                                          );
                                          alert(
                                            err instanceof Error
                                              ? err.message
                                              : 'Không xóa được.',
                                          );
                                        } finally {
                                          setLoiSaving(false);
                                        }
                                      }}
                                      className="p-1 rounded text-slate-500 hover:text-red-600 disabled:opacity-40 shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {detailTabState === 'LICH_SU' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-200 px-3 py-3 text-xs text-slate-700 min-h-[80px]">
                      <p className="text-[10px] text-slate-600 mb-2">
                        <span className="font-semibold text-slate-800">Lịch sử thao tác</span> (tạo/sửa công
                        việc…). Sắp xếp theo thời gian, mới nhất trước.
                      </p>
                      {lichSuTimelineItems.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-2">
                          Chưa có sự kiện lịch sử.
                        </p>
                      ) : (
                        <ul className="space-y-2 max-h-[min(420px,55vh)] overflow-y-auto pr-0.5">
                          {lichSuTimelineItems.map((entry, idx) => (
                            <li
                              key={`ls-${idx}-${entry.h.time}`}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded shrink-0">
                                    Thao tác
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-800 truncate">
                                    {entry.h.ten || 'Sự kiện'}
                                  </span>
                                </span>
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  {entry.h.time
                                    ? new Date(entry.h.time).toLocaleString('vi-VN')
                                    : '—'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 mt-1">{entry.h.hanh_vi}</p>
                              {entry.h.ghi_chu ? (
                                <p className="text-[10px] text-slate-600 mt-1 border-t border-slate-300 pt-1">
                                  {entry.h.ghi_chu}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-600">
                Hãy chọn một công việc trong danh sách bên trái để xem chi tiết.
              </div>
            )}
          </div>
          {selected ? (
            <div className="px-3 py-2 sm:px-4 border-t border-slate-100 bg-white flex flex-wrap justify-end gap-2 shrink-0">
              <button
                type="button"
                className="px-4 py-2 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg hover:bg-slate-200 transition-colors uppercase"
                onClick={async () => {
                  if (!selected?.id) return;
                  if (!window.confirm('Chuyển công việc sang trạng thái Tạm dừng?')) return;
                  try {
                    await taskDetailService.setTrangThaiFromQuanLy(selected.id, 'Tạm dừng');
                    const data = await taskDetailService.getAllAsTasks();
                    setTasks(data || []);
                    const next = (data || []).find((t) => t.id === selected.id);
                    if (next) setSelected(next);
                  } catch (err) {
                    console.error('[QuanLyCongViec] Tạm dừng:', err);
                    alert(
                      err instanceof Error
                        ? err.message
                        : 'Không cập nhật được trạng thái.',
                    );
                  }
                }}
              >
                Tạm dừng
              </button>
              <button
                type="button"
                className="px-5 py-2 bg-[#1e293b] text-white text-[11px] font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-md shadow-slate-300/40 uppercase"
                onClick={() => {
                  if (!selected) return;
                  const task = selected;
                  setFormData({
                    hop_dong_id: task.hop_dong_id || '',
                    ten_task: task.ten_task,
                    mo_ta: task.mo_ta || '',
                    trang_thai: task.trang_thai,
                    uu_tien: task.uu_tien,
                    ngay_bat_dau: task.ngay_bat_dau || '',
                    ngay_ket_thuc: task.ngay_ket_thuc || '',
                    ngay_hoan_thanh: task.ngay_hoan_thanh || '',
                    nguoi_phu_trach: task.nguoi_phu_trach || '',
                    tien_do: task.tien_do ?? 0,
                    ghi_chu: task.ghi_chu || '',
                  });
                  const epIds: string[] = [];
                  for (const n of (task.nguoi_phu_trach || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)) {
                    const emp = employees.find(
                      (e) => e.full_name === n || e.code === n,
                    );
                    if (emp && !epIds.includes(emp.id)) epIds.push(emp.id);
                  }
                  setSelectedEmployeeIds(epIds);
                  const ct = contracts.find(
                    (x) => x.id === (task.hop_dong_id || ''),
                  );
                  if (ct) {
                    const r = resolveCustomerIdAndLabel(
                      ct,
                      projects,
                      customersCatalog,
                    );
                    setModalKhachHangId(r?.customerId ?? '');
                    setModalDuAnId(
                      ct.du_an_id != null ? String(ct.du_an_id) : '',
                    );
                  } else {
                    setModalKhachHangId('');
                    setModalDuAnId('');
                  }
                  setTaskModalEditingId(task.id);
                  setIsModalOpen(true);
                }}
              >
                Cập nhật trạng thái
              </button>
            </div>
          ) : null}
        </aside>
      </main>
      <footer
        className="h-auto min-h-8 sm:h-8 bg-slate-100 border-t border-slate-200 px-4 py-1.5 sm:py-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[10px] text-slate-500 shrink-0 rounded-b-xl"
        data-purpose="footer-bar"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
          <span className="font-medium">Hệ thống quản lý công việc v2.1</span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>Công ty Công nghệ XYZ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">Hệ thống đang hoạt động ổn định</span>
        </div>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto overscroll-y-contain bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[min(92vh,100dvh)] my-4 sm:my-0 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {taskModalEditingId ? 'Sửa công việc' : 'Thêm công việc mới'}
              </h2>
              <button
                onClick={() => {
                  setTaskModalEditingId(null);
                  setIsModalOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-300 text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-3 text-xs touch-pan-y">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative min-w-0" ref={modalKhachHangPickerRef}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Khách hàng
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalKhachHangOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700 text-left font-semibold text-slate-900"
                    title="Chọn khách hàng — gõ để tìm"
                    aria-expanded={modalKhachHangOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="truncate min-w-0">
                      {!modalKhachHangId.trim()
                        ? '— Chọn khách hàng —'
                        : khachHangLabelById(modalKhachHangId)}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-slate-600 transition-transform ${
                        modalKhachHangOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                  {modalKhachHangOpen ? (
                    <div
                      className="absolute left-0 right-0 top-full z-[130] mt-1 max-h-72 flex flex-col rounded-lg border-2 border-slate-400 bg-white shadow-lg overflow-hidden"
                      role="listbox"
                      aria-label="Chọn khách hàng"
                    >
                      <div className="shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                        <div className="relative">
                          <Search
                            className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden
                          />
                          <input
                            ref={modalKhachHangSearchRef}
                            type="search"
                            value={modalKhachHangSearch}
                            onChange={(e) => setModalKhachHangSearch(e.target.value)}
                            placeholder="Tìm khách hàng…"
                            autoComplete="off"
                            className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 bg-white"
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1 min-h-0 py-1 max-h-[min(13rem,40vh)] [scrollbar-gutter:stable]">
                        <button
                          type="button"
                          role="option"
                          aria-selected={!modalKhachHangId.trim()}
                          onClick={() => {
                            setModalKhachHangId('');
                            setModalDuAnId('');
                            setFormData((prev) => ({ ...prev, hop_dong_id: '' }));
                            setModalKhachHangOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-100 ${
                            !modalKhachHangId.trim()
                              ? 'bg-slate-100 text-blue-900'
                              : 'text-slate-900'
                          }`}
                        >
                          — Chọn khách hàng —
                        </button>
                        <div className="mx-2 border-t border-slate-200" />
                        {khachHangFilterOptions.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-slate-600">
                            Chưa có dữ liệu khách hàng.
                          </p>
                        ) : khachHangModalSearchMatching.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-slate-600">
                            Không có khách hàng khớp &quot;{modalKhachHangSearch.trim()}&quot;.
                          </p>
                        ) : (
                          khachHangModalSearchMatching.map((k) => {
                            const chosen = modalKhachHangId === k.id;
                            return (
                              <button
                                key={k.id}
                                type="button"
                                role="option"
                                aria-selected={chosen}
                                onClick={() => {
                                  setModalKhachHangId(k.id);
                                  setModalDuAnId('');
                                  setFormData((prev) => ({ ...prev, hop_dong_id: '' }));
                                  setModalKhachHangOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 break-words ${
                                  chosen ? 'bg-slate-100 text-blue-900 font-bold' : 'text-slate-800'
                                }`}
                              >
                                {k.label}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Dự án
                  </label>
                  <select
                    value={modalDuAnId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setModalDuAnId(v);
                      setFormData((prev) => ({ ...prev, hop_dong_id: '' }));
                    }}
                    disabled={!modalKhachHangId.trim()}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!modalKhachHangId.trim()
                        ? '— Chọn khách hàng trước —'
                        : '— Chọn dự án —'}
                    </option>
                    {projectsForTaskModal.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.ten_du_an || p.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Hợp đồng
                  </label>
                  <select
                    value={formData.hop_dong_id || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hop_dong_id: e.target.value,
                      }))
                    }
                    disabled={!modalDuAnId.trim()}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!modalDuAnId.trim()
                        ? '— Chọn dự án trước —'
                        : '— Chọn hợp đồng (không bắt buộc) —'}
                    </option>
                    {contractsForTaskModal.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ten_goi_thau || c.so_hop_dong || c.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Người phụ trách
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmployeeDropdown((prev) => !prev)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                    >
                      <span className="truncate text-left">
                        {selectedEmployeeIds.length === 0
                          ? 'Chọn nhân sự phụ trách'
                          : `${selectedEmployeeIds.length} nhân sự được chọn`}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-600 shrink-0">
                        {showEmployeeDropdown ? '▲' : '▼'}
                      </span>
                    </button>
                    {showEmployeeDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-44 overflow-y-auto">
                        {employees.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-slate-500">
                            Chưa có dữ liệu nhân sự.
                          </p>
                        ) : (
                          <ul className="py-1">
                            {employees.map((emp) => {
                              const checked = selectedEmployeeIds.includes(emp.id);
                              return (
                                <li
                                  key={emp.id}
                                  className="px-3 py-1.5 hover:bg-slate-200 text-[11px] flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedEmployeeIds((prev) =>
                                        checked
                                          ? prev.filter((id) => id !== emp.id)
                                          : [...prev, emp.id],
                                      );
                                    }}
                                  />
                                  <span className="truncate">
                                    {emp.full_name || emp.code}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Trạng thái công việc
                  </label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => {
                        let td = prev.tien_do ?? 0;
                        if (isTrangThaiDaXong(v)) td = 100;
                        else if (isTrangThaiDaXong(prev.trang_thai)) td = 0;
                        return { ...prev, trang_thai: v, tien_do: td };
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  >
                    <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                    <option value="Đã xong">Đã xong</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                  Tên công việc *
                </label>
                <input
                  value={formData.ten_task}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ten_task: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  placeholder="Nhập tên công việc"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Mức ưu tiên
                  </label>
                  <select
                    value={formData.uu_tien}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, uu_tien: e.target.value as any }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn cấp">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formData.ngay_bat_dau || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ngay_bat_dau: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formData.ngay_ket_thuc || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ngay_ket_thuc: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  />
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.mo_ta || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mo_ta: e.target.value }))
                  }
                  rows={12}
                  className="w-full min-h-[14rem] sm:min-h-[16rem] rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 resize-y shadow-sm"
                  placeholder="Nhập mô tả chi tiết công việc…"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-200 shrink-0">
              <button
                onClick={() => {
                  setTaskModalEditingId(null);
                  setIsModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200"
                disabled={saving}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!formData.ten_task.trim()) {
                    alert('Vui lòng nhập tên công việc');
                    return;
                  }
                  const nguoiPhuTrachStr =
                    selectedEmployeeIds
                      .map(
                        (id) =>
                          employees.find((e) => e.id === id)?.full_name ||
                          employees.find((e) => e.id === id)?.code ||
                          '',
                      )
                      .filter(Boolean)
                      .join(', ') || formData.nguoi_phu_trach || '';
                  try {
                    setSaving(true);
                    const basePayload = {
                      ten_task: formData.ten_task,
                      mo_ta: formData.mo_ta || null,
                      trang_thai: formData.trang_thai,
                      uu_tien: formData.uu_tien,
                      ngay_bat_dau: formData.ngay_bat_dau || null,
                      ngay_ket_thuc: formData.ngay_ket_thuc || null,
                      ngay_hoan_thanh: formData.ngay_hoan_thanh || null,
                      nguoi_phu_trach: nguoiPhuTrachStr || null,
                      tien_do: formData.tien_do ?? 0,
                      ghi_chu: formData.ghi_chu || null,
                      hop_dong_id: formData.hop_dong_id || null,
                    };
                    const payload = taskModalEditingId
                      ? basePayload
                      : {
                          ...basePayload,
                          noi_dung_tieu_chuan: null,
                          trang_thai_tieu_chuan: 'Chưa đánh giá',
                          ghi_chu_tieu_chuan: null,
                        };
                    if (taskModalEditingId) {
                      const updated = await taskDetailService.updateFromForm(
                        taskModalEditingId,
                        payload,
                      );
                      const data = await taskDetailService.getAllAsTasks();
                      setTasks(data || []);
                      setSelected(
                        data.find((t) => t.id === updated.id) || updated,
                      );
                      const detailFresh = await taskDetailService.getOrCreateByTaskId(
                        updated.id,
                      );
                      if (detailFresh) {
                        setDetailByTask((prev) => ({
                          ...prev,
                          [updated.id]: detailFresh,
                        }));
                      }
                    } else {
                      const created = await taskDetailService.createFromForm(payload);
                      const data = await taskDetailService.getAllAsTasks();
                      setTasks(data || []);
                      const sel =
                        data.find((t) => t.id === created.id) || data[0] || null;
                      setSelected(sel);
                      if (sel) {
                        const detailFresh =
                          await taskDetailService.getOrCreateByTaskId(sel.id);
                        if (detailFresh) {
                          setDetailByTask((prev) => ({
                            ...prev,
                            [sel.id]: detailFresh,
                          }));
                        }
                      }
                    }
                    setTaskModalEditingId(null);
                    setIsModalOpen(false);
                  } catch (error) {
                    console.error('[QuanLyCongViec] Error saving task:', error);
                    alert(
                      taskModalEditingId
                        ? 'Lỗi khi cập nhật công việc'
                        : 'Lỗi khi thêm công việc',
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-800 text-white text-xs font-bold hover:bg-blue-950 shadow-sm shadow-blue-500/30 disabled:opacity-60"
                disabled={saving}
              >
                {saving
                  ? 'Đang lưu...'
                  : taskModalEditingId
                    ? 'Lưu thay đổi'
                    : 'Lưu công việc'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PreviewLinkModal
        url={docPreviewUrl}
        onClose={() => setDocPreviewUrl(null)}
        title="Xem tài liệu đính kèm"
        zIndexClass="z-[240]"
      />
    </div>
  );
}

