import { supabase } from '../supabase';
import type { TaskRow } from './taskService';

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

export interface TaskDetailRow {
  id: string;
  task_id: string;
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
  created_at?: string;
  updated_at?: string;
}

export const taskDetailService = {
  mapToTaskRow(detail: TaskDetailRow & { [key: string]: any }): TaskRow {
    const ten_task =
      detail.ten_task ||
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
      (detail as any).ngay_hoan_thanh || null;
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

      const rows = (data || []).map((row: any) =>
        this.mapToTaskRow(this.normalizeRow(row) as any),
      );

      return rows;
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
  }): Promise<TaskRow> {
    const insertData: any = {
      ten_cong_viec: payload.ten_task,
      mo_ta: payload.mo_ta,
      trang_thai: payload.trang_thai,
      tien_do: payload.tien_do ?? 0,
      ghi_chu: payload.ghi_chu || null,
      nguoi_thuc_hien: payload.nguoi_phu_trach || null,
      // Lưu cả các cột ngày mới để UI đọc lại đúng
      ngay_bat_dau: payload.ngay_bat_dau || null,
      ngay_ket_thuc: payload.ngay_ket_thuc || null,
      ngay_hoan_thanh: payload.ngay_hoan_thanh || null,
      // Giữ han_hoan_thanh cho tương thích ngược (coi như hạn hoàn thành = ngày kết thúc)
      han_hoan_thanh: payload.ngay_ket_thuc || null,
      hop_dong_id: payload.hop_dong_id || null,
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
    return {
      ...row,
      tai_lieu: (row.tai_lieu || []) as TaskDetailDocument[],
      binh_luan: (row.binh_luan || []) as TaskDetailComment[],
      lich_su: (row.lich_su || []) as TaskDetailHistory[],
      buoc_danh_gia,
    };
  },

  // Cập nhật các bước đánh giá (phê duyệt) cho công việc chi tiết
  async updateBuocDanhGia(
    detailId: string,
    buocDanhGia: BuocDanhGia[],
  ): Promise<TaskDetailRow> {
    const { data, error } = await supabase
      .from('cong_viec_chi_tiet')
      .update({ buoc_danh_gia: buocDanhGia })
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
};

