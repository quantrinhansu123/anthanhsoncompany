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
        
        return {
          ...row,
          manager_name: manager ? (manager.full_name || manager.name || manager.hoTen || '') : null,
          executor_name: executor ? (executor.full_name || executor.name || executor.hoTen || '') : null,
          customer_name: row.ten_khach_hang || null, // Sử dụng ten_khach_hang từ du_an thay vì join
          // Lấy ảnh từ nhân sự nếu không có manager_img/executor_img
          manager_img: managerImg,
          executor_img: executorImg,
          // Giữ lại manager và executor objects để có thể truy cập sau
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
    tenKhachHang?: string;
  }): Promise<Project | null> {
    try {
      const insertData: any = {
        ten_du_an: payload.projectName,
        status: payload.status,
        progress: payload.progress ?? 0,
      };
      
      // Xử lý customer_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.customerId && payload.customerId.toString().trim() !== '') {
        insertData.customer_id = payload.customerId.toString().trim();
        console.log('[projectService.create] Setting customer_id:', insertData.customer_id);
      } else {
        insertData.customer_id = null;
        console.log('[projectService.create] customer_id is null or empty');
      }
      
      // Xử lý ten_khach_hang - LUÔN lưu (kể cả khi null hoặc undefined)
      // Luôn set ten_khach_hang vào insertData để đảm bảo cột được cập nhật
      if (payload.tenKhachHang && payload.tenKhachHang.toString().trim() !== '') {
        insertData.ten_khach_hang = payload.tenKhachHang.toString().trim();
        console.log('[projectService.create] Setting ten_khach_hang:', insertData.ten_khach_hang);
      } else {
        // Set null nếu không có giá trị
        insertData.ten_khach_hang = null;
        console.log('[projectService.create] ten_khach_hang set to null. payload.tenKhachHang:', payload.tenKhachHang);
      }
      
      // Xử lý manager_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.managerId && payload.managerId.toString().trim() !== '') {
        insertData.manager_id = payload.managerId.toString().trim();
        console.log('[projectService.create] Setting manager_id:', insertData.manager_id);
      } else {
        insertData.manager_id = null;
        console.log('[projectService.create] manager_id is null or empty');
      }
      
      // Xử lý executor_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.executorId && payload.executorId.toString().trim() !== '') {
        insertData.executor_id = payload.executorId.toString().trim();
        console.log('[projectService.create] Setting executor_id:', insertData.executor_id);
      } else {
        insertData.executor_id = null;
        console.log('[projectService.create] executor_id is null or empty');
      }
      
      // Lưu manager_img và executor_img nếu có
      if (payload.managerImg) {
        insertData.manager_img = payload.managerImg;
      }
      if (payload.executorImg) {
        insertData.executor_img = payload.executorImg;
      }

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

  // Cập nhật dự án
  async update(id: string, payload: {
    projectName?: string;
    status?: string;
    progress?: number;
    customerId?: string;
    tenKhachHang?: string;
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
      // Xử lý customer_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.customerId !== undefined) {
        if (payload.customerId && payload.customerId.toString().trim() !== '') {
          updateData.customer_id = payload.customerId.toString().trim();
          console.log('[projectService.update] Setting customer_id:', updateData.customer_id);
        } else {
          updateData.customer_id = null;
          console.log('[projectService.update] customer_id is null or empty');
        }
      }
      
      // Xử lý ten_khach_hang - LUÔN lưu (kể cả khi null hoặc undefined)
      // Luôn set ten_khach_hang vào updateData để đảm bảo cột được cập nhật
      if (payload.tenKhachHang !== undefined) {
        if (payload.tenKhachHang && payload.tenKhachHang.toString().trim() !== '') {
          updateData.ten_khach_hang = payload.tenKhachHang.toString().trim();
          console.log('[projectService.update] Setting ten_khach_hang:', updateData.ten_khach_hang);
        } else {
          updateData.ten_khach_hang = null;
          console.log('[projectService.update] ten_khach_hang set to null. payload.tenKhachHang:', payload.tenKhachHang);
        }
      } else {
        // Nếu không có trong payload, không update (giữ nguyên giá trị cũ)
        console.log('[projectService.update] tenKhachHang not provided, keeping existing value');
      }
      
      // Xử lý manager_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.managerId !== undefined) {
        if (payload.managerId && payload.managerId.toString().trim() !== '') {
          updateData.manager_id = payload.managerId.toString().trim();
          console.log('[projectService.update] Setting manager_id:', updateData.manager_id);
        } else {
          updateData.manager_id = null;
          console.log('[projectService.update] manager_id is null or empty');
        }
      }
      
      // Xử lý executor_id - chỉ lưu nếu có giá trị hợp lệ
      if (payload.executorId !== undefined) {
        if (payload.executorId && payload.executorId.toString().trim() !== '') {
          updateData.executor_id = payload.executorId.toString().trim();
          console.log('[projectService.update] Setting executor_id:', updateData.executor_id);
        } else {
          updateData.executor_id = null;
          console.log('[projectService.update] executor_id is null or empty');
        }
      }
      
      // Lưu manager_img và executor_img nếu có
      if (payload.managerImg !== undefined) {
        updateData.manager_img = payload.managerImg || null;
      }
      if (payload.executorImg !== undefined) {
        updateData.executor_img = payload.executorImg || null;
      }

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

