import { getSupabase } from '../config/supabase';

/**
 * Script to clear all business data from the database.
 * Order is important due to foreign key constraints.
 */
const tables = [
  'tai_lieu',
  'thu_chi',
  'thu_vien_loi',
  'cong_viec_nhat_ky_nhan_su',
  'setting',
  'cong_viec_chi_tiet',
  'task_template',
  'task',
  'lich_lam_viec',
  'hop_dong',
  'du_an',
  'nguoi_phu_thuoc',
  'nhan_su_chi_tiet',
  'khach_hang',
  'nhan_su'
];

async function clearDatabase() {
  const supabase = getSupabase();
  console.log('🚀 Bắt đầu quá trình xóa dữ liệu database...');

  for (const table of tables) {
    try {
      console.log(`⏳ Đang xóa dữ liệu trong bảng: "${table}"...`);
      
      // We use a filter that matches all rows because Supabase delete requires a filter.
      // For string IDs/UUIDs, 'id != 00000000-0000-0000-0000-000000000000' usually works.
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); 

      if (error) {
        // Fallback for numeric IDs if the above fails
        const { error: error2 } = await supabase
          .from(table)
          .delete()
          .gte('id', 0);
          
        if (error2) {
          throw new Error(error2.message);
        }
      }
      
      console.log(`✅ Đã xóa sạch bảng: "${table}"`);
    } catch (err: any) {
      console.error(`❌ Lỗi khi xóa bảng "${table}":`, err.message);
    }
  }

  console.log('\n✨ Hoàn tất! Database đã được dọn dẹp.');
}

// Run the script
clearDatabase().catch((err) => {
  console.error('💥 Lỗi nghiêm trọng:', err);
  process.exit(1);
});
