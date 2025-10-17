import React, { useState, useEffect, useMemo } from 'react';
import {
  FaHandPaper,
  FaCalendarCheck,
  FaUsers,
  FaBook,
  FaFileExport,
} from 'react-icons/fa';
import Info_Modal from '../../../components/ModalForms/Info_Modal';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
import { useUser } from '../../../context/UserContext';
import useHandledStudents from '../../../context/crud_hooks/fetch/useStudents';
import useHandledSection from '../../../context/crud_hooks/fetch/useHandledSection';
import useHandledSubjects from '../../../context/crud_hooks/fetch/useHandledSubjects';
import useSectionStudents from '../../../context/crud_hooks/fetch/useSectionStudents';
import { supabase } from '../../../supabaseClient';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import SearchBar from '../../../components/InputFields/SearchBar';
import DashboardCard from '../../../components/Cards/DashboardCard';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

export default function Home() {
  const { schoolYear, loading, error } = useActiveSchoolYear();
  const { user } = useUser();

  // Adviser data
  const { sections: handledSections, loading: sectionsLoading } = useHandledSection(user);
  const handledSectionIds = handledSections.map((s) => s.section_id);
  const { students, loading: studentsLoading, error: studentsError } = useHandledStudents();

  // Subject teacher data
  const { subjects: handledSubjects, loading: loadingSubjects, error: subjectError } =
    useHandledSubjects(user);

  // Roles
  const isAdviser = handledSections.length > 0;
  const isSubjectTeacher = handledSubjects.length > 0;

  const [activeTab, setActiveTab] = useState(isAdviser ? 'students' : 'subjects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  // -------------- Fetch Section IDs for Subject Teacher --------------
  const [sectionIds, setSectionIds] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    const fetchSectionIds = async () => {
      if (!handledSubjects?.length) return;
      setLoadingSections(true);
      try {
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

        const ids = (await Promise.all(sectionPromises)).filter(Boolean);
        setSectionIds(ids);
      } catch (error) {
        console.error('Error fetching section IDs:', error);
      } finally {
        setLoadingSections(false);
      }
    };
    fetchSectionIds();
  }, [handledSubjects]);

  // -------------- Fetch Students for Subject Teacher --------------
  const {
    students: sectionStudents,
    loading: subjStudentsLoading,
    error: subjStudentsError,
  } = useSectionStudents(sectionIds);

  // Filter students (Adviser)
  const filteredAdviserStudents = useMemo(() => {
    return students
      .filter((s) => handledSectionIds.includes(s.section_id))
      .filter((s) =>
        `${s.lrn} ${s.first_name} ${s.last_name} ${s.status} ${s.grade_and_section}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }, [students, handledSectionIds, search]);

  // Filter students (Subject Teacher)
  const filteredSubjectStudents = useMemo(() => {
    if (!search) return sectionStudents;
    const lower = search.toLowerCase();
    return sectionStudents.filter((student) =>
      `${student.lrn} ${student.first_name} ${student.last_name} ${student.grade_and_section}`
        .toLowerCase()
        .includes(lower)
    );
  }, [sectionStudents, search]);

  // Columns
  const studentColumns = [
    { key: 'lrn', label: 'LRN' },
    {
      key: 'name',
      label: 'Name',
      render: (_, row) =>
        `${row.last_name || ''}, ${row.first_name || ''} ${row.middle_name || ''} ${
          row.suffix || ''
        }`.trim(),
    },
    { key: 'grade_and_section', label: 'Grade & Section' },
    { key: 'status', label: 'Status' },
  ];

  // Export to Excel (Students)
  const exportStudentsToExcel = async (data, title) => {
    if (!data.length) {
      toast.error('No students to export');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'LRN', key: 'lrn', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Grade & Section', key: 'grade_and_section', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    data.forEach((s) => {
      worksheet.addRow({
        lrn: s.lrn,
        name: `${s.last_name || ''}, ${s.first_name || ''} ${s.middle_name || ''} ${
          s.suffix || ''
        }`.trim(),
        grade_and_section: s.grade_and_section,
        status: s.status,
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
    const fileName = `Combined_Teacher_${title.replace(/\s/g, '_')}(${
      new Date().toISOString().split('T')[0]
    }).xlsx`;
    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      fileName,
    );
    toast.success(`${title} exported successfully!`);
  };

  const handleViewSubjects = () => setIsModalOpen(true);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <div className="bg-yellow-100 p-4 sm:p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Welcome, {user.first_name}!
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {isAdviser && isSubjectTeacher
                ? "Here's your combined overview."
                : isAdviser
                ? "Here's your grade consolidation overview."
                : "Here's your subject overview."}
            </p>
          </div>
          <FaHandPaper className="text-yellow-500 text-4xl animate-wave" />
        </div>

        <DashboardCard
          title="Current School Year"
          count={
            loading ? null : error ? 'Error' : schoolYear?.school_year || 'No active year'
          }
          icon={FaCalendarCheck}
          color="cyan"
          loading={loading}
          error={!!error}
        />

        {isAdviser && (
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
        )}

        {isSubjectTeacher && (
          <DashboardCard
            title="Subjects You Handle"
            count={
              loadingSubjects
                ? null
                : subjectError
                ? 'Error'
                : `${handledSubjects.length} Subject${
                    handledSubjects.length !== 1 ? 's' : ''
                  }`
            }
            icon={FaBook}
            color="purple"
            loading={loadingSubjects}
            buttonLabel="View Details"
            onButtonClick={handleViewSubjects}
          />
        )}
      </div>

      {/* Combined Tabs */}
      {(isAdviser || isSubjectTeacher) && (
        <div className="mt-6">
          {isAdviser && isSubjectTeacher && (
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('students')}
                className={`px-6 py-3 font-semibold cursor-pointer ${
                  activeTab === 'students'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                My Advisory Students
              </button>
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-6 py-3 font-semibold cursor-pointer ${
                  activeTab === 'subjects'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Students in Handled Subjects
              </button>
            </div>
          )}

          {/* Adviser Students */}
          {((isAdviser && !isSubjectTeacher) || activeTab === 'students') && isAdviser && (
            <>

              <div className="flex flex-col md:flex-row gap-2 mb-4">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or LRN..."
                />
                <Button
                  label="Export"
                  onClick={() => exportStudentsToExcel(filteredAdviserStudents, 'My Students')}
                  className="btn-primary text-white hover:bg-primary/90"
                  icon={<FaFileExport />}
                  disabled={filteredAdviserStudents.length === 0}
                />
              </div>
              <DataTable
                columns={studentColumns}
                data={filteredAdviserStudents}
                keyField="lrn"
                loading={studentsLoading}
                emptyMessage={
                  studentsError ? 'Error loading students' : 'No students found'
                }
              />
            </>
          )}

          {/* Subject Teacher Students */}
          {((isSubjectTeacher && !isAdviser) || activeTab === 'subjects') &&
            isSubjectTeacher && (
              <>

                <div className="flex flex-col md:flex-row gap-2 mb-4">
                  <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by student name or LRN..."
                  />
                  <Button
                    label="Export"
                    onClick={() =>
                      exportStudentsToExcel(filteredSubjectStudents, 'Handled Students')
                    }
                    className="btn-primary text-white hover:bg-primary/90"
                    icon={<FaFileExport />}
                    disabled={filteredSubjectStudents.length === 0}
                  />
                </div>
                <DataTable
                  columns={studentColumns}
                  data={filteredSubjectStudents}
                  keyField="lrn"
                  loading={subjStudentsLoading || loadingSections}
                  emptyMessage={
                    subjStudentsError
                      ? 'Error loading students'
                      : 'No students found in handled subjects'
                  }
                />
              </>
            )}
        </div>
      )}

      {/* Modal */}
      <Info_Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="All Handled Subjects"
        items={handledSubjects.map(
          (item) =>
            `${item.subject_name} - Grade ${item.grade_level} (${item.section_name})`
        )}
      />
    </div>
  );
}
