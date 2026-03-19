import { supabase } from '../supabase';

/**
 * Lấy các cột employee có sẵn từ bảng nhan_su
 * Sử dụng cách test từng cột để xác định chính xác cột nào tồn tại
 */
let cachedEmployeeColumns: string[] | null = null;

export async function getEmployeeColumns(): Promise<string[]> {
  if (cachedEmployeeColumns) {
    return cachedEmployeeColumns;
  }

  try {
    // Cách 1: Thử query một record thực tế (nếu có data)
    const { data, error } = await supabase
      .from('nhan_su')
      .select('*')
      .limit(1);

    if (!error && data && data.length > 0) {
      // Có data, lấy keys từ object
      cachedEmployeeColumns = Object.keys(data[0]);
      console.log('Detected employee columns from data:', cachedEmployeeColumns);
      return cachedEmployeeColumns;
    }

    // Cách 2: Nếu không có data, test từng cột bằng cách query
    // Danh sách các cột có thể có (theo thứ tự ưu tiên)
    const possibleColumns = [
      'id', 'code', 
      'full_name', 'name', 'hoTen', 'fullName', 'tenNhanVien', 'ten',
      'department', 'phongBan', 'position', 'chucVu', 
      'email', 'phone', 'sdtNhanVien', 'dienThoai',
      'status', 'trangThai', 'joinDate', 'ngayVaoLam',
      'ngaySinh', 'diaChi', 'soCCCD', 'ngayCapCCCD',
      'mstCaNhan', 'maSoBHXH', 'bangDHChuyenNganh', 'namTotNghiep',
      'created_at', 'updated_at'
    ];

    const availableColumns: string[] = [];

    // Test từng cột - query với limit 0 sẽ không trả về data nhưng sẽ validate cột
    for (const col of possibleColumns) {
      try {
        const { error: testError } = await supabase
          .from('nhan_su')
          .select(col)
          .limit(0);
        
        // Nếu không có lỗi về "column does not exist", cột tồn tại
        if (!testError || (testError.message && !testError.message.includes('does not exist') && !testError.message.includes('column'))) {
          availableColumns.push(col);
        }
      } catch (err: any) {
        // Kiểm tra error message
        const errorMsg = err?.message || err?.error?.message || '';
        if (!errorMsg.includes('does not exist') && !errorMsg.includes('column')) {
          // Có thể là lỗi khác, vẫn thêm vào
          availableColumns.push(col);
        }
      }
    }

    // Nếu không tìm thấy cột nào, dùng default
    if (availableColumns.length === 0) {
      console.warn('No columns detected, using defaults: id, code');
      cachedEmployeeColumns = ['id', 'code'];
      return cachedEmployeeColumns;
    }

    // Đảm bảo có ít nhất id và code
    if (!availableColumns.includes('id')) {
      availableColumns.unshift('id');
    }
    if (!availableColumns.includes('code')) {
      const insertIndex = availableColumns.includes('id') ? 1 : 0;
      availableColumns.splice(insertIndex, 0, 'code');
    }

    cachedEmployeeColumns = availableColumns;
    console.log('Detected employee columns:', cachedEmployeeColumns);
    return cachedEmployeeColumns;
  } catch (err) {
    console.error('Error getting employee columns:', err);
    cachedEmployeeColumns = ['id', 'code'];
    return cachedEmployeeColumns;
  }
}
