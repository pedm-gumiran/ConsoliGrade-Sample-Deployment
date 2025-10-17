import React, { useState, useRef, useEffect } from 'react';
import SearchBar from '../../../components/InputFields/SearchBar';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import Dropdown from '../../../components/InputFields/Dropdown';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import AddSubjectModal from '../../../components/ModalForms/Admin/AddSubject';
import ImportSubjectsModal from '../../../components/ModalForms/Bulk Modals/ImportModal.jsx';
import BulkEditModal from '../../../components/ModalForms/Bulk Modals/BulkEditModal';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import { toast } from 'react-toastify';
import useSubjects from '../../../context/crud_hooks/fetch/useSubjects.js';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import { addRecord } from '../../../context/crud_hooks/post/addRecord.js';
import { updateRecords } from '../../../context/crud_hooks/put/updateRecord.js';
import ViewModal from '../../../components/ModalForms/ViewModal.jsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../../../supabaseClient';

export default function Manage_Subjects() {
  const [search, setSearch] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [exportType, setExportType] = useState('');
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [viewSubject, setViewSubject] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { subjects, refetch, loading } = useSubjects();

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
  // ===================Functions Here=============================
  //------------- 1.Function for confirm delete--------------
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    subjectsToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });

  // ----------open modal for specific subject

  const handleViewSubject = (subject) => {
    setViewSubject(subject);
    setIsOpenViewModal(true);
  };

  //-------------For handling search-----------------
  const handleSearch = (e) => setSearch(e.target.value);

  // -----------------For the filtered subjects---------------

  const filteredSubjects = subjects.filter((s) =>
    `${s.subject_id} ${s.subject_name} ${s.grade_level}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // ----------For dynamically opening or closing of the modal-------------

  const openModal = (subject = null) => {
    setEditSubject(subject);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditSubject(null);
    setIsModalOpen(false);
  };

  // ==============For CRUD operations for subjects====================
  // ----------------For Adding Single Subject--------------------
  const handleAddSubject = async (newSubject) => {
    try {
      const now = new Date().toISOString();

      const subjectWithDates = {
        subject_name: newSubject.subject_name.trim(),
        grade_level: newSubject.grade_level,
        created_at: now,
        updated_at: null,
      };

      const { error } = await addRecord('subjects', subjectWithDates);

      if (error) {
        // Supabase/Postgres specific error handling
        if (error.code === '23505') {
          // 23505 = unique_violation in Postgres
          toast.error('Duplicate entry: This subject already exists.');
        } else {
          toast.error(`Failed to add subject: ${error.message}`);
        }
        return false; // indicate failure
      }

      await refetch(); // refresh table
      toast.success('Subject added successfully!');
      return true; // indicate success
    } catch (err) {
      // handle unexpected errors
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };

  // --------------------Add Multiple Subjects via Excel Import--------------------
  const handleAddSubjectsFromExcel = async (newSubjects) => {
    if (!newSubjects || newSubjects.length === 0) {
      toast.error('No subject data found in the Excel file.');
      return false;
    }

    try {
      const now = new Date().toISOString();
      const subjectRecords = [];

      // Loop through each subject from Excel
      for (const subject of newSubjects) {
        if (!subject['Subject Name'] || !subject['Grade Level']) {
          console.warn('Invalid subject data:', subject);
          toast.warning('Skipped invalid subject entry.');
          continue;
        }

        // Check for duplicate subject in database
        const { data, error } = await supabase
          .from('subjects')
          .select('subject_id')
          .eq('subject_name', subject['Subject Name'].trim())
          .eq('grade_level', subject['Grade Level'].toString().trim())
          .limit(1);
        if (error) {
          toast.error('Error checking for existing subjects: ' + error.message);
          return false;
        }
        if (data && data.length > 0) {
          toast.warning(`Subject "${subject['Subject Name']}" for grade ${subject['Grade Level']} already exists. Skipped.`);
          continue;
        }

        // Add to subject table insert list
        subjectRecords.push({
          subject_name: subject['Subject Name'].trim(),
          grade_level: subject['Grade Level'].toString().trim(),
          created_at: now,
          updated_at: null,
        });
      }

      if (subjectRecords.length === 0) {
        toast.error('No valid subjects to import.');
        return false;
      }

      // Insert into subjects table (bulk insert)
      const { error: subjectError } = await supabase
        .from('subjects')
        .insert(subjectRecords);

      if (subjectError) {
        const errorMessage = subjectError.message.toLowerCase();

        let userFriendlyMessage =
          'An unexpected error occurred while adding subjects.';

        if (
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('unique constraint')
        ) {
          userFriendlyMessage =
            'Unable to add subjects because some subjects already exist.';
        } else if (errorMessage.includes('not null')) {
          userFriendlyMessage =
            'Please fill in all required fields before submitting.';
        }

        toast.error(userFriendlyMessage);
        console.error('Error inserting subjects:', subjectError.message);
        return false;
      }

      await refetch();
      console.log('Subjects inserted:', subjectRecords);
      toast.success(`${subjectRecords.length} subject(s) added successfully!`);
      return true;
    } catch (err) {
      toast.error(`Unexpected error during import: ${err.message}`);
      return false;
    }
  };

  // -----------------For Multiple subjects edit or single---------------------
  const handleBulkSave = async (updatedData) => {
    try {
      const now = new Date().toISOString();

      const recordsToUpdate = Object.entries(updatedData)
        .map(([id, values]) => {
          const original = subjects.find((s) => s.subject_id === Number(id));
          if (!original) return null; // skip if original not found

          const hasChanges = Object.keys(values).some(
            (key) => values[key] !== original[key],
          );
          if (!hasChanges) return null; // skip if no changes

          return { subject_id: id, ...values, updated_at: now };
        })
        .filter(Boolean);

      if (recordsToUpdate.length === 0) {
        toast.info('No changes detected.');
        return;
      }
      const { error } = await updateRecords(
        'subjects',
        'subject_id',
        recordsToUpdate,
      );

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate entry: This subject already exists.');
        } else {
          toast.error(`Failed to update subject(s): ${error.message}`);
        }
        return false; // indicate failure
      }

      await refetch();
      toast.success(`${recordsToUpdate.length} subject${recordsToUpdate.length !== 1 ? 's' : ''} updated successfully!`);
      setSelectedSubjects([]);
      return true; // indicate success
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false; // indicate failure
    }
  };

  // -----------------Delete Handler--------------------
  const confirmDeleteSubjects = (subjectsToDeleteArray, message) => {
    setConfirmDelete({
      isOpen: true,
      subjectsToDelete: subjectsToDeleteArray,
      message,
      title: 'Confirm Delete',
    });
  };
  // -----------------Delete Confirmation-------------------
  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.subjectsToDelete;

    if (!idsToDelete || idsToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete from related tables first to avoid foreign key constraints
      // 1. Delete from teacher_assigned_subjects
      const { error: teacherSubjectsError } = await supabase
        .from('teacher_subjects')
        .delete()
        .in('subject_id', idsToDelete);

      if (teacherSubjectsError) {
        console.warn(
          'Could not delete from teachers_assigned_subjects:',
          teacherSubjectsError.message,
        );
        // Continue anyway as this table might not exist or be empty
      }

      // 2. Finally delete from subjects table
      const { error: subjectError } = await supabase
        .from('subjects')
        .delete()
        .in('subject_id', idsToDelete);

      if (subjectError) {
        toast.error(`Failed to delete subjects: ${subjectError.message}`);
        return;
      }

      // Success
      await refetch();
      toast.success(`${idsToDelete.length} subject(s) deleted successfully!`);
      setSelectedSubjects((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );
      setConfirmDelete({
        isOpen: false,
        subjectsToDelete: [],
        message: '',
        title: '',
      });
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------Handling cancel of delete
  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      subjectsToDelete: [],
      message: '',
      title: '',
    });
    setSelectedSubjects([]);
  };

  //==================For  data exporting here=======================


  // --------------------------For Excel export---------------------
  const exportToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Subjects');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'Subject ID', key: 'subject_id', width: 15 },
      { header: 'Subject Name', key: 'subject_name', width: 20 },
      { header: 'Grade Level', key: 'grade_level', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    // Add rows for each subject
    data.forEach((subject) =>
      worksheet.addRow({
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        grade_level: subject.grade_level,
        created_at: formatDate(subject.created_at),
        updated_at: formatDate(subject.updated_at),
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
      `Subject_Exports(${new Date().toISOString().split('T')[0]}).xlsx`,
    );
    
  };
  // --------------------For handling the export Excel----------
  const handleExport = (e) => {
    const type = e.target.value;
    if (!type) return;

    const selectedData = subjects.filter((s) =>
      selectedSubjects.includes(s.subject_id),
    );
    const dataToExport =
      selectedData.length > 0 ? selectedData : filteredSubjects;

    if (type === 'excel') exportToExcel(dataToExport);

    setExportType('');
  };

  // ----------This are the columns displayed------------------
  const columns = [
    { key: 'subject_name', label: 'Subject Name' },
    { key: 'grade_level', label: 'Grade Level' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (value) => formatDate(value),
    },
    {
      key: 'updated_at',
      label: 'Updated At',
      render: (value) => formatDate(value),
    },
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
              placeholder="Search subjects..."
            />
            <div className="relative w-full md:w-auto">
              <Button
                label="Add Subject"
                className="bg-primary text-white hover:bg-primary/90 flex items-center w-full md:w-auto"
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
                      openModal();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Single Subject
                  </button>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Import Subjects
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedSubjects.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-700">
                {selectedSubjects.length} subject(s) selected
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Export Dropdown */}
              <Dropdown
                label=""
                name="export"
                placeholder="Export as..."
                value={exportType}
                onChange={handleExport}
                options={[{ label: 'Export as Excel', value: 'excel' }]}
                className="min-w-[140px]"
              />

              {/* Bulk Edit Button */}
              <Button
                label="Edit"
                onClick={() => setIsBulkEditModalOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700"
                icon={<FaEdit />}
              />

              {/* Bulk Delete Button */}
              <Button
                label="Delete"
                onClick={() =>
                  confirmDeleteSubjects(
                    selectedSubjects,
                    `Are you sure you want to delete ${selectedSubjects.length} subject(s)? This action cannot be undone.`,
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
            {filteredSubjects.length} subject
            {filteredSubjects.length !== 1 && 's'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredSubjects}
          selectable
          selected={selectedSubjects}
          onSelect={setSelectedSubjects}
          onSelectAll={setSelectedSubjects}
          keyField="subject_id"
          loading={loading}
          actions={(subject) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye />}
                onClick={() => handleViewSubject(subject)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-3"
                title="View Details"
              />
            </div>
          )}
        />
      </div>

      {/* Add Subject Modal */}
      {isModalOpen && !editSubject && (
        <AddSubjectModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleAddSubject}
        />
      )}

      {/* Import Subjects Modal */}
      {isImportModalOpen && (
        <ImportSubjectsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (newSubjects) => {
            const success = await handleAddSubjectsFromExcel(newSubjects);
            if (success) {
              setIsImportModalOpen(false);
            }
          }}
          title="Import_Subjects_Template"
          requiredColumns={['Subject Name', 'Grade Level']}
        />
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setSelectedSubjects([]);
        }}
        data={subjects}
        selectedIds={selectedSubjects}
        onSave={handleBulkSave}
        config={{
          keyField: 'subject_id',
          title: 'Bulk Edit Subjects',
          subtitle: 'Update multiple subjects at once',
          fields: [
            { name: 'subject_name', label: 'Subject Name', type: 'text' },
            {
              name: 'grade_level',
              label: 'Grade Level',
              type: 'dropdown',
              options: ['4', '5', '6'],
            },
          ],
          getDisplayName: (s) => `${s.subject_name} (Grade ${s.grade_level})`,
        }}
      />

      {/* Confirmation Modal */}
      {confirmDelete.isOpen && (
        <ConfirmationBox
          title={confirmDelete.title}
          message={confirmDelete.message}
          onConfirm={handleDeleteConfirmed}
          onCancel={handleCancelDelete}
          label={'Yes, Delete'}
          isLoading={isDeleting}
        />
      )}

      {/* For View Modal */}
      {isViewModalOpen && viewSubject && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsOpenViewModal(false);
            setViewSubject(null);
          }}
          title="Subject Details"
          data={viewSubject}
        />
      )}
    </div>
  );
}
