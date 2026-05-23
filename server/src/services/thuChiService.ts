import { getSupabase } from '../config/supabase';

const THU_CHI_INSERT_COLUMNS = [
  'du_an_id',
  'hop_dong_id',
  'nhan_su_id',
  'loai_phieu',
  'so_tien',
  'ngay',
  'noi_dung',
  'tinh_trang_phieu',
  'trang_thai_hd',
  'nguoi_nhan',
  'file_url',
  'anh_url',
  'ghi_chu',
  'hang_muc_chi',
  'ten_goi_thau',
  'hang_muc_thu',
] as const;

export type ThuChiInsertRow = Partial<Record<(typeof THU_CHI_INSERT_COLUMNS)[number], unknown>>;

function pickThuChiInsertRow(raw: Record<string, unknown>): ThuChiInsertRow {
  const row: ThuChiInsertRow = {};
  for (const key of THU_CHI_INSERT_COLUMNS) {
    if (raw[key] !== undefined) {
      row[key] = raw[key];
    }
  }
  return row;
}

function assertThuChiInsertRow(row: ThuChiInsertRow): void {
  if (!row.loai_phieu || !String(row.loai_phieu).trim()) {
    throw new Error('Thiếu loại phiếu (loai_phieu).');
  }
  const soTien = Number(row.so_tien);
  if (!Number.isFinite(soTien) || soTien <= 0) {
    throw new Error('Số tiền không hợp lệ.');
  }
  if (!row.ngay || !String(row.ngay).trim()) {
    throw new Error('Thiếu ngày chứng từ (ngay).');
  }
}

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

export const thuChiService = {
  /** Danh sách thu chi (service role) — client không bị RLS chặn SELECT. */
  async list(filterDuAnId?: string | null) {
    let query = getSupabase()
      .from('thu_chi')
      .select(THU_CHI_LIST_SELECT)
      .order('ngay', { ascending: false });

    if (filterDuAnId) {
      query = query.eq('du_an_id', String(filterDuAnId));
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(payload: Record<string, unknown>) {
    const row = pickThuChiInsertRow(payload);
    assertThuChiInsertRow(row);

    const { data, error } = await getSupabase()
      .from('thu_chi')
      .insert([row])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async createMany(payloads: Record<string, unknown>[]) {
    if (!payloads.length) return { data: [], inserted: 0 };

    const rows = payloads.map((p) => {
      const row = pickThuChiInsertRow(p);
      assertThuChiInsertRow(row);
      return row;
    });

    const all: unknown[] = [];
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { data, error } = await getSupabase().from('thu_chi').insert(chunk).select('*');
      if (error) throw error;
      if (data?.length) all.push(...data);
    }

    return { data: all, inserted: all.length };
  },

  async update(id: string, payload: Record<string, unknown>) {
    const sid = String(id ?? '').trim();
    if (!sid) throw new Error('Thiếu id chứng từ.');

    const row = pickThuChiInsertRow(payload);
    if (Object.keys(row).length === 0) {
      throw new Error('Không có trường nào để cập nhật.');
    }

    const { data, error } = await getSupabase()
      .from('thu_chi')
      .update(row)
      .eq('id', sid)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Không tìm thấy chứng từ để cập nhật.');
    return data;
  },

  async delete(id: string) {
    const sid = String(id ?? '').trim();
    if (!sid) {
      throw new Error('Thiếu mã chứng từ để xóa');
    }

    const { data, error } = await getSupabase()
      .from('thu_chi')
      .delete()
      .eq('id', sid)
      .select('id');

    if (error) throw error;
    if (!data?.length) {
      throw new Error('Không tìm thấy chứng từ để xóa');
    }
    return true;
  },

  async deleteMany(ids: string[]) {
    const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
    if (unique.length === 0) {
      return { deleted: 0, requested: 0 };
    }

    let deleted = 0;
    const chunkSize = 200;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { data, error } = await getSupabase()
        .from('thu_chi')
        .delete()
        .in('id', chunk)
        .select('id');

      if (error) throw error;
      deleted += data?.length ?? 0;
    }

    return { deleted, requested: unique.length };
  },

  async deleteAll(): Promise<{ deleted: number }> {
    const supabase = getSupabase();
    const { data: rows, error: selErr } = await supabase.from('thu_chi').select('id');
    if (selErr) throw selErr;

    const ids = (rows || []).map((r: { id: string }) => String(r.id));
    if (ids.length === 0) {
      return { deleted: 0 };
    }

    let deleted = 0;
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('thu_chi').delete().in('id', chunk).select('id');
      if (error) throw error;
      deleted += data?.length ?? 0;
    }
    return { deleted };
  },
};
