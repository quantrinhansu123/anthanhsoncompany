import { getSupabase } from '../config/supabase';

export interface WorkScheduleRow {
  id: string;
  nhan_su_id: string;
  ngay: string;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  loai: string;
  tieu_de: string | null;
  ghi_chu: string | null;
  created_at?: string;
  updated_at?: string;
}

export const workScheduleService = {
  async getByRange(from: string, to: string, nhanSuId?: string) {
    let q = getSupabase()
      .from('lich_lam_viec')
      .select('*')
      .gte('ngay', from)
      .lte('ngay', to)
      .order('ngay', { ascending: true })
      .order('gio_bat_dau', { ascending: true, nullsFirst: true });

    if (nhanSuId) {
      q = q.eq('nhan_su_id', nhanSuId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await getSupabase()
      .from('lich_lam_viec')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(row: Partial<WorkScheduleRow>) {
    const { data, error } = await getSupabase()
      .from('lich_lam_viec')
      .insert([row])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string, row: Partial<WorkScheduleRow>) {
    const { data, error } = await getSupabase()
      .from('lich_lam_viec')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async delete(id: string) {
    const { error } = await getSupabase().from('lich_lam_viec').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
