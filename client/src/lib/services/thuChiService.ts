import { supabase } from '../supabase';

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
  /** chi_du_an | chi_nhan_su — phân loại chi (hợp đồng / nhân sự) */
  hang_muc_chi?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  ten_du_an?: string | null;
  so_hop_dong?: string | null;
  nhan_su_ten?: string | null; // Tên nhân sự từ join
  nhan_su_code?: string | null; // Mã nhân sự từ join (chỉ dùng nội bộ / lọc)
  nhan_su_anh?: string | null; // Ảnh nhân sự từ join
}

/** Một truy vấn Supabase: join dự án / hợp đồng / nhân sự — tránh N+1 và tải lại toàn bộ bảng phụ. */
const THU_CHI_LIST_SELECT = `
  id,
  du_an_id,
  hop_dong_id,
  nhan_su_id,
  loai_phieu,
  so_tien,
  ngay,
  noi_dung,
  tinh_trang_phieu,
  nguoi_nhan,
  file_url,
  anh_url,
  ghi_chu,
  hang_muc_chi,
  created_at,
  updated_at,
  du_an:du_an_id(id, ten_du_an, customer_id, ten_khach_hang),
  hop_dong:hop_dong_id(
    id,
    so_hop_dong,
    du_an_id,
    du_an:du_an_id(id, ten_du_an)
  ),
  nhan_su:nhan_su_id(id, code, full_name, name, hoTen, anh_nhan_su)
`;

function mapThuChiJoinedRow(row: any): ThuChiRow {
  const duAn = row.du_an;
  const hopDong = row.hop_dong;
  const effectiveDuAn = duAn || hopDong?.du_an;
  const nhanSu = row.nhan_su;
  const tenNhanSu =
    nhanSu?.full_name || nhanSu?.name || nhanSu?.hoTen || null;

  return {
    id: String(row.id),
    du_an_id: row.du_an_id || hopDong?.du_an_id || null,
    hop_dong_id: row.hop_dong_id,
    nhan_su_id: row.nhan_su_id,
    loai_phieu: row.loai_phieu,
    so_tien: Number(row.so_tien) || 0,
    ngay: row.ngay,
    ngay_tien_ve: row.ngay ?? null,
    noi_dung: row.noi_dung,
    tinh_trang_phieu: row.tinh_trang_phieu,
    nguoi_nhan: row.nguoi_nhan,
    file_url: row.file_url,
    anh_url: row.anh_url,
    ghi_chu: row.ghi_chu,
    hang_muc_chi: row.hang_muc_chi,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ten_du_an: effectiveDuAn?.ten_du_an ?? null,
    so_hop_dong: hopDong?.so_hop_dong ?? null,
    nhan_su_ten: tenNhanSu,
    nhan_su_code: nhanSu?.code ?? null,
    nhan_su_anh: nhanSu?.anh_nhan_su ?? null,
  };
}

export const thuChiService = {
  /**
   * Thu chi một lần truy vấn (join). Dùng cho mọi màn cần danh sách đầy đủ + tên dự án / HĐ / nhân sự.
   */
  async fetchJoinedList(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    let query = supabase
      .from('thu_chi')
      .select(THU_CHI_LIST_SELECT)
      .order('ngay', { ascending: false });

    if (filterDuAnId) {
      query = query.eq('du_an_id', filterDuAnId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[thuChiService] fetchJoinedList:', error);
      throw error;
    }
    return (data || []).map(mapThuChiJoinedRow);
  },

  /**
   * Thu chi gắn dự án: trực tiếp theo `du_an_id` hoặc gián tiếp qua hợp đồng (`hop_dong.du_an_id`).
   * Một truy vấn, không tải toàn bộ bảng thu_chi.
   */
  async fetchJoinedForDuAnScope(duAnId: string): Promise<ThuChiRow[]> {
    const id = String(duAnId || '').trim();
    if (!id) return [];

    const { data, error } = await supabase
      .from('thu_chi')
      .select(THU_CHI_LIST_SELECT)
      .or(`du_an_id.eq.${id},hop_dong.du_an_id.eq.${id}`)
      .order('ngay', { ascending: false });

    if (error) {
      console.error('[thuChiService] fetchJoinedForDuAnScope:', error);
      throw error;
    }
    return (data || []).map(mapThuChiJoinedRow);
  },

  /** Chỉ loại phiếu + số tiền + ngày — dùng biểu đồ / tổng hợp, giảm băng thông khi bảng lớn. */
  async fetchLedgerThin(): Promise<
    { loai_phieu: string; so_tien: number; ngay: string | null }[]
  > {
    const { data, error } = await supabase
      .from('thu_chi')
      .select('loai_phieu, so_tien, ngay');

    if (error) {
      console.error('[thuChiService] fetchLedgerThin:', error);
      throw error;
    }
    return (data || []).map((row: any) => ({
      loai_phieu: String(row.loai_phieu || ''),
      so_tien: Number(row.so_tien) || 0,
      ngay: row.ngay ?? null,
    }));
  },

  /** Phiếu gần nhất kèm join (hiển thị dashboard). */
  async fetchRecentJoined(limit: number): Promise<ThuChiRow[]> {
    const { data, error } = await supabase
      .from('thu_chi')
      .select(THU_CHI_LIST_SELECT)
      .order('ngay', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 50)));

    if (error) {
      console.error('[thuChiService] fetchRecentJoined:', error);
      throw error;
    }
    return (data || []).map(mapThuChiJoinedRow);
  },

  // Lấy thu chi phục vụ dashboard/danh sách dự án (một vòng Supabase).
  async getAllForDuAnDashboard(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    try {
      return await this.fetchJoinedList(filterDuAnId ?? undefined);
    } catch (err) {
      console.error('Exception in thuChiService.getAllForDuAnDashboard:', err);
      return [];
    }
  },

  // Lấy tất cả thu chi — cùng đường join với getAllForDuAnDashboard (không gọi thêm project/employee API).
  async getAll(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    try {
      return await this.fetchJoinedList(filterDuAnId ?? undefined);
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

  // Tạo nhiều thu chi cùng lúc (tối ưu hiệu suất)
  async createMany(payloads: Partial<ThuChiRow>[]): Promise<ThuChiRow[]> {
    try {
      if (!payloads.length) return [];
      const { data, error } = await supabase
        .from('thu_chi')
        .insert(payloads)
        .select();

      if (error) {
        console.error('Error creating many thu_chi:', error);
        throw error;
      }

      return (data || []) as ThuChiRow[];
    } catch (err) {
      console.error('Exception in thuChiService.createMany:', err);
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
