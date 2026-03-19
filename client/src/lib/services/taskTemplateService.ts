import { supabase } from '../supabase';

export type TaskTemplateStandard = {
  noi_dung: string;
  diem: number;
};

export type TaskTemplateStep = {
  hanh_dong: string;
  ghi_chu?: string | null;
};

export type TaskTemplateRow = {
  id: string;
  loai_cv: string;
  cv: string;
  task: string;
  mo_ta: string | null;
  tieu_chuan: TaskTemplateStandard[];
  cac_buoc: TaskTemplateStep[];
  created_at?: string;
  updated_at?: string;
};

export const taskTemplateService = {
  async getAll(): Promise<TaskTemplateRow[]> {
    const { data, error } = await supabase
      .from('task_template')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Chuẩn hóa dữ liệu phòng trường hợp cũ còn dạng string[]
    return (data || []).map((row: any) => {
      const rawStandards = row.tieu_chuan || [];
      const tieu_chuan: TaskTemplateStandard[] = Array.isArray(rawStandards)
        ? rawStandards.map((s: any) =>
            typeof s === 'string'
              ? { noi_dung: s, diem: 0 }
              : {
                  noi_dung: String(s?.noi_dung || '').trim(),
                  diem: Number(s?.diem) || 0,
                },
          )
        : [];
      return {
        id: row.id,
        loai_cv: row.loai_cv,
        cv: row.cv,
        task: row.task,
        mo_ta: row.mo_ta ?? null,
        tieu_chuan,
        cac_buoc: (row.cac_buoc || []) as TaskTemplateStep[],
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as TaskTemplateRow;
    });
  },

  async create(
    payload: Omit<TaskTemplateRow, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TaskTemplateRow> {
    const { data, error } = await supabase
      .from('task_template')
      .insert([
        {
          loai_cv: payload.loai_cv,
          cv: payload.cv,
          task: payload.task,
          mo_ta: payload.mo_ta ?? null,
          tieu_chuan: payload.tieu_chuan ?? [],
          cac_buoc: payload.cac_buoc ?? [],
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data as TaskTemplateRow;
  },

  async update(
    id: string,
    payload: Partial<Omit<TaskTemplateRow, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<TaskTemplateRow> {
    const { data, error } = await supabase
      .from('task_template')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TaskTemplateRow;
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('task_template').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

