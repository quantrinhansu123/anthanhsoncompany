import { supabase } from '../supabase';
import type {
  CongViecTenTaskJsonb,
  QuyTrinhLamViecItem,
  QuyTrinhTieuChuanDong,
  TaskRow,
} from './taskService';

/** Trạng thái bước quy trình suy ra từ checklist: đủ tiêu chuẩn Đạt → Đạt; có Không đạt → Không đạt. */
function deriveTrangThaiForQuyTrinhItem(item: QuyTrinhLamViecItem): string {
  const lines = (item.tieu_chuan ?? []).filter((t) => String(t?.noi_dung ?? '').trim());
  if (lines.length === 0) return (item.trang_thai || '').trim();
  const sts = lines.map(
    (t) => (String(t.trang_thai ?? '').trim() || 'Chưa đánh giá'),
  );
  if (sts.some((s) => s === 'Không đạt')) return 'Không đạt';
  if (sts.every((s) => s === 'Đạt')) return 'Đạt';
  return 'Chưa đánh giá';
}

function syncQuyTrinhItemsTrangThai(items: QuyTrinhLamViecItem[]): QuyTrinhLamViecItem[] {
  return items.map((it) => ({
    ...it,
    trang_thai: deriveTrangThaiForQuyTrinhItem(it),
  }));
}

/** Tiến độ = số bước có trạng thái Đạt / tổng bước (sau khi đồng bộ từ checklist). */
function computeTienDoFromSyncedQuyTrinhItems(items: QuyTrinhLamViecItem[]): number {
  if (!items.length) return 0;
  const done = items.filter((it) => (it.trang_thai || '').trim() === 'Đạt').length;
  return Math.round((done / items.length) * 100);
}

/** Tiến độ 100% → luôn gán trạng thái Đã xong (theo nghiệp vụ Quản lý công việc). */
function trangThaiSauKhiCoTienDo(tienDo: number, trangThaiGiu: string): string {
  return Number(tienDo) >= 100 ? 'Đã xong' : trangThaiGiu;
}

function parseQuyTrinhItemsRaw(raw: unknown): QuyTrinhLamViecItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      const tieuRaw = o.tieu_chuan;
      const tieu_chuan = Array.isArray(tieuRaw)
        ? tieuRaw.map((t) => {
            const r = t as Record<string, unknown>;
            const tt = String(r?.trang_thai ?? '').trim();
            return {
              id: typeof r?.id === 'string' && r.id ? r.id : undefined,
              noi_dung: String(r?.noi_dung ?? ''),
              diem: Number(r?.diem) || 0,
              trang_thai: tt || 'Chưa đánh giá',
            };
          })
        : undefined;
      return {
        id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
        ten_task: String(o.ten_task ?? ''),
        noi_dung_tieu_chuan: String(o.noi_dung_tieu_chuan ?? ''),
        trang_thai: String(o.trang_thai ?? ''),
        ghi_chu: String(o.ghi_chu ?? ''),
        template_id: o.template_id != null ? String(o.template_id) : null,
        tieu_chuan,
      };
    });
}

export function parseCongViecTenTaskColumn(
  raw: unknown,
  fallbackTenCongViec: string,
): CongViecTenTaskJsonb {
  const base = (): CongViecTenTaskJsonb => ({
    ten_task: (fallbackTenCongViec || '').trim(),
    noi_dung_tieu_chuan: '',
    trang_thai: '',
    ghi_chu: '',
    quy_trinh_items: [],
  });
  if (raw == null || raw === '') return base();
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      if (o && typeof o === 'object') {
        return {
          ten_task: String(o.ten_task ?? fallbackTenCongViec ?? ''),
          noi_dung_tieu_chuan: String(o.noi_dung_tieu_chuan ?? ''),
          trang_thai: String(o.trang_thai ?? ''),
          ghi_chu: String(o.ghi_chu ?? ''),
          quy_trinh_items: parseQuyTrinhItemsRaw(o.quy_trinh_items),
        };
      }
    } catch {
      return { ...base(), ten_task: raw.trim() || base().ten_task };
    }
    return base();
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      ten_task: String(o.ten_task ?? fallbackTenCongViec ?? ''),
      noi_dung_tieu_chuan: String(o.noi_dung_tieu_chuan ?? ''),
      trang_thai: String(o.trang_thai ?? ''),
      ghi_chu: String(o.ghi_chu ?? ''),
      quy_trinh_items: parseQuyTrinhItemsRaw(o.quy_trinh_items),
    };
  }
  return base();
}

export function buildCongViecTenTaskJsonb(input: {
  ten_task: string;
  noi_dung_tieu_chuan?: string;
  trang_thai?: string;
  ghi_chu?: string;
}): CongViecTenTaskJsonb {
  return {
    ten_task: (input.ten_task || '').trim(),
    noi_dung_tieu_chuan: (input.noi_dung_tieu_chuan || '').trim(),
    trang_thai: (input.trang_thai || '').trim(),
    ghi_chu: (input.ghi_chu || '').trim(),
    quy_trinh_items: [],
  };
}

export interface TaskDetailDocument {
  ten: string;
  link: string;
  mota?: string | null;
}

export interface TaskDetailComment {
  nhan_su: string;
  anh?: string | null;
  noi_dung: string;
  time: string; // ISO datetime
}

export interface TaskDetailHistory {
  ten: string;
  time: string;
  hanh_vi: string;
  ghi_chu?: string | null;
}

/** Trạng thái từng dòng trong tab “List công việc” */
export type TrangThaiDanhSachCongViec =
  | 'Đang làm'
  | 'Hoàn thành'
  | 'Duyệt'
  | 'Từ chối';

const TRANG_THAI_DANH_SACH_SET = new Set<string>([
  'Đang làm',
  'Hoàn thành',
  'Duyệt',
  'Từ chối',
]);

/** Một dòng trong tab “List công việc” (cột jsonb `danh_sach_cong_viec`) */
export interface DanhSachCongViecItem {
  id: string;
  noi_dung: string;
  trang_thai: TrangThaiDanhSachCongViec;
  /** Khi `trang_thai` = Từ chối */
  ly_do_tu_choi?: string | null;
  /** ISO datetime */
  ngay_gio_hoan_thanh?: string | null;
  ghi_chu?: string | null;
  /** Id nhân sự phụ trách (chọn từ danh sách người phụ trách của công việc) */
  nhan_su_phu_trach_ids?: string[];
  /** Cũ — đọc để tương thích bản ghi trước khi có `trang_thai` */
  da_xong?: boolean;
}

