import { api } from '../api';

export interface Employee {
  id: string | number;
  code: string;
  full_name?: string;
  name?: string;
  hoTen?: string;
  department?: string;
  phongBan?: string;
  position?: string;
  chucVu?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'on-leave';
  joinDate?: string;
  ngayVaoLam?: string;
  sdtNhanVien?: string;
  ngaySinh?: string;
  diaChi?: string;
  soCCCD?: string;
  ngayCapCCCD?: string;
  mstCaNhan?: string;
  maSoBHXH?: string;
  bangDHChuyenNganh?: string;
  namTotNghiep?: number;
  anh_nhan_su?: string;
}

export const employeeService = {
  async getAll() {
    const result = await api.get('/employees');
    return result.data || [];
  },

  async getById(id: string | number) {
    return api.get(`/employees/${id}`);
  },

  async search(searchTerm: string) {
    return api.get(`/employees/search?q=${encodeURIComponent(searchTerm)}`);
  },

  async create(employee: Partial<Employee>) {
    return api.post('/employees', employee);
  },

  async update(id: string | number, employee: Partial<Employee>) {
    return api.put(`/employees/${id}`, employee);
  },

  async delete(id: string | number) {
    return api.delete(`/employees/${id}`);
  },

  // Storage operations can still be handled directly in client for simplicity (uploading files) or moved together if needed.
  // For now, keeping the uploadAvatar as is since it interacts with Supabase Storage.
  async uploadAvatar(bucket: string, path: string, file: File): Promise<string> {
    try {
      const { uploadStorageFile } = await import('../storageUpload');
      return await uploadStorageFile(bucket, path, file, {
        fallbackBuckets: ['employee-avatars', 'hop_dong', 'thu-chi-files'],
      });
    } catch (err: any) {
      console.error('Exception in uploadAvatar:', err);
      throw err;
    }
  }
};
