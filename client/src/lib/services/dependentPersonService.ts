import { supabase } from '../supabase';

export interface DependentPerson {
  id: string | number;
  id_nhan_su?: string | number; // Foreign key to nhan_su
  [key: string]: any; // Allow other fields from nguoi_phu_thuoc
}

export const dependentPersonService = {
  // Lấy danh sách người phụ thuộc theo id nhân viên
  async getByEmployeeId(employeeId: string | number) {
    try {
      // Thử nhiều tên cột foreign key có thể có
      let result = await supabase
        .from('nguoi_phu_thuoc')
        .select('*')
        .eq('id_nhan_su', employeeId.toString())
        .order('created_at', { ascending: false });
      
      if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
        // Thử employee_id
        result = await supabase
          .from('nguoi_phu_thuoc')
          .select('*')
          .eq('employee_id', employeeId.toString())
          .order('created_at', { ascending: false });
      }
      
      if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
        // Thử id_nhan_vien
        result = await supabase
          .from('nguoi_phu_thuoc')
          .select('*')
          .eq('id_nhan_vien', employeeId.toString())
          .order('created_at', { ascending: false });
      }
      
      if (result.error) {
        console.error('Error fetching dependent persons from nguoi_phu_thuoc:', result.error);
        // Nếu tất cả đều lỗi, trả về mảng rỗng thay vì throw
        if (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist')) {
          return [];
        }
        throw result.error;
      }
      
      return result.data || [];
    } catch (err: any) {
      console.error('Exception in getByEmployeeId:', err);
      // Nếu bảng không tồn tại hoặc có lỗi, trả về mảng rỗng
      return [];
    }
  },

  // Lấy tất cả người phụ thuộc
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('nguoi_phu_thuoc')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching dependent persons from nguoi_phu_thuoc:', error);
        throw error;
      }
      
      return data || [];
    } catch (err: any) {
      console.error('Exception in getAll:', err);
      return [];
    }
  }
};
