import { api } from '../api';

export interface ContractFile {
  file_type: string;
  file_name: string;
  file_url: string;
  uploaded_at?: string;
}

export interface ContractRow {
  id?: string;
  contract_id?: string;
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

export const contractService = {
  async getAll(): Promise<ContractRow[]> {
    return api.get('/contracts');
  },

  async create(payload: Partial<ContractRow>): Promise<ContractRow | null> {
    return api.post('/contracts', payload);
  },

  async update(id: string, payload: Partial<ContractRow>): Promise<ContractRow | null> {
    return api.put(`/contracts/${id}`, payload);
  },

  async delete(id: string): Promise<boolean> {
    return api.delete(`/contracts/${id}`);
  },

  async exportToGoogleDocs(payload: any): Promise<any> {
    console.log('[contractService] Exporting via backend proxy...', payload);

    // Call our own backend instead of direct Google Script URL
    // This allows us to handle CORS and get the JSON response back
    const response = await api.post('/contracts/export-google-docs', payload);

    console.log('[contractService] Export result:', response);
    return response;
  },
};

