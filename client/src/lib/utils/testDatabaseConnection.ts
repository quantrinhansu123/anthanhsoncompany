import { supabase } from '../supabase';

/**
 * Test kết nối và kiểm tra bảng nhan_su
 */
export async function testNhanSuConnection() {
  console.log('=== Testing nhan_su table connection ===');
  
  try {
    // 1. Kiểm tra bảng có tồn tại không
    console.log('1. Checking if table exists...');
    const { data: tableData, error: tableError } = await supabase
      .from('nhan_su')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('❌ Table check error:', tableError);
      return {
        success: false,
        error: tableError.message,
        details: tableError
      };
    }
    
    console.log('✅ Table nhan_su exists');
    
    // 2. Đếm số lượng records
    console.log('2. Counting records...');
    const { count, error: countError } = await supabase
      .from('nhan_su')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count error:', countError);
    } else {
      console.log(`✅ Total records: ${count || 0}`);
    }
    
    // 3. Lấy một record mẫu
    console.log('3. Fetching sample data...');
    const { data, error: dataError } = await supabase
      .from('nhan_su')
      .select('*')
      .limit(1);
    
    if (dataError) {
      console.error('❌ Data fetch error:', dataError);
      return {
        success: false,
        error: dataError.message,
        details: dataError,
        count: count || 0
      };
    }
    
    if (data && data.length > 0) {
      console.log('✅ Sample record:', data[0]);
      console.log('✅ Record keys:', Object.keys(data[0]));
    } else {
      console.log('⚠️ No records found in table');
    }
    
    return {
      success: true,
      count: count || 0,
      sampleRecord: data && data.length > 0 ? data[0] : null,
      recordKeys: data && data.length > 0 ? Object.keys(data[0]) : []
    };
    
  } catch (err: any) {
    console.error('❌ Exception:', err);
    return {
      success: false,
      error: err.message || 'Unknown error',
      details: err
    };
  }
}
