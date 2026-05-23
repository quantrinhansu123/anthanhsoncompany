import { supabase } from '../supabase';
import { api, API_BASE_URL } from '../api';

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
  /** Tên gói thầu ghi trên phiếu (một DA nhiều gói) */
  ten_goi_thau?: string | null;
  /** Hạng mục thu — dùng khi Phiếu thu */
  hang_muc_thu?: string | null;
  /** Có hóa đơn / Phát sinh */
  trang_thai_hd?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  customer_id?: string | null;
  customer_name?: string | null;
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
  ten_goi_thau,
  hang_muc_thu,
  trang_thai_hd,
  created_at,
  updated_at,
  du_an:du_an_id(id, ten_du_an, customer_id, ten_khach_hang),
  hop_dong:hop_dong_id(
    id,
    so_hop_dong,
    ten_goi_thau,
    du_an_id,
    customer_id,
    customer_name,
    du_an:du_an_id(id, ten_du_an, customer_id, ten_khach_hang)
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
    ten_goi_thau: (() => {
      const a = String(row.ten_goi_thau ?? '').trim();
      if (a) return a;
      const b = String(hopDong?.ten_goi_thau ?? '').trim();
      return b || null;
    })(),
    hang_muc_thu: row.hang_muc_thu,
    trang_thai_hd: row.trang_thai_hd ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_id: hopDong?.customer_id ?? duAn?.customer_id ?? null,
    customer_name:
      (hopDong?.customer_name && String(hopDong.customer_name).trim()) ||
      (duAn?.ten_khach_hang && String(duAn.ten_khach_hang).trim()) ||
      null,
    ten_du_an: effectiveDuAn?.ten_du_an ?? null,
    so_hop_dong: hopDong?.so_hop_dong ?? null,
    nhan_su_ten: tenNhanSu,
    nhan_su_code: nhanSu?.code ?? null,
    nhan_su_anh: nhanSu?.anh_nhan_su ?? null,
  };
}

