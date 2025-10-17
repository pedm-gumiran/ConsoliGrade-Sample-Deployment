import { supabase } from '../../../supabaseClient';

// Reusable add function
export async function addRecord(table, record) {
  const { data, error } = await supabase.from(table).insert([record]);

  if (error) {
    console.error(`Error inserting into ${table}:`, error.message);
    return { error };
  }

  return { data };
}
