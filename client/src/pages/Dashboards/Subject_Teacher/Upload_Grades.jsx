import React, { useMemo, useState } from 'react';
import { FaUpload, FaPlus, FaEye } from 'react-icons/fa';
import Dropdown from '../../../components/InputFields/Dropdown';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import SearchBar from '../../../components/InputFields/SearchBar';
import { useUser } from '../../../context/UserContext';
import useHandledSubjects from '../../../context/crud_hooks/fetch/useHandledSubjects';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
import useGradeUploads from '../../../context/crud_hooks/fetch/useGradeUploads.js';
import { toast } from 'react-toastify';
import UploadGradesModal from '../../../components/ModalForms/UploadGradesModal';
import axios from '../../../api/axios.js';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import ViewModal from '../../../components/ModalForms/ViewModal.jsx';

export default function Upload_Grades() {
  const { user } = useUser();
  const { subjects: handledSubjects, loading: subjectsLoading } =
    useHandledSubjects(user);
  const { schoolYear } = useActiveSchoolYear();
  const {
    grades: uploadedGrades,
    loading: gradesLoading,
    error: gradesError,
    refetch,
  } = useGradeUploads(user?.user_id);
  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [viewUpload_Grades, setViewUpload_Grades] = useState(null);
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state for viewing uploaded grades
  const [filterSubject, setFilterSubject] = useState('');
  const [filterQuarter, setFilterQuarter] = useState('');
  const [search, setSearch] = useState('');

  // Mock uploaded grades data (replace with actual API call)

  const quarterOptions = useMemo(
    () => [
      { value: 1, label: '1st Quarter' },
      { value: 2, label: '2nd Quarter' },
      { value: 3, label: '3rd Quarter' },
      { value: 4, label: '4th Quarter' },
    ],
    [],
  );

  const extractQuarterNumber = (value) => {
    if (typeof value === 'number') {
      return value >= 1 && value <= 4 ? value : null;
    }

    if (!value) return null;

    const matchedOption = quarterOptions.find((opt) => opt.label === value);
    if (matchedOption) return matchedOption.value;

    const digitMatch = String(value).match(/\d+/);
    if (!digitMatch) return null;

    const parsed = Number(digitMatch[0]);
    return parsed >= 1 && parsed <= 4 ? parsed : null;
  };

  const handleUploadSubmit = async ({ subject, quarter, data }) => {
    if (!subject?.subject_id) {
      toast.error('Subject selection is required to upload grades.');
      return;
    }

    if (!user?.user_id) {
      toast.error('Unable to determine the teacher profile. Please re-login.');
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      toast.warning('No grade rows detected in the uploaded file.');
      return;
    }

    const quarterNumber = extractQuarterNumber(quarter);
    if (!quarterNumber) {
      toast.error(
        'Invalid quarter selected. Please choose a quarter between 1 and 4.',
      );
      return;
    }

    try {
      const response = await axios.post('/api/grades/upload', {
        subject_id: subject.subject_id,
        quarter: quarterNumber,
        grades: data,
      });

      const result = response.data;

      if (result.success) {
        toast.success(result.message);
        refetch();
        return true;
      } else {
        toast.warning(result.message);
        return false;
      }
    } catch (error) {
      console.error('Upload error:', error);
      const message =
        error.response?.data?.message ||
        'Failed to upload grades. Please try again.';
      toast.error(message);
      return false;
    }
  };

  // Filter uploaded grades
  const filteredGrades = uploadedGrades.filter((grade) => {
    const matchesSubject = filterSubject
      ? grade.subject === filterSubject
      : true;
    const matchesQuarter = filterQuarter
      ? grade.quarter === filterQuarter
      : true;
    const matchesSearch = search
      ? grade.student_name.toLowerCase().includes(search.toLowerCase()) ||
        grade.lrn.toLowerCase().includes(search.toLowerCase())
      : true;

    return matchesSubject && matchesQuarter && matchesSearch;
  });

  // -----------------------------Uploaded grades columns-----------------------
  const gradesColumns = [
    { key: 'lrn', label: 'LRN' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'grade_section', label: 'Grade & Section' },
    { key: 'subject', label: 'Subject' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'grade', label: 'Grade' },
    { key: 'school_year', label: 'School Year' },
    {
      key: 'uploaded_date',
      label: 'Upload Date',
      render: (v) => formatDate(v),
    },
  ];

  //-------------------Handle View Subjects Details---------------------
  const handleViewSubject = (upload_Grades) => {
    setViewUpload_Grades(upload_Grades);
    setIsOpenViewModal(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Upload Modal */}
      <UploadGradesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUploadSubmit}
        handledSubjects={handledSubjects}
        schoolYear={schoolYear}
      />

      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Action Bar - Upload Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FaUpload className="text-blue-600" />
            <span className="font-medium">
              {subjectsLoading
                ? 'Loading subjects...'
                : 'Upload new grades using Excel files'}
            </span>
          </div>
          <Button
            label={subjectsLoading ? 'Loading...' : 'Upload Grades'}
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto"
            icon={<FaPlus />}
            disabled={subjectsLoading}
            isLoading={subjectsLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Dropdown
            label="Filter by Subject"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            placeholder={
              subjectsLoading ? 'Loading subjects...' : 'Filter Subjects'
            }
            options={[
              { value: '', label: 'All Subjects' },
              ...handledSubjects.map((item) => ({
                value: `${item.subject_name} `,
                label: `${item.subject_name} - ${item.grade_level} ${item.section_name}`,
              })),
            ]}
            disabled={subjectsLoading}
          />
          <Dropdown
            label="Filter by Quarter"
            value={filterQuarter}
            onChange={(e) => setFilterQuarter(e.target.value)}
            options={[
              { value: '', label: 'All Quarters' },
              { value: 'Q1', label: '1st Quarter' },
              { value: 'Q2', label: '2nd Quarter' },
              { value: 'Q3', label: '3rd Quarter' },
              { value: 'Q4', label: '4th Quarter' },
            ]}
            placeholder="Filter Quarters"
          />
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-2">
              Search Student
            </label>
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or LRN..."
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          Results:{' '}
          <span className="font-semibold">
            {filteredGrades.length} grade record
            {filteredGrades.length !== 1 && 's'}
          </span>
        </div>

        {/* Uploaded Grades Table */}
        <DataTable
          columns={gradesColumns}
          data={filteredGrades}
          keyField="id"
          emptyMessage={
            gradesLoading
              ? 'Loading grades...'
              : gradesError
              ? 'Error loading grades'
              : 'No uploaded grades found'
          }
          loading={gradesLoading}
          actions={(upload_Grades) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye />}
                onClick={() => handleViewSubject(upload_Grades)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-3"
                title="View Details"
              />
            </div>
          )}
        />

        {/* For View Modal */}
        {isViewModalOpen && viewUpload_Grades && (
          <ViewModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsOpenViewModal(false);
              setViewUpload_Grades(null);
            }}
            title="Subject Details"
            data={viewUpload_Grades}
          />
        )}
      </div>
    </div>
  );
}
