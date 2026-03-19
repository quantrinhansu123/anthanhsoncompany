import { supabase } from '../config/supabase';

export interface Employee {
  id: string | number;
  code: string;
  full_name?: string;
  name?: string;
  department?: string;
  position?: string;
  status: 'active' | 'inactive' | 'on-leave';
  [key: string]: any;
}

export const employeeService = {
  async getAll() {
    const { data, error, count } = await supabase
      .from('nhan_su')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { data, count };
  },

  async getById(id: string | number) {
    const { data, error } = await supabase
      .from('nhan_su')
      .select('*')
      .eq('id', id.toString())
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async search(searchTerm: string) {
    const { data, error } = await supabase
      .from('nhan_su')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('nhan_su')
      .insert([employee])
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async update(id: string | number, employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('nhan_su')
      .update(employee)
      .eq('id', id.toString())
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async delete(id: string | number) {
    const { error } = await supabase
      .from('nhan_su')
      .delete()
      .eq('id', id.toString());
    
    if (error) throw error;
    return true;
  }
};
