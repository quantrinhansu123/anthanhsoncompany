import 'dotenv/config';
import { getSupabase } from '../src/config/supabase';

async function cleanup() {
  const supabase = getSupabase();
  console.log('Đang xóa các hợp đồng test...');
  const { data, error } = await supabase
    .from('hop_dong')
    .delete()
    .ilike('so_hop_dong', 'TEST-HD-%')
    .select();

  if (error) {
    console.error('Lỗi khi xóa:', error);
  } else {
    console.log(`Đã xóa ${data?.length || 0} bản ghi test:`, data?.map(d => d.so_hop_dong));
  }
}

cleanup();
