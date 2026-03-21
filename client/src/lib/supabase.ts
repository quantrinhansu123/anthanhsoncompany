import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
  throw new Error(
    'Missing Supabase: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env (see .env.example). Use Project URL from Supabase Dashboard → Settings → API.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
