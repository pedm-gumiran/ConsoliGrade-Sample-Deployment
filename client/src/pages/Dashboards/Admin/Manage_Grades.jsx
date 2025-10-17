import React, { useState, useMemo, useCallback } from 'react';
import Button from '../../../components/Buttons/Button';
import SearchBar from '../../../components/InputFields/SearchBar';
import Dropdown from '../../../components/InputFields/Dropdown';
import { FaDownload, FaTrash, FaEye } from 'react-icons/fa';
// ExcelJS will be imported dynamically
import { saveAs } from 'file-saver';
import DataTable from '../../../components/Tables/DataTable';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import ViewModal from '../../../components/ModalForms/ViewModal';
import useConsolidatedGrades from '../../../context/crud_hooks/fetch/useConsolidatedGrades';

import { toast } from 'react-toastify';
import axios from '../../../api/axios';
export default function Manage_Grades() {
  // Fetch all consolidated grades (no filtering for admin)
  const { grades: initialData } = useConsolidatedGrades();

  const [search, setSearch] = useState('');
  const [quarter, setQuarter] = useState('Q1'); // Default: Quarter 1
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState('single'); // 'single' or 'selected'
  const [deleteStudent, setDeleteStudent] = useState(null);

  // Get displayed grades based on selected quarter
  const getDisplayedGrades = useCallback(
    (student) => {
      if (quarter === 'Combined') {
        // Collect all subjects across all quarters
        const allSubjects = new Set();
        Object.values(student.grades).forEach((quarterGrades) => {
          Object.keys(quarterGrades).forEach((subject) => {
            allSubjects.add(subject);
          });
        });

        // Calculate combined grades for each subject
        const combined = {};
        allSubjects.forEach((subj) => {
          const grades = [];
          ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q) => {
            if (student.grades[q] && student.grades[q][subj]) {
              grades.push(student.grades[q][subj]);
            }
          });
          combined[subj] =
            grades.length > 0
              ? grades.reduce((sum, g) => sum + g, 0) / grades.length
              : 0;
        });
        return combined;
      }
      return student.grades[quarter] || {};
    },
    [quarter],
  );

  // Calculate averages
  const calculateStudentAverage = useCallback(
    (student) => {
      const grades = getDisplayedGrades(student);
      const validGrades = Object.values(grades).filter(
        (gradeData) => {
          const grade = gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
          return grade !== null;
        }
      ).map(gradeData => {
        const grade = gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
        return grade;
      });
      if (validGrades.length === 0) return '-';
      const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
      return (sum / validGrades.length).toFixed(2);
    },
    [getDisplayedGrades],
  );

  // Memoize computations early
  const filteredData = useMemo(
    () =>
      initialData.filter(
        (student) =>
          student.lrn.toLowerCase().includes(search.toLowerCase()) ||
          student.name.toLowerCase().includes(search.toLowerCase()) ||
          student.sex.toLowerCase().includes(search.toLowerCase()),
      ),
    [initialData, search],
  );
  const sortedBySex = useMemo(
    () =>
      [...filteredData].sort((a, b) => {
        if (a.sex === b.sex) return 0;
        return a.sex === 'Male' ? -1 : 1;
      }),
    [filteredData],
  );

  const calculateSubjectAverages = useCallback(() => {
    if (!initialData || initialData.length === 0) return {};
    const sampleSubjects =
      quarter === 'Combined'
        ? Object.keys(getDisplayedGrades(initialData[0]))
        : Object.keys(initialData[0].grades[quarter]);
    const averages = {};
    sampleSubjects.forEach((subject) => {
      const validGrades = sortedBySex
        .map((student) => {
          const gradeData = getDisplayedGrades(student)[subject];
          return gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
        })
        .filter((grade) => grade !== null);

      if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        averages[subject] = (sum / validGrades.length).toFixed(2);
      } else {
        averages[subject] = '-';
      }
    });
    return averages;
  }, [initialData, quarter, getDisplayedGrades, sortedBySex]);

  const sampleSubjects = useMemo(
    () =>
      initialData && initialData.length > 0
        ? Object.keys(getDisplayedGrades(initialData[0]))
        : [],
    [initialData, getDisplayedGrades],
  );

  const columns = useMemo(
    () => [
      
      { key: 'lrn', label: 'LRN', className: 'font-medium' },
      {
        key: 'name',
        label: 'Student Name',
        className: 'font-medium',
      },
      { key: 'sex', label: 'Sex' },
      ...sampleSubjects.map((subject) => ({
        key: subject,
        label: subject,
        render: (_, row) => {
          const gradeData = getDisplayedGrades(row)[subject];
          const grade = gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
          const gradeId = gradeData && typeof gradeData === 'object' ? gradeData.grade_id : null;

          return (
            <div
              className="text-center"
              title={gradeId ? `Grade ID: ${gradeId}` : 'No grade record'}
            >
              {grade !== null ? grade.toFixed(0) : '-'}
            </div>
          );
        },
        className: 'text-center',
      })),
      {
        key: 'average',
        label: 'Average',
        render: (_, row) => calculateStudentAverage(row),
        className: 'text-center font-semibold bg-blue-50',
      },
    ],
    [sampleSubjects, getDisplayedGrades, calculateStudentAverage],
  );

  const subjectAverages = useMemo(
    () => (sortedBySex.length > 0 ? calculateSubjectAverages() : {}),
    [sortedBySex, calculateSubjectAverages],
  );

  // Export consolidated grades to Excel
  const exportToExcel = async (
    dataToExport = sortedBySex,
    quarterValue = quarter,
  ) => {
    if (!Array.isArray(dataToExport) || dataToExport.length === 0) {
      toast.warn('No students to export.');
      return;
    }

    // Dynamic import for ExcelJS
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet(`Grades - ${quarterValue}`);

    // --- Get sample subjects (from the first student) ---
    const sampleGrades =
      quarterValue === 'Combined'
        ? getDisplayedGrades(dataToExport[0])
        : dataToExport[0].grades[quarterValue];

    // --- Define columns: LRN, Name, Sex, Quarter, Subjects, Average ---
    worksheet.columns = [
      { header: 'LRN', key: 'lrn', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Quarter', key: 'quarter', width: 15 },
      ...Object.keys(sampleGrades).map((subject) => ({
        header: subject,
        key: subject,
        width: 15,
      })),
      { header: 'Student Average', key: 'studentAverage', width: 18 },
    ];

    // --- Add rows for each student ---
    dataToExport.forEach((student) => {
      const grades =
        quarterValue === 'Combined'
          ? getDisplayedGrades(student)
          : student.grades[quarterValue];

      // Calculate student average
      const studentAvg = calculateStudentAverage(student);

      // Prepare grades object, converting null to empty string for Excel
      const excelGrades = {};
      Object.keys(grades).forEach((subject) => {
        const gradeData = grades[subject];
        const grade = gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
        excelGrades[subject] = grade !== null ? grade : '';
      });

      worksheet.addRow({
        lrn: student.lrn,
        name: student.name,
        sex: student.sex,
        quarter: quarterValue,
        ...excelGrades,
        studentAverage: studentAvg !== '-' ? studentAvg : '',
      });
    });

    // --- Calculate subject averages (across all students) ---
    const subjectAvgs = {};
    Object.keys(sampleGrades).forEach((subject) => {
      const validGrades = dataToExport
        .map((student) => {
          const gradeData = (quarterValue === 'Combined'
            ? getDisplayedGrades(student)
            : student.grades[quarterValue])[subject];
          return gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
        })
        .filter((grade) => grade !== null);

      if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        subjectAvgs[subject] = (sum / validGrades.length).toFixed(2);
      } else {
        subjectAvgs[subject] = '';
      }
    });

    // Calculate overall class average
    const validSubjectAvgs = Object.values(subjectAvgs).filter(
      (avg) => avg !== '',
    );
    const overallAvg =
      validSubjectAvgs.length > 0
        ? (
            validSubjectAvgs.reduce((acc, avg) => acc + parseFloat(avg), 0) /
            validSubjectAvgs.length
          ).toFixed(2)
        : '';

    // --- Add empty row for spacing ---
    worksheet.addRow({});

    // --- Add CLASS AVERAGES row ---
    const avgRow = worksheet.addRow({
      lrn: '',
      name: 'CLASS AVERAGES',
      sex: '',
      quarter: '',
      ...subjectAvgs,
      studentAverage: overallAvg,
    });

    // Style the averages row
    avgRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // --- Find highest and lowest performing subjects ---
    const subjectEntries = Object.entries(subjectAvgs);
    const highest = subjectEntries.reduce((max, curr) =>
      parseFloat(curr[1]) > parseFloat(max[1]) ? curr : max,
    );
    const lowest = subjectEntries.reduce((min, curr) =>
      parseFloat(curr[1]) < parseFloat(min[1]) ? curr : min,
    );

    // Add empty row
    worksheet.addRow({});

    // Add SUBJECT PERFORMANCE ANALYSIS header
    const analysisHeaderRow = worksheet.addRow({
      lrn: '',
      name: 'SUBJECT PERFORMANCE ANALYSIS',
      sex: '',
      quarter: '',
    });
    analysisHeaderRow.getCell('name').font = { bold: true, size: 12 };
    analysisHeaderRow.getCell('name').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' },
    };

    // Add highest performing subject
    const highestRow = worksheet.addRow({
      lrn: '',
      name: 'Highest Performing Subject',
      sex: highest[0],
      quarter: highest[1],
    });
    highestRow.getCell('name').font = { bold: true };
    highestRow.getCell('sex').font = { bold: true };
    highestRow.getCell('quarter').font = { bold: true };
    highestRow.getCell('sex').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' }, // Light green
    };
    highestRow.getCell('quarter').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC6EFCE' },
    };

    // Add lowest performing subject
    const lowestRow = worksheet.addRow({
      lrn: '',
      name: 'Lowest Performing Subject',
      sex: lowest[0],
      quarter: lowest[1],
    });
    lowestRow.getCell('name').font = { bold: true };
    lowestRow.getCell('sex').font = { bold: true };
    lowestRow.getCell('quarter').font = { bold: true };
    lowestRow.getCell('sex').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' }, // Light red
    };
    lowestRow.getCell('quarter').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC7CE' },
    };

    // --- Style header row ---
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCE6F1' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // --- Auto-adjust column widths based on content ---
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      // Set width with some padding (minimum 10, maximum 50)
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // --- Generate and download Excel file ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd/openxmlformats-officedocument.spreadsheetml.sheet',
    });

    saveAs(blob, `grades_${quarterValue}.xlsx`);
  };

  const handleDeleteSelectedGrades = () => {
    setDeleteType('selected');
    setDeleteConfirm(true);
  };

  // Handle view student
  const handleViewStudent = (student) => {
    setViewStudent(student);
    setIsViewModalOpen(true);
  };

  const confirmDeleteStudentGrades = async () => {
    setDeleteConfirm(false);
    setDeleteLoading(true);
    try {
      if (deleteType === 'single' && deleteStudent) {
        const response = await axios.delete(
          '/api/grades/delete_consolidated_grades',
          {
            data: { lrns: [deleteStudent.lrn] },
          },
        );

        if (response.data.success) {
          toast.success(`Grades for ${deleteStudent.name} have been deleted.`);
        } else {
          throw new Error(response.data.message);
        }
        setDeleteStudent(null);
      } else if (deleteType === 'selected') {
        const lrns = selectedStudents.map((student) => student.lrn);
        const response = await axios.delete(
          '/api/grades/delete_consolidated_grades',
          {
            data: { lrns },
          },
        );

        if (response.data.success) {
          toast.success(
            `Grades for ${selectedStudents.length} student(s) have been deleted.`,
          );
        } else {
          throw new Error(response.data.message);
        }
        setSelectedStudents([]); // Clear selection after delete
      }
      // Optionally refetch or reload
      window.location.reload();
    } catch (error) {
      console.error('Error deleting grades:', error);
      toast.error(error.response?.data?.message || 'Failed to delete grades.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ... (rest of the code remains the same)
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Controls Section */}
        <div className="flex flex-col md:flex-row gap-3 justify-between items-center mb-4">
          {/* Search Bar */}
          <div className="w-full md:w-auto md:flex-1 lg:max-w-md">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by LRN, name, or sex..."
            />
          </div>

          {/* Quarter Filter + Export Button */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Dropdown
              label=""
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              options={[
                { value: 'Q1', label: '1st Quarter' },
                { value: 'Q2', label: '2nd Quarter' },
                { value: 'Q3', label: '3rd Quarter' },
                { value: 'Q4', label: '4th Quarter' },
                { value: 'Combined', label: 'Combined Average' },
              ]}
              placeholder="Select Quarter"
              className="w-full md:w-48"
            />
            <Button
              label="Export"
              onClick={() => exportToExcel(sortedBySex, quarter)}
              icon={<FaDownload />}
              className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 whitespace-nowrap"
              disabled={sortedBySex.length === 0}
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          Showing:{' '}
          <span className="font-semibold">
            {sortedBySex.length} student
            {sortedBySex.length !== 1 && 's'}
          </span>{' '}
          - Quarter:{' '}
          <span className="font-semibold">
            {quarter === 'Combined' ? 'Combined Average' : quarter}
          </span>
        </div>

        {/* Bulk Actions Bar */}
        {selectedStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-red-700">
                {selectedStudents.length} student(s) selected for bulk actions
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                label="Delete Selected Grades"
                onClick={() => handleDeleteSelectedGrades()}
                className="bg-red-600 text-white hover:bg-red-700"
                icon={<FaTrash />}
                disabled={selectedStudents.length === 0}
              />
            </div>
          </div>
        )}

        {/* DataTable */}
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={sortedBySex}
            keyField="lrn"
            selectable={true}
            selected={selectedStudents}
            onSelect={setSelectedStudents}
            onSelectAll={setSelectedStudents}
            emptyMessage="No students found"
            actions={(student) => (
              <div className="flex gap-2">
                <Button
                  icon={<FaEye />}
                  onClick={() => handleViewStudent(student)}
                  className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2"
                  title="View Details"
                />
              </div>
            )}
          />

          {/* Sticky Footer with Averages */}
          {sortedBySex.length > 0 && (
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 shadow-lg mt-0">
              <div className="grid gap-3 p-3 sm:p-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 pb-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 text-xs sm:text-sm uppercase tracking-wide">
                    Class Performance
                  </h3>
                  <span className="text-xs text-gray-500">
                    {sortedBySex.length} student
                    {sortedBySex.length !== 1 && 's'}
                  </span>
                </div>

                {/* Averages Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                  {sampleSubjects.map((subject) => (
                    <div
                      key={subject}
                      className="flex flex-col p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <span
                        className="text-[10px] sm:text-xs font-medium text-gray-600 mb-0.5 sm:mb-1 truncate"
                        title={subject}
                      >
                        {subject}
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-gray-800">
                        {subjectAverages[subject]}
                      </span>
                    </div>
                  ))}

                  {/* Overall Average - Highlighted */}
                  <div className="flex flex-col p-2 sm:p-3 bg-blue-600 text-white rounded-lg border border-blue-700 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
                    <span className="text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1">
                      Overall
                    </span>
                    <span className="text-lg sm:text-xl font-bold">
                      {(
                        Object.values(subjectAverages).reduce(
                          (acc, avg) => acc + parseFloat(avg),
                          0,
                        ) / Object.values(subjectAverages).length
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && viewStudent && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewStudent(null);
          }}
          title="Student Grade Details"
          data={{
            lrn: viewStudent.lrn,
            name: viewStudent.name,
            sex: viewStudent.sex,
            ...Object.fromEntries(
              Object.entries(viewStudent.grades[quarter]).map(([subject, gradeData]) => {
                const grade = gradeData && typeof gradeData === 'object' ? gradeData.grade : gradeData;
                return [subject, grade];
              })
            ),
          }}
        />
      )}

      {/* Delete Student Confirmation */}
      {deleteConfirm && (
        <ConfirmationBox
          title="Delete Grades"
          message={
            deleteType === 'single' && deleteStudent
              ? `Are you sure you want to delete all consolidated grades for ${deleteStudent.name} (LRN: ${deleteStudent.lrn})?`
              : `Are you sure you want to delete grades for ${selectedStudents.length} student(s)? This action cannot be undone.`
          }
          label={
            deleteLoading
              ? 'Deleting...'
              : deleteType === 'single'
              ? 'Delete Grades'
              : 'Delete Selected Grades'
          }
          disabled={deleteLoading}
          onConfirm={confirmDeleteStudentGrades}
          onCancel={() => {
            setDeleteConfirm(false);
            if (deleteType === 'single') setDeleteStudent(null);
          }}
        />
      )}
    </div>
  );
}
