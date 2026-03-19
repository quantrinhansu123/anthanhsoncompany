import { supabase } from '../config/supabase';

export const projectService = {
  async getAll() {
    const { data, error } = await supabase
      .from('du_an')
      .select(`
        *,
        manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
        executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((row: any) => {
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
  },

  async getById(id: string) {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('du_an')
      .insert([payload])
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string, payload: any) {
    const { data, error } = await supabase
      .from('du_an')
      .update(payload)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('du_an')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
