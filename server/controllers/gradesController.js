const {
  uploadGrades,
  getGrades_Upload,
  getActiveSchoolYear,
  validateSubjectTeacher,
  getSubjectDetails,
  deleteGrades,
  deleteGradesByLrn,
} = require('../models/gradesModel');
const { createAuditRecord } = require('../models/auditModel');

// -------------------Upload Grades Controller-------------------
exports.uploadGrades = async (req, res) => {
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only teachers can upload grades',
    });
  }

  const { subject_id, quarter, grades } = req.body;
  const teacher_id = req.user.user_id;

  try {
    // Validate required fields
    if (!subject_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Subject selection is required' });
    }

    if (!teacher_id) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine the teacher profile',
      });
    }

    // Validate subject-teacher assignment
    await validateSubjectTeacher(subject_id, teacher_id);

    // Get subject details
    const subjectDetails = await getSubjectDetails(subject_id);

    // Get active school year
    const schoolYear = await getActiveSchoolYear();
    if (!schoolYear) {
      return res
        .status(400)
        .json({ success: false, message: 'No active school year found' });
    }

    // Validate grades array
    if (!Array.isArray(grades) || grades.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No grade rows detected' });
    }

    // Prepare data for model
    const gradesData = grades.map((row) => ({
      lrn: row.LRN,
      subject_id,
      teacher_id,
      school_year_id: schoolYear.school_year_id,
      quarter,
      grade: row.Grade,  
    }));

    // Upload grades
    const results = await uploadGrades(gradesData, subjectDetails);

    // Log audit
    const totalStudents = new Set(grades.map(row => row.LRN)).size;
    await createAuditRecord({
      user_id: teacher_id,
      action: `Upload grades for subject ${subjectDetails.subject_name} , quarter ${quarter}`,
      remarks: `Students: ${totalStudents}, Success: ${results.successCount}, Duplicates: ${results.duplicateCount}, Errors: ${results.errorCount}`,
      date: new Date().toISOString(),
    });

    // Prepare response message
    const messages = [];

    if (results.successCount > 0) {
      messages.push(
        `${results.successCount} grade record${
          results.successCount !== 1 ? 's were' : ' was'
        } uploaded successfully.`,
      );
    }

    if (results.duplicateCount > 0) {
      const listed = results.duplicateDetails.slice(0, 5).join(', ');
      const extra = results.duplicateDetails.length > 5 ? '…' : '';
      messages.push(
        `${results.duplicateCount} duplicate record${
          results.duplicateCount !== 1 ? 's were' : ' was'
        } skipped (${listed}${extra}).`,
      );
    }

    if (results.missingCount > 0) {
      messages.push(
        `${results.missingCount} row${
          results.missingCount !== 1 ? 's were' : ' was'
        } skipped for missing LRN.`,
      );
    }

    if (results.invalidGradeCount > 0) {
      const listed = results.invalidGradeDetails.slice(0, 5).join(', ');
      const extra = results.invalidGradeDetails.length > 5 ? '…' : '';
      messages.push(
        `${results.invalidGradeCount} row${
          results.invalidGradeCount !== 1 ? 's had' : ' had'
        } invalid grades (${listed}${extra}).`,
      );
    }

    if (results.invalidStudentCount > 0) {
      const listed = results.invalidStudentDetails.slice(0, 5).join(', ');
      const extra = results.invalidStudentDetails.length > 5 ? '…' : '';
      messages.push(
        `${results.invalidStudentCount} row${
          results.invalidStudentCount !== 1 ? 's' : ''
        } skipped (${listed}${extra}).`,
      );
    }

    if (results.errorCount > 0) {
      const listed = results.errorDetails.slice(0, 3).join('; ');
      const extra = results.errorDetails.length > 3 ? '…' : '';
      messages.push(
        `${results.errorCount} row${
          results.errorCount !== 1 ? 's encountered' : ' encountered'
        } an error (${listed}${extra}).`,
      );
    }

    const summary = messages.join(' ');

    if (results.successCount > 0) {
      return res.status(200).json({
        success: true,
        message: summary,
        results,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: summary || 'No grades were saved',
        results,
      });
    }
  } catch (err) {
    console.error('Error uploading grades:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------Get Grades Controller-------------------
exports.getUploaded_Grades = async (req, res) => {
  if (req.user.role !== 'Teacher') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only teachers can view grades',
    });
  }

  const teacherId = req.user.user_id;

  try {
    const grades = await getGrades_Upload(teacherId);

    res.status(200).json({
      success: true,
      grades,
      totalCount: grades.length,
    });
  } catch (err) {
    console.error('Error fetching grades:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------Delete Grades Controller-------------------
exports.deleteGrades = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only admins can delete raw grades',
    });
  }

  const { gradeIds } = req.body;

  if (!Array.isArray(gradeIds) || gradeIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No grade IDs provided',
    });
  }

  try {
    await deleteGrades(gradeIds);

    // Log audit
    await createAuditRecord({
      user_id: req.user.user_id,
      action: `Deleted ${gradeIds.length} raw grade records`,
      remarks: `Grade IDs: ${gradeIds.join(', ')}`,
      date: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `${gradeIds.length} grade record(s) deleted successfully`,
    });
  } catch (err) {
    console.error('Error deleting grades:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------Delete Consolidated Grades by LRN Controller-------------------
exports.deleteConsolidatedGrades = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only admins can delete consolidated grades',
    });
  }

  const { lrns } = req.body;

  if (!Array.isArray(lrns) || lrns.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No LRNs provided',
    });
  }

  try {
    const result = await deleteGradesByLrn(lrns);

    // Log audit
    await createAuditRecord({
      user_id: req.user.user_id,
      action: `Deleted consolidated grades for ${lrns.length} student(s)`,
      remarks: `LRNs: ${lrns.join(', ')} - ${result.deletedCount} grade records deleted`,
      date: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: `Consolidated grades for ${lrns.length} student(s) deleted successfully (${result.deletedCount} grade records removed)`,
    });
  } catch (err) {
    console.error('Error deleting consolidated grades:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
