import { getSupabase } from '../config/supabase';

const DU_AN_FETCH_CHUNK = 1000;
const KHACH_HANG_LOOKUP_CHUNK = 200;

const DU_AN_SELECT = `
  *,
  manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
  executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
`;

/** PostgREST embed cần FK — bảng `du_an` có thể chưa có FK `customer_id` → tra `khach_hang` riêng. */
async function fetchKhachHangTenDonViByIds(
  supabase: ReturnType<typeof getSupabase>,
  customerIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(customerIds.map((id) => String(id).trim()).filter(Boolean))];
  for (let i = 0; i < unique.length; i += KHACH_HANG_LOOKUP_CHUNK) {
    const chunk = unique.slice(i, i + KHACH_HANG_LOOKUP_CHUNK);
    const { data, error } = await supabase
      .from('khach_hang')
      .select('id, ten_don_vi')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) {
      const id = row.id != null ? String(row.id) : '';
      const name = row.ten_don_vi != null ? String(row.ten_don_vi).trim() : '';
      if (id && name) map.set(id, name);
    }
  }
  return map;
}

function mapDuAnRows(data: any[] | null | undefined, customerNameById?: Map<string, string>) {
  return (data || []).map((row: any) => {
    const manager = row.manager;
    const executor = row.executor;

    const managerImg = row.manager_img || (manager?.anh_nhan_su || null);
    const executorImg = row.executor_img || (executor?.anh_nhan_su || null);

    const managerIds = Array.isArray(row.manager_ids) ? row.manager_ids : (row.manager_ids ? [row.manager_ids] : []);
    const executorIds = Array.isArray(row.executor_ids) ? row.executor_ids : (row.executor_ids ? [row.executor_ids] : []);

    const cid = row.customer_id != null ? String(row.customer_id) : '';
    const tenDonViKh = (cid && customerNameById?.get(cid)) || '';
    const tenKhFallback = row.ten_khach_hang ? String(row.ten_khach_hang).trim() : '';

    return {
      ...row,
      manager_ids: managerIds,
      executor_ids: executorIds,
      manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
      executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
      /** Tên hiển thị cột Khách hàng — ưu tiên `khach_hang.ten_don_vi`, không dùng mã số `ten_khach_hang`. */
      customer_name: tenDonViKh || tenKhFallback || null,
      manager_img: managerImg,
      executor_img: executorImg,
    };
  });
}

async function mapDuAnRowsWithCustomers(
  supabase: ReturnType<typeof getSupabase>,
  data: any[] | null | undefined,
) {
  const raw = data || [];
  const customerIds = raw
    .map((row) => (row.customer_id != null ? String(row.customer_id) : ''))
    .filter(Boolean);
  const customerNameById = await fetchKhachHangTenDonViByIds(supabase, customerIds);
  return mapDuAnRows(raw, customerNameById);
}

export const projectService = {
  async getAll(options: { page?: number; pageSize?: number; search?: string } = {}) {
    const { page, pageSize, search } = options;
    const supabase = getSupabase();

    const buildOrderedQuery = () => {
      let query = supabase.from('du_an').select(DU_AN_SELECT, { count: 'exact' });

      if (search) {
        query = query.ilike('ten_du_an', `%${search}%`);
      }

      return query.order('created_at', { ascending: false });
    };

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await buildOrderedQuery().range(from, to);
      if (error) throw error;
      const rows = await mapDuAnRowsWithCustomers(supabase, data);
      return {
        data: rows,
        total: count || 0
      };
    }

    const allRaw: any[] = [];
    let offset = 0;
    let totalCount: number | null = null;

    while (true) {
      const { data, error, count } = await buildOrderedQuery().range(offset, offset + DU_AN_FETCH_CHUNK - 1);
      if (error) throw error;
      if (totalCount === null && count !== null && count !== undefined) {
        totalCount = count;
      }
      const batch = data || [];
      allRaw.push(...batch);
      if (batch.length < DU_AN_FETCH_CHUNK) break;
      offset += DU_AN_FETCH_CHUNK;
    }

    const rows = await mapDuAnRowsWithCustomers(supabase, allRaw);
    return {
      data: rows,
      total: totalCount ?? rows.length
    };
  },

  async getById(id: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('du_an')
      .select(DU_AN_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    const [row] = await mapDuAnRowsWithCustomers(supabase, [data]);
    return row ?? data;
  },

  async create(payload: any) {
    const ten_du_an = String(payload?.ten_du_an ?? payload?.projectName ?? '').trim();
    if (!ten_du_an) {
      throw new Error('Tên dự án (ten_du_an) là bắt buộc.');
    }
    const row = {
      ten_du_an,
      status: payload?.status ?? 'Đang thực hiện',
      progress: payload?.progress ?? 0,
      manager_ids: payload?.manager_ids ?? payload?.managerIds ?? [],
      executor_ids: payload?.executor_ids ?? payload?.executorIds ?? [],
      manager_id: payload?.manager_id ?? payload?.managerId ?? null,
      executor_id: payload?.executor_id ?? payload?.executorId ?? null,
      customer_id: payload?.customer_id ?? payload?.customerId ?? null,
      ten_khach_hang: payload?.ten_khach_hang ?? payload?.tenKhachHang ?? null,
      manager_img: payload?.manager_img ?? payload?.managerImg ?? null,
      executor_img: payload?.executor_img ?? payload?.executorImg ?? null
    };

    const { data, error } = await getSupabase().from('du_an').insert([row]).select();

    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string, payload: any) {
    const { data, error } = await getSupabase()
      .from('du_an')
      .update(payload)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async delete(id: string) {
    const { error } = await getSupabase()
      .from('du_an')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async getByNames(names: string[]) {
    if (!names || names.length === 0) return [];

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('du_an')
      .select(DU_AN_SELECT)
      .in('ten_du_an', names);

    if (error) throw error;
    return await mapDuAnRowsWithCustomers(supabase, data || []);
  },
};
