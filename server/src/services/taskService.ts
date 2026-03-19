import { supabase } from '../config/supabase';

export const taskService = {
  async getAll() {
    const { data, error } = await supabase
      .from('task')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByHopDongId(hopDongId: string) {
    const { data, error } = await supabase
      .from('task')
      .select('*')
      .eq('hop_dong_id', hopDongId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(payload: any) {
    const { data, error } = await supabase
      .from('task')
      .insert([payload])
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string, payload: any) {
    const { data, error } = await supabase
      .from('task')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('task')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
