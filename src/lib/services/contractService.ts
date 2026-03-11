import { supabase } from '../supabase';
import { projectService } from './projectService';
import { employeeService } from './employeeService';

export interface ContractRow {
  id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  project_name?: string | null; // Deprecated: giữ lại để backward compatibility
  du_an_id?: string | null; // Foreign key đến du_an.id
  nhan_su_id?: string | null; // Foreign key đến nhan_su.id
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
  // Joined data
  nhan_su_ten?: string | null; // Tên nhân sự từ join
  nhan_su_code?: string | null; // Mã nhân sự từ join
}

export const contractService = {
  // Lấy tất cả hợp đồng (join với du_an để lấy ten_du_an)
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

      // Load tất cả dự án để map du_an_id sang ten_du_an
      const projects = await projectService.getAll();
      const projectMap = new Map<string, string>();
      projects.forEach(p => {
        projectMap.set(p.id, p.ten_du_an);
      });

      // Load tất cả nhân sự để map nhan_su_id sang tên và mã
      const employees = await employeeService.getAll();
      const employeeMap = new Map<string, { name: string; code: string }>();
      employees.forEach(emp => {
        const name = emp.full_name || emp.name || emp.hoTen || '';
        const code = emp.code || '';
        employeeMap.set(emp.id.toString(), { name, code });
      });

      // Map dữ liệu để lấy ten_du_an từ du_an_id và thông tin nhân sự từ nhan_su_id
      return (data || []).map((row: any) => {
        const employee = row.nhan_su_id ? employeeMap.get(row.nhan_su_id) : null;
        return {
          ...row,
          project_name: row.du_an_id ? (projectMap.get(row.du_an_id) || row.project_name) : (row.project_name || null), // Ưu tiên ten_du_an từ du_an_id, fallback về project_name cũ
          nhan_su_ten: employee?.name || null,
          nhan_su_code: employee?.code || null,
        };
      }) as ContractRow[];
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
        .select();

      if (error) {
        console.error('[contractService] Error creating contract in hop_dong:', error);
        console.error('[contractService] Error code:', error.code);
        console.error('[contractService] Error message:', error.message);
        console.error('[contractService] Error details:', error.details);
        console.error('[contractService] Error hint:', error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[contractService] No data returned after insert');
        return null;
      }

      console.log('[contractService] Contract created successfully:', data[0]);
      return data[0] as ContractRow;
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
        .select();

      if (error) {
        console.error('Error updating contract in hop_dong:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[contractService] No data returned after update');
        return null;
      }

      return data[0] as ContractRow;
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

