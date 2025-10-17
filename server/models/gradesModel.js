const { supabaseAdmin: supabase } = require('../config/supabaseAdmin');

// -------------------Upload Grades Model-------------------
exports.uploadGrades = async (gradesData, subjectDetails) => {
  const results = {
    successCount: 0,
    duplicateCount: 0,
    invalidGradeCount: 0,
    missingCount: 0,
    invalidStudentCount: 0,
    errorCount: 0,
    duplicateDetails: [],
    invalidGradeDetails: [],
    invalidStudentDetails: [],
    errorDetails: [],
  };

  // Collect unique LRNs for validation
  const lrns = [...new Set(gradesData.map((row) => row.lrn))];

  // Validate students' grade and section
  const { data: students, error: studentError } = await supabase
    .from('student_info')
    .select('*')
    .in('lrn', lrns);
 
  if (studentError) {
    throw new Error('Error fetching student data');
  }

  const studentMap = new Map(
    students.map((s) => {
      // Parse grade_and_section format: "5 - Matayaga" 
      const gradeAndSection = s.grade_and_section || '';
      const [gradeLevel, sectionName] = gradeAndSection.split(' - ').map(str => str.trim());
      
      return [
        s.lrn,
        { 
          grade_level: gradeLevel || 'undefined', 
          section_name: sectionName || 'undefined' 
        },
      ];
    }),
  );

  for (const row of gradesData) {
    const { lrn, subject_id, teacher_id, school_year_id, quarter, grade } = row;

    // Validate LRN
    const lrnStr = String(lrn || '').trim();
    if (!lrnStr) {
      results.missingCount += 1;
      continue;
    }

    // Validate student belongs to the subject's grade and section
    const student = studentMap.get(lrnStr);
    if (!student) {
      results.invalidStudentCount += 1;
      results.invalidStudentDetails.push(
        `Student with LRN ${lrnStr} is not enrolled`,
      );
      continue;
    }

    if (student.grade_level !== subjectDetails.grade_level) {
      results.invalidStudentCount += 1;
      results.invalidStudentDetails.push(
        `Student with LRN ${lrnStr} is in grade ${student.grade_level}, not grade ${subjectDetails.grade_level}`,
      );
      continue;
    }

    if (student.section_name !== subjectDetails.section_name) {
      results.invalidStudentCount += 1;
      results.invalidStudentDetails.push(
        `Student with LRN ${lrnStr} is enrolled in section ${student.section_name}, not section ${subjectDetails.section_name}`,
      );
      continue;
    }

    // Validate grade
    if (
      grade === undefined ||
      grade === null ||
      isNaN(grade) ||
      grade < 0 ||
      grade > 100
    ) {
      results.invalidGradeCount += 1;
      results.invalidGradeDetails.push(
        `${lrnStr} (invalid grade value: ${grade})`,
      );
      continue;
    }

    // Check for duplicates
    const { data: existingGrade, error: checkError } = await supabase
      .from('grades')
      .select('grade_id')
      .eq('lrn', lrnStr)
      .eq('subject_id', subject_id)
      .eq('quarter', quarter)
      .eq('school_year_id', school_year_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found"
      results.errorCount += 1;
      results.errorDetails.push(
        `${lrnStr} (error checking duplicate: ${checkError.message})`,
      );
      continue;
    }

    if (existingGrade) {
      results.duplicateCount += 1;
      results.duplicateDetails.push(lrnStr);
      continue;
    }

    // Insert the grade
    const { error: insertError } = await supabase.from('grades').insert({
      lrn: lrnStr,
      subject_id,
      teacher_id,
      school_year_id,
      quarter,
      grade: Number(grade.toFixed(2)),
    });

    if (insertError) {
      results.errorCount += 1;
      results.errorDetails.push(`${lrnStr} (${insertError.message})`);
    } else {
      results.successCount += 1;
    }
  }

  return results;
};

// -------------------Get Grades Model-------------------
exports.getGrades_Upload = async (teacherId) => {
  const { data, error } = await supabase
    .from('grade_upload')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform data to match frontend expectations
  const formattedData = data.map((grade) => ({
    id: grade.grade_id,
    lrn: grade.lrn,
    student_name: grade.student_name,
    subject: `${grade.subject_name} `,
    grade_section: `${grade.grade_level}-${grade.section_name}`,
    school_year: grade.school_year,
    quarter: grade.quarter_label,
    grade: parseFloat(grade.grade),
    uploaded_date: grade.created_at,
  }));

  return formattedData;
};

// Helper function to get active school year
exports.getActiveSchoolYear = async () => {
  const { data, error } = await supabase
    .from('school_years')
    .select('*')
    .eq('status', 'Active')
    .single();

  if (error) throw error;
  return data;
};

// Helper function to validate subject and teacher
exports.validateSubjectTeacher = async (subject_id, teacher_id) => {
  const { data, error } = await supabase
    .from('teacher_subjects')
    .select('teacher_subject_id')
    .eq('subject_id', subject_id)
    .eq('teacher_id', teacher_id)
    .single();

  if (error || !data) {
    throw new Error('Teacher is not assigned to this subject');
  }
  return true;
};

// Helper function to get subject details
exports.getSubjectDetails = async (subject_id) => {
  const { data, error } = await supabase
    .from('teachers_assigned_subjects')
    .select('*')
    .eq('subject_id', subject_id)
    .single();

  if (error) throw error;
  return data;
};

// -------------------Delete Grades Model-------------------
exports.deleteGrades = async (gradeIds) => {
  const { data, error } = await supabase
    .from('grades')
    .delete()
    .in('grade_id', gradeIds);

  if (error) throw error;
  return data;
};

// -------------------Delete Grades by LRN Model-------------------
exports.deleteGradesByLrn = async (lrns) => {
  // First, get all grade_ids for the given lrns
  const { data: grades, error: fetchError } = await supabase
    .from('grades')
    .select('grade_id')
    .in('lrn', lrns);

  if (fetchError) throw fetchError;

  if (!grades || grades.length === 0) {
    return { deletedCount: 0 };
  }

  const gradeIds = grades.map((grade) => grade.grade_id);

  // Then delete using grade_ids
  const { error: deleteError } = await supabase
    .from('grades')
    .delete()
    .in('grade_id', gradeIds);

  if (deleteError) throw deleteError;

  return { deletedCount: gradeIds.length };
};
