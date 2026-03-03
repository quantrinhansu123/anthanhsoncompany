/**
 * Example usage of Supabase client
 * 
 * Import the supabase client in your components:
 * import { supabase } from '@/lib/supabase';
 * 
 * Example queries:
 * 
 * // SELECT data
 * const { data, error } = await supabase
 *   .from('table_name')
 *   .select('*');
 * 
 * // INSERT data
 * const { data, error } = await supabase
 *   .from('table_name')
 *   .insert([{ column: 'value' }]);
 * 
 * // UPDATE data
 * const { data, error } = await supabase
 *   .from('table_name')
 *   .update({ column: 'new_value' })
 *   .eq('id', 1);
 * 
 * // DELETE data
 * const { data, error } = await supabase
 *   .from('table_name')
 *   .delete()
 *   .eq('id', 1);
 * 
 * // Upload file to storage
 * const { data, error } = await supabase.storage
 *   .from('bucket_name')
 *   .upload('path/to/file', file);
 * 
 * // Download file from storage
 * const { data, error } = await supabase.storage
 *   .from('bucket_name')
 *   .download('path/to/file');
 */
