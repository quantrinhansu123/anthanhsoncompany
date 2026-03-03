import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://snopykjbibzkoaewfaiq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3B5a2piaWJ6a29hZXdmYWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTc1MDQsImV4cCI6MjA4NzY5MzUwNH0.UX3WxdgXiYg2dm4P8sKiNY7YhHUJgfI7QcIEPZLJ5hw';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
