import { supabase } from '../supabase';

export interface ThuVienLoiRow {
  id: string;
  stt: number | null;
  noi_dung_kiem_tra: string;
  checklist_id: string | null;
  chuyen_nganh: string | null;
  bo_mon: string | null;
  hang_muc: string | null;
  hang_muc_kiem_tra: string | null;
  dien_giai_kiem_tra: string | null;
  cach_kiem_tra_nhanh: string | null;
  tieu_chuan: string | null;
  trong_cham: number | null;
  muc_do_quan_trong: string | null;
  canh_bao_loi: string | null;
  ghi_chu_ky_thuat: string | null;
  hinh_anh_minh_hoa: string | null;
  created_at?: string;
  updated_at?: string;
}

// Helper function để normalize dữ liệu từ database (hỗ trợ cả PascalCase và snake_case)
function normalizeRow(row: any, index: number): ThuVienLoiRow {
  // ID lấy từ cột Checklist_ID (ưu tiên)
  let rowId = row.Checklist_ID || row.checklist_id || row.ChecklistId || row['Checklist_ID'] || row['checklist_id'] || null;
  
  // Nếu không có Checklist_ID, thử các cách khác
  if (!rowId || rowId === '') {
    rowId = row.id || row.Id || row.ID || row['id'] || row['Id'] || row['ID'] || null;
  }
  
  // Nếu vẫn không có id, tạo id tạm từ index
  if (!rowId || rowId === '') {
    // Tạo id tạm từ index (sẽ được replace sau nếu cần)
    rowId = `temp-${index}-${Date.now()}`;
  }
  
  const normalized: ThuVienLoiRow = {
    id: String(rowId),
    stt: row.stt ?? row.Stt ?? row.STT ?? null,
    noi_dung_kiem_tra: row.noi_dung_kiem_tra || row.Noi_Dung_Kiem_Tra || row.NoiDungKiemTra || row['Nội dung kiểm tra'] || '',
    checklist_id: row.checklist_id || row.Checklist_Id || row.ChecklistId || row['Mã Checklist'] || null,
    // Chuyên ngành: ưu tiên cột chuyen_nganh (snake_case)
    chuyen_nganh: row.chuyen_nganh || row.Chuyen_Nganh || row.ChuyenNganh || row['Chuyên ngành'] || null,
    bo_mon: row.bo_mon || row.Bo_Mon || row.BoMon || row['Bộ môn'] || null,
    hang_muc: row.hang_muc || row.Hang_Muc || row.HangMuc || row['Hạng mục'] || null,
    hang_muc_kiem_tra: row.hang_muc_kiem_tra || row.Hang_Muc_Kiem_Tra || row.HangMucKiemTra || row['Hạng mục kiểm tra'] || null,
    dien_giai_kiem_tra: row.dien_giai_kiem_tra || row.Dien_Giai_Kiem_Tra || row.DienGiaiKiemTra || row['Diễn giải kiểm tra'] || null,
    cach_kiem_tra_nhanh: row.cach_kiem_tra_nhanh || row.Cach_Kiem_Tra_Nhanh || row.CachKiemTraNhanh || row['Cách kiểm tra nhanh'] || null,
    tieu_chuan: row.tieu_chuan || row.Tieu_Chuan || row.TieuChuan || row['Tiêu chuẩn'] || null,
    trong_cham: row.trong_cham ?? row.Trong_Cham ?? row.TrongCham ?? row['Trọng châm'] ?? null,
    muc_do_quan_trong: row.muc_do_quan_trong || row.Muc_Do_Quan_Trong || row.MucDoQuanTrong || row['Mức độ quan trọng'] || null,
    canh_bao_loi: row.canh_bao_loi || row.Canh_Bao_Loi || row.CanhBaoLoi || row['Cảnh báo lỗi'] || null,
    ghi_chu_ky_thuat: row.ghi_chu_ky_thuat || row.Ghi_Chu_Ky_Thuat || row.GhiChuKyThuat || row['Ghi chú kỹ thuật'] || null,
    hinh_anh_minh_hoa: row.hinh_anh_minh_hoa || row.Hinh_Anh_Minh_Hoa || row.HinhAnhMinhHoa || row['Hình ảnh minh họa'] || null,
    created_at: row.created_at || row.Created_At || row.createdAt,
    updated_at: row.updated_at || row.Updated_At || row.updatedAt,
  };
  
  return normalized;
}

