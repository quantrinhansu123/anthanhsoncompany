import { api } from '../api';

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