function parseTrangThaiDanhSachCongViec(o: Record<string, unknown>): TrangThaiDanhSachCongViec {
  const t = String(o.trang_thai ?? '').trim();
  if (TRANG_THAI_DANH_SACH_SET.has(t)) return t as TrangThaiDanhSachCongViec;
  if (Boolean(o.da_xong)) return 'Hoàn thành';
  return 'Đang làm';
}

export function parseDanhSachCongViecColumn(raw: unknown): DanhSachCongViecItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      const trang_thai = parseTrangThaiDanhSachCongViec(o);
      const ly = o.ly_do_tu_choi;
      const ng = o.ngay_gio_hoan_thanh;
      const gc = o.ghi_chu;
      const nsRaw = o.nhan_su_phu_trach_ids;
      const nhan_su_phu_trach_ids = Array.isArray(nsRaw)
        ? nsRaw.map((x) => String(x)).filter((s) => s.trim() !== '')
        : [];
      return {
        id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
        noi_dung: String(o.noi_dung ?? ''),
        trang_thai,
        ly_do_tu_choi:
          ly != null && String(ly).trim() !== '' ? String(ly).trim() : null,
        ngay_gio_hoan_thanh:
          ng != null && String(ng).trim() !== '' ? String(ng).trim() : null,
        ghi_chu: gc != null && String(gc).trim() !== '' ? String(gc).trim() : null,
        nhan_su_phu_trach_ids,
      };
    });
}

export interface BuocDanhGia {
  id: string;
  ten: string;
  trang_thai: 'cho' | 'da_duyet' | 'tu_choi';
  nguoi_duyet?: string | null;
  ngay_gio?: string | null;
  ghi_chu?: string | null;
}

export const DEFAULT_BUOC_DANH_GIA: BuocDanhGia[] = [
  { id: 'truong_bo_phan', ten: 'Trưởng bộ phận phê duyệt', trang_thai: 'cho', nguoi_duyet: null, ngay_gio: null, ghi_chu: null },
  { id: 'ban_giam_doc', ten: 'Ban giám đốc phê duyệt', trang_thai: 'cho', nguoi_duyet: null, ngay_gio: null, ghi_chu: null },
  { id: 'hoan_tat', ten: 'Hoàn tất & lưu hồ sơ', trang_thai: 'cho', nguoi_duyet: null, ngay_gio: null, ghi_chu: null },
];

/** Một dòng ghi nhận lỗi (cột jsonb `cong_viec_chi_tiet.loi_ghi_nhan`) */
export interface LoiGhiNhanItem {
  id: string;
  thu_vien_loi_id: string;
  chuyen_nganh: string;
  bo_mon: string;
  canh_bao_loi: string;
  hang_muc_kiem_tra: string;
  noi_dung_kiem_tra: string;
  nguoi_vi_pham_id: string;
  nguoi_vi_pham_ten: string;
  ghi_chu: string;
  /** ISO datetime */
  ngay_gio: string;
}

/** Một dòng lỗi đã gắn với công việc (dùng tab “Lỗi vi phạm” trong chi tiết nhân sự) */
export interface ViPhamNhanSuRow {
  cong_viec_chi_tiet_id: string;
  ten_cong_viec: string;
  hop_dong_id: string | null;
  task_id: string | null;
  trang_thai: string;
  loi: LoiGhiNhanItem;
}

export function parseLoiGhiNhanColumn(raw: unknown): LoiGhiNhanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
        thu_vien_loi_id: String(o.thu_vien_loi_id ?? ''),
        chuyen_nganh: String(o.chuyen_nganh ?? ''),
        bo_mon: String(o.bo_mon ?? ''),
        canh_bao_loi: String(o.canh_bao_loi ?? ''),
        hang_muc_kiem_tra: String(o.hang_muc_kiem_tra ?? ''),
        noi_dung_kiem_tra: String(o.noi_dung_kiem_tra ?? ''),
        nguoi_vi_pham_id: String(o.nguoi_vi_pham_id ?? ''),
        nguoi_vi_pham_ten: String(o.nguoi_vi_pham_ten ?? ''),
        ghi_chu: String(o.ghi_chu ?? ''),
        ngay_gio: String(o.ngay_gio ?? new Date().toISOString()),
      };
    });
}

export interface TaskDetailRow {
  id: string;
  task_id?: string | null;
  hop_dong_id?: string | null;
  /** jsonb từ DB — có thể object hoặc (legacy) bỏ trống */
  ten_task?: unknown;
  ten_cong_viec: string;
  mo_ta: string | null;
  nguoi_thuc_hien: string | null;
  han_hoan_thanh: string | null;
  trang_thai: string;
  tien_do: number;
  ghi_chu: string | null;
  tai_lieu?: TaskDetailDocument[];
  binh_luan?: TaskDetailComment[];
  lich_su?: TaskDetailHistory[];
  buoc_danh_gia?: BuocDanhGia[];
  /** jsonb — ghi nhận lỗi từ thư viện lỗi + người vi phạm */
  loi_ghi_nhan?: LoiGhiNhanItem[];
  /** jsonb — danh sách việc con do người dùng tự thêm (tab List công việc) */
  danh_sach_cong_viec?: DanhSachCongViecItem[];
  created_at?: string;
  updated_at?: string;
  ten_task_detail?: CongViecTenTaskJsonb;
}

function coerceLichSuArray(raw: unknown): TaskDetailHistory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      const gc = o.ghi_chu;
      return {
        ten: String(o.ten ?? ''),
        time: String(o.time ?? ''),
        hanh_vi: String(o.hanh_vi ?? ''),
        ghi_chu:
          gc != null && String(gc).trim() !== '' ? String(gc).trim() : null,
      };
    });
}

function appendLichSuEntry(
  existing: unknown,
  entry: {
    ten?: string;
    hanh_vi: string;
    ghi_chu?: string | null;
    time?: string;
  },
): TaskDetailHistory[] {
  const prev = coerceLichSuArray(existing);
  const note =
    entry.ghi_chu != null && String(entry.ghi_chu).trim() !== ''
      ? String(entry.ghi_chu).trim()
      : null;
  return [
    ...prev,
    {
      ten: (entry.ten || 'Hệ thống').trim() || 'Hệ thống',
      time: entry.time || new Date().toISOString(),
      hanh_vi: entry.hanh_vi,
      ghi_chu: note,
    },
  ];
}