export const thuVienLoiService = {
  async getAll(): Promise<ThuVienLoiRow[]> {
    try {
      console.log('[thuVienLoiService] Bắt đầu query từ bảng thu_vien_loi...');
      console.log('[thuVienLoiService] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('[thuVienLoiService] Using anon key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No');
      
      // Thử query với select cụ thể các cột có thể có
      // Nếu lỗi, sẽ fallback sang select tất cả
      let { data, error } = await supabase
        .from('thu_vien_loi')
        .select(`
          id,
          stt,
          noi_dung_kiem_tra,
          checklist_id,
          chuyen_nganh,
          bo_mon,
          hang_muc,
          hang_muc_kiem_tra,
          dien_giai_kiem_tra,
          cach_kiem_tra_nhanh,
          tieu_chuan,
          trong_cham,
          muc_do_quan_trong,
          canh_bao_loi,
          ghi_chu_ky_thuat,
          hinh_anh_minh_hoa,
          created_at,
          updated_at
        `);
      
      // Nếu lỗi do cột không tồn tại, thử select * 
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) {
        console.warn('[thuVienLoiService] ⚠️ Một số cột không tồn tại, thử select * ...');
        const retry = await supabase
          .from('thu_vien_loi')
          .select('*');
        
        if (retry.error) {
          console.error('[thuVienLoiService] ❌ Lỗi khi select *:', retry.error);
          throw retry.error;
        }
        
        data = retry.data;
        error = null;
      }

      console.log('[thuVienLoiService] Query completed. Error:', error);
      console.log('[thuVienLoiService] Data received:', data);
      console.log('[thuVienLoiService] Data type:', typeof data);
      console.log('[thuVienLoiService] Is array?', Array.isArray(data));
      console.log('[thuVienLoiService] Data length:', data?.length);

      if (error) {
        console.error('[thuVienLoiService] ❌ ERROR:', error);
        console.error('[thuVienLoiService] Error code:', error.code);
        console.error('[thuVienLoiService] Error message:', error.message);
        console.error('[thuVienLoiService] Error details:', JSON.stringify(error, null, 2));
        
        // Nếu là lỗi RLS, thông báo rõ ràng
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.error('[thuVienLoiService] ⚠️ CÓ THỂ LÀ LỖI RLS (Row Level Security). Vui lòng kiểm tra RLS policies trong Supabase.');
        }
        
        throw error;
      }

      // Kiểm tra data
      if (!data) {
        console.warn('[thuVienLoiService] ⚠️ Data là null hoặc undefined');
        return [];
      }

      if (!Array.isArray(data)) {
        console.warn('[thuVienLoiService] ⚠️ Data không phải là array:', typeof data);
        return [];
      }

      if (data.length === 0) {
        console.warn('[thuVienLoiService] ⚠️⚠️⚠️ DATA ARRAY RỖNG ⚠️⚠️⚠️');
        console.warn('[thuVienLoiService] Query thành công nhưng không có data được trả về.');
        console.warn('[thuVienLoiService] ĐIỀU NÀY THƯỜNG XẢY RA KHI:');
        console.warn('[thuVienLoiService] 1. RLS (Row Level Security) đang BẬT và không có policy cho phép SELECT');
        console.warn('[thuVienLoiService] 2. Hoặc có policy nhưng đang filter ra tất cả rows');
        console.warn('[thuVienLoiService]');
        console.warn('[thuVienLoiService] 🔧 CÁCH SỬA:');
        console.warn('[thuVienLoiService] 1. Vào Supabase Dashboard → Table Editor → thu_vien_loi');
        console.warn('[thuVienLoiService] 2. Vào tab "Policies"');
        console.warn('[thuVienLoiService] 3. Nếu RLS đang BẬT:');
        console.warn('[thuVienLoiService]    - Tạm thời TẮT RLS: Settings → API → RLS → Tắt cho bảng thu_vien_loi');
        console.warn('[thuVienLoiService]    - HOẶC tạo policy: "Allow all SELECT" cho role "anon"');
        console.warn('[thuVienLoiService]');
        console.warn('[thuVienLoiService] 4. Refresh trang và thử lại');
        
        // Thử một query test để xem có phải RLS không
        try {
          const testQuery = await supabase
            .from('thu_vien_loi')
            .select('id')
            .limit(1);
          
          console.log('[thuVienLoiService] Test query result:', testQuery);
          if (testQuery.data && testQuery.data.length === 0 && !testQuery.error) {
            console.error('[thuVienLoiService] ❌ XÁC NHẬN: RLS đang chặn query (trả về empty array không có error)');
          }
        } catch (e) {
          console.error('[thuVienLoiService] Test query error:', e);
        }
        
        return [];
      }

      console.log('[thuVienLoiService] ✅ Raw data from Supabase:', data);
      console.log('[thuVienLoiService] ✅ Data length:', data.length);
      console.log('[thuVienLoiService] ✅ First row keys:', Object.keys(data[0]));
      console.log('[thuVienLoiService] ✅ First row sample:', JSON.stringify(data[0], null, 2));
      // Log để tìm cột id
      const firstRow = data[0];
      console.log('[thuVienLoiService] 🔍 Tìm cột id trong row:');
      console.log('[thuVienLoiService]   - row.id:', firstRow.id);
      console.log('[thuVienLoiService]   - row.Id:', firstRow.Id);
      console.log('[thuVienLoiService]   - row.ID:', firstRow.ID);
      console.log('[thuVienLoiService]   - All keys containing "id":', Object.keys(firstRow).filter(k => k.toLowerCase().includes('id')));
      
      // Normalize dữ liệu để hỗ trợ cả PascalCase và snake_case
      const normalized = data.map((row, idx) => {
        try {
          return normalizeRow(row, idx);
        } catch (e) {
          console.error(`[thuVienLoiService] ❌ Lỗi khi normalize row ${idx}:`, e, row);
          return null;
        }
      }).filter((row): row is ThuVienLoiRow => row !== null && row.id && row.id !== '');
      
      console.log('[thuVienLoiService] ✅ Normalized data length:', normalized.length);
      
      if (normalized.length > 0) {
        console.log('[thuVienLoiService] ✅ First normalized row:', JSON.stringify(normalized[0], null, 2));
      } else {
        console.warn('[thuVienLoiService] ⚠️ Sau khi normalize, không còn bản ghi nào hợp lệ');
      }
      
      return normalized;
    } catch (err) {
      console.error('[thuVienLoiService] ❌ Exception in getAll:', err);
      console.error('[thuVienLoiService] Exception type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[thuVienLoiService] Exception stack:', err instanceof Error ? err.stack : 'N/A');
      throw err;
    }
  },

  async create(payload: Omit<ThuVienLoiRow, 'id' | 'created_at' | 'updated_at'>): Promise<ThuVienLoiRow | null> {
    const { data, error } = await supabase
      .from('thu_vien_loi')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating thu_vien_loi row:', error);
      throw error;
    }

    return data as ThuVienLoiRow;
  },

  async update(id: string, payload: Partial<ThuVienLoiRow>): Promise<ThuVienLoiRow | null> {
    const { data, error } = await supabase
      .from('thu_vien_loi')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating thu_vien_loi row:', error);
      throw error;
    }

    return data as ThuVienLoiRow;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('thu_vien_loi')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting thu_vien_loi row:', error);
      throw error;
    }

    return true;
  },
};

