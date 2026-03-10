import { supabase } from '../supabase';

export interface SettingRow {
  id: string;
  user_id: string | null;
  theme: string | null;
  color: string | null;
  font_family: string | null;
  font_size: string | null;
  language: string | null;
  logo_url: string | null;
  timezone: string | null;
  email_notifications: boolean | null;
  push_notifications: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export const settingService = {
  // Lấy setting của user (hoặc default nếu không có user_id)
  async get(userId: string = 'default'): Promise<SettingRow | null> {
    try {
      const { data, error } = await supabase
        .from('setting')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching setting:', error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Exception in settingService.get:', err);
      throw err;
    }
  },

  // Tạo hoặc cập nhật setting
  async upsert(userId: string = 'default', payload: Partial<Omit<SettingRow, 'id' | 'created_at' | 'updated_at'>>): Promise<SettingRow | null> {
    try {
      // Kiểm tra xem đã có setting chưa
      const existing = await this.get(userId);

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('setting')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating setting:', error);
          throw error;
        }

        return data;
      } else {
        // Create
        const { data, error } = await supabase
          .from('setting')
          .insert([{
            user_id: userId,
            ...payload
          }])
          .select()
          .single();

        if (error) {
          console.error('Error creating setting:', error);
          throw error;
        }

        return data;
      }
    } catch (err) {
      console.error('Exception in settingService.upsert:', err);
      throw err;
    }
  },

  // Cập nhật một trường cụ thể
  async updateField(userId: string = 'default', field: keyof Omit<SettingRow, 'id' | 'created_at' | 'updated_at'>, value: any): Promise<SettingRow | null> {
    return this.upsert(userId, { [field]: value });
  },

  // Xóa setting
  async delete(userId: string = 'default'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('setting')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting setting:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in settingService.delete:', err);
      throw err;
    }
  }
};
