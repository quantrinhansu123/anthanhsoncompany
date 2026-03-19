import { api } from '../api';

export interface Project {
  id: string;
  customer_id?: string | null;
  ten_khach_hang?: string | null;
  ten_du_an: string;
  status: string;
  progress: number;
  manager_id?: string | null;
  executor_id?: string | null;
  manager_ids?: string[];
  executor_ids?: string[];
  manager_img?: string | null;
  executor_img?: string | null;
  created_at?: string;
  updated_at?: string;
  manager_name?: string | null;
  executor_name?: string | null;
  customer_name?: string | null;
  manager?: any;
  executor?: any;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    return api.get('/projects');
  },

  async getById(id: string): Promise<Project> {
    return api.get(`/projects/${id}`);
  },

  async create(payload: any): Promise<Project | null> {
    // Transform payload to server format if needed
    const insertData: any = {
      ten_du_an: payload.projectName || payload.ten_du_an,
      status: payload.status,
      progress: payload.progress ?? 0,
      manager_ids: payload.managerIds || payload.manager_ids || [],
      executor_ids: payload.executorIds || payload.executor_ids || [],
      manager_id: payload.managerId || payload.manager_id || null,
      executor_id: payload.executorId || payload.executor_id || null,
      customer_id: payload.customerId || payload.customer_id || null,
      ten_khach_hang: payload.tenKhachHang || payload.ten_khach_hang || null,
      manager_img: payload.managerImg || payload.manager_img || null,
      executor_img: payload.executorImg || payload.executor_img || null,
    };
    return api.post('/projects', insertData);
  },

  async update(id: string, payload: any): Promise<Project | null> {
    const updateData: any = {};
    if (payload.projectName !== undefined) updateData.ten_du_an = payload.projectName;
    if (payload.ten_du_an !== undefined) updateData.ten_du_an = payload.ten_du_an;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.progress !== undefined) updateData.progress = payload.progress;
    if (payload.customerId !== undefined) updateData.customer_id = payload.customerId || null;
    if (payload.customer_id !== undefined) updateData.customer_id = payload.customer_id || null;
    if (payload.tenKhachHang !== undefined) updateData.ten_khach_hang = payload.tenKhachHang || null;
    if (payload.ten_khach_hang !== undefined) updateData.ten_khach_hang = payload.ten_khach_hang || null;
    if (payload.managerIds !== undefined) updateData.manager_ids = payload.managerIds;
    if (payload.manager_ids !== undefined) updateData.manager_ids = payload.manager_ids;
    if (payload.managerId !== undefined) updateData.manager_id = payload.managerId;
    if (payload.manager_id !== undefined) updateData.manager_id = payload.manager_id;
    if (payload.executorIds !== undefined) updateData.executor_ids = payload.executorIds;
    if (payload.executor_ids !== undefined) updateData.executor_ids = payload.executor_ids;
    if (payload.executorId !== undefined) updateData.executor_id = payload.executorId;
    if (payload.executor_id !== undefined) updateData.executor_id = payload.executor_id;
    if (payload.managerImg !== undefined) updateData.manager_img = payload.managerImg;
    if (payload.manager_img !== undefined) updateData.manager_img = payload.manager_img;
    if (payload.executorImg !== undefined) updateData.executor_img = payload.executorImg;
    if (payload.executor_img !== undefined) updateData.executor_img = payload.executor_img;

    return api.put(`/projects/${id}`, updateData);
  },

  async delete(id: string): Promise<boolean> {
    return api.delete(`/projects/${id}`);
  },
};

