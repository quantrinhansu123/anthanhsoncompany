import { getSupabase } from '../config/supabase';

function cleanPayload(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
}

export const customerService = {
  async getAll(options: { search?: string } = {}) {
    const supabase = getSupabase();
    let query = supabase.from('khach_hang').select('*').order('ten_don_vi', { ascending: true });

    const search = String(options.search ?? '').trim();
    if (search) {
      query = query.ilike('ten_don_vi', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { data: data || [] };
  },

  async getById(id: string) {
    const { data, error } = await getSupabase()
      .from('khach_hang')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async search(searchTerm: string) {
    const term = String(searchTerm ?? '').trim();
    if (!term) return { data: [] as unknown[] };
    const { data, error } = await getSupabase()
      .from('khach_hang')
      .select('*')
      .ilike('ten_don_vi', `%${term}%`)
      .order('ten_don_vi', { ascending: true });
    if (error) throw error;
    return { data: data || [] };
  },

  async getByNames(names: string[]) {
    const list = [...new Set((names || []).map((n) => String(n).trim()).filter(Boolean))];
    if (list.length === 0) return [];
    const { data, error } = await getSupabase()
      .from('khach_hang')
      .select('*')
      .in('ten_don_vi', list);
    if (error) throw error;
    return data || [];
  },

  async create(payload: Record<string, unknown>) {
    const row = cleanPayload(payload);
    const { data, error } = await getSupabase()
      .from('khach_hang')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const row = cleanPayload(payload);
    const { data, error } = await getSupabase()
      .from('khach_hang')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await getSupabase().from('khach_hang').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteMany(ids: string[]) {
    const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
    if (unique.length === 0) return { deleted: 0, requested: 0 };

    const chunkSize = 500;
    let deleted = 0;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const { error } = await getSupabase().from('khach_hang').delete().in('id', chunk);
      if (error) throw error;
      deleted += chunk.length;
    }
    return { deleted, requested: unique.length };
  },

  async deleteAll() {
    const supabase = getSupabase();
    const { data: rows, error: selErr } = await supabase.from('khach_hang').select('id');
    if (selErr) throw selErr;
    const ids = (rows || []).map((r: { id: string }) => String(r.id));
    if (ids.length === 0) return { deleted: 0 };
    const { deleted, requested } = await this.deleteMany(ids);
    return { deleted: deleted || requested };
  },
};
