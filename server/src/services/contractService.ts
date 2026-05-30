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

function escapeRegexForPostgres(term: string): string {
  return String(term ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Tìm số HĐ: khớp từ khóa nhưng không dính trong số khác (vd. «86» không khớp «686»). */
function applyHopDongSoHopDongSearch(query: any, searchTerm: string) {
  const term = String(searchTerm ?? '').trim();
  if (!term) return query;
  const rx = `(^|[^0-9])${escapeRegexForPostgres(term)}([^0-9]|$)`;
  return query.filter('so_hop_dong', 'imatch', rx);
}

/** UUID trong `.in.(...)` của PostgREST bắt buộc có dấu ngoặc kép. */
function postgrestQuotedInList(values: string[], max: number): string {
  const uniq = [...new Set(values.map((v) => String(v).trim()).filter(Boolean))].slice(0, max);
  if (!uniq.length) return '';
  return uniq.map((v) => `"${v.replace(/"/g, '')}"`).join(',');
}

/** PostgREST/Supabase thường giới hạn ~1000 dòng mỗi response nếu không dùng range lặp */
const HOP_DONG_FETCH_CHUNK = 1000;

function isMissingCdtColumnError(msg: string): boolean {
  return (
    /cdt_thanh_toan|cdt_tam_ung/i.test(msg) &&
    /column|schema|does not exist|could not find/i.test(msg)
  );
}

function withoutCdtColumns(payload: Record<string, unknown>): Record<string, unknown> {
  const { cdt_thanh_toan: _a, cdt_tam_ung: _b, ...rest } = payload;
  return rest;
}

function mapHopDongRows(data: any[] | null | undefined) {
  return (data || []).map((row: any) => {
    /** PK bảng hop_dong (có thể là cột id hoặc contract_id tùy migration). */
    const rowPk = row.id ?? row.contract_id;
    const contractId = row.contract_id || row.id;
    const nhanSu = row.nhan_su;
    const duAn = row.du_an;

    const nhanSuTen = nhanSu ? (nhanSu.full_name || nhanSu.name || nhanSu.hoTen || '') : null;
    const nhanSuCode = nhanSu?.code || null;

    return {
      ...row,
      id: contractId,
      contract_id: contractId,
      hop_dong_row_id: rowPk,
      project_name: duAn?.ten_du_an || row.project_name || null,
      nhan_su_ten: nhanSuTen,
      nhan_su_code: nhanSuCode,
      nhan_su_ids: Array.isArray(row.nhan_su_ids) ? row.nhan_su_ids : (row.nhan_su_ids ? [row.nhan_su_ids] : [])
    };
  });
}

type HopDongListKhachFilter = 'none' | 'all' | 'restricted';

function applyHopDongKhachDuAnFilters(
  query: any,
  opts: {
    khachFilter?: HopDongListKhachFilter;
    customerIds?: string[];
    duAnIds?: string[];
    projectName?: string;
  },
) {
  let q = query;

  const projectName = String(opts.projectName ?? '').trim();
  if (projectName) {
    q = q.eq('project_name', projectName);
  }

  const duAnIds = (opts.duAnIds ?? []).map((id) => String(id).trim()).filter(Boolean);
  const customerIds = (opts.customerIds ?? []).map((id) => String(id).trim()).filter(Boolean);
  const khachFilter = opts.khachFilter ?? 'all';

  if (khachFilter === 'none') {
    return q.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (khachFilter === 'restricted') {
    const parts: string[] = [];
    const customerIn = postgrestQuotedInList(customerIds, 200);
    if (customerIn) parts.push(`customer_id.in.(${customerIn})`);
    const duAnIn = postgrestQuotedInList(duAnIds, 200);
    if (duAnIn) parts.push(`du_an_id.in.(${duAnIn})`);
    if (parts.length === 0) {
      return q.eq('id', '00000000-0000-0000-0000-000000000000');
    }
    q = q.or(parts.join(','));
    return q;
  }

  // all — chỉ lọc dự án nếu có
  if (duAnIds.length > 0) {
    q = q.in('du_an_id', duAnIds);
  }
  return q;
}

export const contractService = {
  async getAll(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      trangThai?: string;
      khachFilter?: HopDongListKhachFilter;
      customerIds?: string[];
      duAnIds?: string[];
      projectName?: string;
    } = {},
  ) {
    const {
      page,
      pageSize,
      search,
      dateFrom,
      dateTo,
      trangThai,
      khachFilter,
      customerIds,
      duAnIds,
      projectName,
    } = options;
    const supabase = getSupabase();
    const searchTerm = String(search ?? '').trim();

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

      if (searchTerm) {
        query = applyHopDongSoHopDongSearch(query, searchTerm);
      }

      const from = String(dateFrom ?? '').trim();
      const to = String(dateTo ?? '').trim();
      if (from) query = query.gte('ngay_ky_hd', from);
      if (to) query = query.lte('ngay_ky_hd', to);

      const status = String(trangThai ?? '').trim();
      if (status === 'Đang thực hiện') {
        query = query.or(
          'trang_thai.eq.Đang thực hiện,trang_thai.eq.Đang làm,trang_thai.is.null',
        );
      } else if (status === 'Hoàn thành') {
        query = query.eq('trang_thai', 'Hoàn thành');
      }

      query = applyHopDongKhachDuAnFilters(query, {
        khachFilter,
        customerIds,
        duAnIds,
        projectName,
      });

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
      hop_dong_row_id: row.id ?? row.contract_id,
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
      hop_dong_row_id: row.id ?? row.contract_id,
    };
  },

  async delete(id: string) {
    const sid = String(id ?? '').trim();
    if (!sid) {
      throw new Error('Thiếu mã hợp đồng để xóa');
    }

    const supabase = getSupabase();

    const tryDelete = async (column: 'id' | 'contract_id') => {
      const { data, error } = await supabase
        .from('hop_dong')
        .delete()
        .eq(column, sid)
        .select(column);
      if (error) return { ok: false as const, error };
      if (data && data.length > 0) return { ok: true as const };
      return { ok: false as const, error: null };
    };

    const byId = await tryDelete('id');
    if (byId.ok) return true;
    if (byId.error && !/column.*does not exist/i.test(String(byId.error.message ?? ''))) {
      throw byId.error;
    }

    const byContractId = await tryDelete('contract_id');
    if (byContractId.ok) return true;
    if (byContractId.error) throw byContractId.error;

    throw new Error('Không tìm thấy hợp đồng để xóa');
  },

  /** Xóa mọi bản ghi `hop_dong` (theo PK `id`, từng lô). Công việc gắn HĐ: CASCADE; thu_chi: SET NULL theo FK. */
  async deleteAll(): Promise<{ deleted: number }> {
    const supabase = getSupabase();
    const allIds: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('hop_dong')
        .select('id')
        .range(offset, offset + HOP_DONG_FETCH_CHUNK - 1);
      if (error) throw error;
      const batch = data || [];
      for (const row of batch) {
        if (row?.id != null) allIds.push(String(row.id));
      }
      if (batch.length < HOP_DONG_FETCH_CHUNK) break;
      offset += HOP_DONG_FETCH_CHUNK;
    }
    if (allIds.length === 0) return { deleted: 0 };
    const chunkSize = 500;
    let deleted = 0;
    for (let i = 0; i < allIds.length; i += chunkSize) {
      const chunk = allIds.slice(i, i + chunkSize);
      const { error } = await supabase.from('hop_dong').delete().in('id', chunk);
      if (error) throw error;
      deleted += chunk.length;
    }
    return { deleted };
  },

  /**
   * Cập nhật hàng loạt cột tài chính HĐ (một HTTP request — tránh hàng trăm PUT từ trình duyệt).
   */
  async syncFinancials(
    updates: Array<{
      id: string;
      gia_tri_qt?: number;
      cdt_thanh_toan?: number;
      cdt_tam_ung?: number;
      da_thu?: number;
      con_phai_thu?: number;
    }>,
  ) {
    const supabase = getSupabase();
    let updated = 0;
    const errors: string[] = [];

    for (const row of updates) {
      const sid = String(row.id ?? '').trim();
      if (!sid) continue;

      const fullPayload: Record<string, number> = {};
      if (row.gia_tri_qt !== undefined) fullPayload.gia_tri_qt = Number(row.gia_tri_qt) || 0;
      if (row.cdt_thanh_toan !== undefined) fullPayload.cdt_thanh_toan = Number(row.cdt_thanh_toan) || 0;
      if (row.cdt_tam_ung !== undefined) fullPayload.cdt_tam_ung = Number(row.cdt_tam_ung) || 0;
      if (row.da_thu !== undefined) fullPayload.da_thu = Number(row.da_thu) || 0;
      if (row.con_phai_thu !== undefined) fullPayload.con_phai_thu = Number(row.con_phai_thu) || 0;

      const legacyPayload = {
        gia_tri_qt: fullPayload.gia_tri_qt,
        da_thu: fullPayload.da_thu,
        con_phai_thu: fullPayload.con_phai_thu,
      };

      const tryUpdate = async (payload: Record<string, number>) => {
        let res = await supabase.from('hop_dong').update(payload).eq('id', sid).select('id');
        if (res.error) return res;
        if (!res.data?.length) {
          res = await supabase.from('hop_dong').update(payload).eq('contract_id', sid).select('id');
        }
        return res;
      };

      try {
        let res = await tryUpdate(fullPayload);
        if (res.error && isMissingCdtColumnError(String(res.error.message ?? ''))) {
          res = await tryUpdate(legacyPayload as Record<string, number>);
        }
        if (res.error) throw res.error;
        if (!res.data?.length) {
          errors.push(`${sid}: Không tìm thấy HĐ để cập nhật.`);
          continue;
        }
        updated += 1;
      } catch (err: any) {
        errors.push(`${sid}: ${err?.message || String(err)}`);
      }
    }

    return { updated, errors };
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

    const contractKey = (
      soHopDong: string,
      duAnId: string | null | undefined,
      tenGoiThau?: string | null,
    ) =>
      `${String(soHopDong || '').trim().toLowerCase()}|${String(duAnId || '').trim()}|${normalizeKey(tenGoiThau || '')}`;

    /** Đã xử lý ít nhất một dòng Excel cùng khóa trong lô này → dòng trùng tiếp theo tạo HĐ mới. */
    const touchedKeysInBatch = new Set<string>();

    const soHopDongSet = new Set(
      rows
        .map((r) => String(r.so_hop_dong || '').trim())
        .filter(Boolean),
    );
    const soHopDongList = Array.from(soHopDongSet);
    const existingByKey = new Map<string, any>();
    const existingBySo = new Map<string, any[]>();
    const fetchChunk = 500;
    for (let i = 0; i < soHopDongList.length; i += fetchChunk) {
      const chunk = soHopDongList.slice(i, i + fetchChunk);
      const { data, error } = await supabase
        .from('hop_dong')
        .select('*')
        .in('so_hop_dong', chunk);
      if (error) {
        results.errors.push(`Không thể tải HĐ hiện có: ${error.message}`);
        continue;
      }
      for (const ex of data || []) {
        const so = String(ex.so_hop_dong || '').trim();
        const du = ex.du_an_id != null ? String(ex.du_an_id).trim() : '';
        const k = contractKey(so, du, ex.ten_goi_thau);
        if (!existingByKey.has(k)) existingByKey.set(k, ex);
        const normSo = so.toLowerCase();
        const list = existingBySo.get(normSo) || [];
        list.push(ex);
        existingBySo.set(normSo, list);
      }
    }

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
          loai_dich_vu: row.loai_dich_vu || row.loai_dv || null,
          ngay_ky_hd: row.ngay_ky_hd || null,
          gia_tri_hd: row.gia_tri_hd !== undefined && row.gia_tri_hd !== null ? Number(row.gia_tri_hd) : null,
          gia_tri_qt: row.gia_tri_qt !== undefined && row.gia_tri_qt !== null ? Number(row.gia_tri_qt) : null,
          da_thu: row.da_thu !== undefined && row.da_thu !== null ? Number(row.da_thu) : null,
          con_phai_thu:
            row.con_phai_thu !== undefined && row.con_phai_thu !== null
              ? Number(row.con_phai_thu)
              : null,
          cdt_thanh_toan:
            row.cdt_thanh_toan !== undefined && row.cdt_thanh_toan !== null
              ? Number(row.cdt_thanh_toan)
              : null,
          cdt_tam_ung:
            row.cdt_tam_ung !== undefined && row.cdt_tam_ung !== null
              ? Number(row.cdt_tam_ung)
              : null,
          customer_name:
            row.customer_name || row.ten_khach_hang || row.ten_day_du_chu_dau_tu || null,
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

        const rowKey = contractKey(soHopDong, duAnId ?? '', payload.ten_goi_thau);
        const duplicateRowInFile = touchedKeysInBatch.has(rowKey);
        const existing = duplicateRowInFile
          ? null
          : existingByKey.get(rowKey) ?? null;

        if (existing) {
          let changed = false;
          const updatePayload: any = {};

          for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) {
              const existingValue = existing[key];
              const newValue = payload[key];

              if (String(newValue) !== String(existingValue)) {
                updatePayload[key] = newValue;
                changed = true;
              }
            }
          }

          const pkCol = existing.id ? 'id' : 'contract_id';
          if (changed) {
            let { error: updateError } = await supabase
              .from('hop_dong')
              .update(updatePayload)
              .eq(pkCol, existing[pkCol]);

            if (updateError && isMissingCdtColumnError(String(updateError.message ?? ''))) {
              const retry = await supabase
                .from('hop_dong')
                .update(withoutCdtColumns(updatePayload))
                .eq(pkCol, existing[pkCol]);
              updateError = retry.error;
            }

            if (updateError) throw updateError;
            const merged = { ...existing, ...updatePayload };
            existingByKey.set(rowKey, merged);
          }
          results.updated++;
          touchedKeysInBatch.add(rowKey);
        } else {
          let { data: inserted, error: insertError } = await supabase
            .from('hop_dong')
            .insert([payload])
            .select('*')
            .maybeSingle();

          if (insertError && isMissingCdtColumnError(String(insertError.message ?? ''))) {
            const retry = await supabase
              .from('hop_dong')
              .insert([withoutCdtColumns(payload)])
              .select('*')
              .maybeSingle();
            inserted = retry.data;
            insertError = retry.error;
          }

          if (insertError) throw insertError;
          results.created++;
          const added = inserted || payload;
          const so = String(added.so_hop_dong || soHopDong).trim();
          const du = added.du_an_id != null ? String(added.du_an_id).trim() : '';
          const kNew = contractKey(so, du, added.ten_goi_thau ?? payload.ten_goi_thau);
          existingByKey.set(kNew, added);
          touchedKeysInBatch.add(rowKey);
          const normSo = so.toLowerCase();
          const list = existingBySo.get(normSo) || [];
          list.push(added);
          existingBySo.set(normSo, list);
        }
      } catch (err: any) {
        results.errors.push(`${rowSuffix}: ${err.message}`);
      }
    }

    return results;
  }
};
