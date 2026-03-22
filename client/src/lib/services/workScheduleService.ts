import { api } from '../api';

export interface WorkSchedule {
  id: string;
  nhan_su_id: string;
  ngay: string;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  loai: string;
  tieu_de: string | null;
  ghi_chu: string | null;
}

export const workScheduleService = {
  async list(from: string, to: string, nhanSuId?: string) {
    const qs = new URLSearchParams({ from, to });
    if (nhanSuId) qs.set('nhan_su_id', nhanSuId);
    const result = await api.get(`/work-schedules?${qs.toString()}`);
    return (result.data || []) as WorkSchedule[];
  },

  async create(payload: Partial<WorkSchedule>) {
    return api.post('/work-schedules', payload) as Promise<WorkSchedule>;
  },

  async update(id: string, payload: Partial<WorkSchedule>) {
    return api.put(`/work-schedules/${id}`, payload) as Promise<WorkSchedule>;
  },

  async delete(id: string) {
    return api.delete(`/work-schedules/${id}`);
  }
};
