const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

// Audit model functions

const getAuditRecords = async () => {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .order('audit_id', { ascending: false });
  if (error) throw error;
  return data;
};

const deleteAuditRecords = async (auditIds) => {
  const { error } = await supabase
    .from('audits')
    .delete()
    .in('audit_id', auditIds);
  if (error) throw error;
  return true;
};

const createAuditRecord = async (auditData) => {
  const { data, error } = await supabase
    .from('audits')
    .insert([auditData])
    .select();
  if (error) throw error;
  return data[0];
};

module.exports = {
  getAuditRecords,
  deleteAuditRecords,
  createAuditRecord,
};
