import { getSupabase } from '../config/supabase';

const cleanString = (s: any): string => {
  return String(s || '')
    .trim()
    .normalize('NFC')
    .replace(/\s+/g, ' ');
};

const normalizeKey = (s: any): string => {
  return cleanString(s).toLowerCase();
};

/** PostgREST/Supabase thường giới hạn ~1000 dòng mỗi response nếu không dùng range lặp */
const HOP_DONG_FETCH_CHUNK = 1000;

function mapHopDongRows(data: any[] | null | undefined) {
  return (data || []).map((row: any) => {
    const contractId = row.contract_id || row.id;
    const nhanSu = row.nhan_su;
    const duAn = row.du_an;

    const nhanSuTen = nhanSu ? (nhanSu.full_name || nhanSu.name || nhanSu.hoTen || '') : null;
    const nhanSuCode = nhanSu?.code || null;

    return {
      ...row,
      id: contractId,
      contract_id: contractId,
      hop_dong_row_id: row.id,
      project_name: duAn?.ten_du_an || row.project_name || null,
      nhan_su_ten: nhanSuTen,
      nhan_su_code: nhanSuCode,
      nhan_su_ids: Array.isArray(row.nhan_su_ids) ? row.nhan_su_ids : (row.nhan_su_ids ? [row.nhan_su_ids] : [])
    };
  });
}

