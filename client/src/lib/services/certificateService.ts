import { api } from '../api';
import { supabase } from '../supabase';

export interface ProfessionalCertificate {
  id: string;
  tenFileLuu: string;
  file_url?: string;
  anh_url?: string;
  anh2_url?: string;
  ghiChu: string;
  cchn: string;
  hangCCHN: string;
  ngayHetHanCC: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  employeeName?: string;
  employeeId?: string;
  employeeCode?: string;
  created_at?: string;
  updated_at?: string;
}

export const certificateService = {
  async getAll(): Promise<ProfessionalCertificate[]> {
    return (await api.get('/certificates')) as ProfessionalCertificate[];
  },

  async getById(id: string): Promise<ProfessionalCertificate> {
    return (await api.get(`/certificates/${encodeURIComponent(id)}`)) as ProfessionalCertificate;
  },

  async getByEmployeeId(employeeId: string): Promise<ProfessionalCertificate[]> {
    return (await api.get(
      `/certificates/employee/${encodeURIComponent(employeeId)}`,
    )) as ProfessionalCertificate[];
  },

  async search(searchTerm: string): Promise<ProfessionalCertificate[]> {
    const q = encodeURIComponent(searchTerm.trim());
    return (await api.get(`/certificates/search?q=${q}`)) as ProfessionalCertificate[];
  },

  async create(certificate: Partial<ProfessionalCertificate>): Promise<ProfessionalCertificate> {
    return (await api.post('/certificates', certificate)) as ProfessionalCertificate;
  },

  async update(
    id: string,
    certificate: Partial<ProfessionalCertificate>,
  ): Promise<ProfessionalCertificate> {
    return (await api.put(`/certificates/${encodeURIComponent(id)}`, certificate)) as ProfessionalCertificate;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/certificates/${encodeURIComponent(id)}`);
  },

  async uploadFile(bucket: string, path: string, file: File) {
    const { uploadStorageFile } = await import('../storageUpload');
    const primary = bucket?.trim() || 'hop_dong';
    const fallbacks =
      primary === 'hop_dong'
        ? ['thu-chi-files']
        : primary === 'certificates'
          ? ['hop_dong', 'thu-chi-files']
          : [];
    return uploadStorageFile(primary, path, file, { fallbackBuckets: fallbacks });
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  },
};
