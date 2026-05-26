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

/** Số dòng mỗi lần gọi Supabase (PostgREST ~1000/request) — không phải giới hạn tổng. */
const THU_CHI_FETCH_CHUNK = 1000;

/** Gọi `.range` lặp đến khi hết bảng (hoặc hết bản ghi theo `du_an_id`). */
async function fetchAllThuChiJoinedRows(filterDuAnId?: string | null): Promise<unknown[]> {
  const allRaw: unknown[] = [];
  let offset = 0;

  for (;;) {
    let query = getSupabase()
      .from('thu_chi')
      .select(THU_CHI_LIST_SELECT)
      .order('ngay', { ascending: false })
      .range(offset, offset + THU_CHI_FETCH_CHUNK - 1);

    if (filterDuAnId) {
      query = query.eq('du_an_id', String(filterDuAnId));
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = data ?? [];
    if (batch.length === 0) break;

    allRaw.push(...batch);
    offset += batch.length;

    if (batch.length < THU_CHI_FETCH_CHUNK) break;
  }

  return allRaw;
}

export const thuChiService = {
  /** Danh sách thu chi đầy đủ (service role) — nhiều request nếu > THU_CHI_FETCH_CHUNK dòng. */
  async list(filterDuAnId?: string | null) {
    return fetchAllThuChiJoinedRows(filterDuAnId);
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

  /**
   * Đổi mọi «Chủ đầu tư thanh toán» → `Thanh toán` (hiển thị CĐT thanh toán) trên tinh_trang_phieu / hang_muc_thu;
   * trong noi_dung thay bằng chuỗi «CĐT thanh toán».
   */
  async migrateChuDauTuThanhToan(): Promise<{
    updated: number;
    tinh_trang_phieu: number;
    hang_muc_thu: number;
    noi_dung: number;
  }> {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from('thu_chi')
      .select('id, tinh_trang_phieu, hang_muc_thu, noi_dung');
    if (error) throw error;

    const isLegacy = (v: unknown) => {
      const n = String(v ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
      if (!n) return false;
      return n === 'chu dau tu thanh toan' || n.includes('chu dau tu thanh toan');
    };

    const LEGACY_TEXT = 'Chủ đầu tư thanh toán';
    const NEW_PHIEU = 'Thanh toán';
    const NEW_NOI_DUNG = 'CĐT thanh toán';

    let updated = 0;
    let tinhTrangCount = 0;
    let hangMucCount = 0;
    let noiDungCount = 0;

    for (const row of rows || []) {
      const id = String((row as { id: string }).id);
      const patch: Record<string, string> = {};
      const tt = (row as { tinh_trang_phieu?: string | null }).tinh_trang_phieu;
      const hm = (row as { hang_muc_thu?: string | null }).hang_muc_thu;
      let nd = String((row as { noi_dung?: string | null }).noi_dung ?? '');

      if (isLegacy(tt)) {
        patch.tinh_trang_phieu = NEW_PHIEU;
        tinhTrangCount += 1;
      }
      if (isLegacy(hm)) {
        patch.hang_muc_thu = NEW_PHIEU;
        hangMucCount += 1;
      }
      if (nd.includes(LEGACY_TEXT)) {
        nd = nd.split(LEGACY_TEXT).join(NEW_NOI_DUNG);
        patch.noi_dung = nd;
        noiDungCount += 1;
      }

      if (Object.keys(patch).length === 0) continue;

      const { error: upErr } = await supabase.from('thu_chi').update(patch).eq('id', id);
      if (upErr) throw upErr;
      updated += 1;
    }

    return {
      updated,
      tinh_trang_phieu: tinhTrangCount,
      hang_muc_thu: hangMucCount,
      noi_dung: noiDungCount,
    };
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
