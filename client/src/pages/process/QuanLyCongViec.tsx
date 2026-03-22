import React, {
  useCallback,
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
  GripVertical,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import {
  taskService,
  type TaskRow,
  type QuyTrinhLamViecItem,
  type QuyTrinhTieuChuanDong,
} from '../../lib/services/taskService';
import {
  taskTemplateService,
  type TaskTemplateRow,
} from '../../lib/services/taskTemplateService';
import { contractService } from '../../lib/services/contractService';
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

/** Thứ tự id sau khi kéo phần tử `dragId` tới vị trí `dropIndex`. */
function newQuyTrinhTieuChuanLine(): QuyTrinhTieuChuanDong {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    noi_dung: '',
    diem: 0,
    trang_thai: 'Chưa đánh giá',
  };
}

function reorderQuyTrinhItemIds(
  items: { id: string }[],
  dragId: string,
  dropIndex: number,
): string[] {
  const from = items.findIndex((x) => x.id === dragId);
  if (from === -1) return items.map((x) => x.id);
  const copy = [...items];
  const [removed] = copy.splice(from, 1);
  copy.splice(dropIndex, 0, removed);
  return copy.map((x) => x.id);
}

/** Thanh tiến độ danh sách trái: cùng logic cột quy trình — có `quy_trinh_items` thì % = bước Đạt / tổng bước; không thì dùng `tien_do` trong DB. */
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

