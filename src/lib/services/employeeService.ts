import { supabase } from '../supabase';

export interface Employee {
  id: string | number; // Có thể là string hoặc number tùy database
  code: string;
  full_name?: string; // Họ và tên - ưu tiên
  name?: string;
  hoTen?: string;
  department?: string;
  phongBan?: string; // Phòng ban
  position?: string;
  chucVu?: string; // Chức vụ
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'on-leave';
  joinDate?: string;
  ngayVaoLam?: string; // Ngày vào làm
  sdtNhanVien?: string;
  ngaySinh?: string;
  diaChi?: string;
  soCCCD?: string;
  ngayCapCCCD?: string;
  mstCaNhan?: string;
  maSoBHXH?: string;
  bangDHChuyenNganh?: string;
  namTotNghiep?: number;
  anh_nhan_su?: string; // URL ảnh nhân sự
}

export const employeeService = {
  // Lấy danh sách nhân viên từ bảng nhan_su
  async getAll() {
    try {
      console.log('Querying nhan_su table...');
      const { data, error, count } = await supabase
        .from('nhan_su')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching from nhan_su table:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Fetched employees from nhan_su:', data?.length || 0, 'records');
      console.log('Total count:', count);
      if (data && data.length > 0) {
        console.log('Sample data structure:', {
          keys: Object.keys(data[0]),
          firstRecord: data[0]
        });
      } else {
        console.warn('No data returned from nhan_su table. Table might be empty.');
      }
      
      return data || [];
    } catch (err) {
      console.error('Exception in getAll:', err);
      throw err;
    }
  },

  // Lấy nhân viên theo ID
  async getById(id: string | number) {
    const { data, error } = await supabase
      .from('nhan_su')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  // Tìm kiếm nhân viên
  async search(searchTerm: string) {
    const { data, error } = await supabase
      .from('nhan_su')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Tạo nhân viên mới
  async create(employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('nhan_su')
      .insert([employee])
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after insert');
    }
    return data[0];
  },

  // Cập nhật nhân viên
  async update(id: string | number, employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('nhan_su')
      .update(employee)
      .eq('id', id.toString())
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after update');
    }
    return data[0];
  },

  // Xóa nhân viên
  async delete(id: string | number) {
    const { error } = await supabase
      .from('nhan_su')
      .delete()
      .eq('id', id.toString());
    
    if (error) throw error;
  },

  // Upload ảnh nhân sự
  async uploadAvatar(bucket: string, path: string, file: File): Promise<string> {
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
        const errorMessage = `Bucket "${bucket}" chưa được tạo.\n\n` +
          `Vui lòng làm theo các bước sau:\n` +
          `1. Mở Supabase Dashboard → Storage\n` +
          `2. Click "New bucket"\n` +
          `3. Đặt tên: "${bucket}"\n` +
          `4. Chọn "Public bucket" (QUAN TRỌNG!)\n` +
          `5. Click "Create bucket"\n` +
          `6. Chạy script SQL từ file "create_${bucket.replace(/-/g, '_')}_bucket.sql" trong SQL Editor\n\n` +
          `Xem file "SETUP_STORAGE_BUCKETS.md" để biết thêm chi tiết.`;
        throw new Error(errorMessage);
      }

      // Upload file
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

      // Lấy public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err: any) {
      console.error('Exception in uploadAvatar:', err);
      throw err;
    }
  }
};
