import { supabase } from '../supabase';

export interface Project {
  id: string;
  customer_id?: string | null;
  ten_du_an: string;
  status: string;
  progress: number;
  manager_img?: string | null;
  executor_img?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const projectService = {
  // Lấy tất cả dự án
  async getAll(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('du_an')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects from du_an:', error);
        throw error;
      }

      return (data || []) as Project[];
    } catch (err) {
      console.error('Exception in projectService.getAll:', err);
      return [];
    }
  },

  // Tạo dự án mới
  async create(payload: {
    projectName: string;
    status: string;
    progress: number;
    managerImg?: string;
    executorImg?: string;
    customerId?: string;
  }): Promise<Project | null> {
    try {
      const insertData = {
        ten_du_an: payload.projectName,
        status: payload.status,
        progress: payload.progress ?? 0,
        manager_img: payload.managerImg,
        executor_img: payload.executorImg,
        customer_id: payload.customerId ?? null,
      };

      const { data, error } = await supabase
        .from('du_an')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error creating project in du_an:', error);
        throw error;
      }

      return data as Project;
    } catch (err) {
      console.error('Exception in projectService.create:', err);
      return null;
    }
  },

  // Cập nhật dự án
  async update(id: string, payload: {
    projectName?: string;
    status?: string;
    progress?: number;
    managerImg?: string;
    executorImg?: string;
  }): Promise<Project | null> {
    try {
      const updateData: any = {};
      if (payload.projectName !== undefined) updateData.ten_du_an = payload.projectName;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.progress !== undefined) updateData.progress = payload.progress;
      if (payload.managerImg !== undefined) updateData.manager_img = payload.managerImg;
      if (payload.executorImg !== undefined) updateData.executor_img = payload.executorImg;

      const { data, error } = await supabase
        .from('du_an')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating project in du_an:', error);
        throw error;
      }

      return data as Project;
    } catch (err) {
      console.error('Exception in projectService.update:', err);
      return null;
    }
  },

  // Xóa dự án
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('du_an')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project from du_an:', error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error('Exception in projectService.delete:', err);
      return false;
    }
  },
};

