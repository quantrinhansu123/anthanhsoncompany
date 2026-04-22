import { supabase } from '../supabase';
import { getEmployeeColumns } from '../utils/getTableSchema';

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
  created_at?: string;
  updated_at?: string;
}

export const certificateService = {
  // Helper function để build select query cho employee
  async buildEmployeeSelect(): Promise<string> {
    const columns = await getEmployeeColumns();
    // Chỉ lấy các cột cần thiết: id, code, và full_name
    const selectColumns: string[] = [];
    
    // Luôn có id và code
    if (columns.includes('id')) selectColumns.push('id');
    if (columns.includes('code')) selectColumns.push('code');
    
    // Ưu tiên full_name (theo yêu cầu)
    if (columns.includes('full_name')) {
      selectColumns.push('full_name');
    } else {
      // Fallback: thêm các cột tên khác nếu full_name không có
      const nameColumns = ['hoTen', 'name', 'fullName', 'tenNhanVien'];
      for (const nameCol of nameColumns) {
        if (columns.includes(nameCol)) {
          selectColumns.push(nameCol);
          break;
        }
      }
    }
    
    return selectColumns.join(', ');
  },

  // Lấy danh sách chứng chỉ từ nhan_su_chi_tiet
  async getAll() {
    const employeeSelect = await this.buildEmployeeSelect();
    
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .select(`
        *,
        nhan_su:nhan_su(${employeeSelect})
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map data từ snake_case sang camelCase để match với interface
    return (data || []).map((cert: any) => {
      // Ưu tiên full_name (theo yêu cầu)
      let employeeName = '';
      if (cert.nhan_su) {
        employeeName = cert.nhan_su.full_name || 
                      cert.nhan_su.hoTen || 
                      cert.nhan_su.name || 
                      cert.nhan_su.fullName || 
                      cert.nhan_su.tenNhanVien || '';
      }
      
      return {
        id: cert.id,
        tenFileLuu: cert.ten_file_luu || cert.tenFileLuu || '',
        file_url: cert.file_url || '',
        anh_url: cert.anh_url || '',
        anh2_url: cert.anh2_url || '',
        ghiChu: cert.ghi_chu || cert.ghiChu || '',
        cchn: cert.cchn || '',
        hangCCHN: cert.hang_cchn || cert.hangCCHN || '',
        ngayHetHanCC: cert.ngay_het_han_cc || cert.ngayHetHanCC || '',
        employee_id: cert.id_nhan_su || cert.employee_id || '',
        employeeId: cert.id_nhan_su || cert.employee_id || '',
        employeeName: employeeName || '(Trống)',
        employeeCode: cert.nhan_su?.code || '',
        created_at: cert.created_at,
        updated_at: cert.updated_at
      };
    });
  },

  // Lấy chứng chỉ theo ID
  async getById(id: string) {
    const employeeSelect = await this.buildEmployeeSelect();
    
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .select(`
        *,
        nhan_su:nhan_su(${employeeSelect})
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Ưu tiên full_name (theo yêu cầu)
    let employeeName = '';
    if (data.nhan_su) {
      employeeName = data.nhan_su.full_name || 
                    data.nhan_su.hoTen || 
                    data.nhan_su.name || 
                    data.nhan_su.fullName || 
                    data.nhan_su.tenNhanVien || '';
    }
    
    return {
      id: data.id,
      tenFileLuu: data.ten_file_luu || data.tenFileLuu || '',
      file_url: data.file_url || '',
      anh_url: data.anh_url || '',
      anh2_url: data.anh2_url || '',
      ghiChu: data.ghi_chu || data.ghiChu || '',
      cchn: data.cchn || '',
      hangCCHN: data.hang_cchn || data.hangCCHN || '',
      ngayHetHanCC: data.ngay_het_han_cc || data.ngayHetHanCC || '',
      employee_id: data.id_nhan_su || data.employee_id || '',
      employeeId: data.id_nhan_su || data.employee_id || '',
      employeeName: employeeName || '(Trống)',
      employeeCode: data.nhan_su?.code || '',
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  // Lấy chứng chỉ theo id_nhan_su
  async getByEmployeeId(employeeId: string) {
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .select('*')
      .eq('id_nhan_su', employeeId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((cert: any) => ({
      id: cert.id,
      tenFileLuu: cert.ten_file_luu || cert.tenFileLuu || '',
      file_url: cert.file_url || '',
      anh_url: cert.anh_url || '',
      anh2_url: cert.anh2_url || '',
      ghiChu: cert.ghi_chu || cert.ghiChu || '',
      cchn: cert.cchn || '',
      hangCCHN: cert.hang_cchn || cert.hangCCHN || '',
      ngayHetHanCC: cert.ngay_het_han_cc || cert.ngayHetHanCC || '',
      employee_id: cert.id_nhan_su || cert.employee_id || ''
    }));
  },

  // Tìm kiếm chứng chỉ
  async search(searchTerm: string) {
    const employeeSelect = await this.buildEmployeeSelect();
    
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .select(`
        *,
        nhan_su:nhan_su(${employeeSelect})
      `)
      .or(`ten_file_luu.ilike.%${searchTerm}%,cchn.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((cert: any) => {
      // Ưu tiên full_name (theo yêu cầu)
      let employeeName = '';
      if (cert.nhan_su) {
        employeeName = cert.nhan_su.full_name || 
                      cert.nhan_su.hoTen || 
                      cert.nhan_su.name || 
                      cert.nhan_su.fullName || 
                      cert.nhan_su.tenNhanVien || '';
      }
      
      return {
        id: cert.id,
        tenFileLuu: cert.ten_file_luu || cert.tenFileLuu || '',
        file_url: cert.file_url || '',
        anh_url: cert.anh_url || '',
        anh2_url: cert.anh2_url || '',
        ghiChu: cert.ghi_chu || cert.ghiChu || '',
        cchn: cert.cchn || '',
        hangCCHN: cert.hang_cchn || cert.hangCCHN || '',
        ngayHetHanCC: cert.ngay_het_han_cc || cert.ngayHetHanCC || '',
        employee_id: cert.id_nhan_su || cert.employee_id || '',
        employeeId: cert.id_nhan_su || cert.employee_id || '',
        employeeName: employeeName || '(Trống)',
        employeeCode: cert.nhan_su?.code || ''
      };
    });
  },

  // Tạo chứng chỉ mới - id_nhan_su sẽ tự điền
  async create(certificate: Partial<ProfessionalCertificate>) {
    // Đảm bảo employee_id là UUID string
    const employeeId = certificate.employee_id?.toString();
    if (!employeeId) {
      throw new Error('employee_id là bắt buộc để tạo chứng chỉ');
    }
    
    // Kiểm tra UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(employeeId)) {
      throw new Error(`employee_id phải là UUID hợp lệ, nhận được: ${employeeId}`);
    }
    
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .insert([{
        id_nhan_su: employeeId, // id_nhan_su phải là UUID
        ten_file_luu: certificate.tenFileLuu || '',
        file_url: certificate.file_url || '',
        anh_url: certificate.anh_url || '',
        anh2_url: certificate.anh2_url || '',
        ghi_chu: certificate.ghiChu || '',
        cchn: certificate.cchn || '',
        hang_cchn: certificate.hangCCHN || '',
        ngay_het_han_cc: certificate.ngayHetHanCC || null
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Map lại sang format camelCase
    return {
      id: data.id,
      tenFileLuu: data.ten_file_luu || data.tenFileLuu || '',
      file_url: data.file_url || '',
      anh_url: data.anh_url || '',
      anh2_url: data.anh2_url || '',
      ghiChu: data.ghi_chu || data.ghiChu || '',
      cchn: data.cchn || '',
      hangCCHN: data.hang_cchn || data.hangCCHN || '',
      ngayHetHanCC: data.ngay_het_han_cc || data.ngayHetHanCC || '',
      employee_id: data.id_nhan_su || data.employee_id || ''
    };
  },

  // Cập nhật chứng chỉ
  async update(id: string, certificate: Partial<ProfessionalCertificate>) {
    // Đảm bảo employee_id là UUID string
    const employeeId = certificate.employee_id?.toString();
    if (!employeeId) {
      throw new Error('employee_id là bắt buộc để cập nhật chứng chỉ');
    }
    
    // Kiểm tra UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(employeeId)) {
      throw new Error(`employee_id phải là UUID hợp lệ, nhận được: ${employeeId}`);
    }
    
    // Chỉ gửi các trường có giá trị (không undefined)
    const updateData: any = {
      id_nhan_su: employeeId,
      updated_at: new Date().toISOString()
    };
    
    if (certificate.tenFileLuu !== undefined) updateData.ten_file_luu = certificate.tenFileLuu || '';
    if (certificate.file_url !== undefined) updateData.file_url = certificate.file_url || '';
    if (certificate.anh_url !== undefined) updateData.anh_url = certificate.anh_url || '';
    if (certificate.anh2_url !== undefined) updateData.anh2_url = certificate.anh2_url || '';
    if (certificate.ghiChu !== undefined) updateData.ghi_chu = certificate.ghiChu || '';
    if (certificate.cchn !== undefined) updateData.cchn = certificate.cchn || '';
    if (certificate.hangCCHN !== undefined) updateData.hang_cchn = certificate.hangCCHN || '';
    if (certificate.ngayHetHanCC !== undefined) updateData.ngay_het_han_cc = certificate.ngayHetHanCC || null;
    
    const { data, error } = await supabase
      .from('nhan_su_chi_tiet')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Map lại sang format camelCase
    return {
      id: data.id,
      tenFileLuu: data.ten_file_luu || data.tenFileLuu || '',
      file_url: data.file_url || '',
      anh_url: data.anh_url || '',
      anh2_url: data.anh2_url || '',
      ghiChu: data.ghi_chu || data.ghiChu || '',
      cchn: data.cchn || '',
      hangCCHN: data.hang_cchn || data.hangCCHN || '',
      ngayHetHanCC: data.ngay_het_han_cc || data.ngayHetHanCC || '',
      employee_id: data.id_nhan_su || data.employee_id || ''
    };
  },

  // Xóa chứng chỉ
  async delete(id: string) {
    const { error } = await supabase
      .from('nhan_su_chi_tiet')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Upload file - dùng bucket chung với hợp đồng
  async uploadFile(bucket: string, path: string, file: File) {
    try {
      let uploadedUrl = '';
      
      // Thử upload vào bucket chính (hop_dong)
      try {
        const { data, error } = await supabase.storage
          .from('hop_dong')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw error;
        
        if (!data) {
          throw new Error('Không nhận được dữ liệu sau khi upload');
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('hop_dong')
          .getPublicUrl(data.path);
        
        uploadedUrl = urlData.publicUrl;
      } catch (primaryErr: any) {
        const msg = String(primaryErr?.message || '');
        
        // Nếu bucket hop_dong không tồn tại, thử fallback sang thu-chi-files
        if (msg.includes('Bucket') || msg.includes('not found')) {
          console.warn('Bucket "hop_dong" không tồn tại, thử fallback sang "thu-chi-files"...');
          
          const { data, error } = await supabase.storage
            .from('thu-chi-files')
            .upload(path, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) {
            throw new Error(`Upload thất bại. Vui lòng tạo bucket "hop_dong" hoặc "thu-chi-files" trong Supabase Dashboard > Storage.`);
          }
          
          if (!data) {
            throw new Error('Không nhận được dữ liệu sau khi upload');
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('thu-chi-files')
            .getPublicUrl(data.path);
          
          uploadedUrl = urlData.publicUrl;
        } else {
          throw primaryErr;
        }
      }
      
      return uploadedUrl;
    } catch (err: any) {
      console.error('Upload file error:', err);
      throw err;
    }
  },

  // Xóa file
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
  }
};
