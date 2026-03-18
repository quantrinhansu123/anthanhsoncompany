import { supabase } from '../supabase';

export interface Project {
  id: string;
  customer_id?: string | null;
  ten_khach_hang?: string | null;
  ten_du_an: string;
  status: string;
  progress: number;
  manager_id?: string | null;
  executor_id?: string | null;
  /** Nhiều người quản lý (lưu trong cột manager_ids JSONB) */
  manager_ids?: string[];
  /** Nhiều người thực thi (lưu trong cột executor_ids JSONB) */
  executor_ids?: string[];
  manager_img?: string | null;
  executor_img?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  manager_name?: string | null;
  executor_name?: string | null;
  customer_name?: string | null;
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
          executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
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
        
        // Lấy ảnh từ nhân sự: ưu tiên manager_img/executor_img từ du_an, nếu không có thì lấy từ anh_nhan_su
        const managerImg = row.manager_img || (manager?.anh_nhan_su || null);
        const executorImg = row.executor_img || (executor?.anh_nhan_su || null);
        
        const managerIds = Array.isArray(row.manager_ids) ? row.manager_ids : (row.manager_ids ? [].concat(row.manager_ids) : []);
        const executorIds = Array.isArray(row.executor_ids) ? row.executor_ids : (row.executor_ids ? [].concat(row.executor_ids) : []);
        return {
          ...row,
          manager_ids: managerIds,
          executor_ids: executorIds,
          manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
          executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
          customer_name: row.ten_khach_hang || null,
          manager_img: managerImg,
          executor_img: executorImg,
          manager: manager,
          executor: executor,
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

  // Tạo dự án mới (hỗ trợ nhiều người: managerIds, executorIds)
  async create(payload: {
    projectName: string;
    status: string;
    progress: number;
    managerId?: string;
    executorId?: string;
    managerIds?: string[];
    executorIds?: string[];
    managerImg?: string;
    executorImg?: string;
    customerId?: string;
    tenKhachHang?: string;
  }): Promise<Project | null> {
    try {
      const managerIds = payload.managerIds && payload.managerIds.length > 0
        ? payload.managerIds.map((id) => String(id).trim()).filter(Boolean)
        : (payload.managerId && payload.managerId.trim() ? [payload.managerId.trim()] : []);
      const executorIds = payload.executorIds && payload.executorIds.length > 0
        ? payload.executorIds.map((id) => String(id).trim()).filter(Boolean)
        : (payload.executorId && payload.executorId.trim() ? [payload.executorId.trim()] : []);

      const insertData: any = {
        ten_du_an: payload.projectName,
        status: payload.status,
        progress: payload.progress ?? 0,
        manager_ids: managerIds,
        executor_ids: executorIds,
        manager_id: managerIds[0] || null,
        executor_id: executorIds[0] || null,
      };

      if (payload.customerId && payload.customerId.toString().trim() !== '') {
        insertData.customer_id = payload.customerId.toString().trim();
      } else {
        insertData.customer_id = null;
      }

      if (payload.tenKhachHang && payload.tenKhachHang.toString().trim() !== '') {
        insertData.ten_khach_hang = payload.tenKhachHang.toString().trim();
      } else {
        insertData.ten_khach_hang = null;
      }

      if (payload.managerImg) insertData.manager_img = payload.managerImg;
      if (payload.executorImg) insertData.executor_img = payload.executorImg;

      console.log('[projectService.create] Final insertData:', JSON.stringify(insertData, null, 2));
      
      const { data, error } = await supabase
        .from('du_an')
        .insert([insertData])
        .select(`
          *,
          manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
          executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
        `);
      
      if (error) {
        console.error('Error creating project in du_an:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[projectService] No data returned after insert');
        return null;
      }
      
      const created = data[0];
      const manager = created.manager;
      const executor = created.executor;
      
      console.log('[projectService.create] Created project:', {
        id: created.id,
        manager_id: created.manager_id,
        executor_id: created.executor_id,
        manager: manager ? { id: manager.id, name: manager.full_name || manager.name || manager.hoTen } : null,
        executor: executor ? { id: executor.id, name: executor.full_name || executor.name || executor.hoTen } : null
      });
      
      return {
        ...created,
        manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
        executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
        manager: manager,
        executor: executor,
      } as Project;

    } catch (err) {
      console.error('Exception in projectService.create:', err);
      return null;
    }
  },

  // Cập nhật dự án (hỗ trợ nhiều người: managerIds, executorIds)
  async update(id: string, payload: {
    projectName?: string;
    status?: string;
    progress?: number;
    customerId?: string;
    tenKhachHang?: string;
    managerId?: string;
    executorId?: string;
    managerIds?: string[];
    executorIds?: string[];
    managerImg?: string;
    executorImg?: string;
  }): Promise<Project | null> {
    try {
      const updateData: any = {};
      if (payload.projectName !== undefined) updateData.ten_du_an = payload.projectName;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.progress !== undefined) updateData.progress = payload.progress;
      if (payload.customerId !== undefined) {
        updateData.customer_id = payload.customerId && payload.customerId.toString().trim() !== ''
          ? payload.customerId.toString().trim() : null;
      }
      if (payload.tenKhachHang !== undefined) {
        updateData.ten_khach_hang = payload.tenKhachHang && payload.tenKhachHang.toString().trim() !== ''
          ? payload.tenKhachHang.toString().trim() : null;
      }
      if (payload.managerIds !== undefined) {
        const arr = payload.managerIds.map((id) => String(id).trim()).filter(Boolean);
        updateData.manager_ids = arr;
        updateData.manager_id = arr[0] || null;
      } else if (payload.managerId !== undefined) {
        const v = payload.managerId && payload.managerId.toString().trim() !== '' ? payload.managerId.toString().trim() : null;
        updateData.manager_id = v;
        updateData.manager_ids = v ? [v] : [];
      }
      if (payload.executorIds !== undefined) {
        const arr = payload.executorIds.map((id) => String(id).trim()).filter(Boolean);
        updateData.executor_ids = arr;
        updateData.executor_id = arr[0] || null;
      } else if (payload.executorId !== undefined) {
        const v = payload.executorId && payload.executorId.toString().trim() !== '' ? payload.executorId.toString().trim() : null;
        updateData.executor_id = v;
        updateData.executor_ids = v ? [v] : [];
      }
      if (payload.managerImg !== undefined) updateData.manager_img = payload.managerImg || null;
      if (payload.executorImg !== undefined) updateData.executor_img = payload.executorImg || null;

      console.log('[projectService.update] Final updateData:', JSON.stringify(updateData, null, 2));
      
      const { data, error } = await supabase
        .from('du_an')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          manager:manager_id(id, full_name, name, hoTen, code, anh_nhan_su),
          executor:executor_id(id, full_name, name, hoTen, code, anh_nhan_su)
        `);
      
      if (error) {
        console.error('Error updating project in du_an:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[projectService] No data returned after update');
        return null;
      }
      
      const updated = data[0];
      const manager = updated.manager;
      const executor = updated.executor;
      
      console.log('[projectService.update] Updated project:', {
        id: updated.id,
        manager_id: updated.manager_id,
        executor_id: updated.executor_id,
        manager: manager ? { id: manager.id, name: manager.full_name || manager.name || manager.hoTen } : null,
        executor: executor ? { id: executor.id, name: executor.full_name || executor.name || executor.hoTen } : null
      });
      
      return {
        ...updated,
        manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
        executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
        manager: manager,
        executor: executor,
      } as Project;
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