export const taskDetailService = {
  // Đồng bộ dữ liệu từ bảng `task` sang `cong_viec_chi_tiet` để trang "Quản lý công việc"
  // hiển thị đúng các task được tạo/sửa từ các màn hình khác.
  async upsertFromTask(
    task: TaskRow,
    opts?: { allowInsert?: boolean },
  ): Promise<void> {
    if (!task?.id) return;
    const allowInsert = opts?.allowInsert ?? true;

    const toDateOrNull = (v: unknown) => {
      const s = (v ?? '').toString().trim();
      return s === '' ? null : s;
    };

    const tenTaskJsonbBase = buildCongViecTenTaskJsonb({
      ten_task: task.ten_task || '',
      noi_dung_tieu_chuan: (task as any).noi_dung_tieu_chuan,
      trang_thai: (task as any).trang_thai_tieu_chuan,
      ghi_chu: (task as any).ghi_chu_tieu_chuan,
    });

    const payload: any = {
      ten_cong_viec: task.ten_task,
      ten_task: tenTaskJsonbBase,
      mo_ta: task.mo_ta ?? null,
      hop_dong_id: task.hop_dong_id?.trim() || null,
      nguoi_thuc_hien: task.nguoi_phu_trach ?? null,
      trang_thai: task.trang_thai,
      tien_do: task.tien_do ?? 0,
      ghi_chu: task.ghi_chu ?? null,
      ngay_bat_dau: toDateOrNull((task as any).ngay_bat_dau),
      ngay_ket_thuc: toDateOrNull((task as any).ngay_ket_thuc),
      // Bảng cong_viec_chi_tiet có thể dùng 1 trong 2 cặp cột này,
      // nên set cả hai để UI ở QuanLyCongViec không bị rỗng.
      han_hoan_thanh: toDateOrNull((task as any).ngay_hoan_thanh),
      ngay_hoan_thanh: toDateOrNull((task as any).ngay_hoan_thanh),
    };

    // UPDATE trước để tránh "sinh task mới" khi đang edit.
    const { data: existingRows, error: existingError } = await supabase
      .from('cong_viec_chi_tiet')
      .select('id')
      .eq('task_id', task.id);

    if (existingError) throw existingError;

    if (existingRows && existingRows.length > 0) {
      const { data: existingTen, error: tenErr } = await supabase
        .from('cong_viec_chi_tiet')
        .select('ten_task')
        .eq('task_id', task.id)
        .limit(1)
        .maybeSingle();
      if (tenErr) throw tenErr;
      const preserved = parseCongViecTenTaskColumn(
        existingTen?.ten_task,
        task.ten_task || '',
      );
      payload.ten_task = {
        ...tenTaskJsonbBase,
        quy_trinh_items: preserved.quy_trinh_items ?? [],
      };

      const { error: updateError } = await supabase
        .from('cong_viec_chi_tiet')
        .update(payload)
        .eq('task_id', task.id);
      if (updateError) throw updateError;
      return;
    }

    if (!allowInsert) {
      // Khi edit mà không tìm thấy bản ghi tương ứng, không insert để tránh tạo dòng mới.
      return;
    }

    // Nếu không có bản ghi nào thì mới insert (trường hợp "create")
    const { error: insertError } = await supabase
      .from('cong_viec_chi_tiet')
      .insert([{ task_id: task.id, ...payload }]);
    if (insertError) throw insertError;
  },

  mapToTaskRow(detail: TaskDetailRow & { [key: string]: any }): TaskRow {
    const tenPayload =
      detail.ten_task_detail ||
      parseCongViecTenTaskColumn(detail.ten_task, detail.ten_cong_viec || '');
    const ten_task =
      tenPayload.ten_task ||
      detail.ten_cong_viec ||
      '';
    const mo_ta =
      detail.mo_ta_task ||
      detail.mo_ta ||
      null;
    const trang_thai =
      detail.trang_thai_task ||
      detail.trang_thai ||
      'Chưa bắt đầu';
    const uu_tien =
      detail.uu_tien_task ||
      'Trung bình';
    const ngay_bat_dau =
      (detail as any).ngay_bat_dau || null;
    const ngay_ket_thuc =
      (detail as any).ngay_ket_thuc || null;
    const ngay_hoan_thanh =
      (detail as any).ngay_hoan_thanh ||
      (detail as any).han_hoan_thanh ||
      null;
    const nguoi_phu_trach =
      (detail as any).nguoi_phu_trach ||
      detail.nguoi_thuc_hien ||
      null;
    const tien_do =
      (detail as any).tien_do != null
        ? Number((detail as any).tien_do)
        : 0;
    const ghi_chu =
      detail.ghi_chu_task ||
      detail.ghi_chu ||
      null;
    const hop_dong_id =
      detail.hop_dong_id ||
      '';
    const taiLieu = (detail.tai_lieu || []) as TaskDetailDocument[];
    const link_tai_lieu =
      taiLieu.length > 0 && taiLieu[0].link
        ? taiLieu[0].link
        : null;

    return {
      id: detail.task_id || detail.id,
      hop_dong_id,
      ten_task,
      mo_ta,
      trang_thai,
      uu_tien,
      ngay_bat_dau,
      ngay_ket_thuc,
      ngay_hoan_thanh,
      nguoi_phu_trach,
      tien_do,
      ghi_chu,
      link_tai_lieu,
      anh_bang_chung: null,
      created_at: detail.created_at,
      updated_at: detail.updated_at,
      ten_task_detail: tenPayload,
    };
  },

  // Cập nhật danh sách tài liệu cho một công việc chi tiết (lưu vào cong_viec_chi_tiet.tai_lieu)
  async updateDocuments(
    detailId: string,
    documents: TaskDetailDocument[],
  ): Promise<TaskDetailRow> {
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ tai_lieu: documents })
      .eq('id', detailId)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] Error updating documents:', error);
      throw error;
    }

    return taskDetailService.normalizeRow(data);
  },

  // Lấy tất cả công việc từ bảng cong_viec_chi_tiet, map về TaskRow cho UI
  async getAllAsTasks(): Promise<TaskRow[]> {
    try {
      const { data, error } = await supabase
        .from('cong_viec_chi_tiet')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[taskDetailService] Error fetching all details:', error);
        throw error;
      }

      const normalizedDetails = (data || []).map((row: any) =>
        this.normalizeRow(row) as any,
      );

      // `cong_viec_chi_tiet` thiếu một số cột (vd: `uu_tien`, `hop_dong_id`) nên cần lấy bổ sung từ bảng `task`
      // theo khóa ngoại `task_id`.
      const taskIds = normalizedDetails
        .map((d: any) => d.task_id)
        .filter(Boolean);

      let taskById: Record<string, any> = {};
      if (taskIds.length > 0) {
        const { data: tasksData, error: taskError } = await supabase
          .from('task')
          .select('id, uu_tien, hop_dong_id')
          .in('id', taskIds);

        if (taskError) throw taskError;

        taskById = (tasksData || []).reduce(
          (acc: Record<string, any>, t: any) => {
            acc[String(t.id)] = t;
            return acc;
          },
          {},
        );
      }

      const mapped = normalizedDetails.map((detail: any) => {
        const base = this.mapToTaskRow(detail as any);
        const related = taskById[String(base.id)] || null;
        if (related) {
          base.uu_tien = related.uu_tien || base.uu_tien;
          base.hop_dong_id = related.hop_dong_id || base.hop_dong_id;
        }
        return base;
      });

      // UI de-duplicate theo task id (vì DB có thể đã có record trùng).
      const seen = new Set<string>();
      const deduped: TaskRow[] = [];
      for (const t of mapped) {
        const key = String(t.id);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(t);
      }

      return deduped;
    } catch (err) {
      console.error('[taskDetailService] Exception in getAllAsTasks:', err);
      throw err;
    }
  },

  // Tạo mới 1 công việc trong cong_viec_chi_tiet từ form QuanLyCongViec
  async createFromForm(payload: {
    ten_task: string;
    mo_ta: string | null;
    trang_thai: string;
    uu_tien: string;
    ngay_bat_dau?: string | null;
    ngay_ket_thuc?: string | null;
    ngay_hoan_thanh?: string | null;
    nguoi_phu_trach?: string | null;
    tien_do: number;
    ghi_chu?: string | null;
    hop_dong_id?: string | null;
    /** jsonb `ten_task` — nếu không gửi sẽ tự ghép từ các field phẳng bên dưới */
    ten_task_jsonb?: CongViecTenTaskJsonb | null;
    noi_dung_tieu_chuan?: string | null;
    trang_thai_tieu_chuan?: string | null;
    ghi_chu_tieu_chuan?: string | null;
  }): Promise<TaskRow> {
    const tenTaskJsonb: CongViecTenTaskJsonb =
      payload.ten_task_jsonb ||
      buildCongViecTenTaskJsonb({
        ten_task: payload.ten_task,
        noi_dung_tieu_chuan: payload.noi_dung_tieu_chuan ?? undefined,
        trang_thai: payload.trang_thai_tieu_chuan ?? undefined,
        ghi_chu: payload.ghi_chu_tieu_chuan ?? undefined,
      });

    const tienDoInsert = Number(payload.tien_do ?? 0);
    const insertData: any = {
      ten_cong_viec: tenTaskJsonb.ten_task || payload.ten_task,
      ten_task: tenTaskJsonb,
      mo_ta: payload.mo_ta,
      trang_thai: trangThaiSauKhiCoTienDo(tienDoInsert, payload.trang_thai),
      tien_do: tienDoInsert,
      ghi_chu: payload.ghi_chu || null,
      nguoi_thuc_hien: payload.nguoi_phu_trach || null,
      // Lưu cả các cột ngày mới để UI đọc lại đúng
      ngay_bat_dau: payload.ngay_bat_dau || null,
      ngay_ket_thuc: payload.ngay_ket_thuc || null,
      ngay_hoan_thanh: payload.ngay_hoan_thanh || null,
      // Giữ han_hoan_thanh cho tương thích ngược (coi như hạn hoàn thành = ngày kết thúc)
      han_hoan_thanh: payload.ngay_ket_thuc || null,
      hop_dong_id: payload.hop_dong_id || null,
      lich_su: appendLichSuEntry([], {
        ten: 'Công việc',
        hanh_vi: 'Tạo công việc mới',
        ghi_chu: payload.ten_task?.trim() || null,
      }),
    };

    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] Error creating detail from form:', error);
      throw error;
    }

    const detail = this.normalizeRow(data);
    return this.mapToTaskRow(detail as any);
  },

  /** Cập nhật bản ghi `cong_viec_chi_tiet` (theo id hoặc task_id UI), giữ `quy_trinh_items` trong jsonb. Đồng bộ bảng `task` nếu có `task_id`. */
  async updateFromForm(
    lookupId: string,
    payload: {
      ten_task: string;
      mo_ta: string | null;
      trang_thai: string;
      uu_tien: string;
      ngay_bat_dau?: string | null;
      ngay_ket_thuc?: string | null;
      ngay_hoan_thanh?: string | null;
      nguoi_phu_trach?: string | null;
      tien_do: number;
      ghi_chu?: string | null;
      hop_dong_id?: string | null;
      ten_task_jsonb?: CongViecTenTaskJsonb | null;
      noi_dung_tieu_chuan?: string | null;
      trang_thai_tieu_chuan?: string | null;
      ghi_chu_tieu_chuan?: string | null;
    },
  ): Promise<TaskRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc để cập nhật.');
    }

    const currentTen = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const tenTaskJsonb: CongViecTenTaskJsonb =
      payload.ten_task_jsonb ||
      ({
        ...currentTen,
        ten_task: payload.ten_task.trim(),
        noi_dung_tieu_chuan:
          payload.noi_dung_tieu_chuan !== undefined
            ? String(payload.noi_dung_tieu_chuan ?? '').trim()
            : currentTen.noi_dung_tieu_chuan,
        trang_thai:
          payload.trang_thai_tieu_chuan !== undefined
            ? String(payload.trang_thai_tieu_chuan ?? '').trim() || 'Chưa đánh giá'
            : currentTen.trang_thai,
        ghi_chu:
          payload.ghi_chu_tieu_chuan !== undefined
            ? String(payload.ghi_chu_tieu_chuan ?? '').trim()
            : currentTen.ghi_chu,
        quy_trinh_items: currentTen.quy_trinh_items ?? [],
      } as CongViecTenTaskJsonb);

    const tienDoUp = Number(payload.tien_do ?? 0);
    const updateRow: Record<string, unknown> = {
      ten_cong_viec: tenTaskJsonb.ten_task || payload.ten_task.trim(),
      ten_task: tenTaskJsonb,
      mo_ta: payload.mo_ta,
      trang_thai: trangThaiSauKhiCoTienDo(tienDoUp, payload.trang_thai),
      tien_do: tienDoUp,
      ghi_chu: payload.ghi_chu || null,
      nguoi_thuc_hien: payload.nguoi_phu_trach || null,
      ngay_bat_dau: payload.ngay_bat_dau || null,
      ngay_ket_thuc: payload.ngay_ket_thuc || null,
      ngay_hoan_thanh: payload.ngay_hoan_thanh || null,
      han_hoan_thanh: payload.ngay_ket_thuc || null,
      hop_dong_id: payload.hop_dong_id?.toString().trim() || null,
    };

    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update(updateRow)
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] updateFromForm:', error);
      throw error;
    }

    const taskFk = detail.task_id?.toString().trim();
    if (taskFk) {
      const { error: taskErr } = await supabase
        .from('task')
        .update({
          ten_task: payload.ten_task.trim(),
          mo_ta: payload.mo_ta ?? null,
          trang_thai: trangThaiSauKhiCoTienDo(tienDoUp, payload.trang_thai),
          uu_tien: payload.uu_tien,
          ngay_bat_dau: payload.ngay_bat_dau || null,
          ngay_ket_thuc: payload.ngay_ket_thuc || null,
          ngay_hoan_thanh: payload.ngay_hoan_thanh || null,
          nguoi_phu_trach: payload.nguoi_phu_trach || null,
          tien_do: tienDoUp,
          ghi_chu: payload.ghi_chu || null,
          hop_dong_id: payload.hop_dong_id?.toString().trim() || null,
        })
        .eq('id', taskFk);
      if (taskErr) {
        console.error('[taskDetailService] updateFromForm sync task:', taskErr);
      }
    }

    return this.mapToTaskRow(this.normalizeRow(data) as any);
  },

  // Lấy (hoặc tạo mới) bản ghi chi tiết cho 1 task.
  // taskId có thể là cong_viec_chi_tiet.id (khi không dùng bảng task) hoặc task_id.
  async getOrCreateByTaskId(taskId: string): Promise<TaskDetailRow | null> {
    try {
      // 1) Thử tìm theo id (khi danh sách từ getAllAsTasks() trả về id = row.id)
      const byId = await supabase
        .from('cong_viec_chi_tiet')
        .select('*')
        .eq('id', taskId)
        .limit(1)
        .maybeSingle();

      if (!byId.error && byId.data) {
        return taskDetailService.normalizeRow(byId.data);
      }

      // 2) Thử tìm theo task_id
      const byTaskId = await supabase
        .from('cong_viec_chi_tiet')
        .select('*')
        .eq('task_id', taskId)
        .limit(1)
        .maybeSingle();

      if (!byTaskId.error && byTaskId.data) {
        return taskDetailService.normalizeRow(byTaskId.data);
      }

      // 3) Không có thì tạo bản ghi trống (chỉ khi thực sự dùng task_id)
      const { data: inserted, error: insertError } = await supabase
        .from('cong_viec_chi_tiet')
        .insert([
          {
            task_id: taskId,
            ten_cong_viec: '',
            ten_task: buildCongViecTenTaskJsonb({ ten_task: '' }),
            tai_lieu: [],
            binh_luan: [],
            lich_su: [],
          },
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('[taskDetailService] Error creating detail:', insertError);
        throw insertError;
      }

      return taskDetailService.normalizeRow(inserted);
    } catch (err) {
      console.error('[taskDetailService] Exception in getOrCreateByTaskId:', err);
      return null;
    }
  },

  /** Tìm bản ghi chi tiết theo `cong_viec_chi_tiet.id` hoặc `task_id` — không insert. */
  async findDetailByIdOrTaskId(lookupId: string): Promise<TaskDetailRow | null> {
    const { data: byId, error: e1 } = await supabase
      .from('cong_viec_chi_tiet')
      .select('*')
      .eq('id', lookupId)
      .maybeSingle();
    if (!e1 && byId) return this.normalizeRow(byId);
    const { data: byTask, error: e2 } = await supabase
      .from('cong_viec_chi_tiet')
      .select('*')
      .eq('task_id', lookupId)
      .maybeSingle();
    if (!e2 && byTask) return this.normalizeRow(byTask);
    return null;
  },

  /**
   * Đổi trạng thái công việc từ màn Quản lý (vd. Duyệt → Đang thực hiện).
   * Luôn cập nhật `cong_viec_chi_tiet`; đồng bộ `task` khi có `task_id`.
   * `lookupId` phải là id hiển thị trên UI (`task_id` hoặc `cong_viec_chi_tiet.id`).
   */
  async setTrangThaiFromQuanLy(lookupId: string, trang_thai: string): Promise<TaskRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc.');
    }
    const next = String(trang_thai || '').trim();
    if (!next) {
      throw new Error('Trạng thái không hợp lệ.');
    }
    const lichSuNext = appendLichSuEntry(detail.lich_su, {
      ten: 'Trạng thái',
      hanh_vi: `Chuyển sang: ${next}`,
      ghi_chu: null,
    });
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({
        trang_thai: next,
        lich_su: lichSuNext,
      })
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] setTrangThaiFromQuanLy cong_viec_chi_tiet:', error);
      throw error;
    }

    const normalized = this.normalizeRow(data);
    const taskFk = detail.task_id?.toString().trim();
    if (taskFk) {
      const { error: taskErr } = await supabase
        .from('task')
        .update({
          trang_thai: next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskFk);
      if (taskErr) {
        console.error('[taskDetailService] setTrangThaiFromQuanLy task:', taskErr);
      }
    }

    return this.mapToTaskRow(normalized as any);
  },

  /**
   * Lưu jsonb `ten_task`: đồng bộ `trang_thai` từng bước từ checklist con (nếu có),
   * cập nhật `tien_do` = (bước Đạt / tổng bước) × 100, đồng bộ `task.tien_do` khi có `task_id`.
   */
  async saveTenTaskJsonbWithQuyTrinhProgress(
    detail: TaskDetailRow,
    nextTenTaskBase: CongViecTenTaskJsonb,
    extraRowPatch: Record<string, unknown> = {},
  ): Promise<TaskDetailRow> {
    const items = syncQuyTrinhItemsTrangThai(nextTenTaskBase.quy_trinh_items ?? []);
    const tenFinal: CongViecTenTaskJsonb = {
      ...nextTenTaskBase,
      quy_trinh_items: items,
    };
    const tienDo = computeTienDoFromSyncedQuyTrinhItems(items);
    const rowPatch: Record<string, unknown> = {
      ...extraRowPatch,
      ten_task: tenFinal,
      tien_do: tienDo,
    };
    if (tienDo >= 100) {
      rowPatch.trang_thai = 'Đã xong';
    }
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update(rowPatch)
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] saveTenTaskJsonbWithQuyTrinhProgress:', error);
      throw error;
    }

    const taskFk = detail.task_id?.toString().trim();
    if (taskFk) {
      const taskSync: Record<string, unknown> = { tien_do: tienDo };
      if (tienDo >= 100) taskSync.trang_thai = 'Đã xong';
      const { error: taskErr } = await supabase
        .from('task')
        .update(taskSync)
        .eq('id', taskFk);
      if (taskErr) {
        console.error('[taskDetailService] sync task.tien_do:', taskErr);
      }
    }

    return this.normalizeRow(data);
  },

  /**
   * Thêm các bước vào `ten_task.quy_trinh_items` của bản ghi đã có.
   * Không tạo dòng `cong_viec_chi_tiet` / `ten_cong_viec` mới.
   */
  async appendQuyTrinhItems(
    lookupId: string,
    items: Array<{
      ten_task: string;
      noi_dung_tieu_chuan: string;
      trang_thai: string;
      ghi_chu: string;
      tieu_chuan?: { noi_dung: string; diem: number }[];
      template_id?: string | null;
    }>,
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const existing = current.quy_trinh_items ?? [];
    const toAdd: QuyTrinhLamViecItem[] = items.map((it) => ({
      id: crypto.randomUUID(),
      ten_task: it.ten_task.trim(),
      noi_dung_tieu_chuan: it.noi_dung_tieu_chuan.trim(),
      trang_thai: it.trang_thai.trim(),
      ghi_chu: it.ghi_chu.trim(),
      tieu_chuan:
        it.tieu_chuan && it.tieu_chuan.length > 0
          ? it.tieu_chuan.map((t) => ({
              id: crypto.randomUUID(),
              noi_dung: (t.noi_dung || '').trim(),
              diem: Number(t.diem) || 0,
              trang_thai: 'Chưa đánh giá',
            }))
          : undefined,
      template_id: it.template_id ?? null,
    }));
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: [...existing, ...toAdd],
    };
    const tenNames = toAdd.map((x) => x.ten_task.trim()).filter(Boolean);
    const lichSuNext = appendLichSuEntry(detail.lich_su, {
      ten: 'Quy trình',
      hanh_vi:
        toAdd.length === 1
          ? `Thêm bước quy trình: ${tenNames[0] || '(không tên)'}`
          : `Thêm ${toAdd.length} bước vào quy trình`,
      ghi_chu: tenNames.length ? tenNames.join(' · ') : null,
    });
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask, {
      lich_su: lichSuNext,
    });
  },

  /** Cập nhật một phần tử trong `ten_task.quy_trinh_items` (có thể thay `tieu_chuan` / checklist con). */
  async updateQuyTrinhItem(
    lookupId: string,
    itemId: string,
    patch: {
      ten_task?: string;
      noi_dung_tieu_chuan?: string;
      trang_thai?: string;
      ghi_chu?: string;
      /** Nếu có — thay toàn bộ checklist con; mảng rỗng = xóa checklist */
      tieu_chuan?: QuyTrinhTieuChuanDong[];
    },
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const list = [...(current.quy_trinh_items ?? [])];
    const idx = list.findIndex((x) => x.id === itemId);
    if (idx === -1) {
      throw new Error('Không tìm thấy bước quy trình.');
    }
    const prev = list[idx];
    let nextTieuChuan: QuyTrinhTieuChuanDong[] | undefined = prev.tieu_chuan;
    if (patch.tieu_chuan !== undefined) {
      const raw = patch.tieu_chuan.filter((t) => String(t?.noi_dung ?? '').trim());
      nextTieuChuan =
        raw.length > 0
          ? raw.map((t) => {
              const tt = String(t.trang_thai ?? '').trim() || 'Chưa đánh giá';
              return {
                id:
                  typeof t.id === 'string' && t.id
                    ? t.id
                    : crypto.randomUUID(),
                noi_dung: String(t.noi_dung ?? '').trim(),
                diem: Number(t.diem) || 0,
                trang_thai: tt,
              };
            })
          : undefined;
    }
    /** Menu "Hoàn thành bước": gán Đạt cho cả checklist con — nếu không, deriveTrangThaiForQuyTrinhItem
     *  vẫn trả "Chưa đánh giá" và tiến độ % không lên (kể cả khi chỉ còn 1 bước thì không đạt 100%). */
    const markingStepDone =
      patch.trang_thai !== undefined && patch.trang_thai.trim() === 'Đạt';
    if (
      markingStepDone &&
      patch.tieu_chuan === undefined &&
      nextTieuChuan &&
      nextTieuChuan.length > 0
    ) {
      nextTieuChuan = nextTieuChuan.map((t) => ({
        ...t,
        trang_thai: 'Đạt',
      }));
    }
    list[idx] = {
      ...prev,
      ten_task: patch.ten_task !== undefined ? patch.ten_task.trim() : prev.ten_task,
      noi_dung_tieu_chuan:
        patch.noi_dung_tieu_chuan !== undefined
          ? patch.noi_dung_tieu_chuan.trim()
          : prev.noi_dung_tieu_chuan,
      trang_thai:
        patch.trang_thai !== undefined ? patch.trang_thai.trim() : prev.trang_thai,
      ghi_chu: patch.ghi_chu !== undefined ? patch.ghi_chu.trim() : prev.ghi_chu,
      tieu_chuan: nextTieuChuan,
    };
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: list,
    };
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask);
  },

  /** Cập nhật trạng thái một dòng checklist trong `quy_trinh_items` (theo chỉ số, tương thích dữ liệu cũ không có `id`). */
  async updateQuyTrinhChecklistLine(
    lookupId: string,
    quyTrinhItemId: string,
    lineIndex: number,
    trangThai: string,
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const list = [...(current.quy_trinh_items ?? [])];
    const idx = list.findIndex((x) => x.id === quyTrinhItemId);
    if (idx === -1) {
      throw new Error('Không tìm thấy bước quy trình.');
    }
    const tieuRaw = [...(list[idx].tieu_chuan || [])];
    if (lineIndex < 0 || lineIndex >= tieuRaw.length) {
      throw new Error('Không tìm thấy dòng checklist.');
    }
    const row = tieuRaw[lineIndex];
    tieuRaw[lineIndex] = {
      ...row,
      id: row.id || crypto.randomUUID(),
      trang_thai: (trangThai || 'Chưa đánh giá').trim() || 'Chưa đánh giá',
    };
    list[idx] = { ...list[idx], tieu_chuan: tieuRaw };
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: list,
    };
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask);
  },

  /** Xóa một phần tử khỏi `ten_task.quy_trinh_items`. */
  async removeQuyTrinhItem(lookupId: string, itemId: string): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const before = current.quy_trinh_items ?? [];
    const list = before.filter((x) => x.id !== itemId);
    if (list.length === before.length) {
      throw new Error('Không tìm thấy bước quy trình.');
    }
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: list,
    };
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask);
  },

  /** Đổi chỗ hai bước liền kề trong `ten_task.quy_trinh_items` (lên / xuống). */
  async moveQuyTrinhItem(
    lookupId: string,
    itemId: string,
    direction: 'up' | 'down',
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const list = [...(current.quy_trinh_items ?? [])];
    const idx = list.findIndex((x) => x.id === itemId);
    if (idx === -1) {
      throw new Error('Không tìm thấy bước quy trình.');
    }
    const j = direction === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= list.length) {
      return detail;
    }
    const tmp = list[idx];
    list[idx] = list[j];
    list[j] = tmp;
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: list,
    };
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask);
  },

  /** Đặt lại toàn bộ thứ tự `quy_trinh_items` theo danh sách id (kéo-thả). */
  async setQuyTrinhItemsOrder(
    lookupId: string,
    orderedItemIds: string[],
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy bản ghi công việc để cập nhật quy trình.');
    }
    const current = parseCongViecTenTaskColumn(
      detail.ten_task,
      detail.ten_cong_viec || '',
    );
    const list = [...(current.quy_trinh_items ?? [])];
    if (orderedItemIds.length !== list.length) {
      throw new Error('Danh sách bước không khớp.');
    }
    const byId = new Map(list.map((x) => [x.id, x]));
    const seen = new Set<string>();
    const reordered: QuyTrinhLamViecItem[] = [];
    for (const id of orderedItemIds) {
      const row = byId.get(id);
      if (!row || seen.has(id)) {
        throw new Error('Thứ tự bước không hợp lệ.');
      }
      seen.add(id);
      reordered.push(row);
    }
    if (seen.size !== list.length) {
      throw new Error('Thiếu bước trong thứ tự mới.');
    }
    const nextTenTask: CongViecTenTaskJsonb = {
      ...current,
      quy_trinh_items: reordered,
    };
    return this.saveTenTaskJsonbWithQuyTrinhProgress(detail, nextTenTask);
  },

  /**
   * Gán / đổi `hop_dong_id` cho công việc (bản ghi `cong_viec_chi_tiet`).
   * Nếu có `task_id`, đồng bộ luôn bảng `task` để lọc theo hợp đồng khớp.
   */
  async updateHopDongByTaskLookup(
    lookupId: string,
    hop_dong_id: string | null,
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc.');
    }
    const hop = hop_dong_id?.trim() || null;

    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ hop_dong_id: hop })
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] updateHopDongByTaskLookup:', error);
      throw error;
    }

    const taskId = detail.task_id?.toString().trim();
    if (taskId) {
      const { error: taskErr } = await supabase
        .from('task')
        .update({ hop_dong_id: hop })
        .eq('id', taskId);
      if (taskErr) {
        console.error('[taskDetailService] sync task.hop_dong_id:', taskErr);
      }
    }

    return this.normalizeRow(data);
  },

  /** Thêm một dòng vào jsonb `loi_ghi_nhan` (snapshot từ thư viện lỗi + nhân sự). */
  async appendLoiGhiNhan(
    lookupId: string,
    input: {
      thu_vien_loi_id: string;
      chuyen_nganh: string;
      bo_mon: string;
      canh_bao_loi: string;
      hang_muc_kiem_tra: string;
      noi_dung_kiem_tra: string;
      nguoi_vi_pham_id: string;
      nguoi_vi_pham_ten: string;
      ghi_chu: string;
    },
  ): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc.');
    }
    const existing = parseLoiGhiNhanColumn((detail as any).loi_ghi_nhan);
    const row: LoiGhiNhanItem = {
      id: crypto.randomUUID(),
      thu_vien_loi_id: input.thu_vien_loi_id.trim(),
      chuyen_nganh: input.chuyen_nganh.trim(),
      bo_mon: input.bo_mon.trim(),
      canh_bao_loi: input.canh_bao_loi.trim(),
      hang_muc_kiem_tra: input.hang_muc_kiem_tra.trim(),
      noi_dung_kiem_tra: input.noi_dung_kiem_tra.trim(),
      nguoi_vi_pham_id: input.nguoi_vi_pham_id.trim(),
      nguoi_vi_pham_ten: input.nguoi_vi_pham_ten.trim(),
      ghi_chu: input.ghi_chu.trim(),
      ngay_gio: new Date().toISOString(),
    };
    const next = [...existing, row];
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ loi_ghi_nhan: next })
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] appendLoiGhiNhan:', error);
      throw error;
    }

    return this.normalizeRow(data);
  },

  /** Một lần bấm — thêm nhiều dòng (cùng thư viện lỗi + ghi chú), mỗi người vi phạm một dòng. */
  async appendLoiGhiNhanMany(
    lookupId: string,
    payload: {
      thu_vien_loi_id: string;
      chuyen_nganh: string;
      bo_mon: string;
      canh_bao_loi: string;
      hang_muc_kiem_tra: string;
      noi_dung_kiem_tra: string;
      ghi_chu: string;
    },
    violators: { id: string; ten: string }[],
  ): Promise<TaskDetailRow> {
    if (!violators.length) {
      throw new Error('Chọn ít nhất một người vi phạm.');
    }
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc.');
    }
    const existing = parseLoiGhiNhanColumn((detail as any).loi_ghi_nhan);
    const base = {
      thu_vien_loi_id: payload.thu_vien_loi_id.trim(),
      chuyen_nganh: payload.chuyen_nganh.trim(),
      bo_mon: payload.bo_mon.trim(),
      canh_bao_loi: payload.canh_bao_loi.trim(),
      hang_muc_kiem_tra: payload.hang_muc_kiem_tra.trim(),
      noi_dung_kiem_tra: payload.noi_dung_kiem_tra.trim(),
      ghi_chu: payload.ghi_chu.trim(),
    };
    const now = new Date().toISOString();
    const newRows: LoiGhiNhanItem[] = violators.map((v) => ({
      id: crypto.randomUUID(),
      ...base,
      nguoi_vi_pham_id: v.id.trim(),
      nguoi_vi_pham_ten: v.ten.trim(),
      ngay_gio: now,
    }));
    const next = [...existing, ...newRows];
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ loi_ghi_nhan: next })
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] appendLoiGhiNhanMany:', error);
      throw error;
    }

    return this.normalizeRow(data);
  },

  async removeLoiGhiNhan(lookupId: string, itemId: string): Promise<TaskDetailRow> {
    const detail = await this.findDetailByIdOrTaskId(lookupId);
    if (!detail) {
      throw new Error('Không tìm thấy công việc.');
    }
    const existing = parseLoiGhiNhanColumn((detail as any).loi_ghi_nhan);
    const next = existing.filter((x) => x.id !== itemId);
    if (next.length === existing.length) {
      throw new Error('Không tìm thấy bản ghi lỗi.');
    }
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ loi_ghi_nhan: next })
      .eq('id', detail.id)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] removeLoiGhiNhan:', error);
      throw error;
    }

    return this.normalizeRow(data);
  },

  // Xóa công việc theo "task id" logic (task_id hoặc id)
  async deleteByTaskId(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('cong_viec_chi_tiet')
      .delete()
      .or(`task_id.eq.${taskId},id.eq.${taskId}`);

    if (error) {
      console.error('[taskDetailService] Error deleting detail by taskId:', error);
      throw error;
    }
  },

  normalizeRow(row: any): TaskDetailRow {
    const buocRaw = row.buoc_danh_gia;
    const buoc_danh_gia =
      Array.isArray(buocRaw) && buocRaw.length > 0
        ? (buocRaw as BuocDanhGia[])
        : [...DEFAULT_BUOC_DANH_GIA];
    const ten_task_detail = parseCongViecTenTaskColumn(
      row.ten_task,
      row.ten_cong_viec || '',
    );
    return {
      ...row,
      ten_task_detail,
      loi_ghi_nhan: parseLoiGhiNhanColumn(row.loi_ghi_nhan),
      danh_sach_cong_viec: parseDanhSachCongViecColumn(row.danh_sach_cong_viec),
      tai_lieu: (row.tai_lieu || []) as TaskDetailDocument[],
      binh_luan: (row.binh_luan || []) as TaskDetailComment[],
      lich_su: coerceLichSuArray(row.lich_su),
      buoc_danh_gia,
    };
  },

  // Cập nhật các bước đánh giá (phê duyệt) cho công việc chi tiết; tuỳ chọn ghi thêm dòng `lich_su`.
  async updateBuocDanhGia(
    detailId: string,
    buocDanhGia: BuocDanhGia[],
    historyEntry?: {
      ten?: string;
      hanh_vi: string;
      ghi_chu?: string | null;
    },
  ): Promise<TaskDetailRow> {
    const payload: Record<string, unknown> = { buoc_danh_gia: buocDanhGia };

    if (historyEntry?.hanh_vi) {
      const { data: cur, error: fetchErr } = await supabase
        .from('cong_viec_chi_tiet')
        .select('lich_su')
        .eq('id', detailId)
        .single();
      if (fetchErr) {
        console.error('[taskDetailService] updateBuocDanhGia fetch lich_su:', fetchErr);
        throw fetchErr;
      }
      payload.lich_su = appendLichSuEntry(cur?.lich_su, {
        ten: historyEntry.ten || 'Phê duyệt',
        hanh_vi: historyEntry.hanh_vi,
        ghi_chu: historyEntry.ghi_chu ?? null,
      });
    }

    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update(payload)
      .eq('id', detailId)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] Error updating buoc_danh_gia:', error);
      throw error;
    }

    return taskDetailService.normalizeRow(data);
  },

  // Ghi đè toàn bộ mảng bình luận
  async updateComments(
    detailId: string,
    comments: TaskDetailComment[],
  ): Promise<TaskDetailRow> {
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({
        binh_luan: comments,
      })
      .eq('id', detailId)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] Error updating comments:', error);
      throw error;
    }

    return taskDetailService.normalizeRow(data);
  },

  // Thêm 1 bình luận mới vào mảng
  async appendComment(
    detailId: string,
    comment: TaskDetailComment,
  ): Promise<TaskDetailRow> {
    // Đọc hiện tại trước
    const { data: current, error: fetchError } = await supabase
      .from('cong_viec_chi_tiet')
      .select('binh_luan')
      .eq('id', detailId)
      .single();

    if (fetchError) {
      console.error('[taskDetailService] Error fetching comments:', fetchError);
      throw fetchError;
    }

    const existing: TaskDetailComment[] = (current?.binh_luan || []) as any[];
    const next = [...existing, comment];

    return this.updateComments(detailId, next);
  },

  async updateDanhSachCongViec(
    detailId: string,
    items: DanhSachCongViecItem[],
  ): Promise<TaskDetailRow> {
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ danh_sach_cong_viec: items })
      .eq('id', detailId)
      .select('*')
      .single();

    if (error) {
      console.error('[taskDetailService] updateDanhSachCongViec:', error);
      throw error;
    }

    return taskDetailService.normalizeRow(data);
  },

  /** Tổng hợp mọi dòng `loi_ghi_nhan` mà `nguoi_vi_pham_id` trùng nhân sự */
  async getLoiViPhamByNhanSuId(nhanSuId: string): Promise<ViPhamNhanSuRow[]> {
    const idNorm = String(nhanSuId || '').trim();
    if (!idNorm) return [];

    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .select('id, ten_cong_viec, hop_dong_id, task_id, loi_ghi_nhan, trang_thai')
      .not('loi_ghi_nhan', 'is', null);

    if (error) {
      console.error('[taskDetailService] getLoiViPhamByNhanSuId:', error);
      throw error;
    }

    const out: ViPhamNhanSuRow[] = [];
    for (const row of data || []) {
      const lois = parseLoiGhiNhanColumn(row.loi_ghi_nhan);
      for (const loi of lois) {
        if (String(loi.nguoi_vi_pham_id || '').trim() === idNorm) {
          out.push({
            cong_viec_chi_tiet_id: String(row.id),
            ten_cong_viec: String(row.ten_cong_viec || ''),
            hop_dong_id: row.hop_dong_id != null ? String(row.hop_dong_id) : null,
            task_id: row.task_id != null ? String(row.task_id) : null,
            trang_thai: String(row.trang_thai || ''),
            loi,
          });
        }
      }
    }

    out.sort((a, b) => {
      const ta = new Date(a.loi.ngay_gio || 0).getTime();
      const tb = new Date(b.loi.ngay_gio || 0).getTime();
      return tb - ta;
    });
    return out;
  },
};

