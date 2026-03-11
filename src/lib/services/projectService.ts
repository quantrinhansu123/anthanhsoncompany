import { supabase } from '../supabase';

export interface Project {
  id: string;
  customer_id?: string | null;
  ten_du_an: string;
  status: string;
  progress: number;
  manager_id?: string | null;
  executor_id?: string | null;
  manager_img?: string | null;
  executor_img?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  manager_name?: string | null;
  executor_name?: string | null;
}

export const projectService = {
  // Lấy tất cả dự án
  async getAll(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('du_an')
        .select(`
          *,
          manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
          executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su),
          customer:customer_id(id, ten_don_vi)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects from du_an:', error);
        throw error;
      }

      // Map dữ liệu để lấy thông tin nhân sự và khách hàng
      return (data || []).map((row: any) => {
        const manager = row.manager;
        const executor = row.executor;
        const customer = row.customer;
        return {
          ...row,
          manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
          executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
          customer_name: customer ? (customer.ten_don_vi || '') : null,
          // Lấy ảnh từ nhân sự nếu không có manager_img/executor_img
          manager_img: row.manager_img || (manager?.anh_nhan_su || null),
          executor_img: row.executor_img || (executor?.anh_nhan_su || null),
        } as Project;
      });
    } catch (err) {
      console.error('Exception in projectService.getAll:', err);
      // Fallback nếu join lỗi
      try {
        const { data, error } = await supabase
          .from('du_an')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as Project[];
      } catch (fallbackErr) {
        console.error('Exception in projectService.getAll fallback:', fallbackErr);
        return [];
      }
    }
  },

  // Tạo dự án mới
  async create(payload: {
    projectName: string;
    status: string;
    progress: number;
    managerId?: string;
    executorId?: string;
    managerImg?: string;
    executorImg?: string;
    customerId?: string;
  }): Promise<Project | null> {
    try {
      const insertData: any = {
        ten_du_an: payload.projectName,
        status: payload.status,
        progress: payload.progress ?? 0,
        customer_id: payload.customerId ?? null,
      };
      
      // Ưu tiên lưu manager_id và executor_id, nếu không có thì lưu manager_img và executor_img
      if (payload.managerId) {
        insertData.manager_id = payload.managerId;
      } else if (payload.managerImg) {
        insertData.manager_img = payload.managerImg;
      }
      
      if (payload.executorId) {
        insertData.executor_id = payload.executorId;
      } else if (payload.executorImg) {
        insertData.executor_img = payload.executorImg;
      }

      const { data, error } = await supabase
        .from('du_an')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error('Error creating project in du_an:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[projectService] No data returned after insert');
        return null;
      }
      
      return data[0] as Project;

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
    customerId?: string;
    managerId?: string;
    executorId?: string;
    managerImg?: string;
    executorImg?: string;
  }): Promise<Project | null> {
    try {
      const updateData: any = {};
      if (payload.projectName !== undefined) updateData.ten_du_an = payload.projectName;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.progress !== undefined) updateData.progress = payload.progress;
      if (payload.customerId !== undefined) updateData.customer_id = payload.customerId || null;
      
      // Ưu tiên lưu manager_id và executor_id
      if (payload.managerId !== undefined) {
        updateData.manager_id = payload.managerId || null;
      } else if (payload.managerImg !== undefined) {
        updateData.manager_img = payload.managerImg;
      }
      
      if (payload.executorId !== undefined) {
        updateData.executor_id = payload.executorId || null;
      } else if (payload.executorImg !== undefined) {
        updateData.executor_img = payload.executorImg;
      }

      const { data, error } = await supabase
        .from('du_an')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating project in du_an:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[projectService] No data returned after update');
        return null;
      }
      
      return data[0] as Project;
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

