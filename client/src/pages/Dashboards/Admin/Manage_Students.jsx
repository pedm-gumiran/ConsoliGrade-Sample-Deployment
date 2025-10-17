import React, { useState, useRef, useEffect } from 'react';
import SearchBar from '../../../components/InputFields/SearchBar';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import Dropdown from '../../../components/InputFields/Dropdown';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import useSections from '../../../context/crud_hooks/fetch/useSection.js';
import useSchoolYears from '../../../context/crud_hooks/fetch/useActiveSchoolYear.js';
import AddStudentModal from '../../../components/ModalForms/Admin/AddStudent';
import ImportStudentsModal from '../../../components/ModalForms/Bulk Modals/ImportModal.jsx';
import BulkEditModal from '../../../components/ModalForms/Bulk Modals/BulkEditModal';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import ViewModal from '../../../components/ModalForms/ViewModal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import useStudents from '../../../context/crud_hooks/fetch/useStudents';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import { supabase } from '../../../supabaseClient';

export default function Manage_Students() {
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [exportType, setExportType] = useState('');
  const dropdownRef = useRef(null);

  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const { schoolYear } = useSchoolYears();
  console.log('Current School Year:', schoolYear);
  const { students, refetch, loading } = useStudents();
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    studentsToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { sections } = useSections();

  // Helper function to get full name
  const getFullName = (first, middle, last, suffix) => {
    return [first, middle, last, suffix].filter(Boolean).join(' ').trim();
  };

  // Handle View
  const handleViewStudent = (student) => {
    setViewStudent(student);
    setIsOpenViewModal(true);
  };

  // Search
  const handleSearch = (e) => setSearch(e.target.value);
  const filteredStudents = students.filter((s) =>
    `${s.lrn} ${s.first_name} ${s.last_name} ${s.status} ${s.grade_and_section}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ================= CRUD =================
  // -------------------Add  Single Student------------------------------
  const handleAddStudent = async (newStudent) => {
    try {
      const fullName = getFullName(
        newStudent.first_name,
        newStudent.middle_name,
        newStudent.last_name,
        newStudent.suffix,
      );

      // Check for duplicate LRN
      const existingLRN = students.find((s) => s.lrn === newStudent.lrn);
      if (existingLRN) {
        toast.error('Failed to add student because the LRN already exists.');
        return false;
      }

      // Check for duplicate name
      const existingName = students.find(
        (s) =>
          getFullName(s.first_name, s.middle_name, s.last_name, s.suffix) ===
          fullName,
      );
      if (existingName) {
        toast.error(
          'Failed to add student because a student with the same name already exists.',
        );
        return false;
      }

      // Check for duplicate LRN in database
      const { data: lrnData, error: lrnError } = await supabase
        .from('students')
        .select('lrn')
        .eq('lrn', String(newStudent.lrn).trim())
        .limit(1);
      if (lrnError) {
        toast.error(
          'Error checking for existing students: ' + lrnError.message,
        );
        return false;
      }
      if (lrnData && lrnData.length > 0) {
        toast.error(
          'Failed to add student because the LRN already exists in the database.',
        );
        return false;
      }

      // Check for duplicate name in database
      const { data: nameData, error: nameError } = await supabase
        .from('students')
        .select('first_name, last_name')
        .ilike('first_name', newStudent.first_name.trim())
        .ilike('last_name', newStudent.last_name.trim())
        .limit(1);
      if (nameError) {
        toast.error(
          'Error checking for existing students: ' + nameError.message,
        );
        return false;
      }
      if (nameData && nameData.length > 0) {
        toast.error(
          'Failed to add student because a student with the same first and last name already exists in the database.',
        );
        return false;
      }

      // Start by inserting the student record
      const { error: studentError } = await supabase.from('students').insert([
        {
          lrn: newStudent.lrn,
          first_name: newStudent.first_name,
          middle_name: newStudent.middle_name,
          last_name: newStudent.last_name,
          suffix: newStudent.suffix,
          sex: newStudent.sex,
          status: (newStudent.status || 'Active').trim(),
        },
      ]);

      if (studentError) {
        if (studentError.code === '23505') {
          toast.error(
            'Failed to add student because the LRN is already exists.',
          );
        } else {
          toast.error(`Failed to add student: ${studentError.message}`);
        }
        return false;
      }

      // Insert into student_sections
      const { error: sectionError } = await supabase
        .from('student_sections')
        .insert([
          {
            lrn: newStudent.lrn,
            section_id: newStudent.section_id,
            school_year_id: newStudent.school_year_id,
          },
        ]);

      if (sectionError) {
        // If section assignment fails, delete the student to avoid orphaned record
        await supabase.from('students').delete().eq('lrn', newStudent.lrn);
        toast.error(`Failed to assign section: ${sectionError.message}`);
        return false;
      }

      await refetch();
      toast.success('Student added successfully!');
      return true;
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };

  // --------------------Add Multiple Studets via Excel Import
  const handleAddStudentsFromExcel = async (newStudents) => {
    if (!newStudents || newStudents.length === 0) {
      toast.error('No student data found in the Excel file.');
      return false;
    }

    try {
      //Step 1: Fetch all sections from the database
      const { data: sections, error: sectionError } = await supabase
        .from('sections')
        .select('section_id, grade_level, section_name');

      if (sectionError) {
        toast.error('Error fetching sections: ' + sectionError.message);
        return false;
      }
      const studentRecords = [];
      const sectionRecords = [];
      const errors = [];
      const invalidSections = [];

      //Step 2: Loop through each student from Excel
      for (const student of newStudents) {
        // Validate required fields
        if (!student.LRN || !student['First Name'] || !student['Last Name']) {
          errors.push(`Missing required fields (LRN, First Name, Last Name) for student: ${student.LRN || student['First Name'] + ' ' + student['Last Name'] || 'unknown'}`);
          continue;
        }

        //  Split Grade & Section like "4 - Matatag"
        const [grade_level_raw, section_name_raw] = student['Grade & Section']
          ? student['Grade & Section'].split('-').map((s) => s.trim())
          : [null, null];

        if (!grade_level_raw || !section_name_raw) {
          errors.push(`Invalid Grade & Section format for LRN ${student.LRN}`);
          continue;
        }

        //  Find the matching section
        const matchingSection = sections.find(
          (sec) =>
            sec.grade_level.trim().toLowerCase() ===
              grade_level_raw.trim().toLowerCase() &&
            sec.section_name.trim().toLowerCase() ===
              section_name_raw.trim().toLowerCase(),
        );

        if (!matchingSection) {
          invalidSections.push(student.LRN);
          continue;
        }
        // Add to student table insert list
        studentRecords.push({
          lrn: student.LRN,
          first_name: student['First Name'],
          middle_name: student['Middle Name'],
          last_name: student['Last Name'],
          suffix: student.Suffix,
          sex: student.Sex,
          status: 'Active',
        });

        // Add to student_sections table insert list
        sectionRecords.push({
          lrn: student.LRN,
          section_id: matchingSection.section_id,
          school_year_id: schoolYear.school_year_id, //
        });
      }

      // Check for validation errors
      if (errors.length > 0 || invalidSections.length > 0) {
        let errorMessage = '';
        if (errors.length > 0) {
          errorMessage += `Validation errors: ${errors.join('; ')}`;
        }
        if (invalidSections.length > 0) {
          if (errorMessage) errorMessage += '; ';
          errorMessage += `The sections for students with LRNs ${invalidSections.join(', ')} are not valid.`;
        }
        toast.error(errorMessage);
        return false;
      }

      // Step 3: Check for duplicates within the imported data
      // Check for duplicate LRNs in file
      const lrnsInFile = studentRecords.map((s) => s.lrn);
      const uniqueLrnsInFile = new Set(lrnsInFile);
      if (uniqueLrnsInFile.size < lrnsInFile.length) {
        const duplicateLrns = lrnsInFile.filter(
          (lrn, index) => lrnsInFile.indexOf(lrn) !== index,
        );
        const uniqueDuplicateLrns = [...new Set(duplicateLrns)];
        toast.error(
          `Duplicate LRNs in the imported file: (${uniqueDuplicateLrns.join(
            ', ',
          )}). Please remove duplicates from your Excel file.`,
        );
        return false;
      }

      // Check for duplicate names in file (first name + last name)
      const namesInFile = studentRecords.map(
        (s) =>
          `${s.first_name.trim().toLowerCase()} ${s.last_name
            .trim()
            .toLowerCase()}`,
      );
      const uniqueNamesInFile = new Set(namesInFile);
      if (uniqueNamesInFile.size < namesInFile.length) {
        const duplicateNames = namesInFile.filter(
          (name, index) => namesInFile.indexOf(name) !== index,
        );
        const uniqueDuplicateNames = [...new Set(duplicateNames)];
        toast.error(
          `Duplicate names in the imported file: (${uniqueDuplicateNames.join(
            ', ',
          )}). Please remove duplicates from your Excel file.`,
        );
        return false;
      }

      // Step 4: Check for existing LRNs in the database
      const existingLrns = [];
      for (const lrn of uniqueLrnsInFile) {
        const { data, error } = await supabase
          .from('students')
          .select('lrn')
          .eq('lrn', String(lrn).trim())
          .limit(1);
        if (error) {
          toast.error('Error checking for existing students: ' + error.message);
          return false;
        }
        if (data && data.length > 0) {
          existingLrns.push(lrn);
        }
      }
      if (existingLrns.length > 0) {
        toast.error(
          `LRNs already exist in the database: (${existingLrns.join(', ')}).`,
        );
        return false;
      }

      // Step 5: Check for existing names in the database
      const existingNames = [];
      for (const record of studentRecords) {
        const { data: nameData, error: nameError } = await supabase
          .from('students')
          .select('first_name, last_name')
          .ilike('first_name', record.first_name.trim())
          .ilike('last_name', record.last_name.trim())
          .limit(1);
        if (nameError) {
          toast.error(
            'Error checking for existing students: ' + nameError.message,
          );
          return false;
        }
        if (nameData && nameData.length > 0) {
          existingNames.push(`${record.first_name} ${record.last_name}`);
        }
      }
      if (existingNames.length > 0) {
        const uniqueExistingNames = [...new Set(existingNames)];
        toast.error(
          `Names already exist in the database: (${uniqueExistingNames.join(
            ', ',
          )}).`,
        );
        return false;
      }

      // Step 6: Insert students first
      const studentResult = await supabase
        .from('students')
        .insert(studentRecords);

      if (studentResult.error) {
        const errorMessage = studentResult.error.message.toLowerCase();

        let userFriendlyMessage =
          'An unexpected error occurred while adding students.';

        if (errorMessage.includes('not null')) {
          userFriendlyMessage =
            'Please fill in all required fields before submitting.';
          toast.error(userFriendlyMessage);
        }

        console.error('Error inserting students:', studentResult.error.message); // log technical error
        return false;
      }

      // Then insert sections
      const sectionResult = await supabase
        .from('student_sections')
        .insert(sectionRecords);

      if (sectionResult.error) {
        // If section assignment fails, delete the inserted students to avoid orphaned records
        const lrnsToDelete = studentRecords.map((s) => s.lrn);
        await supabase.from('students').delete().in('lrn', lrnsToDelete);
        const errorMessage = sectionResult.error.message.toLowerCase();

        let userFriendlyMessage =
          'An unexpected error occurred while assigning student sections.';

        if (errorMessage.includes('foreign key')) {
          userFriendlyMessage =
            'The section you selected is not valid for this student.';
        } else if (errorMessage.includes('duplicate key')) {
          userFriendlyMessage =
            'Some students are already assigned to this section.';
        }

        toast.error(userFriendlyMessage);
        console.error('Error assigning sections:', sectionResult.error.message); // log technical error
        return false;
      }

      await refetch();
      console.log(' Students inserted:', studentRecords);
      console.log(' Sections assigned:', sectionRecords);
      toast.success(`${studentRecords.length} students added successfully!`);
      return true;
    } catch (err) {
      toast.error(`Unexpected error during import: ${err.message}`);
      return false;
    }
  };

  // ------------------handle bulk update-------------------
  const handleBulkSave = async (updatedData) => {
    try {
      const now = new Date().toISOString();

      // Prepare records that actually changed
      const recordsToUpdate = Object.entries(updatedData)
        .map(([lrn, values]) => {
          const original = students.find((s) => s.lrn === lrn);
          if (!original) return null;

          const hasChanges = Object.keys(values).some(
            (key) => values[key] !== original[key],
          );
          if (!hasChanges) return null;

          return { lrn, ...values };
        })
        .filter(Boolean);

      if (recordsToUpdate.length === 0) {
        toast.info('No changes detected.');
        return;
      }

      let successCount = 0;

      for (const record of recordsToUpdate) {
        // 1 Update the students table
        const { error: studentError } = await supabase
          .from('students')
          .update({
            first_name: record.first_name,
            middle_name: record.middle_name,
            last_name: record.last_name,
            suffix: record.suffix,
            sex: record.sex,
            status: record.status,

            updated_at: now,
          })
          .eq('lrn', record.lrn);

        if (studentError) {
          toast.error(
            `Failed to update student ${record.lrn}: ${studentError.message}`,
          );
          continue; // skip to next record
        }

        //  Update the student_sections table if section_id or school_year_id changed
        if (record.section_id || record.school_year_id) {
          const { error: sectionError } = await supabase
            .from('student_sections')
            .update({
              section_id: record.section_id,
              school_year_id: schoolYear.school_year_id,
              updated_at: now,
            })
            .eq('lrn', record.lrn);

          if (sectionError) {
            toast.error(
              `Failed to update section for ${record.lrn}: ${sectionError.message}`,
            );
            continue;
          }
        }

        successCount++; // Increment on successful update
      }

      if (successCount > 0) {
        await refetch();
        toast.success(`${successCount} student${successCount !== 1 ? 's' : ''} updated successfully!`);
        setSelectedStudents([]);
        return true;
      } else {
        toast.warning('No students were updated due to errors.');
        return false;
      }
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };

  // -----------------handle delete--------------------
  const confirmDeleteStudents = (studentsToDeleteArray, message) => {
    setConfirmDelete({
      isOpen: true,
      studentsToDelete: studentsToDeleteArray,
      message,
      title: 'Confirm Delete',
    });
  };
  // ---------------confirm delete--------------------------

  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.studentsToDelete;
    if (!idsToDelete || idsToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete from related tables first to avoid foreign key constraints
      // 1. Delete from student_sections
      const { error: sectionError } = await supabase
        .from('student_sections')
        .delete()
        .in('lrn', idsToDelete);

      if (sectionError) {
        toast.error(
          `Failed to delete student sections: ${sectionError.message}`,
        );
        return;
      }

      // 2. Delete from consolidated_grades (if exists)
      const { error: gradesError } = await supabase
        .from('consolidated_grades')
        .delete()
        .in('lrn', idsToDelete);

      if (gradesError) {
        console.warn(
          'Could not delete from consolidated_grades:',
          gradesError.message,
        );
        // Continue anyway as this table might not exist or be empty
      }

      // 3. Finally delete from students table
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .in('lrn', idsToDelete);

      if (studentError) {
        toast.error(`Failed to delete students: ${studentError.message}`);
        return;
      }

      // Success
      await refetch();
      toast.success(`${idsToDelete.length} student(s) deleted successfully!`);
      setSelectedStudents((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );
      setConfirmDelete({
        isOpen: false,
        studentsToDelete: [],
        message: '',
        title: '',
      });
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };
  // -----------------handle canceling delete---------------------------
  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      studentsToDelete: [],
      message: '',
      title: '',
    });
    setSelectedStudents([]);
  };


  // -----------------Export to Excel-----------------------------
  const exportToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'LRN', key: 'lrn', width: 15 },
      { header: 'First Name', key: 'first_name', width: 15 },
      { header: 'Middle Name', key: 'middle_name', width: 15 },
      { header: 'Last Name', key: 'last_name', width: 15 },
      { header: 'Suffix', key: 'suffix', width: 10 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Grade & Section', key: 'grade_and_section', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'School Year', key: 'school_year', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    // Add rows for each student
    data.forEach((student) =>
      worksheet.addRow({
        lrn: student.lrn,
        first_name: student.first_name,
        middle_name: student.middle_name || '',
        last_name: student.last_name,
        suffix: student.suffix || '',
        sex: student.sex,
        grade_and_section: student.grade_and_section,
        status: student.status,
        school_year: student.school_year,
        created_at: formatDate(student.created_at),
        updated_at: formatDate(student.updated_at),
      }),
    );

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCE6F1' }, // Light blue
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Auto-adjust column widths based on content
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      // Set width with some padding (minimum 10, maximum 50)
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `Student_Exports(${new Date().toISOString().split('T')[0]}).xlsx`,
    );
   
  };
  // ----------------Export usecase excel---------------------
  const handleExport = (e) => {
    const type = e.target.value;
    if (!type) return;

    const selectedData = students.filter((s) =>
      selectedStudents.includes(s.lrn),
    );
    const dataToExport =
      selectedData.length > 0 ? selectedData : filteredStudents;

    if (type === 'excel') exportToExcel(dataToExport);

    setExportType('');
  };

  // ================= Table Columns =================
  const columns = [
    { key: 'lrn', label: 'LRN' },
    { key: 'first_name', label: 'First Name' },
    { key: 'middle_name', label: 'Middle Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'suffix', label: 'Suffix' },

    { key: 'sex', label: 'Sex' },
    { key: 'grade_and_section', label: 'Grade & Section' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            val === 'Active'
              ? 'bg-green-100 text-green-700'
              : val === 'Inactive'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {val}
        </span>
      ),
    },
    { key: 'school_year', label: 'School Year' },
    { key: 'created_at', label: 'Created At', render: (v) => formatDate(v) },
    { key: 'updated_at', label: 'Updated At', render: (v) => formatDate(v) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Search and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div
            className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2"
            ref={dropdownRef}
          >
            <SearchBar
              value={search}
              onChange={handleSearch}
              placeholder="Search students..."
            />
            <div className="relative w-full md:w-auto">
              <Button
                label="Add Student"
                className="bg-primary text-white hover:bg-primary/90 flex items-center  w-full md:w-auto"
                icon={
                  isDropdownOpen ? (
                    <HiChevronUp size={20} />
                  ) : (
                    <HiChevronDown size={20} />
                  )
                }
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              />
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-full md:w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      setIsModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Single Student
                  </button>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Import Students
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm font-medium text-blue-700">
              {selectedStudents.length} student(s) selected
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dropdown
                placeholder="Export as..."
                value={exportType}
                onChange={handleExport}
                options={[{ label: 'Export as Excel', value: 'excel' }]}
                className="min-w-[140px]"
              />
              <Button
                label="Edit"
                onClick={() => setIsBulkEditModalOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700"
                icon={<FaEdit />}
              />
              <Button
                label="Delete"
                onClick={() =>
                  confirmDeleteStudents(
                    selectedStudents,
                    `Are you sure you want to delete ${selectedStudents.length} student(s)? This action cannot be undone.`,
                  )
                }
                className="bg-red-600 text-white hover:bg-red-700"
                icon={<FaTrash />}
              />
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          Results:{' '}
          <span className="font-semibold">
            {filteredStudents.length} student
            {filteredStudents.length !== 1 && 's'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredStudents}
          selectable
          selected={selectedStudents}
          onSelect={setSelectedStudents}
          onSelectAll={setSelectedStudents}
          keyField="lrn"
          loading={loading}
          actions={(student) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye />}
                onClick={() => handleViewStudent(student)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-3"
                title="View Details"
              />
            </div>
          )}
        />
      </div>

      {/* Modals */}
      {isModalOpen && (
        <AddStudentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleAddStudent}
        />
      )}

      {isImportModalOpen && (
        <ImportStudentsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (newStudents) => {
            const success = await handleAddStudentsFromExcel(newStudents);
            if (success) {
              setIsImportModalOpen(false); // Close modal only if successful
            }
          }}
          title="Import_Students_Template"
          requiredColumns={[
            'LRN',
            'First Name',
            'Middle Name',
            'Last Name',
            'Suffix',
            'Sex',
            'Grade & Section',
          ]}
        />
      )}

      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setSelectedStudents([]);
        }}
        data={students}
        selectedIds={selectedStudents}
        onSave={handleBulkSave}
        config={{
          keyField: 'lrn',
          title: 'Bulk Edit Students',
          subtitle: 'Update multiple student records',
          fields: [
            { name: 'lrn', label: 'LRN', type: 'text', disabled: true },
            { name: 'first_name', label: 'First Name', type: 'text' },
            { name: 'middle_name', label: 'Middle Name', type: 'text' },
            { name: 'last_name', label: 'Last Name', type: 'text' },
            { name: 'suffix', label: 'Suffix', type: 'text' },
            {
              name: 'sex',
              label: 'Sex',
              type: 'dropdown',
              options: ['Male', 'Female'],
            },
            {
              name: 'status',
              label: 'Status',
              type: 'dropdown',
              options: ['Active', 'Inactive', 'Drop'],
            },
            {
              name: 'section_id',
              label: 'Grade & Section',
              type: 'dropdown',
              options: sections.map((s) => ({
                value: s.section_id,
                label: `${s.grade_level} - ${s.section_name}`,
              })),
            },
          ],
          getDisplayName: (s) => `${s.first_name} ${s.last_name}  `,
        }}
      />
      {confirmDelete.isOpen && (
        <ConfirmationBox
          title={confirmDelete.title}
          message={confirmDelete.message}
          onConfirm={handleDeleteConfirmed}
          onCancel={handleCancelDelete}
          label="Yes, Delete"
          isLoading={isDeleting}
        />
      )}
      {isViewModalOpen && viewStudent && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsOpenViewModal(false);
            setViewStudent(null);
          }}
          title="Student Details"
          data={viewStudent}
          hiddenKeys={['id', 'section_id', 'school_year_id']}
        />
      )}
    </div>
  );
}
