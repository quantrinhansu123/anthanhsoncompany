import { supabase } from '../config/supabase';

export const contractService = {
  async getAll() {
    // We can use Supabase joins on the server
    const { data, error } = await supabase
      .from('hop_dong')
      .select(`
        *,
        du_an:du_an_id(id, ten_du_an),
        nhan_su:nhan_su_id(id, code, full_name, name, hoTen)
      `)
      .order('ngay_ky_hd', { ascending: false });
    
    if (error) throw error;

    // Process result to match frontend's expected format if necessary
    return (data || []).map((row: any) => {
      const contractId = row.contract_id || row.id;
      const nhanSu = row.nhan_su;
      const duAn = row.du_an;
      
      const nhanSuTen = nhanSu ? (nhanSu.full_name || nhanSu.name || nhanSu.hoTen || '') : null;
      const nhanSuCode = nhanSu?.code || null;
      
      return {
        ...row,
        id: contractId,
        contract_id: contractId,
        project_name: duAn?.ten_du_an || row.project_name || null,
        nhan_su_ten: nhanSuTen,
        nhan_su_code: nhanSuCode,
        nhan_su_ids: Array.isArray(row.nhan_su_ids) ? row.nhan_su_ids : (row.nhan_su_ids ? [row.nhan_su_ids] : [])
      };
    });
  },

  async create(payload: any) {
    const insertPayload = { ...payload };
    if (Array.isArray(payload.nhan_su_ids) && payload.nhan_su_ids.length > 0) {
      insertPayload.nhan_su_ids = payload.nhan_su_ids.map((id: any) => String(id).trim()).filter(Boolean);
      insertPayload.nhan_su_id = insertPayload.nhan_su_id ?? insertPayload.nhan_su_ids[0] ?? null;
    }

    const { data, error } = await supabase
      .from('hop_dong')
      .insert([insertPayload])
      .select(`
        *,
        du_an:du_an_id(id, ten_du_an),
        nhan_su:nhan_su_id(id, code, full_name, name, hoTen)
      `);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return null;
    
    const row: any = data[0];
    const contractId = row.contract_id || row.id;
    return {
      ...row,
      id: contractId,
      contract_id: contractId
    };
  },

  async update(id: string, payload: any) {
    const updatePayload = { ...payload };
    if (Array.isArray(payload.nhan_su_ids) && payload.nhan_su_ids.length > 0) {
      updatePayload.nhan_su_ids = payload.nhan_su_ids.map((id: any) => String(id).trim()).filter(Boolean);
      updatePayload.nhan_su_id = updatePayload.nhan_su_id ?? updatePayload.nhan_su_ids[0] ?? null;
    }

    // Try update with id
    let { data, error } = await supabase
      .from('hop_dong')
      .update(updatePayload)
      .eq('id', id)
      .select();
    
    // Fallback to contract_id if not found
    if (!data || data.length === 0) {
      const result = await supabase
        .from('hop_dong')
        .update(updatePayload)
        .eq('contract_id', id)
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!data || data.length === 0) return null;
    
    const row: any = data[0];
    const contractId = row.contract_id || row.id;
    return {
      ...row,
      id: contractId,
      contract_id: contractId
    };
  },

  async delete(id: string) {
    let { error } = await supabase
      .from('hop_dong')
      .delete()
      .eq('id', id);
    
    if (error) {
      const result = await supabase
        .from('hop_dong')
        .delete()
        .eq('contract_id', id);
      error = result.error;
    }
    
    if (error) throw error;
    return true;
  }
};
