const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
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