/** Tiến độ checklist trong một bước: số dòng Đạt / tổng dòng có nội dung. */
function quyTrinhChecklistLineProgress(item: QuyTrinhLamViecItem): {
  done: number;
  total: number;
  pct: number;
} {
  const lines = (item.tieu_chuan ?? []).filter((t) => String(t?.noi_dung ?? '').trim());
  if (lines.length === 0) return { done: 0, total: 0, pct: 0 };
  const done = lines.filter((t) => (String(t.trang_thai ?? '').trim() === 'Đạt')).length;
  return {
    done,
    total: lines.length,
    pct: Math.round((done / lines.length) * 100),
  };
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

export function QuanLyCongViec() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  /** Rỗng = tất cả hợp đồng; có phần tử = chỉ công việc thuộc các hợp đồng đã chọn */
  const [filterHopDongIds, setFilterHopDongIds] = useState<string[]>([]);
  /** Rỗng = tất cả nhân sự; khớp với `nguoi_phu_trach` (tên/code đã lưu) */
  const [filterNhanSuId, setFilterNhanSuId] = useState('');
  /** Lọc theo ngày kết thúc (YYYY-MM-DD), để trống = không giới hạn cạnh đó */
  const [filterKetThucTu, setFilterKetThucTu] = useState('');
  const [filterKetThucDen, setFilterKetThucDen] = useState('');
  const [contractFilterOpen, setContractFilterOpen] = useState(false);
  const [contractFilterSearch, setContractFilterSearch] = useState('');
  const contractFilterRef = useRef<HTMLDivElement>(null);
  const contractFilterSearchRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const [contracts, setContracts] = useState<
    Array<{ id: string; so_hop_dong: string; ten_goi_thau: string }>
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** `null` = thêm mới; có giá trị = đang sửa công việc (id hiển thị trong list = task_id hoặc id chi tiết) */
  const [taskModalEditingId, setTaskModalEditingId] = useState<string | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docDraftRows, setDocDraftRows] = useState<DocDraftRow[]>([newDocDraftRow()]);
  const [docSaving, setDocSaving] = useState(false);
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
  const [templateItems, setTemplateItems] = useState<TaskTemplateRow[]>([]);
  const [thuVienLoiList, setThuVienLoiList] = useState<ThuVienLoiRow[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [detailTabState, setDetailTabState] = useState<
    'NOI_DUNG' | 'BINH_LUAN' | 'TAI_LIEU' | 'LICH_SU' | 'LOI_GHI_NHAN'
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
    if (!selected) setShowAddTaskDropdown(false);
  }, [selected]);

  /** Bước quy trình lưu trong jsonb `ten_task` của công việc đang chọn */
  const quyTrinhItemsForSelected = useMemo(
    () => selected?.ten_task_detail?.quy_trinh_items ?? [],
    [selected?.ten_task_detail?.quy_trinh_items, selected?.id],
  );
  /** Tiến độ hiển thị cột phải: bước Đạt / tổng bước (đồng bộ với cách lưu `tien_do`). */
  const quyTrinhProgress = useMemo(() => {
    const items = quyTrinhItemsForSelected;
    const total = items.length;
    if (total === 0) return { pct: 0, done: 0, total: 0 };
    const done = items.filter((it) => (it.trang_thai || '').trim() === 'Đạt').length;
    return { pct: Math.round((done / total) * 100), done, total };
  }, [quyTrinhItemsForSelected]);
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const [addTaskCheckboxIds, setAddTaskCheckboxIds] = useState<string[]>([]);
  const [addTaskSaving, setAddTaskSaving] = useState(false);
  const [addCustomTaskTen, setAddCustomTaskTen] = useState('');
  const [addCustomTaskMoTa, setAddCustomTaskMoTa] = useState('');
  /** Nhiều dòng checklist khi thêm bước tùy chỉnh */
  const [addCustomChecklistLines, setAddCustomChecklistLines] = useState<
    Array<{ id: string; noi_dung: string; diem: string }>
  >([]);
  const [quyTrinhEditModal, setQuyTrinhEditModal] = useState<{
    itemId: string;
    ten_task: string;
    noi_dung_tieu_chuan: string;
    ghi_chu: string;
    /** Các bước con (checklist) — chỉnh trong modal Sửa bước */
    tieu_chuan_lines: QuyTrinhTieuChuanDong[];
  } | null>(null);
  const [quyTrinhMutating, setQuyTrinhMutating] = useState(false);
  /** Menu ba chấm trên từng thẻ bước quy trình */
  const [quyTrinhStepMenuId, setQuyTrinhStepMenuId] = useState<string | null>(null);
  /** Bước quy trình đang xem trong modal (thẻ luôn thu gọn). */
  const [quyTrinhStepViewItemId, setQuyTrinhStepViewItemId] = useState<string | null>(null);
  /** Menu ba chấm trên từng dòng checklist tiêu chuẩn — key `bướcId:chỉSốDòng` */
  const [checklistLineMenuKey, setChecklistLineMenuKey] = useState<string | null>(null);
  const checklistMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [checklistLineMenuBox, setChecklistLineMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const quyTrinhStepMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [quyTrinhStepMenuBox, setQuyTrinhStepMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const quyTrinhDragIdRef = useRef<string | null>(null);
  const [quyTrinhDragId, setQuyTrinhDragId] = useState<string | null>(null);
  const [quyTrinhDragOverId, setQuyTrinhDragOverId] = useState<string | null>(null);

  const quyTrinhViewItem = useMemo(
    () =>
      quyTrinhStepViewItemId
        ? (quyTrinhItemsForSelected.find((i) => i.id === quyTrinhStepViewItemId) ?? null)
        : null,
    [quyTrinhStepViewItemId, quyTrinhItemsForSelected],
  );

  useEffect(() => {
    setQuyTrinhStepMenuId(null);
    setChecklistLineMenuKey(null);
    setQuyTrinhStepViewItemId(null);
  }, [selected?.id]);

  useEffect(() => {
    if (quyTrinhStepViewItemId == null) return;
    if (!quyTrinhItemsForSelected.some((i) => i.id === quyTrinhStepViewItemId)) {
      setQuyTrinhStepViewItemId(null);
    }
  }, [quyTrinhStepViewItemId, quyTrinhItemsForSelected]);

  useEffect(() => {
    if (quyTrinhStepViewItemId == null) {
      setChecklistLineMenuKey(null);
    }
  }, [quyTrinhStepViewItemId]);

  useEffect(() => {
    if (quyTrinhStepMenuId == null) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-quy-trinh-step-menu]')) return;
      setQuyTrinhStepMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [quyTrinhStepMenuId]);

  useEffect(() => {
    if (checklistLineMenuKey == null) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-quy-trinh-checklist-line-menu]')) return;
      setChecklistLineMenuKey(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [checklistLineMenuKey]);

  useLayoutEffect(() => {
    if (checklistLineMenuKey == null) {
      setChecklistLineMenuBox(null);
      checklistMenuAnchorRef.current = null;
      return;
    }
    const btn = checklistMenuAnchorRef.current;
    if (!btn) return;
    const MENU_W = 168;
    const place = () => {
      const r = btn.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
      const top = r.bottom + 4;
      const maxHeight = Math.max(160, window.innerHeight - top - 12);
      setChecklistLineMenuBox({ top, left, width: MENU_W, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [checklistLineMenuKey]);

  useLayoutEffect(() => {
    if (quyTrinhStepMenuId == null) {
      setQuyTrinhStepMenuBox(null);
      quyTrinhStepMenuAnchorRef.current = null;
      return;
    }
    const btn = quyTrinhStepMenuAnchorRef.current;
    if (!btn) return;
    const MENU_W = 192;
    const place = () => {
      const r = btn.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
      const top = r.bottom + 4;
      const maxHeight = Math.max(200, window.innerHeight - top - 12);
      setQuyTrinhStepMenuBox({ top, left, width: MENU_W, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [quyTrinhStepMenuId]);

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

  const contractsMatchingFilter = useMemo(() => {
    const q = contractFilterSearch.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const label = (c.ten_goi_thau || c.so_hop_dong || c.id).toLowerCase();
      return label.includes(q) || String(c.id).toLowerCase().includes(q);
    });
  }, [contracts, contractFilterSearch]);

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

  const applyQuyTrinhDetailToUi = useCallback((updated: TaskDetailRow) => {
    const taskRow = taskDetailService.mapToTaskRow(updated as any);
    setDetailByTask((p) => ({ ...p, [taskRow.id]: updated }));
    setTasks((prev) => prev.map((t) => (t.id === taskRow.id ? taskRow : t)));
    setSelected((s) => (s?.id === taskRow.id ? taskRow : s));
  }, []);

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

  const contractLabelById = (id: string | null | undefined) => {
    if (!id) return '';
    const c = contracts.find((ct) => ct.id === id);
    return c ? c.ten_goi_thau || c.so_hop_dong || c.id : id;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, contractsData, employeesData, templatesData, thuVienData] =
          await Promise.all([
            taskDetailService.getAllAsTasks(),
            contractService.getAll(),
            employeeService.getAll(),
            taskTemplateService.getAll(),
            thuVienLoiService.getAll().catch((err) => {
              console.warn('[QuanLyCongViec] thu_vien_loi:', err);
              return [] as ThuVienLoiRow[];
            }),
          ]);
        setThuVienLoiList(thuVienData || []);
        setTasks(data || []);
        setContracts(
          (contractsData || []).map((c) => ({
            id: c.id,
            so_hop_dong: c.so_hop_dong || '',
            ten_goi_thau: c.ten_goi_thau || '',
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
        setTemplateItems(templatesData || []);
        if (data && data.length > 0) {
          const first = data[0];
          setSelected(first);
          const detail = await taskDetailService.getOrCreateByTaskId(first.id);
          if (detail) {
            setDetailByTask((prev) => ({ ...prev, [first.id]: detail }));
            setCommentsByTask((prev) => ({
              ...prev,
              [first.id]: (detail.binh_luan || []) as any,
            }));
          }
        }
      } catch (error) {
        console.error('[QuanLyCongViec] Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tasksInContractScope = useMemo(() => {
    if (filterHopDongIds.length === 0) return tasks;
    const set = new Set(filterHopDongIds.map((x) => x.trim()).filter(Boolean));
    return tasks.filter((t) => set.has((t.hop_dong_id || '').trim()));
  }, [tasks, filterHopDongIds]);

  const tasksAfterAssigneeAndDate = useMemo(() => {
    let list = tasksInContractScope;
    if (filterNhanSuId.trim()) {
      list = list.filter((t) => taskMatchesAssigneeFilter(t, filterNhanSuId, employees));
    }
    if (filterKetThucTu.trim() || filterKetThucDen.trim()) {
      list = list.filter((t) => taskNgayKetThucInRange(t, filterKetThucTu, filterKetThucDen));
    }
    return list;
  }, [
    tasksInContractScope,
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
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.ten_task.toLowerCase().includes(term) ||
          (t.mo_ta || '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [tasksAfterAssigneeAndDate, activeTab, search]);

  // Nếu có truyền `taskId` qua URL, tự chọn đúng task để người dùng bấm từ nơi khác.
  useEffect(() => {
    if (!taskIdFromUrl) return;
    // Đảm bảo task nằm trong filtered list.
    setActiveTab('all');
    setSearch('');
    setFilterHopDongIds([]);
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-3 space-y-4 h-[calc(100vh-96px)] min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
            Quản lý công việc
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={() => navigate('/quy-trinh/thu-vien-loi')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-indigo-600 bg-indigo-200 text-indigo-950 text-sm font-bold hover:bg-indigo-300 shadow-sm"
            title="Mở Thư viện lỗi"
          >
            <BookOpen className="w-4 h-4 text-indigo-700" />
            Thư viện lỗi
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
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
              setSelectedEmployeeIds([]);
              setTaskModalEditingId(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-700/35 hover:bg-blue-800 active:scale-95 border border-blue-900"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 flex-1 min-h-0">
        {/* Danh sách công việc (trái) */}
        <div className="lg:col-span-4 bg-white border-2 border-slate-400 rounded-xl shadow-lg flex flex-col min-h-0">
          <div className="px-4 py-3 border-b-2 border-slate-300 flex items-center justify-between gap-2">
          <div className="flex gap-1 text-[11px] font-bold rounded-full bg-slate-200/90 p-1">
            {[
              {
                id: 'all',
                label: 'Tất cả',
                color: 'text-slate-900',
                count: statusCounts.all,
              },
              {
                id: 'doing',
                label: 'Đang làm',
                color: 'text-blue-800',
                count: statusCounts.doing,
              },
              {
                id: 'pending',
                label: 'Chờ duyệt',
                color: 'text-amber-900',
                count: statusCounts.pending,
              },
              {
                id: 'done',
                label: 'Đã xong',
                color: 'text-emerald-900',
                count: statusCounts.done,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StatusTab)}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white shadow-md ring-2 ring-slate-400/60'
                    : 'bg-transparent'
                }`}
              >
                <span
                  className={`${
                    activeTab === tab.id
                      ? `${tab.color} font-bold`
                      : 'text-slate-700 font-bold'
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
                    tab.id === 'done'
                      ? 'bg-emerald-600 text-white'
                      : tab.id === 'doing'
                      ? 'bg-blue-800 text-white'
                      : tab.id === 'pending'
                      ? 'bg-amber-500 text-amber-950'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          </div>

          <div className="px-4 py-2 border-b border-slate-300">
            <div className="grid grid-cols-2 gap-x-2 gap-y-2 items-start">
            <div className="relative min-w-0">
              <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nhập tên công việc"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border-2 border-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600 bg-slate-200 font-bold text-slate-900"
              />
            </div>
            <div className="relative min-w-0" ref={contractFilterRef}>
              <label className="sr-only">Lọc theo hợp đồng</label>
              <button
                type="button"
                onClick={() => setContractFilterOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-slate-400 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600 text-slate-900 font-bold text-left"
                title="Lọc danh sách theo một hoặc nhiều hợp đồng"
                aria-expanded={contractFilterOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate min-w-0">
                  {filterHopDongIds.length === 0
                    ? 'Tất cả hợp đồng'
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
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                Nhân sự phụ trách
              </label>
              <select
                value={filterNhanSuId}
                onChange={(e) => setFilterNhanSuId(e.target.value)}
                className="w-full min-w-0 rounded-lg border-2 border-slate-400 px-2 py-1.5 text-[11px] bg-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                title="Chỉ hiện công việc có người phụ trách đã chọn"
              >
                <option value="">Tất cả nhân sự</option>
                {employees
                  .slice()
                  .sort((a, b) =>
                    (a.full_name || a.code).localeCompare(b.full_name || b.code, 'vi'),
                  )
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name || e.code || e.id}
                    </option>
                  ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                Ngày kết thúc (từ — đến)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={filterKetThucTu}
                  onChange={(e) => setFilterKetThucTu(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border-2 border-slate-400 px-1 py-1.5 text-[10px] bg-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                  title="Từ ngày kết thúc"
                />
                <span className="text-[9px] font-bold text-slate-500 shrink-0">—</span>
                <input
                  type="date"
                  value={filterKetThucDen}
                  onChange={(e) => setFilterKetThucDen(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border-2 border-slate-400 px-1 py-1.5 text-[10px] bg-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                  title="Đến ngày kết thúc"
                />
              </div>
            </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-2 overscroll-contain">
            {loading ? (
              <p className="px-4 py-4 text-xs text-slate-600">Đang tải công việc...</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-600">Không có công việc nào.</p>
            ) : (
              <div className="space-y-2 px-0.5">
                {filtered.map((task, index) => {
                  const isActive = selected && selected.id === task.id;
                  const listPct = listProgressPercent(task);
                  const hopDongLabel = task.hop_dong_id
                    ? contractLabelById(task.hop_dong_id)
                    : '';
                  return (
                    <div
                      key={`${task.id}-${index}`}
                      className={`w-full px-4 py-3.5 border-l-[5px] rounded-r-lg flex items-start justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-100 border-blue-700 shadow-sm ring-1 ring-blue-200/80'
                          : 'bg-slate-50/90 border-transparent hover:bg-slate-200/90 ring-1 ring-slate-200/80'
                      }`}
                    >
                      <button
                        onClick={() => setSelected(task)}
                        className="flex-1 min-w-0 text-left flex flex-col gap-2"
                      >
                        <span
                          className="text-sm font-bold text-slate-900 line-clamp-3 leading-snug"
                          title={task.ten_task}
                        >
                          {task.ten_task}
                        </span>
                        {task.hop_dong_id ? (
                          <span
                            className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-snug"
                            title={hopDongLabel}
                          >
                            {hopDongLabel}
                          </span>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-[8rem]">
                            <div className="flex-1 min-w-0 h-2.5 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300/80">
                              <div
                                className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                                style={{ width: `${listPct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800 tabular-nums shrink-0 min-w-[2.25rem]">
                              {listPct}%
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 shrink-0 max-w-full">
                            {task.trang_thai}
                          </span>
                        </div>
                      </button>
                      <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0 pt-0.5">
                        <button
                          type="button"
                          title="Sửa công việc"
                          aria-label="Sửa công việc"
                          onClick={(e) => {
                            e.stopPropagation();
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
                            setTaskModalEditingId(task.id);
                            setIsModalOpen(true);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-amber-600 bg-amber-100 text-amber-900 hover:bg-amber-200 shadow-sm"
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          title="Xóa công việc"
                          aria-label="Xóa công việc"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              !window.confirm(
                                'Bạn có chắc chắn muốn xóa công việc này?',
                              )
                            )
                              return;
                            (async () => {
                              try {
                                await taskDetailService.deleteByTaskId(task.id);
                                setTasks((prev) =>
                                  prev.filter((t) => t.id !== task.id),
                                );
                                if (selected && selected.id === task.id) {
                                  const next =
                                    filtered.find((t) => t.id !== task.id) ||
                                    null;
                                  setSelected(next);
                                }
                              } catch (err) {
                                console.error(
                                  '[QuanLyCongViec] Error deleting task:',
                                  err,
                                );
                                alert('Lỗi khi xóa công việc');
                              }
                            })();
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-red-600 bg-red-100 text-red-800 hover:bg-red-200 shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chi tiết công việc (giữa) */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-400 rounded-xl shadow-lg flex flex-col min-h-0">
                          <div className="px-5 py-3 border-b-2 border-slate-300 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 line-clamp-2">
                {selected ? selected.ten_task : 'Chọn một công việc ở bên trái'}
              </h2>
              {selected && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Mức ưu tiên: {selected.uu_tien} • Trạng thái:{' '}
                  <span className="font-bold text-slate-700">
                    {selected.trang_thai}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-blue-900 bg-blue-800 text-white text-xs font-bold hover:bg-blue-950 disabled:opacity-45 shadow-sm shadow-blue-900/30"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
                  {duyetSaving ? 'Đang duyệt...' : 'Duyệt'}
                </button>
              ) : null}
              {selected ? getStatusBadge(selected.trang_thai) : null}
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-800 font-bold flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {selected ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-100/80 px-2 py-1.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 leading-tight">
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wide text-slate-600 font-bold">
                        Ngày bắt đầu
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-950 tabular-nums">
                        {selected.ngay_bat_dau
                          ? new Date(selected.ngay_bat_dau).toLocaleDateString('vi-VN')
                          : '—'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wide text-slate-600 font-bold">
                        Ngày kết thúc
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-950 tabular-nums">
                        {selected.ngay_ket_thuc
                          ? new Date(selected.ngay_ket_thuc).toLocaleDateString('vi-VN')
                          : '—'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wide text-slate-600 font-bold">
                        Số ngày thực hiện
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-950 tabular-nums">
                        {selectedNgayThongKe.soNgayThucHien != null
                          ? `${selectedNgayThongKe.soNgayThucHien} ngày`
                          : '—'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] uppercase tracking-wide text-slate-600 font-bold">
                        Số ngày còn lại
                      </div>
                      <div
                        className={`text-[11px] font-extrabold tabular-nums ${selectedNgayThongKe.conLaiClass}`}
                      >
                        {selectedNgayThongKe.conLaiText}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-600 mb-0.5 font-bold">
                    Người phụ trách
                  </div>
                    {selected.nguoi_phu_trach ? (
                      <div className="flex flex-wrap gap-1.5">
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
                                className="inline-flex items-center px-0.5 py-0.5"
                                title={name}
                              >
                                {emp?.avatar ? (
                                  <img
                                    src={emp.avatar}
                                    alt={name}
                                    className="h-7 w-7 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-800 text-[9px] font-bold text-white">
                                    {initials}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        Chưa gán
                      </span>
                    )}
                </div>
                <div>
                    <div className="text-[11px] text-slate-600 mb-1 font-bold">
                      Hợp đồng (gán id hợp đồng)
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                      <select
                        value={hopDongDraft}
                        onChange={(e) => setHopDongDraft(e.target.value)}
                        disabled={contractAssignSaving}
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                      >
                        <option value="">-- Chưa gán hợp đồng --</option>
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
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-900 disabled:opacity-40 shrink-0"
                      >
                        {contractAssignSaving ? 'Đang lưu...' : 'Lưu hợp đồng'}
                      </button>
                    </div>
                </div>

                {/* Tabs chi tiết: Nội dung / Bình luận / Tài liệu / Lịch sử */}
                <div className="mt-2">
                  <div className="border-b border-slate-200 flex gap-4 text-[11px] font-bold">
                    {[
                      { id: 'NOI_DUNG', label: 'NỘI DUNG' },
                      { id: 'BINH_LUAN', label: 'BÌNH LUẬN' },
                      { id: 'TAI_LIEU', label: 'TÀI LIỆU' },
                      { id: 'LOI_GHI_NHAN', label: 'GHI NHẬN LỖI' },
                      { id: 'LICH_SU', label: 'LỊCH SỬ' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailTabState(tab.id as any)}
                        className={`py-2 px-1 -mb-px border-b-2 ${
                          detailTabState === tab.id
                            ? 'border-blue-800 text-blue-800 font-bold'
                            : 'border-transparent text-slate-600'
                        }`}
                      >
                        {tab.label}
                        {tab.id === 'BINH_LUAN' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[9px] px-1.5">
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
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[9px] px-1.5">
                            {
                              (detailByTask[selected.id]?.tai_lieu || []).filter(
                                (d: TaskDetailDocument) => String(d?.link || '').trim(),
                              ).length
                            }
                          </span>
                        )}
                        {tab.id === 'LOI_GHI_NHAN' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[9px] px-1.5">
                            {detailByTask[selected.id]?.loi_ghi_nhan?.length ?? 0}
                          </span>
                        )}
                        {tab.id === 'LICH_SU' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[9px] px-1.5">
                            {(detailByTask[selected.id]?.lich_su || []).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {detailTabState === 'NOI_DUNG' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-200 px-3 py-3 text-xs text-slate-700 min-h-[80px] whitespace-pre-line">
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
                        Ghi lại khi tạo công việc, thêm hoặc sửa bước quy trình và các thao tác liên quan.
                      </p>
                      {(detailByTask[selected.id]?.lich_su || []).length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-2">
                          Chưa có sự kiện lịch sử.
                        </p>
                      ) : (
                        <ul className="space-y-2 max-h-[min(360px,50vh)] overflow-y-auto pr-0.5">
                          {(
                            [...(detailByTask[selected.id]?.lich_su || [])] as TaskDetailHistory[]
                          )
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.time).getTime() - new Date(a.time).getTime(),
                            )
                            .map((h, hi) => (
                              <li
                                key={`${h.time}-${hi}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-800">
                                    {h.ten || 'Sự kiện'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    {h.time
                                      ? new Date(h.time).toLocaleString('vi-VN')
                                      : '—'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-700 mt-1">{h.hanh_vi}</p>
                                {h.ghi_chu ? (
                                  <p className="text-[10px] text-slate-600 mt-1 border-t border-slate-300 pt-1">
                                    {h.ghi_chu}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-600">
                Hãy chọn một công việc trong danh sách bên trái để xem chi tiết.
              </div>
            )}
          </div>
        </div>

        {/* Quy trình làm việc (phải) */}
        <div className="lg:col-span-3 bg-white border-2 border-slate-400 rounded-xl shadow-lg flex flex-col min-h-0">
          <div className="px-4 py-3 border-b-2 border-slate-300 flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Quy trình làm việc
              </h3>
              {selected ? (
                <p className="text-xs text-slate-600 mt-0.5 break-words">
                  Theo công việc: <span className="font-bold text-slate-600">{selected.ten_task}</span>
                </p>
              ) : (
                <p className="text-xs font-bold text-orange-700 mt-0.5">Chọn công việc bên trái trước</p>
              )}
              {selected && quyTrinhProgress.total > 0 ? (
                <div className="mt-2.5 space-y-1.5 pr-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-700">Tiến độ</span>
                    <span className="tabular-nums font-bold text-slate-800 shrink-0">
                      {quyTrinhProgress.done}/{quyTrinhProgress.total} bước đạt ·{' '}
                      {quyTrinhProgress.pct}%
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300/80"
                    role="progressbar"
                    aria-valuenow={quyTrinhProgress.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Tiến độ quy trình theo số bước đạt"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                      style={{ width: `${quyTrinhProgress.pct}%` }}
                    />
                  </div>
                </div>
              ) : selected ? (
                <p className="text-xs text-slate-500 mt-2">
                  Chưa có bước quy trình — tiến độ 0%
                </p>
              ) : null}
            </div>
            <div className="relative shrink-0 self-start">
              <button
                type="button"
                title={!selected ? 'Chọn một công việc ở danh sách bên trái' : undefined}
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  setShowAddTaskDropdown((prev) => {
                    const next = !prev;
                    if (next) {
                      setAddCustomTaskTen('');
                      setAddCustomTaskMoTa('');
                    }
                    return next;
                  });
                  if (!showAddTaskDropdown) setAddTaskCheckboxIds([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-blue-900 bg-blue-800 text-white text-sm font-bold hover:bg-blue-950 hover:border-blue-950 disabled:opacity-45 disabled:cursor-not-allowed shadow-md shadow-blue-900/40"
              >
                <Plus className="w-4 h-4" />
                Thêm task
              </button>
              {showAddTaskDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setShowAddTaskDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-[22rem] max-h-[min(32rem,85vh)] min-h-0 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="px-3 py-2 border-b border-slate-300 text-[11px] font-bold text-slate-600">
                      Gắn vào:{' '}
                      <span className="text-slate-800">{selected?.ten_task || '—'}</span>
                    </div>
                    <div className="px-3 py-2 border-b border-slate-300 space-y-2 bg-emerald-50/50">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                        Bước quy trình (tự nhập)
                      </p>
                      <input
                        type="text"
                        value={addCustomTaskTen}
                        onChange={(e) => setAddCustomTaskTen(e.target.value)}
                        placeholder="Tên task *"
                        className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-[11px] bg-white"
                      />
                      <textarea
                        rows={2}
                        value={addCustomTaskMoTa}
                        onChange={(e) => setAddCustomTaskMoTa(e.target.value)}
                        placeholder="Mô tả (tuỳ chọn)"
                        className="w-full rounded-lg border border-emerald-200 px-2 py-1.5 text-[11px] bg-white resize-none"
                      />
                      <div className="rounded-lg border border-emerald-200/80 bg-white p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-bold text-slate-600 uppercase">
                            Checklist tiêu chuẩn (nhiều dòng)
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setAddCustomChecklistLines((p) => [
                                ...p,
                                { id: crypto.randomUUID(), noi_dung: '', diem: '0' },
                              ])
                            }
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            Thêm dòng
                          </button>
                        </div>
                        {addCustomChecklistLines.length === 0 ? (
                          <p className="text-[10px] text-slate-600">
                            Tuỳ chọn — sau khi lưu, đánh giá từng dòng qua menu ⋯ trên thẻ checklist.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                            {addCustomChecklistLines.map((line) => (
                              <div key={line.id} className="flex gap-1 items-start">
                                <input
                                  type="text"
                                  value={line.noi_dung}
                                  onChange={(e) =>
                                    setAddCustomChecklistLines((prev) =>
                                      prev.map((x) =>
                                        x.id === line.id ? { ...x, noi_dung: e.target.value } : x,
                                      ),
                                    )
                                  }
                                  placeholder="Nội dung tiêu chuẩn"
                                  className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-[11px]"
                                />
                                <input
                                  type="number"
                                  value={line.diem}
                                  onChange={(e) =>
                                    setAddCustomChecklistLines((prev) =>
                                      prev.map((x) =>
                                        x.id === line.id ? { ...x, diem: e.target.value } : x,
                                      ),
                                    )
                                  }
                                  className="w-14 shrink-0 rounded border border-slate-200 px-1 py-1 text-[11px]"
                                  title="Điểm"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAddCustomChecklistLines((prev) =>
                                      prev.filter((x) => x.id !== line.id),
                                    )
                                  }
                                  className="p-1 text-slate-500 hover:text-red-600 shrink-0"
                                  title="Xóa dòng"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={addTaskSaving || !addCustomTaskTen.trim()}
                        onClick={async () => {
                          const parentId = selected?.id;
                          if (!parentId) {
                            alert('Vui lòng chọn một công việc ở danh sách bên trái.');
                            return;
                          }
                          const ten = addCustomTaskTen.trim();
                          if (!ten) return;
                          setAddTaskSaving(true);
                          try {
                            const detail =
                              detailByTask[parentId] ||
                              (await taskDetailService.getOrCreateByTaskId(parentId));
                            if (!detail) {
                              alert('Không tải được bản ghi công việc. Thử lại sau.');
                              return;
                            }
                            if (!detailByTask[parentId]) {
                              setDetailByTask((p) => ({ ...p, [parentId]: detail }));
                            }
                            const trangThaiTc = 'Chưa đánh giá';
                            const noiDung = addCustomTaskMoTa.trim() || '';
                            const checklistPayload = addCustomChecklistLines
                              .filter((l) => l.noi_dung.trim())
                              .map((l) => ({
                                noi_dung: l.noi_dung.trim(),
                                diem: Number(l.diem) || 0,
                              }));
                            const updated = await taskDetailService.appendQuyTrinhItems(
                              parentId,
                              [
                                {
                                  ten_task: ten,
                                  noi_dung_tieu_chuan: noiDung,
                                  trang_thai: trangThaiTc,
                                  ghi_chu: '',
                                  template_id: null,
                                  tieu_chuan:
                                    checklistPayload.length > 0 ? checklistPayload : undefined,
                                },
                              ],
                            );
                            applyQuyTrinhDetailToUi(updated);
                            setAddCustomTaskTen('');
                            setAddCustomTaskMoTa('');
                            setAddCustomChecklistLines([]);
                            setShowAddTaskDropdown(false);
                          } catch (err) {
                            console.error('[QuanLyCongViec] Error appending quy trình:', err);
                            alert(
                              err instanceof Error
                                ? err.message
                                : 'Không thể cập nhật quy trình. Kiểm tra kết nối hoặc quyền.',
                            );
                          } finally {
                            setAddTaskSaving(false);
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addTaskSaving ? 'Đang lưu...' : 'Thêm bước vào quy trình'}
                      </button>
                    </div>
                    <div className="px-3 py-2 border-b border-slate-300 space-y-2 bg-slate-200/70">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        Khi chọn mẫu
                      </p>
                      <p className="text-[9px] text-slate-600 leading-snug">
                        Tick mẫu bên dưới rồi bấm &quot;Thêm vào quy trình&quot;. Mỗi bước lấy tên, mô tả và checklist từ
                        mẫu; trạng thái mặc định &quot;Chưa đánh giá&quot;.
                      </p>
                    </div>
                    <div className="px-3 py-1.5 bg-slate-200/80 text-[10px] font-bold text-slate-600 uppercase">
                      Hoặc chọn từ mẫu
                    </div>
                    <div className="flex-1 min-h-0 max-h-[min(14rem,45vh)] overflow-y-auto overscroll-contain py-1 pr-1 [scrollbar-gutter:stable]">
                      {templateItems.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-500">
                          Chưa có mẫu — dùng phần &quot;Task mới&quot; phía trên.
                        </p>
                      ) : (
                        templateItems.map((tpl) => {
                          const checked = addTaskCheckboxIds.includes(tpl.id);
                          return (
                            <label
                              key={tpl.id}
                              className="flex items-start gap-2 px-3 py-2 hover:bg-slate-200 cursor-pointer text-[11px]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setAddTaskCheckboxIds((prev) =>
                                    checked
                                      ? prev.filter((id) => id !== tpl.id)
                                      : [...prev, tpl.id],
                                  );
                                }}
                                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 mt-0.5"
                              />
                              <span className="text-slate-800 break-words min-w-0">
                                {tpl.task || tpl.id.slice(0, 8)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-slate-300">
                      <button
                        type="button"
                        disabled={addTaskCheckboxIds.length === 0 || addTaskSaving}
                        onClick={async () => {
                          if (addTaskCheckboxIds.length === 0) return;
                          const parentId = selected?.id;
                          if (!parentId) {
                            alert('Vui lòng chọn một công việc ở danh sách bên trái.');
                            return;
                          }
                          setAddTaskSaving(true);
                          try {
                            const detail =
                              detailByTask[parentId] ||
                              (await taskDetailService.getOrCreateByTaskId(parentId));
                            if (!detail) {
                              alert('Không tải được bản ghi công việc. Thử lại sau.');
                              return;
                            }
                            if (!detailByTask[parentId]) {
                              setDetailByTask((p) => ({ ...p, [parentId]: detail }));
                            }
                            const toAppend: Parameters<
                              typeof taskDetailService.appendQuyTrinhItems
                            >[1] = [];
                            for (const tplId of addTaskCheckboxIds) {
                              const tpl = templateItems.find((t) => t.id === tplId);
                              if (!tpl) continue;
                              const tenName = tpl.task || tpl.cv || 'Công việc mới';
                              const autoNoiDung = (tpl.tieu_chuan || [])
                                .map((t) => t.noi_dung)
                                .filter(Boolean)
                                .join('\n');
                              const noiDung = autoNoiDung || (tpl.mo_ta || '');
                              const trangThaiTc = 'Chưa đánh giá';
                              toAppend.push({
                                ten_task: tenName,
                                noi_dung_tieu_chuan: noiDung,
                                trang_thai: trangThaiTc,
                                ghi_chu: '',
                                tieu_chuan: tpl.tieu_chuan?.length
                                  ? tpl.tieu_chuan.map((t) => ({
                                      noi_dung: t.noi_dung,
                                      diem: t.diem,
                                    }))
                                  : undefined,
                                template_id: tpl.id,
                              });
                            }
                            if (toAppend.length === 0) return;
                            const updated = await taskDetailService.appendQuyTrinhItems(
                              parentId,
                              toAppend,
                            );
                            applyQuyTrinhDetailToUi(updated);
                            setShowAddTaskDropdown(false);
                            setAddTaskCheckboxIds([]);
                          } catch (err) {
                            console.error('[QuanLyCongViec] Error appending templates to quy trình:', err);
                            alert(
                              err instanceof Error
                                ? err.message
                                : 'Không thể thêm mẫu vào quy trình.',
                            );
                          } finally {
                            setAddTaskSaving(false);
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-blue-800 text-white text-[11px] font-bold hover:bg-blue-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addTaskSaving ? 'Đang lưu...' : 'Thêm vào quy trình'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="p-4 space-y-4 text-sm flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {!selected ? (
              <p className="text-sm text-slate-600">
                Chọn một công việc ở danh sách bên trái để xem quy trình làm việc gắn với công việc đó.
              </p>
            ) : (
              <>
                {quyTrinhItemsForSelected.length > 0 ? (
                  <div className="space-y-4">
                    {quyTrinhItemsForSelected.map((item, stepIndex) => {
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border-2 border-slate-400 bg-slate-200/90 overflow-hidden transition-shadow shadow-md ${
                            quyTrinhDragId === item.id ? 'opacity-50' : ''
                          } ${
                            quyTrinhDragOverId === item.id &&
                            quyTrinhDragId &&
                            quyTrinhDragId !== item.id
                              ? 'ring-2 ring-blue-700 ring-offset-2 ring-offset-slate-200'
                              : ''
                          }`}
                          onDragOver={(e) => {
                            const drag = quyTrinhDragIdRef.current;
                            if (!drag || drag === item.id) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setQuyTrinhDragOverId(item.id);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const dragId =
                              quyTrinhDragIdRef.current ||
                              e.dataTransfer.getData('text/plain');
                            setQuyTrinhDragOverId(null);
                            quyTrinhDragIdRef.current = null;
                            setQuyTrinhDragId(null);
                            if (!selected?.id || !dragId || dragId === item.id) return;
                            const ids = reorderQuyTrinhItemIds(
                              quyTrinhItemsForSelected,
                              dragId,
                              stepIndex,
                            );
                            setQuyTrinhMutating(true);
                            try {
                              const updated =
                                await taskDetailService.setQuyTrinhItemsOrder(
                                  selected.id,
                                  ids,
                                );
                              applyQuyTrinhDetailToUi(updated);
                            } catch (err) {
                              console.error('[QuanLyCongViec] reorder quy trình:', err);
                              alert(
                                err instanceof Error
                                  ? err.message
                                  : 'Không thể sắp xếp lại.',
                              );
                            } finally {
                              setQuyTrinhMutating(false);
                            }
                          }}
                        >
                          <div className="px-2.5 py-2 bg-slate-200/90">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Kéo để đổi thứ tự bước"
                                title="Kéo thả để sắp xếp"
                                draggable={!quyTrinhMutating}
                                onDragStart={(e) => {
                                  quyTrinhDragIdRef.current = item.id;
                                  e.dataTransfer.setData('text/plain', item.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setQuyTrinhDragId(item.id);
                                }}
                                onDragEnd={() => {
                                  quyTrinhDragIdRef.current = null;
                                  setQuyTrinhDragId(null);
                                  setQuyTrinhDragOverId(null);
                                }}
                                className="shrink-0 p-0.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200/90 cursor-grab active:cursor-grabbing touch-none disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <GripVertical className="w-4 h-4" />
                              </span>
                              <span
                                className="shrink-0 rounded-md bg-blue-700 text-white text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide shadow-sm border border-blue-900"
                                title="Thứ tự bước"
                              >
                                {stepIndex + 1}
                              </span>
                              <p className="flex-1 min-w-0 font-bold text-slate-900 text-sm leading-snug break-words">
                                {item.ten_task || item.id.slice(0, 8)}
                              </p>
                              <div className="relative shrink-0" data-quy-trinh-step-menu>
                                  <button
                                    type="button"
                                    title="Thao tác bước"
                                    aria-expanded={quyTrinhStepMenuId === item.id}
                                    aria-haspopup="menu"
                                    disabled={quyTrinhMutating || !selected?.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const btn = e.currentTarget;
                                      setQuyTrinhStepMenuId((id) => {
                                        if (id === item.id) {
                                          quyTrinhStepMenuAnchorRef.current = null;
                                          return null;
                                        }
                                        quyTrinhStepMenuAnchorRef.current = btn;
                                        return item.id;
                                      });
                                    }}
                                    className="p-1 rounded-md text-slate-600 hover:bg-white hover:text-slate-800 disabled:opacity-40"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {quyTrinhStepMenuId === item.id &&
                                    quyTrinhStepMenuBox &&
                                    createPortal(
                                      <div
                                        data-quy-trinh-step-menu
                                        role="menu"
                                        className="fixed z-[220] min-w-[12rem] max-h-[min(70vh,320px)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-xl [scrollbar-gutter:stable]"
                                        style={{
                                          top: quyTrinhStepMenuBox.top,
                                          left: quyTrinhStepMenuBox.left,
                                          width: quyTrinhStepMenuBox.width,
                                          maxHeight: quyTrinhStepMenuBox.maxHeight,
                                        }}
                                      >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={quyTrinhMutating || !selected?.id}
                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-200 disabled:opacity-40 flex items-center gap-2 border-b border-slate-200"
                                        onClick={() => {
                                          setQuyTrinhStepMenuId(null);
                                          setQuyTrinhStepViewItemId(item.id);
                                        }}
                                      >
                                        <Eye className="w-4 h-4 shrink-0 text-slate-700" />
                                        Xem chi tiết bước
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={quyTrinhMutating || !selected?.id}
                                        className="w-full text-left px-3 py-2.5 text-sm font-bold hover:bg-slate-200 disabled:opacity-40 flex items-center gap-2"
                                        onClick={async () => {
                                          if (!selected?.id) return;
                                          const isDone =
                                            (item.trang_thai || '').trim() === 'Đạt';
                                          setQuyTrinhStepMenuId(null);
                                          setQuyTrinhMutating(true);
                                          try {
                                            const updated =
                                              await taskDetailService.updateQuyTrinhItem(
                                                selected.id,
                                                item.id,
                                                {
                                                  trang_thai: isDone
                                                    ? 'Chưa đánh giá'
                                                    : 'Đạt',
                                                },
                                              );
                                            applyQuyTrinhDetailToUi(updated);
                                          } catch (err) {
                                            console.error(
                                              '[QuanLyCongViec] hoàn thành bước:',
                                              err,
                                            );
                                            alert(
                                              err instanceof Error
                                                ? err.message
                                                : 'Không thể cập nhật.',
                                            );
                                          } finally {
                                            setQuyTrinhMutating(false);
                                          }
                                        }}
                                      >
                                        <CheckCircle2
                                          className={`w-4 h-4 shrink-0 ${
                                            (item.trang_thai || '').trim() === 'Đạt'
                                              ? 'text-slate-600'
                                              : 'text-emerald-600'
                                          }`}
                                        />
                                        {(item.trang_thai || '').trim() === 'Đạt'
                                          ? 'Đặt lại bước'
                                          : 'Hoàn thành bước'}
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={quyTrinhMutating || !selected?.id}
                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-200 disabled:opacity-40 flex items-center gap-2"
                                        onClick={() => {
                                          setQuyTrinhStepMenuId(null);
                                          setQuyTrinhEditModal({
                                            itemId: item.id,
                                            ten_task: item.ten_task,
                                            noi_dung_tieu_chuan: item.noi_dung_tieu_chuan,
                                            ghi_chu: item.ghi_chu,
                                            tieu_chuan_lines: (item.tieu_chuan?.length
                                              ? item.tieu_chuan
                                              : []
                                            ).map((tc) => ({
                                              id:
                                                typeof tc.id === 'string' && tc.id.trim()
                                                  ? tc.id
                                                  : typeof crypto !== 'undefined' &&
                                                      typeof crypto.randomUUID === 'function'
                                                    ? crypto.randomUUID()
                                                    : `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                              noi_dung: tc.noi_dung || '',
                                              diem: Number(tc.diem) || 0,
                                              trang_thai:
                                                (tc.trang_thai || 'Chưa đánh giá').trim() ||
                                                'Chưa đánh giá',
                                            })),
                                          });
                                        }}
                                      >
                                        <Pencil className="w-4 h-4 shrink-0 text-blue-600" />
                                        Sửa bước
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={quyTrinhMutating || !selected?.id}
                                        className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 flex items-center gap-2"
                                        onClick={async () => {
                                          if (!selected?.id) return;
                                          if (
                                            !window.confirm(
                                              'Xóa bước này khỏi quy trình?',
                                            )
                                          )
                                            return;
                                          setQuyTrinhStepMenuId(null);
                                          setQuyTrinhMutating(true);
                                          try {
                                            const updated =
                                              await taskDetailService.removeQuyTrinhItem(
                                                selected.id,
                                                item.id,
                                              );
                                            applyQuyTrinhDetailToUi(updated);
                                          } catch (err) {
                                            console.error(
                                              '[QuanLyCongViec] remove quy trình item:',
                                              err,
                                            );
                                            alert(
                                              err instanceof Error
                                                ? err.message
                                                : 'Không thể xóa bước.',
                                            );
                                          } finally {
                                            setQuyTrinhMutating(false);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4 shrink-0" />
                                        Xóa bước
                                      </button>
                                    </div>,
                                    document.body,
                                  )}
                                </div>
                              </div>
                            </div>
                            {(() => {
                              const lineProg = quyTrinhChecklistLineProgress(item);
                              if (lineProg.total === 0) return null;
                              return (
                                <div className="mt-2.5 space-y-1.5 pr-0.5 pl-0.5">
                                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                                    <span className="font-bold text-slate-700">
                                      Checklist tiêu chuẩn
                                    </span>
                                    <span className="tabular-nums font-bold text-slate-800 shrink-0">
                                      {lineProg.done}/{lineProg.total} mục đạt · {lineProg.pct}%
                                    </span>
                                  </div>
                                  <div
                                    className="h-2 rounded-full bg-slate-300/90 overflow-hidden ring-1 ring-slate-400/60"
                                    role="progressbar"
                                    aria-valuenow={lineProg.pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Tiến độ checklist bước ${stepIndex + 1}: ${lineProg.done} trên ${lineProg.total} mục đạt`}
                                  >
                                    <div
                                      className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                                      style={{ width: `${lineProg.pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {quyTrinhViewItem && selected?.id && (
        <div
          className="fixed inset-0 z-[136] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQuyTrinhStepViewItemId(null)}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(640px,90vh)] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quy-trinh-view-step-title"
          >
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <h2
                id="quy-trinh-view-step-title"
                className="text-base font-bold text-slate-800 min-w-0 flex-1 truncate"
                title={quyTrinhViewItem.ten_task || quyTrinhViewItem.id}
              >
                {quyTrinhViewItem.ten_task || 'Chi tiết bước'}
              </h2>
              <button
                type="button"
                onClick={() => setQuyTrinhStepViewItemId(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 shrink-0"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm overflow-y-auto flex-1 min-h-0">
              {quyTrinhViewItem.trang_thai ||
              quyTrinhViewItem.ghi_chu ||
              quyTrinhViewItem.noi_dung_tieu_chuan ? (
                <p
                  className="text-[12px] text-slate-600 leading-snug"
                  title={
                    [
                      quyTrinhViewItem.trang_thai &&
                        `Tiêu chuẩn: ${quyTrinhViewItem.trang_thai}${quyTrinhViewItem.ghi_chu ? ` · ${quyTrinhViewItem.ghi_chu}` : ''}`,
                      quyTrinhViewItem.noi_dung_tieu_chuan,
                    ]
                      .filter(Boolean)
                      .join(' — ') || undefined
                  }
                >
                  {quyTrinhViewItem.trang_thai ? (
                    <span className="font-bold text-slate-700">{quyTrinhViewItem.trang_thai}</span>
                  ) : null}
                  {quyTrinhViewItem.ghi_chu ? (
                    <span className="text-slate-600">
                      {quyTrinhViewItem.trang_thai ? ' · ' : null}
                      {quyTrinhViewItem.ghi_chu}
                    </span>
                  ) : null}
                  {quyTrinhViewItem.noi_dung_tieu_chuan ? (
                    <span className="text-slate-600 whitespace-pre-wrap">
                      {quyTrinhViewItem.trang_thai || quyTrinhViewItem.ghi_chu ? ' · ' : null}
                      {quyTrinhViewItem.noi_dung_tieu_chuan}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">Chưa có mô tả / tiêu chuẩn cho bước này.</p>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-100/90 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Checklist tiêu chuẩn
                </p>
                <div className="space-y-2 max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]">
                  {(quyTrinhViewItem.tieu_chuan?.length ? quyTrinhViewItem.tieu_chuan : []).length ? (
                    (quyTrinhViewItem.tieu_chuan?.length ? quyTrinhViewItem.tieu_chuan : []).map(
                      (tc, i) => {
                        const lt =
                          (tc.trang_thai || 'Chưa đánh giá').trim() || 'Chưa đánh giá';
                        const isLineDone = lt === 'Đạt';
                        const isLineFail = lt === 'Không đạt';
                        const checklistMenuKey = `${quyTrinhViewItem.id}:${i}`;
                        const checklistMenuOpen = checklistLineMenuKey === checklistMenuKey;
                        const runChecklistStatus = async (next: string) => {
                          if (!selected?.id) return;
                          setChecklistLineMenuKey(null);
                          setQuyTrinhMutating(true);
                          try {
                            const updated = await taskDetailService.updateQuyTrinhChecklistLine(
                              selected.id,
                              quyTrinhViewItem.id,
                              i,
                              next,
                            );
                            applyQuyTrinhDetailToUi(updated);
                          } catch (err) {
                            console.error('[QuanLyCongViec] checklist line (modal):', err);
                            alert(
                              err instanceof Error ? err.message : 'Không thể lưu.',
                            );
                          } finally {
                            setQuyTrinhMutating(false);
                          }
                        };
                        return (
                          <div
                            key={tc.id ?? `${quyTrinhViewItem.id}-tc-${i}`}
                            className="flex flex-col gap-1 py-2 px-2 rounded-lg bg-white border border-slate-200"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-slate-800 text-sm leading-snug min-w-0 flex-1">
                                {tc.noi_dung}
                                <span className="text-xs text-slate-600 ml-1">
                                  (Điểm: {tc.diem})
                                </span>
                                {lt !== 'Chưa đánh giá' ? (
                                  <span
                                    className={`text-xs ml-1 font-bold ${
                                      isLineDone
                                        ? 'text-emerald-600'
                                        : isLineFail
                                          ? 'text-red-600'
                                          : 'text-slate-600'
                                    }`}
                                  >
                                    · {lt}
                                  </span>
                                ) : null}
                              </span>
                              <div
                                className="flex items-start shrink-0 pt-0.5"
                                data-quy-trinh-checklist-line-menu
                              >
                                <div className="relative">
                                  <button
                                    type="button"
                                    title="Thao tác dòng tiêu chuẩn"
                                    aria-expanded={checklistMenuOpen}
                                    aria-haspopup="menu"
                                    disabled={quyTrinhMutating || !selected?.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const btn = e.currentTarget;
                                      setChecklistLineMenuKey((k) => {
                                        if (k === checklistMenuKey) {
                                          checklistMenuAnchorRef.current = null;
                                          return null;
                                        }
                                        checklistMenuAnchorRef.current = btn;
                                        return checklistMenuKey;
                                      });
                                    }}
                                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 border border-transparent hover:border-slate-200 disabled:opacity-40"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                  {checklistMenuOpen &&
                                    checklistLineMenuBox &&
                                    createPortal(
                                      <div
                                        data-quy-trinh-checklist-line-menu
                                        role="menu"
                                        className="fixed z-[220] min-w-[10.5rem] max-h-[min(50vh,280px)] overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-xl [scrollbar-gutter:stable]"
                                        style={{
                                          top: checklistLineMenuBox.top,
                                          left: checklistLineMenuBox.left,
                                          width: checklistLineMenuBox.width,
                                          maxHeight: checklistLineMenuBox.maxHeight,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={quyTrinhMutating || !selected?.id}
                                          className="w-full text-left px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                                          onClick={() => runChecklistStatus('Đạt')}
                                        >
                                          Hoàn thành
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={quyTrinhMutating || !selected?.id}
                                          className="w-full text-left px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-40"
                                          onClick={() => runChecklistStatus('Không đạt')}
                                        >
                                          Chưa đạt
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          disabled={quyTrinhMutating || !selected?.id}
                                          className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 disabled:opacity-40 border-t border-slate-300"
                                          onClick={() => runChecklistStatus('Chưa đánh giá')}
                                        >
                                          Đặt lại: Chưa đánh giá
                                        </button>
                                      </div>,
                                      document.body,
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )
                  ) : (
                    <p className="text-sm text-slate-600 italic py-1">
                      Không có checklist — dùng menu ⋯ trên thẻ bước (&quot;Hoàn thành bước&quot;) hoặc
                      &quot;Sửa bước&quot; để thêm dòng.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {quyTrinhEditModal && selected?.id && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(640px,90vh)] overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
                Sửa bước quy trình
              </h2>
              <button
                type="button"
                onClick={() => setQuyTrinhEditModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-300 text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">
                  Tên bước *
                </label>
                <input
                  type="text"
                  value={quyTrinhEditModal.ten_task}
                  onChange={(e) =>
                    setQuyTrinhEditModal((m) => (m ? { ...m, ten_task: e.target.value } : m))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">
                  Nội dung tiêu chuẩn
                </label>
                <textarea
                  rows={3}
                  value={quyTrinhEditModal.noi_dung_tieu_chuan}
                  onChange={(e) =>
                    setQuyTrinhEditModal((m) =>
                      m ? { ...m, noi_dung_tieu_chuan: e.target.value } : m,
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={quyTrinhEditModal.ghi_chu}
                  onChange={(e) =>
                    setQuyTrinhEditModal((m) => (m ? { ...m, ghi_chu: e.target.value } : m))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-200/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    Các bước con (checklist)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setQuyTrinhEditModal((m) =>
                        m
                          ? {
                              ...m,
                              tieu_chuan_lines: [
                                ...m.tieu_chuan_lines,
                                newQuyTrinhTieuChuanLine(),
                              ],
                            }
                          : m,
                      )
                    }
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Thêm dòng
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  Sửa nội dung / điểm; trạng thái từng dòng được giữ. Đánh giá từng dòng qua menu ⋯ trên checklist.
                </p>
                {quyTrinhEditModal.tieu_chuan_lines.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-1">
                    Chưa có dòng — bấm &quot;Thêm dòng&quot;.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                    {quyTrinhEditModal.tieu_chuan_lines.map((row) => (
                      <li
                        key={row.id}
                        className="rounded-lg border border-slate-200 bg-white p-2 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-slate-600 shrink-0 pt-1">
                            {(row.trang_thai || 'Chưa đánh giá').trim()}
                          </span>
                          <button
                            type="button"
                            title="Xóa dòng"
                            onClick={() =>
                              setQuyTrinhEditModal((m) =>
                                m
                                  ? {
                                      ...m,
                                      tieu_chuan_lines: m.tieu_chuan_lines.filter(
                                        (x) => x.id !== row.id,
                                      ),
                                    }
                                  : m,
                              )
                            }
                            className="p-1 rounded text-red-500 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={row.noi_dung}
                          onChange={(e) =>
                            setQuyTrinhEditModal((m) =>
                              m
                                ? {
                                    ...m,
                                    tieu_chuan_lines: m.tieu_chuan_lines.map((x) =>
                                      x.id === row.id
                                        ? { ...x, noi_dung: e.target.value }
                                        : x,
                                    ),
                                  }
                                : m,
                            )
                          }
                          placeholder="Nội dung tiêu chuẩn *"
                          className="w-full rounded border border-slate-200 px-2 py-2 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-600 shrink-0">Điểm</label>
                          <input
                            type="number"
                            min={0}
                            value={row.diem}
                            onChange={(e) =>
                              setQuyTrinhEditModal((m) =>
                                m
                                  ? {
                                      ...m,
                                      tieu_chuan_lines: m.tieu_chuan_lines.map((x) =>
                                        x.id === row.id
                                          ? {
                                              ...x,
                                              diem: Number(e.target.value) || 0,
                                            }
                                          : x,
                                      ),
                                    }
                                  : m,
                              )
                            }
                            className="w-20 rounded border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setQuyTrinhEditModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={quyTrinhMutating || !quyTrinhEditModal.ten_task.trim()}
                onClick={async () => {
                  const m = quyTrinhEditModal;
                  if (!m || !selected?.id) return;
                  const ten = m.ten_task.trim();
                  if (!ten) return;
                  setQuyTrinhMutating(true);
                  try {
                    const updated = await taskDetailService.updateQuyTrinhItem(
                      selected.id,
                      m.itemId,
                      {
                        ten_task: ten,
                        noi_dung_tieu_chuan: m.noi_dung_tieu_chuan.trim(),
                        ghi_chu: m.ghi_chu.trim(),
                        tieu_chuan: m.tieu_chuan_lines,
                      },
                    );
                    applyQuyTrinhDetailToUi(updated);
                    setQuyTrinhEditModal(null);
                  } catch (err) {
                    console.error('[QuanLyCongViec] update quy trình item:', err);
                    alert(err instanceof Error ? err.message : 'Không thể lưu.');
                  } finally {
                    setQuyTrinhMutating(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-800 text-white text-sm font-bold hover:bg-blue-950 disabled:opacity-50"
              >
                {quyTrinhMutating ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
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
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  >
                    <option value="">-- Chọn hợp đồng (không bắt buộc) --</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ten_goi_thau || c.so_hop_dong || c.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                      <span className="ml-2 text-[10px] text-slate-600">
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Trạng thái công việc
                  </label>
                  <select
                    value={formData.trang_thai}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        trang_thai: v,
                        tien_do: isTrangThaiDaXong(v) ? 100 : prev.tien_do,
                      }));
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
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tiến độ (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.tien_do ?? 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const v = Number.isFinite(raw)
                        ? Math.min(100, Math.max(0, Math.round(raw)))
                        : 0;
                      setFormData((prev) => ({
                        ...prev,
                        tien_do: v,
                        trang_thai: v >= 100 ? 'Đã xong' : prev.trang_thai,
                      }));
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700 tabular-nums"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                    Quy trình đạt 100% sẽ tự chuyển Đã xong khi lưu; nhập 100 ở đây cũng gán Đã xong.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.mo_ta || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mo_ta: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-700/35 focus:border-blue-700"
                  placeholder="Nhập mô tả chi tiết công việc..."
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-200">
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

