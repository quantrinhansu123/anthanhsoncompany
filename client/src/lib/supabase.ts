import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://owftpuxwujdaruqnyjlq.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZnRwdXh3dWpkYXJ1cW55amxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTI2NDUsImV4cCI6MjA4OTE2ODY0NX0.dHxwd6NpJvm6TIRUgbjqtuOuVE2KrshNAVB3DgUC5yg';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY'
  );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
