const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

const USER_COLUMNS = [
  'user_id',
  'first_name',
  'middle_initial',
  'last_name',
  'suffix',
  'email',
  'role',
  'status',
  'auth_user_id',
];

// -------------------Create User------------------- //
exports.createUser = async (newUser, authUserId) => {
  try {
    const userPayload = {};

    // Keep only valid columns
    for (const key of USER_COLUMNS) {
      if (newUser[key] !== undefined) userPayload[key] = newUser[key];
    }

    userPayload.auth_user_id = authUserId;
    userPayload.status = userPayload.status || 'Active';

    // Check for duplicate user based on first_name and last_name
    if (userPayload.first_name && userPayload.last_name) {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('user_id')
        .eq('first_name', userPayload.first_name)
        .eq('last_name', userPayload.last_name);
      if (existingUsers && existingUsers.length > 0) {
        throw new Error(
          'A user with the same first name and last name already exists.',
        );
      }
    }

    const { data: userRecord, error } = await supabase
      .from('users')
      .insert([userPayload])
      .select('*');

    if (error) throw error;

    // Teacher / Adviser logic
    if (newUser.role === 'Teacher') {
      const teacherId = userRecord[0].user_id;

      // Assign subjects
      if (newUser.isSubjectTeacher && Array.isArray(newUser.subjects)) {
        for (const subject of newUser.subjects) {
          for (const sectionId of subject.sections) {
            await supabase.from('teacher_subjects').insert({
              teacher_id: teacherId,
              subject_id: subject.subject_id,
              section_id: sectionId,
            });
          }
        }
      }

      // Assign adviser section
      if (newUser.isAdviser && newUser.adviser_section) {
        await supabase.from('section_advisers').insert({
          section_id: newUser.adviser_section,
          teacher_id: teacherId,
          is_active: 1,
        });
      }
    }

    return userRecord[0];
  } catch (err) {
    if (err.code === '23505' && err.message.includes('users_pkey')) {
      throw new Error(
        'A user with this user ID already exists. Please choose a different user ID.',
      );
    } else {
      throw err;
    }
  }
};

