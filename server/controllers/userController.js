const {
  createUser,
  getUserByEmail,
  getUsersByIds,
  getUserById,
  deleteUsersByIds,
  editUser,
  getAllUsers,
} = require('../models/userModel');
const { createAuditRecord } = require('../models/auditModel');
const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

// --------- Create User Controller ---------
exports.addUser = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  const newUser = req.body;
  let createdAuthUserId = null;
  let createdUserId = null;

  try {
    // Step 1: Check if email already exists in app DB
    const existingUser = await getUserByEmail(newUser.email);
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: 'Email already exists.' });
    }

    // Step 2: Temporarily insert into app DB (without auth_user_id)
    const userWithoutAuth = { ...newUser };
    delete userWithoutAuth.auth_user_id;

    const tempUser = await createUser(userWithoutAuth, null);
    createdUserId = tempUser.user_id;

    // Step 3: Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      });

    if (authError) {
      // rollback local user if auth fails
      await deleteUsersByIds([createdUserId]);
      return res
        .status(400)
        .json({ success: false, message: authError.message });
    }

    createdAuthUserId = authData.user.id;

    // Step 4: Update  users table with auth_user_id
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: createdAuthUserId })
      .eq('user_id', createdUserId)
      .select('*')
      .single();

    if (updateError) {
      // rollback both if update fails
      await supabase.auth.admin.deleteUser(createdAuthUserId);
      await deleteUsersByIds([createdUserId]);
      throw updateError;
    }

    // Step 5: Success
    // Log audit
    await createAuditRecord({
      user_id: req.user?.user_id || '22-10265', // Fallback if not authenticated
      action: `Create user with  ${newUser.email}`,
      remarks: 'Success',
      date: updatedUser.created_at || new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully!',
      user: updatedUser,
    });
  } catch (err) {
    // rollback if something unexpected fails
    if (createdAuthUserId)
      await supabase.auth.admin.deleteUser(createdAuthUserId);
    if (createdUserId) await deleteUsersByIds([createdUserId]);

    console.error('Error creating user:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------Edit User Core Logic------------------- //
const editUserCore = async (userId, updatedData) => {
  console.log(`Starting editUserCore for userId: ${userId}`);

  // Fetch current user
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    console.error(`User not found for ID: ${userId}`);
    throw new Error('User not found.');
  }
  console.log(`Current user fetched for ID: ${userId}`);

  // Check email uniqueness if changed
  if (updatedData.email && updatedData.email !== existingUser.email) {
    console.log(`Checking email uniqueness for: ${updatedData.email}`);
    const emailTaken = await getUserByEmail(updatedData.email);
    if (emailTaken) {
      console.error(
        `Email ${updatedData.email} already in use by another user`,
      );
      throw new Error('Email already in use.');
    }
  }

  const previousUserData = { ...existingUser };
  console.log(`Previous user data saved for rollback`);

  try {
    console.log(`Calling editUser model for ID: ${userId}`);
    const updatedUser = await editUser(userId, updatedData);
    console.log(`Model editUser succeeded for ID: ${userId}`);

    if (
      existingUser.auth_user_id &&
      (updatedData.email || updatedData.password)
    ) {
      console.log(
        `Updating Supabase auth for auth_user_id: ${existingUser.auth_user_id}`,
      );
      try {
        const { error } = await supabase.auth.admin.updateUserById(
          existingUser.auth_user_id,
          {
            email: updatedData.email || existingUser.email,
            password: updatedData.password || undefined,
          },
        );

        if (error) {
          console.error(
            `Auth update failed for auth_user_id: ${existingUser.auth_user_id}`,
            error,
          );
          // Log the error but do NOT rollback the main update - allow it to succeed
          console.warn(
            `Proceeding with DB update despite auth failure for userId: ${userId}`,
          );
          // Optional: You could add logic here to clear or update the invalid auth_user_id in the DB
        } else {
          console.log(`Auth update succeeded for ID: ${userId}`);
        }
      } catch (err) {
        console.error('Auth update error:', err);
        console.log('No error just good');
        console.warn(
          `Proceeding with DB update despite auth failure for userId: ${userId}`,
        );
      }
    }

    return updatedUser;
  } catch (err) {
    console.error(`Error in editUserCore for ID: ${userId}`, err);
    // Only rollback if it's not an auth-related error (since we allow DB success despite auth failure)
    if (
      !err.message.includes('AuthApiError') &&
      !err.message.includes('user_not_found')
    ) {
      await editUser(userId, previousUserData);
    }
    throw err;
  }
};

// Export it if needed elsewhere
exports.editUserCore = editUserCore;
// -------------------Single User Edit Controller------------------- //
exports.editUserController = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  const { user_id } = req.params;
  const updatedData = req.body;

  try {
    const updatedUser = await editUserCore(user_id, updatedData);

    // Log audit
    await createAuditRecord({
      user_id: req.user?.user_id || '22-10265',
      action: `Edit user ${updatedUser.first_name} ${updatedUser.last_name}`,
      remarks: 'Success',
      date: updatedUser.updated_at || new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully!',
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// -------------------Bulk Edit Users Controller (Parallel)------------------- //
exports.bulkEditUsersController = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  const updatedUsers = req.body; // array of { user_id, ...updatedData }

  const updatePromises = updatedUsers.map(async (userData) => {
    try {
      const updatedUser = await editUserCore(userData.user_id, userData);
      return { success: true, user: updatedUser };
    } catch (err) {
      return {
        success: false,
        user_id: userData.user_id,
        message: err.message,
      };
    }
  });

  const results = await Promise.all(updatePromises);

  const updated = results.filter((r) => r.success).map((r) => r.user);
  const failed = results.filter((r) => !r.success);

  // Log audit for bulk edit
  if (updated.length > 0) {
    const userNames = updated.map(u => `${u.first_name} ${u.last_name}`).join(', ');
    await createAuditRecord({
      user_id: req.user?.user_id || '22-10265',
      action: `Bulk edit user(s): ${userNames}`,
      remarks: 'Success',
      date: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    success: failed.length === 0,
    updated,
    failed,
  });
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    // Fetch all data in parallel
    const [usersRes, teacherSubjectsRes, sectionsRes] = await Promise.all([
      supabase
        .from('users_info')
        .select(
          `
          user_id,
          first_name,
          middle_initial,
          last_name,
          suffix,
          email,
          role,
          status,
          handled_subject_ids,
          handled_subjects,
          handled_section_ids,
          advised_section_ids,
          advised_sections,
          created_at,
          updated_at
          `,
        )
        .order('created_at', { ascending: false }),

      supabase.from('teacher_subjects').select('*'),
      supabase.from('sections').select('*'),
    ]);

    // Error handling
    if (usersRes.error) throw usersRes.error;
    if (teacherSubjectsRes.error) throw teacherSubjectsRes.error;
    if (sectionsRes.error) throw sectionsRes.error;

    const usersData = usersRes.data || [];
    const teacherSubjects = teacherSubjectsRes.data || [];
    const sections = sectionsRes.data || [];

    const formattedUsers = usersData.map((user) => {
      // Handled subjects parsing
      let handledSubjectsArray = [];
      if (Array.isArray(user.handled_subjects)) {
        handledSubjectsArray = user.handled_subjects.map((s) =>
          s ? s.toString().trim() : '',
        );
      } else if (typeof user.handled_subjects === 'string') {
        handledSubjectsArray = user.handled_subjects
          .split(',')
          .map((s) => s.trim());
      }

      // Adviser sections parsing
      let advisedSectionsArray = [];
      if (Array.isArray(user.advised_section_ids)) {
        advisedSectionsArray = user.advised_section_ids.map((s) =>
          s ? s.toString().trim() : '',
        );
      } else if (typeof user.advised_section_ids === 'string') {
        advisedSectionsArray = user.advised_section_ids
          .split(',')
          .map((s) => s.trim());
      }

      // Combine handled subjects with section + grade level
      const teacherSubs = teacherSubjects.filter(
        (t) => t.teacher_id === user.user_id,
      );

      const handledSubjectsWithGrade = teacherSubs.map((t, idx) => {
        const section = sections.find((s) => s.section_id === t.section_id);
        const sectionName = section ? section.section_name : 'Unknown';
        const gradeLevel = section ? section.grade_level : 'N/A';

        // Pick subject name properly (avoid duplicating section name)
        let subjectName = 'Unknown Subject';

        // Get subject name from handled_subjects array if it exists
        if (handledSubjectsArray[idx]) {
          // Remove any existing section name part to prevent duplication
          subjectName = handledSubjectsArray[idx]
            .split('-')[0] // take only the subject name before the first dash
            .trim();
        }

        // Clean and simple format: Subject - SectionName (GradeLevel)
        return `${subjectName} - ${sectionName} (${gradeLevel})`;
      });

      return {
        ...user,
        handled_subjects:
          handledSubjectsWithGrade.length > 0
            ? handledSubjectsWithGrade
            : handledSubjectsArray,
        advised_section_ids: advisedSectionsArray,
        isSubjectTeacher: handledSubjectsWithGrade.length > 0 ? 1 : 0,
        isAdviser: advisedSectionsArray.length > 0 ? 1 : 0,
      };
    });

    // Fetch total count
    const { count, error: countError } = await supabase
      .from('users_info')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    res.status(200).json({ success: true, users: formattedUsers, totalCount: count || 0 });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --------- Delete Users Controller ---------
exports.deleteUsers = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }

  try {
    const { userIds } = req.body;
    console.log('deleteUsers function called with body:',req.body)


    if (!userIds || userIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No users selected for deletion' });
    }

    // Fetch users by IDs
    const users = await getUsersByIds(userIds);

    // Validate that all users have auth_user_id
    const usersWithoutAuth = users.filter((user) => !user.auth_user_id);
    if (usersWithoutAuth.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete users without auth entries: ${usersWithoutAuth
          .map((u) => u.user_id)
          .join(', ')}`,
      });
    }

    // Track deletion results
    const deletionResults = {
      authDeleted: [],
      authFailed: [],
      dbDeleted: [],
      dbFailed: [],
    };

    // Delete from Supabase Auth first (collect all auth user IDs)
    const authUserIds = users.map((user) => user.auth_user_id).filter(Boolean);

    console.log('Auth user ID to delete:', authUserIds);

    for (const authUserId of authUserIds) {
      try {
        console.log(`Attempting to delete auth user: ${authUserId}`);
        const deleteResponse = await supabase.auth.admin.deleteUser(authUserId);
        console.log(`Auth user ${authUserId} deleted successfully:`, deleteResponse);
        deletionResults.authDeleted.push(authUserId);
      } catch (authError) {
        console.error(`Failed to delete auth user ${authUserId}:`, authError);
        deletionResults.authFailed.push({
          authUserId,
          error: authError.message,
        });
      }
    }

    // If any auth deletions failed, don't proceed with DB deletion
    if (deletionResults.authFailed.length > 0) {
      return res.status(500).json({
        success: false,
        message: `Failed to delete ${deletionResults.authFailed.length} auth user(s). Database deletion cancelled.`,
        details: {
          authDeleted: deletionResults.authDeleted.length,
          authFailed: deletionResults.authFailed,
          dbDeleted: 0,
          dbFailed: 0,
        },
      });
    }

    // If all auth deletions succeeded, delete from app database
    try {
      await deleteUsersByIds(userIds);
      deletionResults.dbDeleted = userIds;
    } catch (dbError) {
      console.error('Failed to delete from database:', dbError);

      // Attempt to rollback auth deletions
      console.log('Attempting to rollback auth deletions...');
      let rollbackCount = 0;
      for (const authUserId of deletionResults.authDeleted) {
        try {
          // Note: You cannot actually restore a deleted auth user, but we log this
          console.warn(
            `Auth user ${authUserId} was deleted but database deletion failed - manual intervention may be required`,
          );
          rollbackCount++;
        } catch (rollbackError) {
          console.error(
            `Failed to rollback auth user ${authUserId}:`,
            rollbackError,
          );
        }
      }

      return res.status(500).json({
        success: false,
        message:
          'Database deletion failed after auth deletion. Manual cleanup may be required.',
        details: {
          authDeleted: deletionResults.authDeleted.length,
          authFailed: deletionResults.authFailed.length,
          dbDeleted: 0,
          dbFailed: userIds.length,
          rollbackAttempted: rollbackCount,
        },
      });
    }

    const deletedCount = userIds.length;

    // Log audit for each deleted user
    for (const user of users) {
      await createAuditRecord({
        user_id: req.user?.user_id || '22-10265',
        action: `Delete the user name ${user.first_name} ${user.last_name}`,
        remarks: 'Success',
        date: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: `${deletedCount} user(s) deleted successfully.`,
      details: {
        deletedCount,
        authDeleted: deletionResults.authDeleted.length,
        dbDeleted: deletionResults.dbDeleted.length,
        fromAppDB: deletedCount,
      },
    });
  } catch (err) {
    console.error('Error deleting users:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