export const thuChiService = {
  sanitizeStoragePath(rawPath: string): string {
    const parts = String(rawPath || '')
      .split('/')
      .filter(Boolean)
      .map((part) => {
        const normalized = part.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalized
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '') || 'file';
      });
    return parts.join('/');
  },
  /**
   * Thu chi một lần truy vấn (join). Dùng cho mọi màn cần danh sách đầy đủ + tên dự án / HĐ / nhân sự.
   */
  async fetchJoinedList(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    try {
      const q = filterDuAnId
        ? `?du_an_id=${encodeURIComponent(String(filterDuAnId))}`
        : '';
      const data = await api.get(`/thu-chi${q}`);
      const rows = Array.isArray(data) ? data : [];
      return rows.map(mapThuChiJoinedRow);
    } catch (apiErr) {
      console.warn('[thuChiService] fetchJoinedList API failed, thử Supabase trực tiếp:', apiErr);
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
    }
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
    return await this.fetchJoinedList(filterDuAnId ?? undefined);
  },

  // Lấy tất cả thu chi — qua API server (tránh RLS ẩn dòng vừa nhập Excel).
  async getAll(filterDuAnId?: string | null): Promise<ThuChiRow[]> {
    return await this.fetchJoinedList(filterDuAnId ?? undefined);
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

  /** Tạo qua API server (service role) — tránh RLS Supabase trên client. */
  async create(payload: Partial<ThuChiRow>): Promise<ThuChiRow | null> {
    try {
      const data = await api.post('/thu-chi', payload);
      return (data as ThuChiRow) ?? null;
    } catch (err) {
      console.error('Exception in thuChiService.create:', err);
      throw err;
    }
  },

  async createMany(payloads: Partial<ThuChiRow>[]): Promise<ThuChiRow[]> {
    try {
      if (!payloads.length) return [];
      const result = await api.post('/thu-chi/bulk', { rows: payloads });
      const data = (result as { data?: ThuChiRow[] })?.data;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Exception in thuChiService.createMany:', err);
      throw err;
    }
  },

  async update(id: string, payload: Partial<ThuChiRow>): Promise<ThuChiRow | null> {
    try {
      const encoded = encodeURIComponent(String(id).trim());
      const data = await api.put(`/thu-chi/${encoded}`, payload);
      return (data as ThuChiRow) ?? null;
    } catch (err) {
      console.error('Exception in thuChiService.update:', err);
      throw err;
    }
  },

  /** Xóa một chứng từ qua API server (service role — tránh RLS client chặn xóa). */
  async delete(id: string): Promise<boolean> {
    try {
      const encoded = encodeURIComponent(String(id).trim());
      await api.delete(`/thu-chi/${encoded}`);
      return true;
    } catch (err) {
      console.error('Exception in thuChiService.delete:', err);
      return false;
    }
  },

  /** Xóa nhiều chứng từ một lần. */
  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; requested: number; error?: string }> {
    try {
      const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
      if (unique.length === 0) {
        return { deleted: 0, requested: 0 };
      }
      const res = (await api.post('/thu-chi/bulk-delete', { ids: unique })) as {
        deleted?: number;
        requested?: number;
      };
      return {
        deleted: Number(res.deleted) || 0,
        requested: Number(res.requested) || unique.length,
      };
    } catch (err: any) {
      console.error('Exception in thuChiService.deleteMany:', err);
      return {
        deleted: 0,
        requested: ids.length,
        error: err?.message || String(err),
      };
    }
  },

  /** Đổi «Chủ đầu tư thanh toán» → chuẩn «Thanh toán» (hiển thị CĐT thanh toán). */
  async migrateChuDauTuThanhToan(): Promise<{
    updated: number;
    tinh_trang_phieu: number;
    hang_muc_thu: number;
    noi_dung: number;
    error?: string;
  }> {
    try {
      const res = (await api.post('/thu-chi/migrate-chu-dau-tu-thanh-toan', {})) as {
        updated?: number;
        tinh_trang_phieu?: number;
        hang_muc_thu?: number;
        noi_dung?: number;
      };
      return {
        updated: Number(res.updated) || 0,
        tinh_trang_phieu: Number(res.tinh_trang_phieu) || 0,
        hang_muc_thu: Number(res.hang_muc_thu) || 0,
        noi_dung: Number(res.noi_dung) || 0,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        updated: 0,
        tinh_trang_phieu: 0,
        hang_muc_thu: 0,
        noi_dung: 0,
        error: msg,
      };
    }
  },

  /** Xóa mọi bản ghi `thu_chi` — chỉ dùng khi người dùng xác nhận rõ ràng. */
  async deleteAll(): Promise<{ ok: boolean; deleted: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/thu-chi/all`, { method: 'DELETE' });
      const body = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
      if (!res.ok) {
        return { ok: false, deleted: 0, error: body.error || res.statusText || 'Request failed' };
      }
      return { ok: true, deleted: Number(body.deleted) || 0 };
    } catch (err: any) {
      console.error('Exception in thuChiService.deleteAll:', err);
      return { ok: false, deleted: 0, error: err?.message || String(err) };
    }
  },

  // Upload ảnh chứng từ
  async uploadImage(bucket: string, path: string, file: File): Promise<string> {
    try {
      const safePath = this.sanitizeStoragePath(path);
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(safePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        const msg = String(error.message || '');
        if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
          throw new Error(`Bucket "${bucket}" chưa tồn tại hoặc không truy cập được.`);
        }
        if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission')) {
          throw new Error(`Không đủ quyền upload vào bucket "${bucket}". Kiểm tra Storage policy.`);
        }
        throw new Error(`Lỗi khi upload ảnh: ${msg}`);
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
      const safePath = this.sanitizeStoragePath(path);
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(safePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        const msg = String(uploadError.message || '');
        if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
          throw new Error(`Bucket "${bucket}" chưa tồn tại hoặc không truy cập được.`);
        }
        if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission')) {
          throw new Error(`Không đủ quyền upload vào bucket "${bucket}". Kiểm tra Storage policy.`);
        }
        throw new Error(msg || 'Upload file thất bại');
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
