import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import {
  FaHandPaper,
  FaCalendarCheck,
  FaFileExport,
  FaBook,
} from 'react-icons/fa';
import Info_Modal from '../../../components/ModalForms/Info_Modal';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
import useHandledSubjects from '../../../context/crud_hooks/fetch/useHandledSubjects';
import useSectionStudents from '../../../context/crud_hooks/fetch/useSectionStudents';
import { useUser } from '../../../context/UserContext';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import SearchBar from '../../../components/InputFields/SearchBar';
import DashboardCard from '../../../components/Cards/DashboardCard';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

export default function Home_SubjectTeacher() {
  const { user } = useUser();
  const { schoolYear, loading, error } = useActiveSchoolYear();
  const {
    subjects: handledSubjects,
    loading: loadingSubjects,
    error: subjectError,
  } = useHandledSubjects(user);

  // State to store section IDs
  const [sectionIds, setSectionIds] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  // Fetch section IDs based on grade_level and section_name
  useEffect(() => {
    const fetchSectionIds = async () => {
      if (!handledSubjects?.length) return;

      setLoadingSections(true);

      try {
        // Get unique grade_level and section_name combinations
        const uniqueSections = [];
        const seen = new Set();

        handledSubjects.forEach((subject) => {
          const key = `${subject.grade_level}-${subject.section_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSections.push({
              grade_level: subject.grade_level,
              section_name: subject.section_name,
            });
          }
        });

        console.log('Unique sections to fetch:', uniqueSections);

        // Fetch section IDs for each unique section
        const sectionPromises = uniqueSections.map(async (section) => {
          const { data, error } = await supabase
            .from('sections')
            .select('section_id')
            .eq('grade_level', section.grade_level)
            .eq('section_name', section.section_name)
            .single();

          if (error) throw error;
          return data?.section_id;
        });

        const sectionIds = (await Promise.all(sectionPromises)).filter(Boolean);

        console.log('Fetched section IDs:', sectionIds);
        setSectionIds(sectionIds);
      } catch (error) {
        console.error('Error fetching section IDs:', error);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSectionIds();
  }, [handledSubjects]);

  // Memoize the section IDs to prevent unnecessary re-renders
  const handledSectionIds = useMemo(() => sectionIds, [sectionIds]);

  // Fetch students from these sections
  const {
    students: sectionStudents,
    loading: studentsLoading,
    error: studentsError,
  } = useSectionStudents(handledSectionIds);

  // Debug log students data
  useEffect(() => {
    if (sectionStudents.length > 0) {
      console.log('Fetched Students:', sectionStudents);
    }
  }, [sectionStudents]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Search students by name, LRN, or grade & section
  const filteredStudents = useMemo(() => {
    if (!search) return sectionStudents;
    
    const searchLower = search.toLowerCase();
    return sectionStudents.filter((student) => {
      // Safely check each field
      return (
        (student.first_name && student.first_name.toLowerCase().includes(searchLower)) ||
        (student.last_name && student.last_name.toLowerCase().includes(searchLower)) ||
        (student.lrn && student.lrn.toString().toLowerCase().includes(searchLower)) ||
        (student.grade_and_section && 
          student.grade_and_section.toString().toLowerCase().includes(searchLower)) ||
        `${student.first_name || ''} ${student.last_name || ''}`
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [sectionStudents, search]);

  const columns = [
    { key: 'lrn', label: 'LRN' },
    {
      key: 'full_name',
      label: 'Student Name',
      render: (_, student) =>
        `${student.last_name || ''}, ${student.first_name || ''}`.trim(),
    },
    { key: 'grade_and_section', label: 'Grade & Section' },
    { key: 'status', label: 'Status' },
  ];

  // Export to Excel
  const exportToExcel = async () => {
    if (!filteredStudents.length) {
      toast.error('No students to export');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Subject Teacher Students');

      // Define columns with headers and initial widths
      worksheet.columns = [
        { header: 'LRN', key: 'lrn', width: 15 },
        { header: 'Last Name', key: 'last_name', width: 20 },
        { header: 'First Name', key: 'first_name', width: 20 },
        { header: 'Middle Name', key: 'middle_name', width: 15 },
        { header: 'Suffix', key: 'suffix', width: 10 },
        { header: 'Grade & Section', key: 'grade_and_section', width: 20 },
        { header: 'Status', key: 'status', width: 10 },
      ];

      // Add data rows
      filteredStudents.forEach((student) => {
        worksheet.addRow({
          lrn: student.lrn || '',
          last_name: student.last_name || '',
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          suffix: student.suffix || '',
          grade_and_section: student.grade_and_section || '',
          status: student.status || 'Active',
        });
      });

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

      // Style data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = {
            vertical: 'middle',
            wrapText: true,
          };
        }

        // Add borders to all cells
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
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

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Subject_Teacher_Students(${
        new Date().toISOString().split('T')[0]
      }).xlsx`;
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        fileName,
      );

      toast.success('Students exported successfully!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export students');
    }
  };

  const handleViewSubjects = () => {
    setIsModalOpen(true);
  };
  return (
    <div className="p-6 md:p-8 space-y-8 flex flex-col min-w-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
        {/* Welcome Card */}
        <div className="bg-yellow-100 p-4 sm:p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Welcome, {user.first_name || 'Teacher'}!
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Here’s an overview of your school data.
            </p>
          </div>
          <FaHandPaper className="text-yellow-500 text-4xl animate-wave" />
        </div>

        {/* Current School Year */}
        <DashboardCard
          title="Current School Year"
          count={
            loading
              ? null
              : error
              ? 'Error'
              : schoolYear === 0
              ? 'No Active Year'
              : schoolYear.school_year
          }
          icon={FaCalendarCheck}
          color="cyan"
          loading={loading}
          error={!!error}
        />

        {/* Subjects You Handle */}
        <DashboardCard
          title="Subjects You Handle"
          count={
            loadingSubjects
              ? 'Loading...'
              : subjectError
              ? 'Error'
              : `${handledSubjects.length} Subject${
                  handledSubjects.length !== 1 ? 's' : ''
                }`
          }
          icon={FaBook}
          color="purple"
          buttonLabel="View Details"
          onButtonClick={handleViewSubjects}
        />
      </div>

      {/* Students Table Section */}
      <div className="mt-2">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">
          Students in Handled Subjects
        </h2>

        <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-2">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or LRN..."
            />
            <Button
              label="Export to Excel"
              onClick={exportToExcel}
              className="btn-primary text-white hover:bg-primary/90"
              icon={<FaFileExport />}
              disabled={studentsLoading || filteredStudents.length === 0}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-1">
          Results:{' '}
          <span className="font-semibold">
            {filteredStudents.length} student
            {filteredStudents.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filteredStudents}
          keyField="lrn"
          emptyMessage={
            studentsLoading
              ? 'Loading students...'
              : studentsError
              ? 'Error loading students'
              : 'No students found in your sections'
          }
          loading={loadingSections}
        />
      </div>

      {/* Modal */}
      <Info_Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="All Handled Subjects"
        items={handledSubjects.map(
          (item) =>
            `${item.subject_name} - Grade ${item.grade_level} (${item.section_name})`,
        )}
      />
    </div>
  );
}
