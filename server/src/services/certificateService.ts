import { getSupabase } from '../config/supabase';

const EMPLOYEE_SELECT = 'id, code, full_name, name, hoTen';

const CERT_SELECT = `
  *,
  nhan_su:nhan_su(${EMPLOYEE_SELECT})
`;

function assertUuid(id: string, label = 'id'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`${label} phải là UUID hợp lệ, nhận được: ${id}`);
  }
}

function employeeNameFromJoin(nhanSu: Record<string, unknown> | null | undefined): string {
  if (!nhanSu) return '';
  return String(
    nhanSu.full_name ||
      nhanSu.hoTen ||
      nhanSu.ho_ten ||
      nhanSu.name ||
      nhanSu.fullName ||
      nhanSu.tenNhanVien ||
      '',
  ).trim();
}

export function mapCertificateRow(cert: Record<string, unknown>) {
  const nhanSu = (cert.nhan_su as Record<string, unknown> | null) ?? null;
  const employeeName = employeeNameFromJoin(nhanSu);
  return {
    id: cert.id,
    tenFileLuu: cert.ten_file_luu || cert.tenFileLuu || '',
    file_url: cert.file_url || '',
    anh_url: cert.anh_url || '',
    anh2_url: cert.anh2_url || '',
    ghiChu: cert.ghi_chu || cert.ghiChu || '',
    cchn: cert.cchn || '',
    hangCCHN: cert.hang_cchn || cert.hangCCHN || '',
    ngayHetHanCC: cert.ngay_het_han_cc || cert.ngayHetHanCC || '',
    employee_id: cert.id_nhan_su || cert.employee_id || '',
    employeeId: cert.id_nhan_su || cert.employee_id || '',
    employeeName: employeeName || '(Trống)',
    employeeCode: nhanSu?.code || '',
    created_at: cert.created_at,
    updated_at: cert.updated_at,
  };
}

function toInsertRow(body: Record<string, unknown>) {
  const employeeId = String(body.employee_id ?? body.employeeId ?? body.id_nhan_su ?? '').trim();
  if (!employeeId) throw new Error('employee_id là bắt buộc để tạo chứng chỉ');
  assertUuid(employeeId, 'employee_id');

  return {
    id_nhan_su: employeeId,
    ten_file_luu: String(body.tenFileLuu ?? body.ten_file_luu ?? ''),
    file_url: String(body.file_url ?? ''),
    anh_url: String(body.anh_url ?? ''),
    anh2_url: String(body.anh2_url ?? ''),
    ghi_chu: String(body.ghiChu ?? body.ghi_chu ?? ''),
    cchn: String(body.cchn ?? ''),
    hang_cchn: String(body.hangCCHN ?? body.hang_cchn ?? ''),
    ngay_het_han_cc: body.ngayHetHanCC ?? body.ngay_het_han_cc ?? null,
  };
}

function toUpdateRow(body: Record<string, unknown>) {
  const employeeId = String(body.employee_id ?? body.employeeId ?? body.id_nhan_su ?? '').trim();
  if (!employeeId) throw new Error('employee_id là bắt buộc để cập nhật chứng chỉ');
  assertUuid(employeeId, 'employee_id');

  const updateData: Record<string, unknown> = {
    id_nhan_su: employeeId,
    updated_at: new Date().toISOString(),
  };

  if (body.tenFileLuu !== undefined || body.ten_file_luu !== undefined) {
    updateData.ten_file_luu = String(body.tenFileLuu ?? body.ten_file_luu ?? '');
  }
  if (body.file_url !== undefined) updateData.file_url = String(body.file_url ?? '');
  if (body.anh_url !== undefined) updateData.anh_url = String(body.anh_url ?? '');
  if (body.anh2_url !== undefined) updateData.anh2_url = String(body.anh2_url ?? '');
  if (body.ghiChu !== undefined || body.ghi_chu !== undefined) {
    updateData.ghi_chu = String(body.ghiChu ?? body.ghi_chu ?? '');
  }
  if (body.cchn !== undefined) updateData.cchn = String(body.cchn ?? '');
  if (body.hangCCHN !== undefined || body.hang_cchn !== undefined) {
    updateData.hang_cchn = String(body.hangCCHN ?? body.hang_cchn ?? '');
  }
  if (body.ngayHetHanCC !== undefined || body.ngay_het_han_cc !== undefined) {
    updateData.ngay_het_han_cc = body.ngayHetHanCC ?? body.ngay_het_han_cc ?? null;
  }

  return updateData;
}

export const certificateService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .select(CERT_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => mapCertificateRow(row as Record<string, unknown>));
  },

  async getById(id: string) {
    assertUuid(id);
    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .select(CERT_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapCertificateRow(data as Record<string, unknown>);
  },

  async getByEmployeeId(employeeId: string) {
    assertUuid(employeeId, 'employee_id');
    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .select('*')
      .eq('id_nhan_su', employeeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => mapCertificateRow(row as Record<string, unknown>));
  },

  async search(searchTerm: string) {
    const q = String(searchTerm || '').trim();
    if (!q) return this.getAll();

    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .select(CERT_SELECT)
      .or(`ten_file_luu.ilike.%${q}%,cchn.ilike.%${q}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => mapCertificateRow(row as Record<string, unknown>));
  },

  async create(body: Record<string, unknown>) {
    const row = toInsertRow(body);
    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .insert([row])
      .select('*')
      .single();

    if (error) throw error;
    return mapCertificateRow(data as Record<string, unknown>);
  },

  async update(id: string, body: Record<string, unknown>) {
    assertUuid(id);
    const row = toUpdateRow(body);
    const { data, error } = await getSupabase()
      .from('nhan_su_chi_tiet')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapCertificateRow(data as Record<string, unknown>);
  },

  async delete(id: string) {
    assertUuid(id);
    const { error } = await getSupabase().from('nhan_su_chi_tiet').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};
