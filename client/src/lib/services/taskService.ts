import { api } from '../api';

/** Một dòng checklist trong bước quy trình (lưu trong jsonb) */
export interface QuyTrinhTieuChuanDong {
  id?: string;
  noi_dung: string;
  diem: number;
  /** Chưa đánh giá | Đạt | Không đạt */
  trang_thai?: string;
}

/** Một dòng trong quy trình — chỉ lưu trong jsonb `ten_task`, không tạo `ten_cong_viec` mới */
export interface QuyTrinhLamViecItem {
  id: string;
  ten_task: string;
  noi_dung_tieu_chuan: string;
  /** Đạt | Không đạt | Chưa đánh giá | '' */
  trang_thai: string;
  ghi_chu: string;
  tieu_chuan?: QuyTrinhTieuChuanDong[];
  template_id?: string | null;
}

/** Dữ liệu lưu cột jsonb `cong_viec_chi_tiet.ten_task` */
export interface CongViecTenTaskJsonb {
  ten_task: string;
  noi_dung_tieu_chuan: string;
  /** Đạt | Không đạt | Chưa đánh giá | '' */
  trang_thai: string;
  ghi_chu: string;
  /** Các bước quy trình (chỉ jsonb, không insert bảng) */
  quy_trinh_items?: QuyTrinhLamViecItem[];
}

export interface TaskRow {
  id: string;
  hop_dong_id: string;
  ten_task: string;
  mo_ta: string | null;
  trang_thai: string;
  uu_tien: string;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  ngay_hoan_thanh: string | null;
  nguoi_phu_trach: string | null;
  tien_do: number;
  ghi_chu: string | null;
  link_tai_lieu?: string | null;
  anh_bang_chung?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Parse từ jsonb `ten_task` (nếu có) */
  ten_task_detail?: CongViecTenTaskJsonb | null;
}

export const taskService = {
  async getByHopDongId(hopDongId: string): Promise<TaskRow[]> {
    return api.get(`/tasks/contract/${hopDongId}`);
  },

  async getAll(): Promise<TaskRow[]> {
    return api.get('/tasks');
  },

  async create(payload: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<TaskRow> {
    return api.post('/tasks', payload);
  },

  async update(id: string, payload: Partial<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>>): Promise<TaskRow> {
    return api.put(`/tasks/${id}`, payload);
  },

  async delete(id: string): Promise<boolean> {
    return api.delete(`/tasks/${id}`);
  }
};
