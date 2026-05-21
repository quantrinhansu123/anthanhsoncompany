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
      // Let callers decide how to handle connection/auth/table errors.
      throw err;
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

  // Loại bỏ key có giá trị undefined để tránh lỗi khi insert/update
  _cleanPayload(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined)
    ) as Record<string, unknown>;
  },

  // Tạo khách hàng mới
  async create(customer: Partial<Customer>) {
    try {
      const payload = this._cleanPayload(customer as Record<string, unknown>);
      const { data, error } = await supabase
        .from('khach_hang')
        .insert([payload])
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
      const payload = this._cleanPayload(customer as Record<string, unknown>);
      const { data, error } = await supabase
        .from('khach_hang')
        .update(payload)
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

  /** Xóa nhiều khách hàng theo danh sách id (theo lô). */
  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; requested: number; error?: string }> {
    try {
      const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
      if (unique.length === 0) return { deleted: 0, requested: 0 };

      const chunkSize = 500;
      let deleted = 0;
      for (let i = 0; i < unique.length; i += chunkSize) {
        const chunk = unique.slice(i, i + chunkSize);
        const { error } = await supabase.from('khach_hang').delete().in('id', chunk);
        if (error) {
          console.error('[customerService] deleteMany chunk:', error);
          return { deleted, requested: unique.length, error: error.message };
        }
        deleted += chunk.length;
      }
      return { deleted, requested: unique.length };
    } catch (err: any) {
      console.error('Exception in customerService.deleteMany:', err);
      return {
        deleted: 0,
        requested: ids.length,
        error: err?.message || String(err),
      };
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
  },

  /** Xóa mọi bản ghi `khach_hang` (theo lô). Cảnh báo: có thể CASCADE sang dữ liệu liên quan (ví dụ hợp đồng gắn customer_id). */
  async deleteAll(): Promise<{ ok: boolean; deleted: number; error?: string }> {
    try {
      const { data: rows, error: selErr } = await supabase.from('khach_hang').select('id');
      if (selErr) {
        console.error('[customerService] deleteAll select:', selErr);
        return { ok: false, deleted: 0, error: selErr.message };
      }
      const ids = (rows || []).map((r: { id: string }) => String(r.id));
      if (ids.length === 0) return { ok: true, deleted: 0 };
      const chunkSize = 500;
      let deleted = 0;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { error } = await supabase.from('khach_hang').delete().in('id', chunk);
        if (error) {
          console.error('[customerService] deleteAll chunk:', error);
          return { ok: false, deleted, error: error.message };
        }
        deleted += chunk.length;
      }
      return { ok: true, deleted };
    } catch (err: any) {
      console.error('Exception in customerService.deleteAll:', err);
      return { ok: false, deleted: 0, error: err?.message || String(err) };
    }
  },

  async getByNames(names: string[]) {
    if (!names || names.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .in('ten_don_vi', names);
      
      if (error) {
        console.error('Error fetching customers by names:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Exception in getByNames:', err);
      throw err;
    }
  }
};
