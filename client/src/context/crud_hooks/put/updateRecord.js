// context/crud_hooks/update/updateRecords.js
import { supabase } from '../../../supabaseClient';

export const updateRecords = async (table, keyField, data) => {
  try {
    if (Array.isArray(data)) {
      // Bulk update: array of objects
      const updates = await Promise.all(
        data.map(async (record) => {
          const { [keyField]: id, ...fields } = record;
          const { error } = await supabase
            .from(table)
            .update(fields)
            .eq(keyField, id);
          return error;
        }),
      );
      const firstError = updates.find((e) => e !== null);
      return { error: firstError || null };
    } else if (typeof data === 'object') {
      // Single record update
      const { [keyField]: id, ...fields } = data;
      const { error } = await supabase
        .from(table)
        .update(fields)
        .eq(keyField, id);
      return { error };
    } else {
      throw new Error('Invalid data type for updateRecords');
    }
  } catch (err) {
    console.error(`Error updating records in ${table}:`, err);
    return { error: err };
  }
};
