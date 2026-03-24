import { getSupabase } from '../config/supabase';

export const projectService = {
  async getAll(options: { page?: number; pageSize?: number; search?: string } = {}) {
    const { page, pageSize, search } = options;
    const supabase = getSupabase();
    
    let query = supabase
      .from('du_an')
      .select(`
        *,
        manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
        executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('ten_du_an', `%${search}%`);
    }

    if (page !== undefined && pageSize !== undefined) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const rows = (data || []).map((row: any) => {
      const manager = row.manager;
      const executor = row.executor;
      
      const managerImg = row.manager_img || (manager?.anh_nhan_su || null);
      const executorImg = row.executor_img || (executor?.anh_nhan_su || null);
      
      const managerIds = Array.isArray(row.manager_ids) ? row.manager_ids : (row.manager_ids ? [row.manager_ids] : []);
      const executorIds = Array.isArray(row.executor_ids) ? row.executor_ids : (row.executor_ids ? [row.executor_ids] : []);
      
      return {
        ...row,
        manager_ids: managerIds,
        executor_ids: executorIds,
        manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
        executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
        customer_name: row.ten_khach_hang || null,
        manager_img: managerImg,
        executor_img: executorImg
      };
    });

    return {
      data: rows,
      total: count || 0
    };
  },

  async getById(id: string) {
    const { data, error } = await getSupabase()
      .from('du_an')
      .select(`
        *,
        manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
        executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async create(payload: any) {
    const { data, error } = await getSupabase()
      .from('du_an')
      .insert([payload])
      .select();
    
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
    
    // Tìm kiếm dự án theo danh sách tên (dùng mảng names)
    const { data, error } = await getSupabase()
      .from('du_an')
      .select(`
        id, ten_du_an,
        manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
        executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
      `)
      .in('ten_du_an', names);
    
    if (error) throw error;
    return data || [];
  }
};
