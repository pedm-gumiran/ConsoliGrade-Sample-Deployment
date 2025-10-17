import React, { useState } from 'react';
import useAudits from '../../../context/crud_hooks/fetch/useAudits';
import SearchBar from '../../../components/InputFields/SearchBar';
import Button from '../../../components/Buttons/Button';
import { FaFileExport, FaEye, FaTrash } from 'react-icons/fa';
import DataTable from '../../../components/Tables/DataTable';
import ViewModal from '../../../components/ModalForms/ViewModal';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function Manage_Audit() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAudits, setSelectedAudits] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState({
    isOpen: false,
    auditsToDelete: [],
    message: '',
    title: 'Confirm Delete',
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isViewModalOpen, setIsOpenViewModal] = useState(false);
  const [viewAudit, setViewAudit] = useState(null);
  // Handle View
  const handleViewAudit = (student) => {
    setViewAudit(student);
    setIsOpenViewModal(true);
  };

  const { audits, loading, refetch, deleteAudits } = useAudits();

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredAudits = audits.filter((a) => {
    const matchesSearch =
      `${a.audit_id} ${a.name} ${a.action} ${a.remarks} ${a.status}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDate = dateFilter
      ? new Date(a.date).toDateString() === new Date(dateFilter).toDateString()
      : true;
    return matchesSearch && matchesDate;
  });

  // Open confirmation modal
  const confirmDeleteAudits = (auditsToDeleteArray, message) => {
    setConfirmDelete({
      isOpen: true,
      auditsToDelete: auditsToDeleteArray,
      message,
      title: 'Confirm Delete',
    });
  };

  const handleDeleteConfirmed = async () => {
    const idsToDelete = confirmDelete.auditsToDelete;
    if (!idsToDelete || idsToDelete.length === 0) return;

    try {
      setIsDeleting(true);
      await deleteAudits(idsToDelete);
      await refetch(); // Refresh data after delete
      setSelectedAudits((prev) =>
        prev.filter((id) => !idsToDelete.includes(id)),
      );
      setConfirmDelete({
        isOpen: false,
        auditsToDelete: [],
        message: '',
        title: '',
      });
    } catch (err) {
      console.error('Delete failed:', err.message);
      // Optionally show a toast error here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete({
      isOpen: false,
      auditsToDelete: [],
      message: '',
      title: '',
    });
    setSelectedAudits([]);
  };

  // Export to Excel
  const exportToExcel = async (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audits');

    // Define columns with headers and initial widths
    worksheet.columns = [
      { header: 'Audit ID', key: 'audit_id', width: 15 },
      { header: 'User ID', key: 'user_id', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Remarks', key: 'remarks', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
    ];

    // Add rows for each audit
    data.forEach((audit) =>
      worksheet.addRow({
        audit_id: audit.audit_id,
        user_id: audit.user_id,
        name: audit.name,
        action: audit.action,
        remarks: audit.remarks,
        date: formatDate(audit.date),
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

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `Audit_Exports(${new Date().toISOString().split('T')[0]}).xlsx`);
  };

  // Handle Export
  const handleExport = () => {
    const selectedData = audits.filter((a) =>
      selectedAudits.includes(a.audit_id),
    );
    const dataToExport =
      selectedData.length > 0 ? selectedData : filteredAudits;
    exportToExcel(dataToExport);
  };

  const columns = [
    { key: 'audit_id', label: 'Audit ID' },
    { key: 'user_id', label: 'User ID' },
    { key: 'name', label: 'Name' },
    { key: 'action', label: 'Action' },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (val, row) => {
        // Special handling for grade upload audits
        if (row.action && row.action.includes('Upload grades for subject')) {
          return (
            <div className="text-xs space-y-1">
              <div className="font-medium text-gray-700">{val}</div>
            </div>
          );
        }

        // Default handling for other audits
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              val === 'Success'
                ? 'bg-green-100 text-green-700'
                : val.includes('Success')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {val}
          </span>
        );
      },
    },
    { key: 'date', label: 'Date', render: (v) => formatDate(v) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Main Container */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Search and Export Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
            <SearchBar
              value={search}
              onChange={handleSearch}
              placeholder="Search audits..."
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3  py-2 lg:-py-1  border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary "
              placeholder="Filter by date"
            />
            <Button
              label="Export"
              onClick={handleExport}
              className="bg-primary text-white hover:bg-primary/90"
              icon={<FaFileExport />}
              disabled={filteredAudits.length === 0}
            />
          </div>
        </div>

        {/* Delete Multiple */}
        {selectedAudits.length > 0 && (
          <div className="flex justify-between items-center bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm font-medium text-red-700">
              {selectedAudits.length} selected
            </span>
            <Button
              label="Delete Selected"
              onClick={() =>
                confirmDeleteAudits(
                  selectedAudits,
                  `Are you sure you want to delete ${selectedAudits.length} audit record(s)? This cannot be undone.You may lose records for the audit`,
                )
              }
              className="bg-red-600 text-white hover:bg-red-700"
              icon={<FaTrash />}
            />
          </div>
        )}

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          Results:{' '}
          <span className="font-semibold">
            {filteredAudits.length} audit trail
            {filteredAudits.length !== 1 && 's'}
          </span>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredAudits}
          selectable
          selected={selectedAudits}
          onSelect={setSelectedAudits}
          onSelectAll={setSelectedAudits}
          keyField="audit_id"
          loading={loading}
          actions={(audit) => (
            <div className="flex gap-1">
              <Button
                icon={<FaEye />}
                onClick={() => handleViewAudit(audit)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2 ml-3"
                title="View Details"
              />
            </div>
          )}
        />
      </div>

      {/* Confirmation Modal */}
      {confirmDelete.isOpen && (
        <ConfirmationBox
          title={confirmDelete.title}
          message={confirmDelete.message}
          onConfirm={handleDeleteConfirmed}
          onCancel={handleCancelDelete}
          label={'Yes,Delete'}
          isLoading={isDeleting}
        />
      )}
      {isViewModalOpen && viewAudit && (
        <ViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsOpenViewModal(false);
            setViewAudit(null);
          }}
          title="Student Details"
          data={viewAudit}
        />
      )}
    </div>
  );
}
