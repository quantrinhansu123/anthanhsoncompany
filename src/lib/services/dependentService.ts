import { supabase } from '../supabase';

export interface Dependent {
  id: string;
  employee_id: string;
  hoTenNPT: string;
  ngaySinhNPT: string;
  soCCCDNPT: string;
  mstNPT: string;
  quanHe: string;
  created_at?: string;
  updated_at?: string;
}

export const dependentService = {
  // Lấy danh sách người phụ thuộc theo employee_id từ bảng nguoi_phu_thuoc
  async getByEmployeeId(employeeId: string) {
    try {
      // Thử nhiều tên cột có thể có
      let data: any[] = [];
      let error: any = null;
      
      // Thử id_nhan_su trước
      let result = await supabase
        .from('nguoi_phu_thuoc')
        .select('*')
        .eq('id_nhan_su', employeeId)
        .order('created_at', { ascending: false });
      
      if (result.error) {
        // Nếu lỗi, thử employee_id
        result = await supabase
          .from('nguoi_phu_thuoc')
          .select('*')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false });
      }
      
      if (result.error) {
        // Nếu vẫn lỗi, thử id_nhan_vien
        result = await supabase
          .from('nguoi_phu_thuoc')
          .select('*')
          .eq('id_nhan_vien', employeeId)
          .order('created_at', { ascending: false });
      }
      
      if (result.error) {
        console.error('Error fetching dependents from nguoi_phu_thuoc:', result.error);
        // Nếu lỗi do cột không tồn tại, trả về mảng rỗng thay vì throw
        if (result.error.message?.includes('does not exist') || result.error.code === '42703' || result.error.code === 'PGRST204') {
          console.warn('Column does not exist, returning empty array');
          return [];
        }
        throw result.error;
      }
      
      data = result.data || [];
      
      // Map dữ liệu từ snake_case sang camelCase (ưu tiên snake_case vì database có thể chỉ có snake_case)
      return (data || []).map((dep: any) => ({
        id: dep.id,
        employee_id: dep.id_nhan_su || dep.employee_id || '', // Map id_nhan_su sang employee_id cho frontend
        hoTenNPT: dep.ho_ten_npt || dep.hoTenNPT || dep.ho_ten || dep.ten || '',
        ngaySinhNPT: dep.ngay_sinh_npt || dep.ngaySinhNPT || dep.ngay_sinh || '',
        soCCCDNPT: dep.so_cccd_npt || dep.soCCCDNPT || dep.so_cccd || '',
        mstNPT: dep.mst_npt || dep.mstNPT || dep.mst || '',
        quanHe: dep.quan_he || dep.quanHe || dep.quan_he_npt || dep.quan_he_nhan_vien || '',
        created_at: dep.created_at,
        updated_at: dep.updated_at
      }));
    } catch (err: any) {
      console.error('Exception in getByEmployeeId:', err);
      // Trả về mảng rỗng nếu có lỗi
      return [];
    }
  },

  // Tạo người phụ thuộc mới trong bảng nguoi_phu_thuoc
  async create(dependent: Partial<Dependent>) {
    // Base data với các cột snake_case
    const baseData: any = {
      ho_ten_npt: dependent.hoTenNPT || dependent.ho_ten_npt || '',
      ngay_sinh_npt: dependent.ngaySinhNPT || dependent.ngay_sinh_npt || '',
      so_cccd_npt: dependent.soCCCDNPT || dependent.so_cccd_npt || '',
      mst_npt: dependent.mstNPT || dependent.mst_npt || '',
      quan_he: dependent.quanHe || dependent.quan_he || ''
    };
    
    // Thử insert với từng cột foreign key một
    let data: any = null;
    let lastError: any = null;
    
    // Thử id_nhan_su trước
    let dependentData = { ...baseData, id_nhan_su: dependent.employee_id };
    let result = await supabase
      .from('nguoi_phu_thuoc')
      .insert([dependentData])
      .select()
      .single();
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu lỗi do cột không tồn tại, thử employee_id
      dependentData = { ...baseData, employee_id: dependent.employee_id };
      result = await supabase
        .from('nguoi_phu_thuoc')
        .insert([dependentData])
        .select()
        .single();
    }
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu vẫn lỗi, thử id_nhan_vien
      dependentData = { ...baseData, id_nhan_vien: dependent.employee_id };
      result = await supabase
        .from('nguoi_phu_thuoc')
        .insert([dependentData])
        .select()
        .single();
    }
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu tất cả đều lỗi, thử insert không có foreign key (có thể bảng không có foreign key)
      result = await supabase
        .from('nguoi_phu_thuoc')
        .insert([baseData])
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error creating dependent in nguoi_phu_thuoc:', result.error);
      console.error('Last error:', lastError);
      throw result.error;
    }
    
    data = result.data;
    
    // Map lại sang format camelCase (ưu tiên snake_case)
    return {
      id: data.id,
      employee_id: data.id_nhan_su || data.employee_id || data.id_nhan_vien || '',
      hoTenNPT: data.ho_ten_npt || data.hoTenNPT || data.ho_ten || '',
      ngaySinhNPT: data.ngay_sinh_npt || data.ngaySinhNPT || data.ngay_sinh || '',
      soCCCDNPT: data.so_cccd_npt || data.soCCCDNPT || data.so_cccd || '',
      mstNPT: data.mst_npt || data.mstNPT || data.mst || '',
      quanHe: data.quan_he || data.quanHe || data.quan_he_npt || '',
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Cập nhật người phụ thuộc trong bảng nguoi_phu_thuoc
  async update(id: string, dependent: Partial<Dependent>) {
    // Base data với các cột snake_case
    const baseData: any = {
      ho_ten_npt: dependent.hoTenNPT || dependent.ho_ten_npt || '',
      ngay_sinh_npt: dependent.ngaySinhNPT || dependent.ngay_sinh_npt || '',
      so_cccd_npt: dependent.soCCCDNPT || dependent.so_cccd_npt || '',
      mst_npt: dependent.mstNPT || dependent.mst_npt || '',
      quan_he: dependent.quanHe || dependent.quan_he || ''
    };
    
    // Thử update với từng cột foreign key một
    let data: any = null;
    let lastError: any = null;
    
    // Thử id_nhan_su trước
    let dependentData = { ...baseData, id_nhan_su: dependent.employee_id };
    let result = await supabase
      .from('nguoi_phu_thuoc')
      .update(dependentData)
      .eq('id', id)
      .select()
      .single();
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu lỗi do cột không tồn tại, thử employee_id
      dependentData = { ...baseData, employee_id: dependent.employee_id };
      result = await supabase
        .from('nguoi_phu_thuoc')
        .update(dependentData)
        .eq('id', id)
        .select()
        .single();
    }
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu vẫn lỗi, thử id_nhan_vien
      dependentData = { ...baseData, id_nhan_vien: dependent.employee_id };
      result = await supabase
        .from('nguoi_phu_thuoc')
        .update(dependentData)
        .eq('id', id)
        .select()
        .single();
    }
    
    if (result.error && (result.error.code === 'PGRST204' || result.error.message?.includes('does not exist'))) {
      lastError = result.error;
      // Nếu tất cả đều lỗi, thử update không có foreign key
      result = await supabase
        .from('nguoi_phu_thuoc')
        .update(baseData)
        .eq('id', id)
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error updating dependent in nguoi_phu_thuoc:', result.error);
      console.error('Last error:', lastError);
      throw result.error;
    }
    
    data = result.data;
    
    // Map lại sang format camelCase (ưu tiên snake_case)
    return {
      id: data.id,
      employee_id: data.id_nhan_su || data.employee_id || '',
      hoTenNPT: data.ho_ten_npt || data.hoTenNPT || data.ho_ten || '',
      ngaySinhNPT: data.ngay_sinh_npt || data.ngaySinhNPT || data.ngay_sinh || '',
      soCCCDNPT: data.so_cccd_npt || data.soCCCDNPT || data.so_cccd || '',
      mstNPT: data.mst_npt || data.mstNPT || data.mst || '',
      quanHe: data.quan_he || data.quanHe || data.quan_he_npt || '',
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Xóa người phụ thuộc từ bảng nguoi_phu_thuoc
  async delete(id: string) {
    const { error } = await supabase
      .from('nguoi_phu_thuoc')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting dependent from nguoi_phu_thuoc:', error);
      throw error;
    }
  }
};