// -------------------Edit User Model-------------------
exports.editUser = async (userId, updatedData) => {
  try {
    // Normalize userId to string and trim for consistent VARCHAR matching
    const normalizedUserId = String(userId).trim();
    console.log('Normalized userId for update:', normalizedUserId); // Temporary log for debugging

    const currentUser = await exports.getUserById(normalizedUserId);
    if (!currentUser) {
      console.error('User not found in getUserById for ID:', normalizedUserId);
      throw new Error(`User with ID "${normalizedUserId}" not found.`);
    }
    console.log('Current user fetched:', currentUser.user_id);

    const userPayload = {};

    // Keep only valid columns for update
    for (const key of USER_COLUMNS) {
      if (updatedData[key] !== undefined && key !== 'user_id') {
        userPayload[key] = updatedData[key];
      }
    }

    userPayload.updated_at = new Date().toISOString();
    console.log('User payload prepared:', userPayload);

    // Determine effective first_name and last_name
    const effectiveFirst =
      userPayload.first_name !== undefined
        ? userPayload.first_name
        : currentUser.first_name;
    const effectiveLast =
      userPayload.last_name !== undefined
        ? userPayload.last_name
        : currentUser.last_name;

    // Check for duplicate user based on first_name and last_name
    const { data: conflictingUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('first_name', effectiveFirst)
      .eq('last_name', effectiveLast)
      .neq('user_id', normalizedUserId);
    if (conflictingUsers && conflictingUsers.length > 0) {
      throw new Error(
        'Another user with the same first name and last name already exists.',
      );
    }

    // Update main user record
    console.log('Attempting update for userId:', normalizedUserId);
    const { data: updatedRows, error: updateError } = await supabase
      .from('users')
      .update(userPayload)
      .eq('user_id', normalizedUserId)
      .select('*');

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error('No rows updated for userId:', normalizedUserId);
      throw new Error(`User with ID "${normalizedUserId}" not found or update failed. Check if the ID matches a valid record.`);
    }

    const updatedUser = updatedRows[0];
    console.log('User updated successfully:', updatedUser.user_id);

    // -------------------- TEACHER LOGIC --------------------
    if (updatedData.role === 'Teacher') {
      // ----------- DELETE SUBJECTS IF NOT A SUBJECT TEACHER -----------
      if (!updatedData.isSubjectTeacher) {
        await supabase
          .from('teacher_subjects')
          .delete()
          .eq('teacher_id', normalizedUserId);
      }

      // ----------- HANDLE SUBJECTS -----------
      if (updatedData.isSubjectTeacher && Array.isArray(updatedData.subjects)) {
        // Step 1: Get existing subjects for this teacher
        const { data: existingSubjects, error: existingErr } = await supabase
          .from('teacher_subjects')
          .select('subject_id, section_id')
          .eq('teacher_id', normalizedUserId);

        if (existingErr) throw existingErr;

        const existingKeys = existingSubjects.map(
          (subj) => `${subj.subject_id}-${subj.section_id}`,
        );

        // Build incoming keys from updated data
        const incomingKeys = [];
        for (const subject of updatedData.subjects) {
          for (const sectionId of subject.sections) {
            incomingKeys.push(`${subject.subject_id}-${sectionId}`);
          }
        }

        // Insert only NEW assignments (skip existing ones)
        for (const subject of updatedData.subjects) {
          for (const sectionId of subject.sections) {
            const key = `${subject.subject_id}-${sectionId}`;
            if (!existingKeys.includes(key)) {
              const { error: insertError } = await supabase
                .from('teacher_subjects')
                .insert({
                  teacher_id: normalizedUserId,
                  subject_id: subject.subject_id,
                  section_id: sectionId,
                });

              if (insertError) throw insertError;
            }
          }
        }

        // Remove assignments that are no longer in the incoming data
        for (const existingSubj of existingSubjects) {
          const key = `${existingSubj.subject_id}-${existingSubj.section_id}`;
          if (!incomingKeys.includes(key)) {
            await supabase
              .from('teacher_subjects')
              .delete()
              .eq('teacher_id', normalizedUserId)
              .eq('subject_id', existingSubj.subject_id)
              .eq('section_id', existingSubj.section_id);
          }
        }
      }

      // ----------- ADVISER LOGIC -----------
      const { data: existingAdviser } = await supabase
        .from('section_advisers')
        .select('*')
        .eq('teacher_id', normalizedUserId)
        .single();

      if (existingAdviser) {
        await supabase
          .from('section_advisers')
          .delete()
          .eq('teacher_id', normalizedUserId);
      }

      if (updatedData.isAdviser && updatedData.adviser_section) {
        await supabase.from('section_advisers').insert({
          teacher_id: normalizedUserId,
          section_id: updatedData.adviser_section,
          is_active: 1,
        });
      }
    } else {
      // ----------- NON-TEACHER ROLE -----------
      await supabase.from('teacher_subjects').delete().eq('teacher_id', normalizedUserId);
      await supabase.from('section_advisers').delete().eq('teacher_id', normalizedUserId);
    }

    return updatedUser;
  } catch (err) {
    // Explicitly rethrow with a readable message
    throw new Error(
      err.message || 'An unexpected error occurred while editing user',
    );
  }
};

//--------- Get User By Email ---------
exports.getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // ignore no rows
  return data || null;
};

//  Correct version
exports.getUsersByIds = async (userIds) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('user_id', userIds); 

  if (error) throw error;
  return data;
};

// Get all users
exports.getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// --------- Get User By ID ---------
exports.getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', String(userId).trim())
    .maybeSingle(); // ensures only one record is returned

  if (error) throw error;
  return data;
};

//--------- Delete Users By IDs ---------

exports.deleteUsersByIds = async (userIds) => {
  const { error } = await supabase
    .from('users')
    .delete()
    .in('user_id', userIds);

  if (error) throw error;
};
