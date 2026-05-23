import { api } from '../api';
import { supabase } from '../supabase';

const DU_AN_FETCH_CHUNK = 1000;

function isDuAnCustomerEmbedApiError(err: unknown): boolean {
    const msg = String((err as Error)?.message ?? err ?? '').toLowerCase();
    return (
        msg.includes('relationship') &&
        (msg.includes('customer_id') || msg.includes('du_an'))
    );
}

function isProjectsApiUnreachable(err: unknown): boolean {
    const msg = String((err as Error)?.message ?? err ?? '').toLowerCase();
    return (
        msg.includes('fetch failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('network response was not ok') ||
        msg.includes('load failed') ||
        msg.includes('econnrefused') ||
        msg.includes('aborted')
    );
}

function shouldUseSupabaseProjectsFallback(err: unknown): boolean {
    return isDuAnCustomerEmbedApiError(err) || isProjectsApiUnreachable(err);
}

const DU_AN_LOOKUP_SELECT =
    'id, ten_du_an, customer_id, ten_khach_hang, status, progress, created_at, updated_at';

function normalizeProjectsPayload(payload: unknown): Project[] {
    if (Array.isArray(payload)) return payload as Project[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
        return (payload as { data: Project[] }).data;
    }
    return [];
}

/** Tải dự án trực tiếp Supabase (không embed khach_hang — tránh lỗi schema cache). */
async function fetchAllProjectsFromSupabase(): Promise<Project[]> {
    const allRaw: Record<string, unknown>[] = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from('du_an')
            .select(DU_AN_LOOKUP_SELECT)
            .order('created_at', { ascending: false })
            .range(offset, offset + DU_AN_FETCH_CHUNK - 1);
        if (error) throw error;
        const batch = (data || []) as Record<string, unknown>[];
        allRaw.push(...batch);
        if (batch.length < DU_AN_FETCH_CHUNK) break;
        offset += DU_AN_FETCH_CHUNK;
    }

    const customerIds = [
        ...new Set(
            allRaw
                .map((r) => (r.customer_id != null ? String(r.customer_id) : ''))
                .filter(Boolean),
        ),
    ];
    const nameById = new Map<string, string>();
    for (let i = 0; i < customerIds.length; i += 200) {
        const chunk = customerIds.slice(i, i + 200);
        const { data: khRows, error: khErr } = await supabase
            .from('khach_hang')
            .select('id, ten_don_vi')
            .in('id', chunk);
        if (khErr) throw khErr;
        for (const k of khRows || []) {
            const id = k.id != null ? String(k.id) : '';
            const name = k.ten_don_vi != null ? String(k.ten_don_vi).trim() : '';
            if (id && name) nameById.set(id, name);
        }
    }

    return allRaw.map((row) => {
        const cid = row.customer_id != null ? String(row.customer_id) : '';
        const tenKh = row.ten_khach_hang ? String(row.ten_khach_hang).trim() : '';
        return {
            ...(row as Project),
            customer_name: (cid && nameById.get(cid)) || tenKh || null,
        };
    });
}

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
    try {
      const payload = await api.get('/projects');
      return normalizeProjectsPayload(payload);
    } catch (err) {
      if (!shouldUseSupabaseProjectsFallback(err)) throw err;
      console.warn(
        '[projectService] API /projects không khả dụng — tải từ Supabase',
        err,
      );
      return fetchAllProjectsFromSupabase();
    }
  },

  async getById(id: string): Promise<Project> {
    return api.get(`/projects/${id}`);
  },

  async create(payload: any): Promise<Project | null> {
    const tenDuAn = String(payload.projectName ?? payload.ten_du_an ?? '')
      .trim();
    if (!tenDuAn) {
      throw new Error('Tên dự án không được để trống.');
    }
    const insertData: any = {
      ten_du_an: tenDuAn,
      status: payload.status ?? 'Đang thực hiện',
      progress: payload.progress ?? 0,
      manager_ids: payload.managerIds || payload.manager_ids || [],
      executor_ids: payload.executorIds || payload.executor_ids || [],
      manager_id: payload.managerId ?? payload.manager_id ?? null,
      executor_id: payload.executorId ?? payload.executor_id ?? null,
      customer_id: payload.customerId ?? payload.customer_id ?? null,
      ten_khach_hang: payload.tenKhachHang ?? payload.ten_khach_hang ?? null,
      manager_img: payload.managerImg ?? payload.manager_img ?? null,
      executor_img: payload.executorImg ?? payload.executor_img ?? null,
    };
    return api.post('/projects', insertData);
  },

  async update(id: string, payload: any): Promise<Project | null> {
    const updateData: any = {};
    if (payload.projectName !== undefined || payload.ten_du_an !== undefined) {
      const tenDuAn = String(
        payload.projectName !== undefined ? payload.projectName : payload.ten_du_an,
      ).trim();
      if (!tenDuAn) {
        throw new Error('Tên dự án không được để trống.');
      }
      updateData.ten_du_an = tenDuAn;
    }
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

  async getByNames(names: string[]): Promise<Project[]> {
    if (!names || names.length === 0) return [];
    return api.post('/projects/by-names', { names });
  },
};

