import { api, API_BASE_URL } from '../api';
import { supabase } from '../supabase';

export interface Customer {
  id: string;
  ten_don_vi: string;
  loai_hinh?: string;
  mst?: string;
  dia_chi?: string;
  nguoi_dai_dien?: string;
  chuc_vu_dai_dien?: string;
  nguoi_lien_he?: string;
  chuc_vu_lien_he?: string;
  sdt_lien_he?: string;
  tong_hop_dong?: number;
  gia_tri_quyet_toan?: number;
  da_thu?: number;
  con_phai_thu?: number;
  created_at?: string;
  updated_at?: string;
}

function normalizeCustomersList(payload: unknown): Customer[] {
  if (Array.isArray(payload)) return payload as Customer[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: Customer[] }).data;
  }
  return [];
}

function isCustomersApiUnreachable(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('không kết nối được server') ||
    msg.includes('network')
  );
}

async function fetchAllCustomersFromSupabase(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('khach_hang')
    .select('*')
    .order('ten_don_vi', { ascending: true });
  if (error) throw error;
  return data || [];
}

export const customerService = {
  _cleanPayload(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;
  },

  async getAll() {
    try {
      const payload = await api.get('/customers');
      return normalizeCustomersList(payload);
    } catch (err) {
      if (!isCustomersApiUnreachable(err)) throw err;
      console.warn('[customerService] API /customers không khả dụng — đọc Supabase', err);
      return fetchAllCustomersFromSupabase();
    }
  },

  async getById(id: string) {
    try {
      return (await api.get(`/customers/${encodeURIComponent(id)}`)) as Customer;
    } catch (err) {
      if (!isCustomersApiUnreachable(err)) throw err;
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  },

  async search(searchTerm: string) {
    try {
      const payload = await api.get(
        `/customers?search=${encodeURIComponent(searchTerm)}`,
      );
      return normalizeCustomersList(payload);
    } catch (err) {
      if (!isCustomersApiUnreachable(err)) throw err;
      const { data, error } = await supabase
        .from('khach_hang')
        .select('*')
        .ilike('ten_don_vi', `%${searchTerm}%`)
        .order('ten_don_vi', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  },

  async create(customer: Partial<Customer>) {
    const payload = this._cleanPayload(customer as Record<string, unknown>);
    return api.post('/customers', payload) as Promise<Customer>;
  },

  async update(id: string, customer: Partial<Customer>) {
    const payload = this._cleanPayload(customer as Record<string, unknown>);
    return api.put(`/customers/${encodeURIComponent(id)}`, payload) as Promise<Customer>;
  },

  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; requested: number; error?: string }> {
    try {
      return (await api.post('/customers/delete-many', { ids })) as {
        deleted: number;
        requested: number;
      };
    } catch (err: unknown) {
      return {
        deleted: 0,
        requested: ids.length,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async delete(id: string) {
    await api.delete(`/customers/${encodeURIComponent(id)}`);
    return true;
  },

  async deleteAll(): Promise<{ ok: boolean; deleted: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/all`, { method: 'DELETE' });
      const body = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
      if (!res.ok) {
        return { ok: false, deleted: 0, error: body.error || res.statusText };
      }
      return { ok: true, deleted: Number(body.deleted) || 0 };
    } catch (err: unknown) {
      return {
        ok: false,
        deleted: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async getByNames(names: string[]) {
    if (!names?.length) return [];
    return api.post('/customers/by-names', { names }) as Promise<Customer[]>;
  },
};
