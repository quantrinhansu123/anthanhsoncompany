import { getSupabase } from '../config/supabase';

export const thuChiService = {
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
