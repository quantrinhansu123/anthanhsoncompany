import { supabase } from '../supabase';

export interface ContractRow {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  file_status?: string | null;
  ngay_ky_hd?: string | null; // ISO date
  so_hop_dong?: string | null;
  ten_goi_thau?: string | null;
  loai_dich_vu?: string | null;
  gia_tri_hd?: number | null;
  gia_tri_qt?: number | null;
  da_thu?: number | null;
  con_phai_thu?: number | null;
  progress?: number | null;
  phan_tram_task_hoan_thanh?: number | null; // Phần trăm task hoàn thành (tự động tính từ task)
  ngay_update?: string | null; // ISO date
  created_at?: string;
  updated_at?: string;
}

export const contractService = {
  // Lấy tất cả hợp đồng
  async getAll(): Promise<ContractRow[]> {
    try {
      const { data, error } = await supabase
        .from('hop_dong')
        .select('*')
        .order('ngay_ky_hd', { ascending: false });

      if (error) {
        console.error('Error fetching contracts from hop_dong:', error);
        throw error;
      }

      return (data || []) as ContractRow[];
    } catch (err) {
      console.error('Exception in contractService.getAll:', err);
      return [];
    }
  },

  // Tạo hợp đồng mới
  async create(payload: Partial<ContractRow>): Promise<ContractRow | null> {
    try {
      console.log('[contractService] Creating contract with payload:', payload);
      
      const { data, error } = await supabase
        .from('hop_dong')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[contractService] Error creating contract in hop_dong:', error);
        console.error('[contractService] Error code:', error.code);
        console.error('[contractService] Error message:', error.message);
        console.error('[contractService] Error details:', error.details);
        console.error('[contractService] Error hint:', error.hint);
        throw error;
      }

      console.log('[contractService] Contract created successfully:', data);
      return data as ContractRow;
    } catch (err: any) {
      console.error('[contractService] Exception in contractService.create:', err);
      if (err?.code) {
        console.error('[contractService] Error code:', err.code);
        console.error('[contractService] Error message:', err.message);
      }
      throw err; // Re-throw để component có thể xử lý
    }
  },

  // Cập nhật hợp đồng
  async update(id: string, payload: Partial<ContractRow>): Promise<ContractRow | null> {
    try {
      const { data, error } = await supabase
        .from('hop_dong')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating contract in hop_dong:', error);
        throw error;
      }

      return data as ContractRow;
    } catch (err) {
      console.error('Exception in contractService.update:', err);
      return null;
    }
  },

  // Xóa hợp đồng
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('hop_dong')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting contract from hop_dong:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in contractService.delete:', err);
      return false;
    }
  },
};

