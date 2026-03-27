import { getSupabase } from '../config/supabase';

export const taskService = {
  async getAll(options: { page?: number; pageSize?: number; search?: string } = {}) {
    const { page, pageSize, search } = options;
    const supabase = getSupabase();
    
    let query = supabase.from('task').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('ten_task', `%${search}%`);
    }

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return {
      data: data || [],
      total: count || 0
    };
  },

  async getByHopDongId(hopDongId: string) {
    const { data, error } = await getSupabase()
      .from('task')
      .select('*')
      .eq('hop_dong_id', hopDongId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(payload: any) {
    const { data, error } = await getSupabase()
      .from('task')
      .insert([payload])
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string, payload: any) {
    const supabase = getSupabase();
    const updatedAt = new Date().toISOString();
    const sanitizeDate = (v: unknown) => {
      if (v === '' || v === undefined) return null;
      return v;
    };

    // Tránh lỗi Postgres: invalid input syntax for type date: ""
    const taskBody = {
      ...payload,
      ngay_bat_dau: sanitizeDate(payload.ngay_bat_dau),
      ngay_ket_thuc: sanitizeDate(payload.ngay_ket_thuc),
      ngay_hoan_thanh: sanitizeDate(payload.ngay_hoan_thanh),
      updated_at: updatedAt,
    };

    const { data: taskRows, error: taskErr } = await supabase
      .from('task')
      .update(taskBody)
      .eq('id', id)
      .select('*');

    if (taskErr) throw taskErr;
    if (taskRows?.[0]) return taskRows[0];

    /**
     * Quản lý công việc: `TaskRow.id` có thể là `cong_viec_chi_tiet.id` khi chưa có `task_id`.
     * Client cũ gọi PUT /tasks/:id — cần cập nhật đúng bảng để không trả 404.
     */
    const detailPatch: Record<string, unknown> = {};
    const pick = (from: string, to?: string) => {
      if (payload[from] !== undefined) {
        const v = payload[from];
        detailPatch[to || from] = v === '' ? null : v;
      }
    };
    pick('trang_thai');
    pick('tien_do');
    pick('ghi_chu');
    pick('mo_ta');
    pick('hop_dong_id');
    pick('ngay_bat_dau');
    pick('ngay_ket_thuc');
    pick('ngay_hoan_thanh');
    if (payload.nguoi_phu_trach !== undefined) {
      detailPatch.nguoi_thuc_hien = payload.nguoi_phu_trach;
    }
    if (payload.ten_task !== undefined) {
      detailPatch.ten_cong_viec = payload.ten_task;
    }

    if (Object.keys(detailPatch).length === 0) return null;

    const { data: detail, error: dErr } = await supabase
      .from('cong_viec_chi_tiet')
      .update(detailPatch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (dErr) throw dErr;
    if (!detail) return null;

    const taskFk = detail.task_id ? String(detail.task_id).trim() : '';
    if (taskFk) {
      const { error: syncErr } = await supabase
        .from('task')
        .update(taskBody)
        .eq('id', taskFk);
      if (syncErr) {
        console.error('[taskService.update] sync parent task:', syncErr);
      }
      const { data: parent } = await supabase
        .from('task')
        .select('*')
        .eq('id', taskFk)
        .maybeSingle();
      if (parent) return parent;
    }

    return {
      id: taskFk || id,
      hop_dong_id: String((detail as any).hop_dong_id || ''),
      ten_task: String((detail as any).ten_cong_viec || ''),
      mo_ta: (detail as any).mo_ta ?? null,
      trang_thai: String((detail as any).trang_thai ?? ''),
      uu_tien: 'Trung bình',
      ngay_bat_dau: (detail as any).ngay_bat_dau ?? null,
      ngay_ket_thuc: (detail as any).ngay_ket_thuc ?? null,
      ngay_hoan_thanh: (detail as any).ngay_hoan_thanh ?? null,
      nguoi_phu_trach: (detail as any).nguoi_thuc_hien ?? null,
      tien_do: Number((detail as any).tien_do) || 0,
      ghi_chu: (detail as any).ghi_chu ?? null,
      updated_at: updatedAt,
    };
  },

  async delete(id: string) {
    const { error } = await getSupabase()
      .from('task')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
