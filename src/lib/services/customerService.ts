import { supabase } from '../supabase';

export interface Customer {
  id: string;
  ten_don_vi: string;
  loai_hinh?: string;
  mst?: string;
  dia_chi?: string;
  nguoi_dai_dien?: string;
  chuc_vu_dai_dien?: string;
  nguoi_lien_he?: string;
  chuc_vu_lien_he?: string;
  sdt_lien_he?: string;
  tong_hop_dong?: number;
  gia_tri_quyet_toan?: number;
  da_thu?: number;
  con_phai_thu?: number;
  created_at?: string;
  updated_at?: string;
}

export const customerService = {
  // Lấy danh sách tất cả khách hàng
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .order('ten_don_vi', { ascending: true });
      
      if (error) {
        console.error('Error fetching customers from khach_hang:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Exception in getAll:', err);
      return [];
    }
  },

  // Lấy khách hàng theo ID
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching customer by id:', error);
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Exception in getById:', err);
      return null;
    }
  },

  // Tìm kiếm khách hàng theo tên
  async search(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .ilike('ten_don_vi', `%${searchTerm}%`)
        .order('ten_don_vi', { ascending: true });
      
      if (error) {
        console.error('Error searching customers:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Exception in search:', err);
      return [];
    }
  },

  // Tạo khách hàng mới
  async create(customer: Partial<Customer>) {
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .insert([customer])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating customer:', error);
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Exception in create:', err);
      throw err;
    }
  },

  // Cập nhật khách hàng
  async update(id: string, customer: Partial<Customer>) {
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .update(customer)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating customer:', error);
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Exception in update:', err);
      throw err;
    }
  },

  // Xóa khách hàng
  async delete(id: string) {
    try {
      const { error } = await supabase
        .from('khach_hang')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting customer:', error);
        throw error;
      }
      
      return true;
    } catch (err) {
      console.error('Exception in delete:', err);
      throw err;
    }
  }
};
