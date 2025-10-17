const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

// Backup model functions (for metadata in 'backups' table)

const createBackupRecord = async (backupData) => {
  const { data, error } = await supabase
    .from('backups')
    .insert([backupData])
    .select();
  if (error) throw error;
  return data[0];
};

const deleteBackupRecords = async (backupIds) => {
  const { error } = await supabase
    .from('backups')
    .delete()
    .in('id', backupIds);
  if (error) throw error;
  return true;
};

const getBackupRecords = async () => {
  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .order('date_created', { ascending: false });
  if (error) throw error;
  return data;
};

module.exports = {
  createBackupRecord,
  deleteBackupRecords,
  getBackupRecords,
};
