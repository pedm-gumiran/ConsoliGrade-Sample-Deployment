import React, { useState, useMemo } from 'react';
import { FaPlus, FaEye, FaTrash } from 'react-icons/fa';
import Button from '../../components/Buttons/Button';
import SchoolYearModal from '../ModalForms/Admin/AddSchoolYear.jsx';
import SearchBar from '../InputFields/SearchBar';
import useAllSchoolYears from '../../context/crud_hooks/fetch/useActiveSchoolYear.js';
import DataTable from '../../components/Tables/DataTable'; //  import your reusable table
import { toast } from 'react-toastify';
import { addRecord } from '../../context/crud_hooks/post/addRecord.js';
import { deleteRecords } from '../../context/crud_hooks/delete/deleteRecord.js';
import ViewModal from '../ModalForms/ViewModal';
import ConfirmationBox from '../MessageBox/ConfirmationBox';
export default function SchoolYearManagement() {
  const { allSchoolYears, loading, refetchAll } = useAllSchoolYears();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSchoolYear, setViewSchoolYear] = useState(null);
  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [selectedSchoolYears, setSelectedSchoolYears] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    schoolYearsToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });

  // -----------------Add New School year------------
  const handleAddSchoolYear = async (newYear) => {
    try {
      const schoolYearData = {
        school_year: newYear.school_year.trim(),
      };

      const { error } = await addRecord('school_years', schoolYearData);

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate entry: This school year already exists.');
        } else {
          toast.error(`Failed to add school year: ${error.message}`);
        }
        return false;
      }

      await refetchAll();
      toast.success('School year added successfully!');
      return true;
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
      return false;
    }
  };
  // -------------------Handle View School Year Details----------------
  const handleViewSchoolYear = (schoolYear) => {
    setViewSchoolYear(schoolYear);
    setIsOpenViewModal(true);
  };

  // -------------------Delete Handlers----------------
  const confirmDeleteSchoolYears = (schoolYearsToDeleteArray) => {
    // Check if any selected school years are active
    const activeSchoolYears = allSchoolYears.filter(sy =>
      schoolYearsToDeleteArray.includes(sy.school_year_id) && sy.status === 'Active'
    );

    if (activeSchoolYears.length > 0) {
      toast.error(`Cannot delete active school year(s): ${activeSchoolYears.map(sy => sy.school_year).join(', ')}. Only one school year can be active at a time.`);
      return;
    }

    // Filter out active school years (though there shouldn't be any at this point)
    const nonActiveIds = schoolYearsToDeleteArray.filter(id =>
      !allSchoolYears.find(sy => sy.school_year_id === id && sy.status === 'Active')
    );

    if (nonActiveIds.length === 0) {
      toast.warning('No eligible school years to delete.');
      return;
    }

    setConfirmDelete({
      isOpen: true,
      schoolYearsToDelete: nonActiveIds,
      message: `Are you sure you want to delete ${nonActiveIds.length} school year(s)? This action cannot be undone.`,
      title: 'Confirm Delete',
    });
  };

  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.schoolYearsToDelete;

    if (!idsToDelete || idsToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteRecords(
        'school_years',
        'school_year_id',
        idsToDelete,
      );

      if (!error) {
        await refetchAll();
        setSelectedSchoolYears((prev) =>
          prev.filter((id) => !idsToDelete.includes(id)),
        );
        setConfirmDelete({
          isOpen: false,
          schoolYearsToDelete: [],
          message: '',
          title: '',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      schoolYearsToDelete: [],
      message: '',
      title: '',
    });
    setSelectedSchoolYears([]);
  };

  // ------------------Filter list by search-----------
  const filteredAllSchoolYears = useMemo(() => {
    return allSchoolYears.filter(
      (sy) =>
        sy.school_year.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sy.status.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allSchoolYears, searchQuery]);

  // --------------------Define columns for DataTable---------------------
  const columns = [
    { key: 'school_year', label: 'School Year' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className="flex items-center gap-1 font-semibold">
          {value === 'Active' && (
            <span className="text-green-600 font-bold">|</span>
          )}
          <span
            className={value === 'Active' ? 'text-green-600' : 'text-red-500'}
          >
            {value}
          </span>
        </span>
      ),
    },
    {
      key: 'start_date',
      label: 'Start Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
  ];

  return (
    <div className="bg-white p-4 sm:p-6 md:p-8 mt-2 rounded-xl shadow-md space-y-4">
      <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-1">
        School Year Management
      </h2>

      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
        <SearchBar
          type="text"
          placeholder="Search by Year or Status"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        <Button
          icon={<FaPlus />}
          className="text-white btn-primary"
          label="Add Year"
          onClick={() => setShowModal(true)}
        />
      </div>
      {/* Number of results info */}
      <div className="text-sm text-gray-600 mb-1">
        Results:{' '}
        <span className="font-semibold">
          {filteredAllSchoolYears.length} school year
          {filteredAllSchoolYears.length !== 1 && 's'}
        </span>
      </div>

      {/* Bulk Actions Bar */}
      {selectedSchoolYears.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-700">
              {(() => {
                const activeCount = allSchoolYears.filter(sy =>
                  selectedSchoolYears.includes(sy.school_year_id) && sy.status === 'Active'
                ).length;
                const eligibleCount = selectedSchoolYears.length - activeCount;
                return eligibleCount > 0
                  ? `${eligibleCount} school year(s) selected for deletion${activeCount > 0 ? ` (${activeCount} active cannot be deleted)` : ''}`
                  : `${selectedSchoolYears.length} school year(s) selected (active years cannot be deleted)`;
              })()}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Bulk Delete Button */}
            <Button
              label="Delete "
              onClick={() => confirmDeleteSchoolYears(selectedSchoolYears)}
              className="bg-red-600 text-white hover:bg-red-700"
              icon={<FaTrash />}
              disabled={allSchoolYears.filter(sy =>
                selectedSchoolYears.includes(sy.school_year_id) && sy.status === 'Active'
              ).length === selectedSchoolYears.length}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={filteredAllSchoolYears}
          selectable
          selected={selectedSchoolYears}
          onSelect={setSelectedSchoolYears}
          onSelectAll={setSelectedSchoolYears}
          keyField="school_year_id"
          emptyMessage="No records found"
          loading={loading}
          actions={(schoolYear) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye className='ml-2' />}
                onClick={() => handleViewSchoolYear(schoolYear)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-4 sm:ml-5 md:ml-8 lg:ml-20"
                title="View Details"
              />
            </div>
          )}
        />
      </div>

      <SchoolYearModal
        isOpen={showModal}
        onSave={handleAddSchoolYear}
        onClose={() => {
          setShowModal(false);
        }}
      />
      {isViewModalOpen && viewSchoolYear && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsOpenViewModal(false);
            setViewSchoolYear(null);
          }}
          title="School Year Details"
          data={viewSchoolYear}

        />
      )}

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
    </div>
  );
}
