import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Support both server env naming (`SUPABASE_*`) and frontend-style naming (`VITE_SUPABASE_*`)
// because the project currently stores keys with `VITE_` prefix in `server/.env`.
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
  '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const missing = [
    !supabaseUrl ? 'SUPABASE_URL / VITE_SUPABASE_URL' : null,
    !supabaseServiceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean);

  throw new Error(
    `Missing Supabase configuration. Please check your .env file. Missing: ${missing.join(', ')}`
  );
}

// Use Service Role Key on the server for full access
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
