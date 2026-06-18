import { api, API_BASE_URL } from '../api';
import {
  emitHopDongProfileAccess,
  hopDongNgayUpdateDateToday,
} from '../hopDongProfileAccess';

export interface ContractFile {
  file_type: string;
  file_name: string;
  file_url: string;
  uploaded_at?: string;
}

export interface ContractRow {
  id?: string;
  contract_id?: string;
  /** UUID/PK bảng hop_dong — khớp thu_chi.hop_dong_id khi khác contract_id */
  hop_dong_row_id?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  du_an_id?: string | null;
  nhan_su_id?: string | null;
  nhan_su_ids?: string[] | null;
  file_status?: string | null;
  files?: ContractFile[] | null;
  ngay_ky_hd?: string | null;
  so_hop_dong?: string | null;
  ten_goi_thau?: string | null;
  loai_dich_vu?: string | null;
  gia_tri_hd?: number | null;
  gia_tri_qt?: number | null;
  nguong_chi_nhan_su?: number | null;
  /** tien | phan_tram — nếu phan_tram thì nguong_chi_nhan_su là % nhân với gia_tri_qt */
  nguong_chi_nhan_su_loai?: string | null;
  da_thu?: number | null;
  con_phai_thu?: number | null;
  cdt_thanh_toan?: number | null;
  cdt_tam_ung?: number | null;
  progress?: number | null;
  phan_tram_task_hoan_thanh?: number | null;
  ngay_update?: string | null;
  ten_day_du_chu_dau_tu?: string | null;
  dai_dien_ben_a?: string | null;
  chuc_vu_dai_dien_a?: string | null;
  tai_khoan_ben_a?: string | null;
  mst?: string | null;
  dia_chi_tai_thoi_diem_ky?: string | null;
  nguoi_dai_dien_ky?: string | null;
  loai_cong_trinh?: string | null;
  cap_cong_trinh?: string | null;
  trang_thai?: string | null;
  created_at?: string;
  updated_at?: string;
  nhan_su_ten?: string | null;
  nhan_su_code?: string | null;
}

export type ContractUpdatePayload = Partial<ContractRow> & {
  /** Chỉ cập nhật trường khác, không đụng Lịch sử HS */
  skipNgayUpdate?: boolean;
};

export const contractService = {
  async getAll(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      trangThai?: string;
      khachFilter?: 'none' | 'all' | 'restricted';
      customerIds?: string[];
      duAnIds?: string[];
      projectName?: string;
    } = {},
  ): Promise<any> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());
    if (options.search) params.append('search', options.search);
    if (options.dateFrom) params.append('dateFrom', options.dateFrom);
    if (options.dateTo) params.append('dateTo', options.dateTo);
    if (options.trangThai) params.append('trangThai', options.trangThai);
    if (options.khachFilter) params.append('khachFilter', options.khachFilter);
    if (options.customerIds?.length) {
      params.append('customerIds', options.customerIds.join(','));
    }
    if (options.duAnIds?.length) {
      params.append('duAnIds', options.duAnIds.join(','));
    }
    if (options.projectName) params.append('projectName', options.projectName);
    
    const queryString = params.toString();
    const res = await api.get(`/contracts${queryString ? `?${queryString}` : ''}`);
    return res;
  },

  async getById(id: string): Promise<ContractRow | null> {
    const encoded = encodeURIComponent(String(id).trim());
    return api.get<ContractRow>(`/contracts/${encoded}`);
  },

  async create(payload: Partial<ContractRow>): Promise<ContractRow | null> {
    const body = {
      ...payload,
      ngay_update: payload.ngay_update ?? hopDongNgayUpdateDateToday(),
    };
    const data = await api.post<ContractRow>('/contracts', body);
    const uuid = String(data?.id ?? '').trim();
    if (uuid) emitHopDongProfileAccess(uuid, String(body.ngay_update));
    return data;
  },

  async update(id: string, payload: ContractUpdatePayload): Promise<ContractRow | null> {
    const { skipNgayUpdate, ...rest } = payload;
    const body: Partial<ContractRow> = skipNgayUpdate
      ? rest
      : { ...rest, ngay_update: rest.ngay_update ?? hopDongNgayUpdateDateToday() };
    const encoded = encodeURIComponent(String(id).trim());
    const data = await api.put<ContractRow>(`/contracts/${encoded}`, body);
    if (!skipNgayUpdate) {
      const uuid = String(data?.id ?? id).trim();
      if (uuid) emitHopDongProfileAccess(uuid, String(body.ngay_update));
    }
    return data;
  },

  async delete(id: string): Promise<boolean> {
    const encoded = encodeURIComponent(String(id).trim());
    return api.delete(`/contracts/${encoded}`);
  },

  /** Xóa toàn bộ hợp đồng (`hop_dong`) qua API — cần xác nhận rõ ràng ở UI. */
  async deleteAll(): Promise<{ ok: boolean; deleted: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/contracts/all`, { method: 'DELETE' });
      const body = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
      if (!res.ok) {
        return { ok: false, deleted: 0, error: body.error || res.statusText || 'Request failed' };
      }
      return { ok: true, deleted: Number(body.deleted) || 0 };
    } catch (err: any) {
      return { ok: false, deleted: 0, error: err?.message || String(err) };
    }
  },

  async exportToGoogleDocs(payload: any): Promise<any> {
    console.log('[contractService] Exporting via backend proxy...', payload);

    // Call our own backend instead of direct Google Script URL
    // This allows us to handle CORS and get the JSON response back
    const response = await api.post('/contracts/export-google-docs', payload);

    console.log('[contractService] Export result:', response);
    return response;
  },

  async bulkImport(rows: any[]): Promise<{ created: number; updated: number; errors: string[] }> {
    return api.post('/contracts/bulk-import', { rows });
  },

  async syncFinancials(
    updates: Array<{
      id: string;
      gia_tri_qt?: number;
      cdt_thanh_toan?: number;
      cdt_tam_ung?: number;
      da_thu?: number;
      con_phai_thu?: number;
    }>,
  ): Promise<{ updated: number; errors: string[] }> {
    const res = await api.post<{ updated: number; errors: string[] }>(
      '/contracts/sync-financials',
      { updates },
    );
    const today = hopDongNgayUpdateDateToday();
    for (const row of updates) {
      const uuid = String(row.id ?? '').trim();
      if (uuid) emitHopDongProfileAccess(uuid, today);
    }
    return res;
  },
};