export const contractService = {
  async getAll(options: { page?: number; pageSize?: number; search?: string } = {}) {
    const { page, pageSize, search } = options;
    const supabase = getSupabase();

    const buildOrderedQuery = () => {
      let query = supabase
        .from('hop_dong')
        .select(
          `
        *,
        du_an:du_an_id(id, ten_du_an),
        nhan_su:nhan_su_id(id, code, full_name, name, hoTen)
      `,
          { count: 'exact' }
        );

      if (search) {
        query = query.or(
          `so_hop_dong.ilike.%${search}%,ten_goi_thau.ilike.%${search}%,project_name.ilike.%${search}%`
        );
      }

      return query.order('ngay_ky_hd', { ascending: false });
    };

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await buildOrderedQuery().range(from, to);
      if (error) throw error;
      const rows = mapHopDongRows(data);
      return {
        data: rows,
        total: count || 0
      };
    }

    // Không truyền page: lấy toàn bộ (nhiều batch) — tránh mất hợp đồng do giới hạn mặc định
    const allRaw: any[] = [];
    let offset = 0;
    let totalCount: number | null = null;

    while (true) {
      const { data, error, count } = await buildOrderedQuery().range(
        offset,
        offset + HOP_DONG_FETCH_CHUNK - 1
      );
      if (error) throw error;
      if (totalCount === null && count !== null && count !== undefined) {
        totalCount = count;
      }
      const batch = data || [];
      allRaw.push(...batch);
      if (batch.length < HOP_DONG_FETCH_CHUNK) break;
      offset += HOP_DONG_FETCH_CHUNK;
    }

    const rows = mapHopDongRows(allRaw);
    return {
      data: rows,
      total: totalCount ?? rows.length
    };
  },

  async create(payload: any) {
    const insertPayload = { ...payload };
    if (Array.isArray(payload.nhan_su_ids) && payload.nhan_su_ids.length > 0) {
      insertPayload.nhan_su_ids = payload.nhan_su_ids.map((id: any) => String(id).trim()).filter(Boolean);
      insertPayload.nhan_su_id = insertPayload.nhan_su_id ?? insertPayload.nhan_su_ids[0] ?? null;
    }

    const { data, error } = await getSupabase()
      .from('hop_dong')
      .insert([insertPayload])
      .select(`
        *,
        du_an:du_an_id(id, ten_du_an),
        nhan_su:nhan_su_id(id, code, full_name, name, hoTen)
      `);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return null;
    
    const row: any = data[0];
    const contractId = row.contract_id || row.id;
    return {
      ...row,
      id: contractId,
      contract_id: contractId,
      hop_dong_row_id: row.id,
    };
  },

  async update(id: string, payload: any) {
    const updatePayload = { ...payload };
    if (Array.isArray(payload.nhan_su_ids) && payload.nhan_su_ids.length > 0) {
      updatePayload.nhan_su_ids = payload.nhan_su_ids.map((id: any) => String(id).trim()).filter(Boolean);
      updatePayload.nhan_su_id = updatePayload.nhan_su_id ?? updatePayload.nhan_su_ids[0] ?? null;
    }

    // Try update with id
    let { data, error } = await getSupabase()
      .from('hop_dong')
      .update(updatePayload)
      .eq('id', id)
      .select();
    
    // Fallback to contract_id if not found
    if (!data || data.length === 0) {
      const result = await getSupabase()
        .from('hop_dong')
        .update(updatePayload)
        .eq('contract_id', id)
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    const row: any = data[0];
    const contractId = row.contract_id || row.id;
    return {
      ...row,
      id: contractId,
      contract_id: contractId,
      hop_dong_row_id: row.id,
    };
  },

  async delete(id: string) {
    let { error } = await getSupabase()
      .from('hop_dong')
      .delete()
      .eq('id', id);
    
    if (error) {
      const result = await getSupabase()
        .from('hop_dong')
        .delete()
        .eq('contract_id', id);
      error = result.error;
    }
    
    if (error) throw error;
    return true;
  },

  async bulkImport(rows: any[]) {
    const supabase = getSupabase();
    
    // 1. Trích xuất danh sách tên dự án gốc (NFC) để tra cứu bằng toán tử .in()
    const projectNames = Array.from(new Set(rows.map(r => cleanString(r.ten_du_an || r.project_name)).filter(Boolean)));
    
    // 2. Fetch chỉ những dự án cần thiết (Dùng tên gốc NFC để khớp trong DB)
    let projects: any[] = [];
    if (projectNames.length > 0) {
        const { data } = await supabase
            .from('du_an')
            .select('id, ten_du_an')
            .in('ten_du_an', projectNames);
        projects = data || [];
    }
    // 3. Xây dựng bản đồ dùng khóa chuẩn hóa (lowercase) để tra cứu không phân biệt hoa thường
    const projectMap = new Map(projects.map(p => [normalizeKey(p.ten_du_an), p.id]));

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Ưu tiên lấy số dòng thực tế từ Excel do client gửi lên
      const rowSuffix = row.__rowNumber ? `Excel Dòng ${row.__rowNumber}` : `Dòng ${i + 2}`;
      
      try {
        const soHopDong = String(row.so_hop_dong || '').trim();
        if (!soHopDong) {
          results.errors.push(`${rowSuffix}: Thiếu số hợp đồng.`);
          continue;
        }

        // Map project name to ID
        const rawProjectName = String(row.ten_du_an || row.project_name || '').trim();
        let duAnId = row.du_an_id || null; // Ưu tiên ID từ client đã tra cứu/tạo xong
        
        if (!duAnId && rawProjectName) {
          duAnId = projectMap.get(normalizeKey(rawProjectName));
        }

        if (rawProjectName && !duAnId) {
          results.errors.push(`${rowSuffix}: Không tìm thấy dự án "${rawProjectName}".`);
          continue;
        }

        // Prepare data for upsert
        const payload: any = {
          so_hop_dong: soHopDong,
          project_name: rawProjectName || null,
          du_an_id: duAnId,
          ten_goi_thau: row.ten_goi_thau || null,
          ngay_ky_hd: row.ngay_ky_hd || null,
          gia_tri_hd: row.gia_tri_hd !== undefined && row.gia_tri_hd !== null ? Number(row.gia_tri_hd) : null,
          gia_tri_qt: row.gia_tri_qt !== undefined && row.gia_tri_qt !== null ? Number(row.gia_tri_qt) : null,
          ten_day_du_chu_dau_tu: row.ten_day_du_chu_dau_tu || null,
          dai_dien_ben_a: row.dai_dien_ben_a || null,
          chuc_vu_dai_dien_a: row.chuc_vu_dai_dien_a || null,
          mst: row.mst || null,
          dia_chi_tai_thoi_diem_ky: row.dia_chi_tai_thoi_diem_ky || null,
          nguoi_dai_dien_ky: row.nguoi_dai_dien_ky || null,
          loai_cong_trinh: row.loai_cong_trinh || null,
          cap_cong_trinh: row.cap_cong_trinh || null,
          trang_thai: row.trang_thai || null,
        };

        // Check if exists by so_hop_dong
        const { data: existing } = await supabase
          .from('hop_dong')
          .select('*')
          .eq('so_hop_dong', soHopDong)
          .maybeSingle();

        if (existing) {
          // Check if changed and field is not null in payload
          let changed = false;
          const updatePayload: any = {};
          
          for (const key in payload) {
            // Only update if payload has a value and it's different from existing
            if (payload[key] !== null && payload[key] !== undefined) {
              // Basic comparison (works for strings, numbers, nulls)
              const existingValue = existing[key];
              const newValue = payload[key];
              
              if (String(newValue) !== String(existingValue)) {
                updatePayload[key] = newValue;
                changed = true;
              }
            }
          }

          if (changed) {
            // Identifying the PK column (could be 'id' or 'contract_id' based on migrations)
            const pkCol = existing.id ? 'id' : 'contract_id';
            const { error: updateError } = await supabase
              .from('hop_dong')
              .update(updatePayload)
              .eq(pkCol, existing[pkCol]);
            
            if (updateError) throw updateError;
            results.updated++;
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('hop_dong')
            .insert([payload]);
          
          if (insertError) throw insertError;
          results.created++;
        }
      } catch (err: any) {
        results.errors.push(`${rowSuffix}: ${err.message}`);
      }
    }

    return results;
  }
};
