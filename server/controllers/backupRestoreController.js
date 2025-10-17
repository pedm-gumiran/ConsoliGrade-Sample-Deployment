const {
  createBackupRecord,
  deleteBackupRecords,
  getBackupRecords,
} = require('../models/backupModel');
const { createAuditRecord } = require('../models/auditModel');
const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

// Tables to backup/restore
const tables = [
  'users',
  'subjects',
  'sections',
  'section_advisers',
  'students',
  'student_sections',
  'teacher_subjects',
  'grades',
  'school_years',
];

// Create full database backup
exports.createBackup = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const allData = {};
    let totalRecords = 0;

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
      allData[table] = data || [];
      totalRecords += data?.length || 0;
    }

    // Fetch auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw new Error(`Failed to fetch auth users: ${authError.message}`);
    allData['auth_users'] = authUsers.users;
    totalRecords += authUsers.users.length;

    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      database: 'ConsoliGrade',
      data: allData,
      metadata: {
        totalRecords,
        totalTables: tables.length + 1, // + auth_users
        tables: [...tables, 'auth_users'],
      },
    };

    const now = new Date().toISOString().split('T')[0];
    const filename = `full_database_backup_${now}.json`;

    // Save backup record in Supabase
    const record = await createBackupRecord({
      filename,
      size: 'N/A', // Will be updated by frontend
    });

    // Log audit
    await createAuditRecord({
      user_id: req.user?.user_id || '22-10265',
      action: `Create backup ${filename}`,
      remarks: 'Success',
      date: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      backupData,
      filename,
      backupId: record.id,
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore full database
exports.restoreBackup = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const { backupData } = req.body;

    if (!backupData || !backupData.data) {
      return res.status(400).json({ success: false, message: 'Invalid backup data' });
    }

    const restoreOrder = [
      'school_years',
      'users',
      'sections',
      'section_advisers',
      'students',
      'subjects',
      'teacher_subjects',
      'student_sections',
      'grades',
      'auth_users', // Restore auth users last
    ];

    const primaryKeyMap = {
      school_years: 'school_year_id',
      users: 'user_id',
      subjects: 'subject_id',
      sections: 'section_id',
      section_advisers: 'section_adviser_id',
      students: 'lrn',
      student_sections: 'student_section_id',
      teacher_subjects: 'teacher_subject_id',
      grades: 'grade_id',
    };

    for (const table of restoreOrder) {
      if (!backupData.data[table]) continue;

      if (table === 'auth_users') {
        // Special handling for auth users
        for (const user of backupData.data[table]) {
          try {
            const { error } = await supabase.auth.admin.createUser({
              email: user.email,
              password: 'TempPassword123!', // Default password; change as needed
              email_confirm: true,
            });
            if (error && !error.message.includes('already registered')) {
              console.warn(`Failed to create auth user ${user.email}: ${error.message}`);
            }
          } catch (err) {
            console.warn(`Error creating auth user ${user.email}: ${err.message}`);
          }
        }
      } else {
        const primaryKey = primaryKeyMap[table] || 'id';

        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .not(primaryKey, 'is', null);

        if (delErr) throw new Error(`Failed to clear ${table}: ${delErr.message}`);

        const tableData = backupData.data[table];
        if (tableData.length > 0) {
          const { error: insErr } = await supabase.from(table).insert(tableData);
          if (insErr) throw new Error(`Failed to restore ${table}: ${insErr.message}`);
        }
      }
    }

    // After restoring users, update auth_user_id in DB
    if (backupData.data.users) {
      console.log('Updating auth_user_id for restored users...');
      for (const user of backupData.data.users) {
        try {
          // Find auth user by email
          const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
          if (authErr) {
            console.warn(`Failed to list auth users for ${user.email}: ${authErr.message}`);
            continue;
          }
          const authUser = authUsers.users.find(u => u.email === user.email);
          if (authUser) {
            // Update DB with new auth_user_id
            const { error: updateErr } = await supabase
              .from('users')
              .update({ auth_user_id: authUser.id })
              .eq('user_id', user.user_id);
            if (updateErr) {
              console.warn(`Failed to update auth_user_id for ${user.email}: ${updateErr.message}`);
            } else {
              console.log(`Updated auth_user_id for ${user.email}`);
            }
          } else {
            console.warn(`Auth user not found for ${user.email}`);
          }
        } catch (err) {
          console.warn(`Error updating auth_user_id for ${user.email}: ${err.message}`);
        }
      }
    }

    // Log audit
    await createAuditRecord({
      user_id: req.user?.user_id || '22-10265',
      action: `Restore full database backup`,
      remarks: 'Success',
      date: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: 'Database restored successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all backups
exports.getBackups = async (req, res) => {
  try {
    const backups = await getBackupRecords();
    const formatted = backups.map((item) => ({
      id: item.id,
      filename: item.filename,
      date: new Date(item.date_created).toLocaleString(),
      size: item.size || 'N/A',
    }));
    res.status(200).json({ success: true, backups: formatted });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete backup
exports.deleteBackup = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const { id } = req.params;

    // Get backup record to log filename
    const backups = await getBackupRecords();
    const backup = backups.find(b => b.id === id);
    const filename = backup ? backup.filename : `ID: ${id}`;

    await deleteBackupRecords([id]);

    console.log('About to log delete backup audit for:', filename);

    // Log audit
    try {
      await createAuditRecord({
        user_id: req.user?.user_id || '22-10265',
        action: `Delete backup ${filename}`,
        remarks: 'Success',
        date: new Date().toISOString(),
      });
      console.log('Audit logged successfully for delete backup');
    } catch (auditError) {
      console.error('Failed to create audit record:', auditError);
    }

    res.status(200).json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
