const { getAuditRecords, deleteAuditRecords, createAuditRecord } = require('../models/auditModel');

// Get all audits
exports.getAudits = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const audits = await getAuditRecords();
    res.status(200).json({ success: true, audits });
  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete audits
exports.deleteAudits = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const { auditIds } = req.body;
    await deleteAuditRecords(auditIds);
    res.status(200).json({ success: true, message: 'Audits deleted successfully' });
  } catch (error) {
    console.error('Delete audits error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
