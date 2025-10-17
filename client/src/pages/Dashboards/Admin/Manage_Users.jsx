import React, { useState } from 'react';
import SearchBar from '../../../components/InputFields/SearchBar';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import Dropdown from '../../../components/InputFields/Dropdown';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import AddUserModal from '../../../components/ModalForms/Admin/AddUser';
import BulkEditUserModal from '../../../components/ModalForms/Bulk Modals/BulkEditUserModal.jsx';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import ViewModal from '../../../components/ModalForms/ViewModal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import useUsers from '../../../context/crud_hooks/fetch/useUsers';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import axios from '../../../api/axios';
export default function Manage_Users() {
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [viewHiddenKeys, setViewHiddenKeys] = useState([]);
  const [exportType, setExportType] = useState('');

  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    usersToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const { users, refetch, loading, deleteUsers } = useUsers();

  // ----------Search----------
  const handleSearch = (e) => setSearch(e.target.value);
  const filteredUsers = users.filter((u) =>
    `${u.user_id} ${u.first_name} ${u.last_name} ${u.status}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // ----------Add User----------
  const handleAddUser = async (newUser) => {
    try {
      // Send all user info to backend
      const res = await axios.post('/api/users/add_user', newUser);

      if (res.data.success) {
        toast.success(res.data.message);
        await refetch(); // refresh user list

        return true;
      } else {
        toast.error(res.data.message || 'Failed to add user');
        return false;
      }
    } catch (err) {
      toast.error(` ${err.response?.data?.message || err.message}`);
      return false;
    }
  };

  // ----------Bulk Edit Users----------
  const handleBulkSave = async (updatedData) => {
    try {
      // Convert updatedData object into an array
      const updates = Object.entries(updatedData).map(([id, values]) => ({
        user_id: id,
        ...values,
      }));

      if (updates.length === 0) {
        toast.info('No changes detected.');
        return;
      }

      // Send all updates in a single request to the bulk endpoint
      const { data } = await axios.put('/api/users/bulk_edit_users', updates);

      let hasError = false;

      // Handle failures
      if (data.failed && data.failed.length > 0) {
        hasError = true;
        data.failed.forEach((f) => {
          toast.error(`Failed to update user ${f.user_id}: ${f.message}`);
        });
      }

      // Handle successes
      if (data.updated && data.updated.length > 0) {
        toast.success(`${data.updated.length} user(s) successfully updated!`);
      }

      // Refresh data after updates
      await refetch();

      //  Only close the modal if no errors occurred
      if (!hasError) {
        setIsBulkEditModalOpen(false);
        setSelectedUsers([]);
      }
    } catch (err) {
      toast.error(`Unexpected error: ${err.message}`);
    }
  };

  // ----------Delete----------
  const confirmDeleteUsers = (usersToDeleteArray, message) => {
    setConfirmDelete({
      isOpen: true,
      usersToDelete: usersToDeleteArray,
      message,
      title: 'Confirm Delete',
    });
  };

  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.usersToDelete;
    if (!idsToDelete || idsToDelete.length === 0) return;

    setIsDeleting(true);

    try {
      await deleteUsers(idsToDelete);
      setSelectedUsers((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );

      setConfirmDelete({
        isOpen: false,
        usersToDelete: [],
        message: '',
        title: '',
      });
    } catch {
      // Error already handled in hook
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      usersToDelete: [],
      message: '',
      title: '',
    });
    setSelectedUsers([]);
  };

  // ----------View----------
  const handleViewUser = (user) => {
    let roleDescription = user.role;
    let hiddenKeys = [
      'advised_section_ids',
      'advised_school_year_ids',
      'isSubjectTeacher',
      'isAdviser',
      'handled_section_ids',
      'handled_subject_ids',
    ]; // Base hidden keys for all roles

    if (user.role === 'Teacher') {
      const handledSubjects = Array.isArray(user.handled_subjects)
        ? user.handled_subjects
        : user.handled_subjects
        ? user.handled_subjects.split(',').map((s) => s.trim())
        : [];
      const advisedSections = Array.isArray(user.advised_sections)
        ? user.advised_sections
        : user.advised_sections
        ? user.advised_sections.split(',').map((s) => s.trim())
        : [];
      const hasSubjects = handledSubjects.length > 0;
      const hasAdvised = advisedSections.length > 0;

      if (hasSubjects && hasAdvised) {
        roleDescription = 'Teacher (Adviser / Subject Teacher)';
        // Show both: No additional hidden keys
      } else if (hasSubjects) {
        roleDescription = 'Teacher (Subject Teacher)';
        // Hide adviser-specific fields
        hiddenKeys = [...hiddenKeys, 'advised_sections'];
      } else if (hasAdvised) {
        roleDescription = 'Teacher (Adviser)';
        // Hide subject teacher-specific fields, including derived or related ones
        hiddenKeys = [
          ...hiddenKeys,
          'handled_subjects',
          'Handled Subject Ids',
          'Handled Section Ids',
        ];
      } else {
        roleDescription = 'Teacher';
        // Hide both if no specifics
        hiddenKeys = [
          ...hiddenKeys,
          'handled_subjects',
          'advised_sections',
          'Handled Subject Ids',
          'Handled Section Ids',
        ];
      }
    } else if (user.role === 'Admin') {
      // For Admins, hide all teacher-specific fields
      hiddenKeys = [
        ...hiddenKeys,
        'handled_subjects',
        'advised_sections',
        'Handled Subject Ids',
        'Handled Section Ids',
      ];
      roleDescription = 'Admin';
    } else {
      // For other roles, hide teacher-specific fields
      hiddenKeys = [
        ...hiddenKeys,
        'handled_subjects',
        'advised_sections',
        'Handled Subject Ids',
        'Handled Section Ids',
      ];
    }

    const modifiedUser = { ...user, role: roleDescription };
    setViewUser(modifiedUser);
    setViewHiddenKeys(hiddenKeys); // Set dynamic hidden keys based on sub-role
    setIsViewModalOpen(true);
  };

  // ----------Export----------
  const handleExport = async (e) => {
    const type = e.target.value;
    if (!type) return;

    const selectedData = users.filter((u) => selectedUsers.includes(u.user_id));
    const dataToExport = selectedData.length > 0 ? selectedData : filteredUsers;
    if (type === 'excel') exportToExcel(dataToExport);

    setExportType('');
  };

  const exportToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'User ID', key: 'user_id', width: 15 },
      { header: 'First Name', key: 'first_name', width: 20 },
      { header: 'Middle Initial', key: 'middle_initial', width: 15 },
      { header: 'Last Name', key: 'last_name', width: 20 },
      { header: 'Suffix', key: 'suffix', width: 10 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Handled Subjects', key: 'handled_subjects', width: 25 },
      { header: 'Handled Section', key: 'advised_sections', width: 25 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 },
    ];

    // Add rows for each user
    data.forEach((user) =>
      worksheet.addRow({
        user_id: user.user_id,
        first_name: user.first_name,
        middle_initial: user.middle_initial || '',
        last_name: user.last_name,
        suffix: user.suffix || '',
        email: user.email,
        role: user.role,
        status: user.status,
        handled_subjects: user.handled_subjects || '',
        advised_sections: user.advised_sections || '',
        created_at: formatDate(user.created_at),
        updated_at: formatDate(user.updated_at),
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
      `User_Exports(${new Date().toISOString().split('T')[0]}).xlsx`,
    );
  };

  // ----------Table Columns----------

  const columns = [
    { key: 'user_id', label: 'User ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'middle_initial', label: 'M.I.' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'suffix', label: 'Suffix' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (val, user) => {
        if (val === 'Teacher') {
          const handledSubjects = Array.isArray(user.handled_subjects)
            ? user.handled_subjects
            : user.handled_subjects
            ? user.handled_subjects.split(',').map((s) => s.trim())
            : [];

          const advisedSections = Array.isArray(user.advised_sections)
            ? user.advised_sections
            : user.advised_sections
            ? user.advised_sections.split(',').map((s) => s.trim())
            : [];

          const hasSubjects = handledSubjects.length > 0;
          const hasAdvised = advisedSections.length > 0;
          if (hasSubjects && hasAdvised)
            return (
              <span className="text-gray-700 font-medium">
                Teacher (Adviser / Subject Teacher)
              </span>
            );
          if (hasSubjects)
            return (
              <span className="text-gray-700 font-medium">
                Teacher (Subject Teacher)
              </span>
            );
          if (hasAdvised)
            return (
              <span className="text-gray-700 font-medium">
                Teacher (Adviser)
              </span>
            );
          return <span className="text-gray-700 font-medium">Teacher</span>;
        }

        // For Admin, User, etc.
        return <span className="text-gray-700 font-medium">{val}</span>;
      },
    },

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
    {
      key: 'handled_subjects',
      label: 'Handled Subjects',
      render: (val) => {
        // If val is null or empty
        if (!val || val.length === 0) {
          return <span className="italic text-gray-400">None</span>;
        }

        // If val is a string (single subject) — optional safety check
        const subjects = Array.isArray(val) ? val : [val];

        return (
          <span className="text-gray-700 text-sm">{subjects.join(', ')}</span>
        );
      },
    },

    {
      key: 'advised_sections',
      label: 'Advised Sections',
      render: (val) => (
        <span className="text-gray-700 text-sm">
          {val || <span className="italic text-gray-400">None</span>}
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
        {/* Header Section */}

        {/* Search and Add Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
            <SearchBar
              value={search}
              onChange={handleSearch}
              placeholder="Search users..."
            />
            <Button
              label="Add User"
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-white hover:bg-primary/90"
              icon={<FaPlus />}
            />
          </div>
        </div>

        {/* Selected Actions Bar */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm font-medium text-blue-700">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Dropdown
                placeholder="Export as..."
                value={exportType}
                onChange={handleExport}
                options={[{ label: 'Export as Excel', value: 'excel' }]}
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
                  confirmDeleteUsers(
                    selectedUsers,
                    `Are you sure you want to delete ${selectedUsers.length} user(s)? This cannot be undone.`,
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
            {filteredUsers.length} user
            {filteredUsers.length !== 1 && 's'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          selectable
          selected={selectedUsers}
          onSelect={setSelectedUsers}
          onSelectAll={setSelectedUsers}
          keyField="user_id"
          loading={loading}
          actions={(user) => (
            <Button
              icon={<FaEye />}
              onClick={() => handleViewUser(user)}
              className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2"
              title="View Details"
            />
          )}
        />
      </div>

      {isModalOpen && (
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUsers([]);
          }}
          onSave={handleAddUser}
        />
      )}

      {isBulkEditModalOpen && (
        <BulkEditUserModal
          isOpen={isBulkEditModalOpen}
          onClose={() => {
            setIsBulkEditModalOpen(false);
            setSelectedUsers([]);
          }}
          selectedUsers={users.filter((u) => selectedUsers.includes(u.user_id))}
          onSave={handleBulkSave}
        />
      )}

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

      {isViewModalOpen && viewUser && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false); // close the modal
            setViewUser(null); // clear selected user
          }}
          title="User Details"
          data={viewUser}
          hiddenKeys={viewHiddenKeys} // Pass dynamic hidden keys based on sub-role
        />
      )}
    </div>
  );
}
