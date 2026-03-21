import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Support both server env naming (`SUPABASE_*`) and frontend-style naming (`VITE_SUPABASE_*`)
const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ??
  '';

let client: SupabaseClient | null = null;

/** Lazy init so the Vercel function can load without env; first DB call throws a clear error if misconfigured. */
export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missing = [
      !supabaseUrl ? 'SUPABASE_URL or VITE_SUPABASE_URL' : null,
      !supabaseServiceRoleKey
        ? 'SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY'
        : null,
    ].filter(Boolean);
    throw new Error(
      `Missing Supabase env on server (${missing.join(', ')}). In Vercel: Project → Settings → Environment Variables.`
    );
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}
