import React, { useState, useRef, useEffect } from 'react';
import SearchBar from '../../../components/InputFields/SearchBar';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import Dropdown from '../../../components/InputFields/Dropdown';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import AddSectionModal from '../../../components/ModalForms/Admin/AddSection';
import BulkEditModal from '../../../components/ModalForms/Bulk Modals/BulkEditModal';
import ImportStudentsModal from '../../../components/ModalForms/Bulk Modals/ImportModal.jsx';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import { toast } from 'react-toastify';
import ViewModal from '../../../components/ModalForms/ViewModal.jsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../../../supabaseClient';

import useSection from '../../../context/crud_hooks/fetch/useSection.js';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import { addRecord } from '../../../context/crud_hooks/post/addRecord.js';
import { updateRecords } from '../../../context/crud_hooks/put/updateRecord.js';

export default function Manage_Sections() {
  const [search, setSearch] = useState('');
  const [selectedSections, setSelectedSections] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [exportType, setExportType] = useState('');
  const { sections, refetch, loading } = useSection();
  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [viewSection, setViewSection] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============ Confirm Delete State ============
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    sectionsToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });

  // ----------open modal for specific subject

  const handleViewSection = (subject) => {
    setViewSection(subject);
    setIsOpenViewModal(true);
  };

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

  // ---------------- Search ----------------
  const handleSearch = (e) => setSearch(e.target.value);

  const filteredSections = sections.filter((s) =>
    `${s.section_id} ${s.section_name} ${s.grade_level}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // ---------------- Modal Handlers ----------------

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // ============== CRUD ===================
  // Add Section
  const handleAddSection = async (newSection) => {
    try {
      const sectionWithDates = {
        section_name: newSection.section_name.trim(),
        grade_level: newSection.grade_level,
      };

      const { error } = await addRecord('sections', sectionWithDates);

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate entry: This section already exists.');
        } else {
          toast.error(`Failed to add section: ${error.message}`);
        }
        return false;
      }

      await refetch();
      toast.success('Section added successfully!');
      return true;
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };

  // --------------------Add Multiple Sections via Excel Import
  const handleAddSectionsFromExcel = async (newSections) => {
    if (!newSections || newSections.length === 0) {
      toast.error('No section data found in the Excel file.');
      return false;
    }

    try {
      const existingKeys = new Set(
        sections.map(
          (sec) =>
            `${String(sec.grade_level).trim().toLowerCase()}|${sec.section_name
              .trim()
              .toLowerCase()}`,
        ),
      );

      let successfulCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      let missingCount = 0;
      const duplicateNames = [];

      for (const section of newSections) {
        const sectionName = section['Section Name']?.trim();
        const gradeLevelRaw = section['Grade Level'];
        const gradeLevel =
          gradeLevelRaw !== undefined ? String(gradeLevelRaw).trim() : '';

        if (!sectionName || !gradeLevel) {
          missingCount += 1;
          continue;
        }

        const key = `${gradeLevel.toLowerCase()}|${sectionName.toLowerCase()}`;
        if (existingKeys.has(key)) {
          duplicateCount += 1;
          duplicateNames.push(`${gradeLevel} - ${sectionName}`);
          continue;
        }

        const { error } = await addRecord('sections', {
          section_name: sectionName,
          grade_level: gradeLevel,
          status: 'Active',
        });

        if (error) {
          errorCount += 1;
          continue;
        }

        existingKeys.add(key);
        successfulCount += 1;
      }

      const describe = (count, singular, plural) =>
        `${count} ${count === 1 ? singular : plural}`;

      const messages = [];
      if (successfulCount > 0) {
        messages.push(
          `${describe(
            successfulCount,
            'section was',
            'sections were',
          )} added successfully.`,
        );
      }
      if (duplicateCount > 0) {
        messages.push(
          `${describe(
            duplicateCount,
            'duplicate section was',
            'duplicate sections were',
          )} skipped because they already exist (${duplicateNames.join(
            ', ',
          )}).`,
        );
      }
      if (missingCount > 0) {
        messages.push(
          `${describe(
            missingCount,
            'row was',
            'rows were',
          )} skipped for missing "Section Name" or "Grade Level".`,
        );
      }
      if (errorCount > 0) {
        messages.push(
          `${describe(
            errorCount,
            'row had an error',
            'rows had errors',
          )} while saving.`,
        );
      }

      const summary = messages.join(' ');

      if (successfulCount > 0) {
        await refetch();
        toast.success(summary || 'Sections imported successfully.');
        return true;
      }

      toast.warning(summary || 'No sections were processed from the file.');
      return false;
    } catch (err) {
      toast.error(`Unexpected error during import: ${err.message}`);

      return false;
    }
  };

  // Bulk Edit / Update
  const handleBulkSave = async (updatedData) => {
    try {
      const now = new Date().toISOString();

      const recordsToUpdate = Object.entries(updatedData)
        .map(([id, values]) => {
          const original = sections.find((s) => s.section_id === Number(id));
          if (!original) return null;

          const hasChanges = Object.keys(values).some(
            (key) => values[key] !== original[key],
          );
          if (!hasChanges) return null;

          return { section_id: id, ...values, updated_at: now };
        })
        .filter(Boolean);

      if (recordsToUpdate.length === 0) {
        toast.info('No changes detected.');
        return;
      }

      const { error } = await updateRecords(
        'sections',
        'section_id',
        recordsToUpdate,
      );

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate entry: This section already exists.');
        } else {
          toast.error(`Failed to update section(s): ${error.message}`);
        }
        return false;
      }

      await refetch();
      toast.success(`${recordsToUpdate.length} section${recordsToUpdate.length !== 1 ? 's' : ''} updated successfully!`);
      setSelectedSections([]);
      return true;
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };

  // Delete
  const confirmDeleteSections = (sectionsToDeleteArray, message) => {
    setConfirmDelete({
      isOpen: true,
      sectionsToDelete: sectionsToDeleteArray,
      message,
      title: 'Confirm Delete',
    });
  };

  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.sectionsToDelete;
    if (!idsToDelete || idsToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete from related tables first to avoid foreign key constraints
      // 1. Delete from student_sections
      const { error: studentSectionsError } = await supabase
        .from('student_sections')
        .delete()
        .in('section_id', idsToDelete);

      if (studentSectionsError) {
        toast.error(
          `Failed to delete student sections: ${studentSectionsError.message}`,
        );
        return;
      }

      // 2. Delete from teachers_assigned_subjects
      const { error: teacherSubjectsError } = await supabase
        .from('teacher_subjects')
        .delete()
        .in(
          'section_id',
          idsToDelete
            .map((id) => {
              // Convert section_id to section_name for the query
              const section = sections.find((s) => s.section_id === id);
              return section
                ? `${section.grade_level} - ${section.section_name}`
                : '';
            })
            .filter((name) => name),
        );

      if (teacherSubjectsError) {
        console.warn(
          'Could not delete from teacher_subjects:',
          teacherSubjectsError.message,
        );
      }

      // 4. Finally delete from sections table
      const { error: sectionError } = await supabase
        .from('sections')
        .delete()
        .in('section_id', idsToDelete);

      if (sectionError) {
        toast.error(`Failed to delete sections: ${sectionError.message}`);
        return;
      }

      // Success
      await refetch();
      toast.success(`${idsToDelete.length} section(s) deleted successfully!`);
      setSelectedSections((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );
      setConfirmDelete({
        isOpen: false,
        sectionsToDelete: [],
        message: '',
        title: '',
      });
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      sectionsToDelete: [],
      message: '',
      title: '',
    });
    setSelectedSections([]);
  };

  // ---------export to excel-------------------
  const exportToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sections');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'Section ID', key: 'section_id', width: 15 },
      { header: 'Grade Level', key: 'grade_level', width: 15 },
      { header: 'Section Name', key: 'section_name', width: 20 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    // Add rows for each section
    data.forEach((section) =>
      worksheet.addRow({
        section_id: section.section_id,
        grade_level: section.grade_level,
        section_name: section.section_name,
        created_at: formatDate(section.created_at),
        updated_at: formatDate(section.updated_at),
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
      `Section_Exports(${new Date().toISOString().split('T')[0]}).xlsx`,
    );

  };

  const handleExport = (e) => {
    const type = e.target.value;
    if (!type) return;

    const selectedData = sections.filter((s) =>
      selectedSections.includes(s.section_id),
    );
    const dataToExport =
      selectedData.length > 0 ? selectedData : filteredSections;

    if (type === 'excel') exportToExcel(dataToExport);

    setExportType('');
  };

  // ========== Table Columns ==========
  const columns = [
    { key: 'grade_level', label: 'Grade Level' },
    { key: 'section_name', label: 'Section Name' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            val === 'Active'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {val}
        </span>
      ),
    },
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
              placeholder="Search sections..."
            />
            <div className="relative w-full md:w-auto">
              <Button
                label="Add Section"
                className="bg-primary text-white hover:bg-primary/90 flex items-center w-full md:w-auto"
                icon={
                  isDropdownOpen ? (
                    <HiChevronUp size={18} />
                  ) : (
                    <HiChevronDown size={18} />
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
                    Single Section
                  </button>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Import Sections
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSections.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm font-medium text-blue-700">
              {selectedSections.length} section(s) selected
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
                  confirmDeleteSections(
                    selectedSections,
                    `Are you sure you want to delete ${selectedSections.length} section(s)? This action cannot be undone.`,
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
            {filteredSections.length} section
            {filteredSections.length !== 1 && 's'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredSections}
          selectable
          selected={selectedSections}
          onSelect={setSelectedSections}
          onSelectAll={setSelectedSections}
          keyField="section_id"
          loading={loading}
          actions={(section) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye />}
                onClick={() => handleViewSection(section)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-3"
                title="View Details"
              />
            </div>
          )}
        />
      </div>

      {/* Add Section Modal */}
      {isModalOpen && (
        <AddSectionModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={handleAddSection}
        />
      )}

      {/* Import Sections Modal */}
      {isImportModalOpen && (
        <ImportStudentsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (newSections) => {
            const success = await handleAddSectionsFromExcel(newSections);
            if (success) {
              setIsImportModalOpen(false);
            }
          }}
          title="Import_Sections_Template"
          requiredColumns={['Section Name', 'Grade Level']}
        />
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={isBulkEditModalOpen}
        onClose={() => {
          setIsBulkEditModalOpen(false);
          setSelectedSections([]);
        }}
        data={sections}
        selectedIds={selectedSections}
        onSave={handleBulkSave}
        config={{
          keyField: 'section_id',
          title: 'Bulk Edit Sections',
          subtitle: 'Update multiple sections at once',
          fields: [
            { name: 'section_name', label: 'Section Name', type: 'text' },
            {
              name: 'grade_level',
              label: 'Grade Level',
              type: 'dropdown',
              options: ['4', '5', '6'],
            },
            {
              name: 'status',
              label: 'Status',
              type: 'dropdown',
              options: ['Active', 'Inactive'],
            },
          ],
          getDisplayName: (s) => `${s.section_name} (Grade ${s.grade_level})`,
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
      {isViewModalOpen && viewSection && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsOpenViewModal(false);
            setViewSection(null);
          }}
          title="Section Details"
          data={viewSection}
        />
      )}
    </div>
  );
}
