import { supabase } from '../supabase';

export interface TaiLieuRow {
  id: string;
  ma_tai_lieu?: string | null;
  ten_tai_lieu?: string | null;
  huong?: 'Nội bộ' | 'Văn bản đến' | 'Văn bản đi' | string | null;
  loai?: string | null;
  nhom_tai_lieu?: string | null;
  trang_thai?: 'Đã ký' | 'Đã gửi' | 'Chờ duyệt' | 'Đã duyệt' | string | null;
  phong_quan_ly?: string | null;
  phan_quyen?: string | null;
  so_den?: string | null;
  so_di?: string | null;
  ngay_den?: string | null; // ISO date
  ngay_ky?: string | null; // ISO date
  link?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const taiLieuService = {
  // Lấy tất cả tài liệu
  async getAll(): Promise<TaiLieuRow[]> {
    try {
      const { data, error } = await supabase
        .from('tai_lieu')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tai_lieu:', error);
        throw error;
      }

      return (data || []) as TaiLieuRow[];
    } catch (err) {
      console.error('Exception in taiLieuService.getAll:', err);
      return [];
    }
  },

  // Lấy tài liệu theo ID
  async getById(id: string): Promise<TaiLieuRow | null> {
    try {
      const { data, error } = await supabase
        .from('tai_lieu')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tai_lieu by id:', error);
        throw error;
      }

      return data as TaiLieuRow | null;
    } catch (err) {
      console.error('Exception in taiLieuService.getById:', err);
      return null;
    }
  },

  // Tạo tài liệu mới
  async create(payload: Partial<TaiLieuRow>): Promise<TaiLieuRow | null> {
    try {
      const { data, error } = await supabase
        .from('tai_lieu')
        .insert([payload])
        .select();

      if (error) {
        console.error('Error creating tai_lieu:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[taiLieuService] No data returned after insert');
        return null;
      }

      return data[0] as TaiLieuRow;
    } catch (err) {
      console.error('Exception in taiLieuService.create:', err);
      throw err;
    }
  },

  // Cập nhật tài liệu
  async update(id: string, payload: Partial<TaiLieuRow>): Promise<TaiLieuRow | null> {
    try {
      const { data, error } = await supabase
        .from('tai_lieu')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating tai_lieu:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[taiLieuService] No data returned after update');
        return null;
      }

      return data[0] as TaiLieuRow;
    } catch (err) {
      console.error('Exception in taiLieuService.update:', err);
      return null;
    }
  },

  // Xóa tài liệu
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tai_lieu')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting tai_lieu:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in taiLieuService.delete:', err);
      return false;
    }
  },
};
