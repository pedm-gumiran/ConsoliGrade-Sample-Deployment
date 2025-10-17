import React, { useState } from 'react';
import {
  FaHandPaper,
  FaCalendarCheck,
  FaUsers,
  FaFileExport,
} from 'react-icons/fa';
import DataTable from '../../../components/Tables/DataTable';
import SearchBar from '../../../components/InputFields/SearchBar';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
import { useUser } from '../../../context/UserContext';
import useHandledStudents from '../../../context/crud_hooks/fetch/useStudents';
import useHandledSection from '../../../context/crud_hooks/fetch/useHandledSection';
import Button from '../../../components/Buttons/Button';
import DashboardCard from '../../../components/Cards/DashboardCard';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

export default function Home_Adviser() {
  const { schoolYear, loading, error } = useActiveSchoolYear();
  const { user } = useUser();
  const { sections: handledSections, loading: sectionsLoading } =
    useHandledSection(user);
  const handledSectionIds = handledSections.map((s) => s.section_id);

  const {
    students,
    loading: studentsLoading,
    error: studentsError,
  } = useHandledStudents();

  const [search, setSearch] = useState('');

  const filteredStudents = students
    .filter((s) => handledSectionIds.includes(s.section_id))
    .filter((s) =>
      `${s.lrn} ${s.first_name} ${s.last_name} ${s.status} ${s.grade_and_section}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  const columns = [
    { key: 'lrn', label: 'LRN' },
    {
      key: 'name',
      label: 'Name',
      render: (value, row) => {
        const fullName = `${row.last_name || ''}, ${row.first_name || ''} ${
          row.middle_name || ''
        } ${row.suffix || ''}`
          .replace(/\s+/g, ' ')
          .trim();
        return fullName;
      },
    },
    { key: 'grade_and_section', label: 'Grade & Section' },
    { key: 'status', label: 'Status' },
  ];

  // ----------------- Export to Excel -----------------
  const exportToExcel = async () => {
    if (!filteredStudents.length) {
      toast.error('No students to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Advisory Students');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'LRN', key: 'lrn', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Grade & Section', key: 'grade_and_section', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    // Add rows for each student
    filteredStudents.forEach((s) =>
      worksheet.addRow({
        lrn: s.lrn,
        name: `${s.last_name || ''}, ${s.first_name || ''} ${s.middle_name || ''} ${
          s.suffix || ''
        }`.trim(),
        grade_and_section: s.grade_and_section,
        status: s.status,
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
      `Advisory_Students(${new Date().toISOString().split('T')[0]}).xlsx`,
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Welcome Card */}
        <div className="bg-yellow-100 p-4 sm:p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Welcome, {user.first_name}!
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Here’s your grade consolidation overview.
            </p>
          </div>
          <FaHandPaper className="text-yellow-500 text-4xl animate-wave" />
        </div>

        {/* Current School Year Card */}
        <DashboardCard
          title="Current School Year"
          count={
            loading
              ? null
              : error
              ? 'Error'
              : schoolYear?.school_year || 'No active school year'
          }
          icon={FaCalendarCheck}
          color="cyan"
          loading={loading}
          error={!!error}
        />

        {/* Handled Section Card */}
        <DashboardCard
          title="Handled Section"
          count={
            sectionsLoading
              ? null
              : handledSections.length > 0
              ? handledSections
                  .map((s) => `${s.grade_level} - ${s.section_name}`)
                  .join(', ')
              : 'No section assigned'
          }
          icon={FaUsers}
          color="green"
          loading={sectionsLoading}
        />
      </div>

      {/* Search & Students Table */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">My Advisory Students</h2>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or LRN..."
            />
            <Button
              label="Export"
              onClick={exportToExcel}
              className="btn-primary text-white hover:bg-primary/90"
              icon={<FaFileExport />}
              disabled={filteredStudents.length === 0}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          Results:{' '}
          <span className="font-semibold">
            {filteredStudents.length} student
            {filteredStudents.length !== 1 && 's'}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filteredStudents}
          keyField="lrn"
          loading={studentsLoading}
          emptyMessage={
            studentsError ? 'Error loading students' : 'No students found'
          }
        />
      </div>
    </div>
  );
}
