import { supabase } from '../../../supabaseClient';
import { toast } from 'react-toastify';
export async function deleteRecords(table, key, ids) {
  if (!ids || ids.length === 0) {
    toast.warning('No records selected for deletion.');
    return { error: null };
  }

  try {
    const { error } = await supabase.from(table).delete().in(key, ids);

    if (error) {
      console.error(` Error deleting from ${table}:`, error.message);
      const entityName = table
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      toast.error(
        `Failed to delete ${entityName.toLowerCase()}: ${error.message}`,
      );
      return { error };
    }

    console.log(` Deleted from ${table}:`, ids);
    const entityName = table
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    toast.success(
      `${ids.length} ${entityName.toLowerCase()}(s) deleted successfully!`,
    );
    return { error: null };
  } catch (err) {
    console.error(` Unexpected error while deleting from ${table}:`, err);
    toast.error('Unexpected error occurred.');
    return { error: err };
  }
}
