import { supabase } from '../supabase';

export interface CongViecNhatKyRow {
  id: string;
  cong_viec_chi_tiet_id: string;
  nhan_su_id: string;
  nhan_su_ten: string;
  noi_dung: string;
  task_id: string | null;
  quy_trinh_item_id: string | null;
  ghi_chu: string | null;
  /** Đang làm | Hoàn thành */
  trang_thai: string;
  created_at: string;
  completed_at: string | null;
}

function mapRow(row: any): CongViecNhatKyRow {
  return {
    id: String(row.id),
    cong_viec_chi_tiet_id: String(row.cong_viec_chi_tiet_id),
    nhan_su_id: String(row.nhan_su_id ?? ''),
    nhan_su_ten: String(row.nhan_su_ten ?? ''),
    noi_dung: String(row.noi_dung ?? ''),
    task_id: row.task_id != null ? String(row.task_id) : null,
    quy_trinh_item_id: row.quy_trinh_item_id != null ? String(row.quy_trinh_item_id) : null,
    ghi_chu: row.ghi_chu != null && String(row.ghi_chu).trim() !== '' ? String(row.ghi_chu) : null,
    trang_thai: String(row.trang_thai ?? 'Đang làm'),
    created_at: String(row.created_at ?? ''),
    completed_at: row.completed_at != null ? String(row.completed_at) : null,
  };
}

export const congViecNhatKyService = {
  /**
   * Tất cả dòng nhật ký checklist có created_at trong [fromIso, toIso] (UTC ISO string).
   */
  async listByCreatedAtRange(
    fromIso: string,
    toIso: string,
  ): Promise<CongViecNhatKyRow[]> {
    const { data, error } = await supabase
      .from('cong_viec_nhat_ky_nhan_su')
      .select('*')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[congViecNhatKyService] listByCreatedAtRange:', error);
      throw error;
    }
    return (data || []).map(mapRow);
  },

  async listByCongViecChiTietId(
    congViecChiTietId: string,
  ): Promise<CongViecNhatKyRow[]> {
    const { data, error } = await supabase
      .from('cong_viec_nhat_ky_nhan_su')
      .select('*')
      .eq('cong_viec_chi_tiet_id', congViecChiTietId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[congViecNhatKyService] list:', error);
      throw error;
    }
    return (data || []).map(mapRow);
  },

  async insert(payload: {
    cong_viec_chi_tiet_id: string;
    nhan_su_id: string;
    nhan_su_ten: string;
    noi_dung: string;
    task_id?: string | null;
    quy_trinh_item_id?: string | null;
    ghi_chu?: string | null;
  }): Promise<CongViecNhatKyRow> {
    const { data, error } = await supabase
      .from('cong_viec_nhat_ky_nhan_su')
      .insert({
        cong_viec_chi_tiet_id: payload.cong_viec_chi_tiet_id,
        nhan_su_id: payload.nhan_su_id.trim(),
        nhan_su_ten: payload.nhan_su_ten.trim(),
        noi_dung: payload.noi_dung.trim(),
        task_id: payload.task_id?.trim() || null,
        quy_trinh_item_id: payload.quy_trinh_item_id?.trim() || null,
        ghi_chu: payload.ghi_chu?.trim() ? payload.ghi_chu.trim() : null,
        trang_thai: 'Đang làm',
        completed_at: null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[congViecNhatKyService] insert:', error);
      throw error;
    }
    return mapRow(data);
  },

  async markComplete(id: string): Promise<CongViecNhatKyRow> {
    const { data, error } = await supabase
      .from('cong_viec_nhat_ky_nhan_su')
      .update({
        trang_thai: 'Hoàn thành',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[congViecNhatKyService] markComplete:', error);
      throw error;
    }
    return mapRow(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('cong_viec_nhat_ky_nhan_su')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[congViecNhatKyService] delete:', error);
      throw error;
    }
  },
};
