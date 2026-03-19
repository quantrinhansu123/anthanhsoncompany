import { supabase } from '../supabase';
import { projectService } from './projectService';
import { employeeService } from './employeeService';

export interface ThuChiRow {
  id: string;
  du_an_id?: string | null;
  hop_dong_id?: string | null;
  nhan_su_id?: string | null; // Nhân sự chi cho ai
  loai_phieu: string; // Phiếu thu / Phiếu chi
  so_tien: number;
  ngay: string; // ISO date
  ngay_tien_ve?: string | null; // Ngày tiền về (ISO date) - alias cho ngay
  noi_dung?: string | null;
  tinh_trang_phieu?: string | null;
  nguoi_nhan?: string | null;
  file_url?: string | null;
  anh_url?: string | null; // URL ảnh chứng từ
  ghi_chu?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  ten_du_an?: string | null;
  so_hop_dong?: string | null;
  nhan_su_ten?: string | null; // Tên nhân sự từ join
  nhan_su_code?: string | null; // Mã nhân sự từ join
}

export const thuChiService = {
  // Lấy tất cả thu chi (join với du_an và hop_dong để lấy tên)
  async getAll(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    try {
      let query = supabase
        .from('thu_chi')
        .select('*')
        .order('ngay', { ascending: false });

      // Filter theo dự án nếu có
      if (filterDuAnId) {
        query = query.eq('du_an_id', filterDuAnId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching thu_chi:', error);
        throw error;
      }

      // Load tất cả dự án và hợp đồng để map
      const projects = await projectService.getAll();
      const projectMap = new Map<string, string>();
      projects.forEach(p => {
        projectMap.set(p.id, p.ten_du_an);
      });

      // Load hợp đồng để map
      const { data: contracts } = await supabase
        .from('hop_dong')
        .select('id, so_hop_dong');
      
      const contractMap = new Map<string, string>();
      (contracts || []).forEach(c => {
        contractMap.set(c.id, c.so_hop_dong || '');
      });

      // Load nhân sự để map
      const employees = await employeeService.getAll();
      const employeeMap = new Map<string, { name: string; code: string }>();
      employees.forEach(emp => {
        const name = emp.full_name || emp.name || emp.hoTen || '';
        const code = emp.code || '';
        employeeMap.set(emp.id.toString(), { name, code });
      });

      // Map dữ liệu để lấy ten_du_an, so_hop_dong và thông tin nhân sự
      return (data || []).map((row: any) => {
        const employee = row.nhan_su_id ? employeeMap.get(row.nhan_su_id) : null;
        return {
          ...row,
          ten_du_an: row.du_an_id ? (projectMap.get(row.du_an_id) || null) : null,
          so_hop_dong: row.hop_dong_id ? (contractMap.get(row.hop_dong_id) || null) : null,
          nhan_su_ten: employee?.name || null,
          nhan_su_code: employee?.code || null,
          ngay_tien_ve: row.ngay || null, // Alias cho ngay
        };
      }) as ThuChiRow[];
    } catch (err) {
      console.error('Exception in thuChiService.getAll:', err);
      return [];
    }
  },

  // Lấy thu chi theo ID
  async getById(id: string): Promise<ThuChiRow | null> {
    try {
      const { data, error } = await supabase
        .from('thu_chi')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching thu_chi by id:', error);
        throw error;
      }

      return data as ThuChiRow | null;
    } catch (err) {
      console.error('Exception in thuChiService.getById:', err);
      return null;
    }
  },

  // Tạo thu chi mới
  async create(payload: Partial<ThuChiRow>): Promise<ThuChiRow | null> {
    try {
      const { data, error } = await supabase
        .from('thu_chi')
        .insert([payload])
        .select();

      if (error) {
        console.error('Error creating thu_chi:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[thuChiService] No data returned after insert');
        return null;
      }

      return data[0] as ThuChiRow;
    } catch (err) {
      console.error('Exception in thuChiService.create:', err);
      throw err;
    }
  },

  // Cập nhật thu chi
  async update(id: string, payload: Partial<ThuChiRow>): Promise<ThuChiRow | null> {
    try {
      const { data, error } = await supabase
        .from('thu_chi')
        .update(payload)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating thu_chi:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('[thuChiService] No data returned after update');
        return null;
      }

      return data[0] as ThuChiRow;
    } catch (err) {
      console.error('Exception in thuChiService.update:', err);
      return null;
    }
  },

  // Xóa thu chi
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('thu_chi')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting thu_chi:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in thuChiService.delete:', err);
      return false;
    }
  },

  // Upload ảnh chứng từ
  async uploadImage(bucket: string, path: string, file: File): Promise<string> {
    try {
      // Kiểm tra bucket có tồn tại không
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        throw new Error(`Không thể truy cập Storage. Vui lòng kiểm tra cấu hình Supabase.`);
      }
      
      const bucketExists = buckets?.some(b => b.name === bucket);
      
      if (!bucketExists) {
        console.warn(`Bucket "${bucket}" không tồn tại. Vui lòng tạo bucket trong Supabase Dashboard > Storage.`);
        throw new Error(`Bucket "${bucket}" chưa được tạo. Vui lòng tạo bucket trong Supabase Dashboard > Storage > New bucket với tên "${bucket}" và chọn Public bucket.`);
      }
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Lỗi khi upload ảnh: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Không nhận được dữ liệu sau khi upload');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Upload image error:', err);
      throw err;
    }
  },

  // Upload file
  async uploadFile(bucket: string, path: string, file: File): Promise<string> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        throw new Error(`Không thể truy cập Storage. Vui lòng kiểm tra cấu hình Supabase.`);
      }
      
      const bucketExists = buckets?.some(b => b.name === bucket);
      
      if (!bucketExists) {
        throw new Error(`Bucket "${bucket}" chưa được tạo. Vui lòng tạo bucket trong Supabase Dashboard > Storage > New bucket với tên "${bucket}" và chọn Public bucket.`);
      }

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Exception in uploadFile:', err);
      throw err;
    }
  }
};
