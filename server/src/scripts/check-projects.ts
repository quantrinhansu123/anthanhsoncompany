import { getSupabase } from '../config/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('du_an')
    .select('id, ten_du_an')
    .ilike('ten_du_an', '%Bắc Giang%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Results:', JSON.stringify(data, null, 2));
}

check();
