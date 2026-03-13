import { supabase } from '../supabase';
import { projectService } from './projectService';
import { employeeService } from './employeeService';

export interface ContractFile {
  file_type: string; // File_BBTT, File_HD, File_BBNT, File_PL3A, File_BBTL, File_PLHD
  file_name: string;
  file_url: string;
  uploaded_at?: string;
}

export interface ContractRow {
  id?: string; // Có thể là id hoặc contract_id
  contract_id?: string; // Alias cho id
  customer_id?: string | null;
  customer_name?: string | null; // Tên đơn vị tại thời điểm ký
  project_name?: string | null; // Deprecated: giữ lại để backward compatibility
  du_an_id?: string | null; // Foreign key đến du_an.id
  nhan_su_id?: string | null; // Foreign key đến nhan_su.id
  file_status?: string | null;
  files?: ContractFile[] | null; // JSONB array of files
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
  // Các cột mới
  ten_day_du_chu_dau_tu?: string | null; // Tên đầy đủ chủ đầu tư
  dai_dien_ben_a?: string | null; // Đại diện bên A
  chuc_vu_dai_dien_a?: string | null; // Chức vụ đại diện A
  tai_khoan_ben_a?: string | null; // Tài khoản bên A
  mst?: string | null; // Mã số thuế
  dia_chi_tai_thoi_diem_ky?: string | null; // Địa chỉ tại thời điểm ký
  nguoi_dai_dien_ky?: string | null; // Người đại diện ký
  loai_cong_trinh?: string | null; // Loại công trình
  cap_cong_trinh?: string | null; // Cấp công trình
  trang_thai?: string | null; // Trạng thái
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
        // Hỗ trợ cả id và contract_id
        const contractId = row.contract_id || row.id;
        return {
          ...row,
          id: contractId, // Đảm bảo luôn có id
          contract_id: contractId, // Alias
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
      // Loại bỏ các trường không hợp lệ hoặc undefined
      const cleanPayload: any = {};
      
      // Chỉ thêm các trường có giá trị hoặc null
      const allowedFields = [
        'customer_id', 'customer_name', 'project_name', 'du_an_id', 'nhan_su_id',
        'file_status', 'files', 'ngay_ky_hd', 'so_hop_dong', 'ten_goi_thau',
        'loai_dich_vu', 'gia_tri_hd', 'gia_tri_qt', 'da_thu', 'con_phai_thu',
        'progress', 'phan_tram_task_hoan_thanh', 'ngay_update',
        'ten_day_du_chu_dau_tu', 'dai_dien_ben_a', 'chuc_vu_dai_dien_a',
        'tai_khoan_ben_a', 'mst', 'dia_chi_tai_thoi_diem_ky', 'nguoi_dai_dien_ky',
        'loai_cong_trinh', 'cap_cong_trinh', 'trang_thai'
      ];
      
      allowedFields.forEach(field => {
        if (field in payload) {
          const value = payload[field as keyof ContractRow];
          // Xử lý đặc biệt cho files (JSONB)
          if (field === 'files') {
            // Nếu là array, chuyển thành JSON string hoặc giữ nguyên nếu Supabase tự xử lý
            cleanPayload[field] = value;
          } else {
            cleanPayload[field] = value;
          }
        }
      });
      
      // Loại bỏ các trường undefined để tránh lỗi
      Object.keys(cleanPayload).forEach(key => {
        if (cleanPayload[key] === undefined) {
          delete cleanPayload[key];
        }
      });
      
      console.log('[contractService.update] Updating contract with id:', id);
      console.log('[contractService.update] Updating contract with payload:', cleanPayload);
      
      // Hỗ trợ cả id và contract_id - thử id trước (vì có thể cột vẫn là id)
      let { data, error } = await supabase
        .from('hop_dong')
        .update(cleanPayload)
        .eq('id', id)
        .select();
      
      // Nếu không tìm thấy với id, thử với contract_id
      if ((error && error.code === 'PGRST116') || (!data || data.length === 0)) {
        console.log('[contractService.update] Retrying with contract_id');
        const { data: retryData, error: retryError } = await supabase
          .from('hop_dong')
          .update(cleanPayload)
          .eq('contract_id', id)
          .select();
        
        if (retryError) {
          console.error('Error updating contract with contract_id:', retryError);
          throw retryError;
        }
        
        if (retryData && retryData.length > 0) {
          const result = retryData[0];
          return {
            ...result,
            id: result.contract_id || result.id,
            contract_id: result.contract_id || result.id,
          } as ContractRow;
        }
        
        // Nếu cả hai đều không tìm thấy
        console.error('[contractService] No data returned after update with both id and contract_id');
        return null;
      }

      if (error) {
        console.error('Error updating contract in hop_dong:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[contractService] No data returned after update');
        return null;
      }

      const result = data[0];
      // Đảm bảo có cả id và contract_id
      return {
        ...result,
        id: result.contract_id || result.id,
        contract_id: result.contract_id || result.id,
      } as ContractRow;
    } catch (err: any) {
      console.error('Exception in contractService.update:', err);
      if (err?.code) {
        console.error('[contractService] Error code:', err.code);
        console.error('[contractService] Error message:', err.message);
        console.error('[contractService] Error details:', err.details);
        console.error('[contractService] Error hint:', err.hint);
      }
      throw err; // Re-throw để component có thể xử lý
    }
  },

  // Xóa hợp đồng
  async delete(id: string): Promise<boolean> {
    try {
      // Hỗ trợ cả id và contract_id - thử contract_id trước
      let { error } = await supabase
        .from('hop_dong')
        .delete()
        .eq('contract_id', id);
      
      // Nếu lỗi và không phải lỗi "không tìm thấy", thử với id
      if (error && error.code !== 'PGRST116') {
        const { error: retryError } = await supabase
          .from('hop_dong')
          .delete()
          .eq('id', id);
        
        if (retryError) {
          console.error('Error deleting contract from hop_dong:', retryError);
          throw retryError;
        }
      } else if (error) {
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

