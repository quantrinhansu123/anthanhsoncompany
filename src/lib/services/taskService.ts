import { supabase } from '../supabase';

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
  // Lấy tất cả task theo hop_dong_id
  async getByHopDongId(hopDongId: string): Promise<TaskRow[]> {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .eq('hop_dong_id', hopDongId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Exception in taskService.getByHopDongId:', err);
      throw err;
    }
  },

  // Lấy tất cả task
  async getAll(): Promise<TaskRow[]> {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Exception in taskService.getAll:', err);
      throw err;
    }
  },

  // Tạo task mới
  async create(payload: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<TaskRow> {
    try {
      console.log('[taskService] Creating task with payload:', payload);
      
      const { data, error } = await supabase
        .from('task')
        .insert([payload])
        .select();

      if (error) {
        console.error('[taskService] Error creating task:', error);
        console.error('[taskService] Error code:', error.code);
        console.error('[taskService] Error message:', error.message);
        console.error('[taskService] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }

      console.log('[taskService] Task created successfully:', data[0]);
      return data[0];
    } catch (err) {
      console.error('[taskService] Exception in taskService.create:', err);
      throw err;
    }
  },

  // Cập nhật task
  async update(id: string, payload: Partial<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>>): Promise<TaskRow> {
    try {
      const { data, error } = await supabase
        .from('task')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating task:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned after update');
      }

      return data[0];
    } catch (err) {
      console.error('Exception in taskService.update:', err);
      throw err;
    }
  },

  // Xóa task
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('task')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in taskService.delete:', err);
      throw err;
    }
  }
};
