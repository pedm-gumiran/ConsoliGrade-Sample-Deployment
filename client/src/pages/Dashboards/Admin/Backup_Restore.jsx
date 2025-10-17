import React, { useState } from 'react';
import { FaDownload, FaUpload, FaTrash } from 'react-icons/fa';
import Button from '../../../components/Buttons/Button';
import DataTable from '../../../components/Tables/DataTable';
import ConfirmationBox from '../../../components/MessageBox/ConfirmationBox';
import SearchBar from '../../../components/InputFields/SearchBar';
import { toast } from 'react-toastify';
import { supabase } from '../../../supabaseClient';
import useBackups from '../../../context/crud_hooks/fetch/useBackups';
import { formatDate } from '../../../components/utility/dateFormatter.js';
import axios from '../../../api/axios.js';

export default function BackupRestore() {
  const [search, setSearch] = useState('');
  const [selectedBackups, setSelectedBackups] = useState([]);
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    backupsToDelete: [],
    message: '',
    title: 'Confirm Action',
    onConfirm: null,
  });
  const { backups, loading, refetch } = useBackups();
  const [isLoading, setIsLoading] = useState({
    backup: false,
    restore: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  //  Filtered backups for search
  const filteredBackups = backups.filter(
    (b) =>
      b.filename.toLowerCase().includes(search.toLowerCase()) ||
      b.date.toLowerCase().includes(search.toLowerCase()) ||
      b.size.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    { key: 'filename', label: 'Filename' },
    { key: 'date', label: 'Date Created', render: (v) => formatDate(v) },
    { key: 'size', label: 'Size' },
  ];

  const handleSearch = (e) => setSearch(e.target.value);

  // ------------------------Create full database backup-----------------
  const handleBackup = async () => {
    setIsLoading((prev) => ({ ...prev, backup: true }));

    try {
      const response = await axios.post('/api/backup_restore/backup');

      if (!response.data.success) throw new Error('Failed to create backup');

      const { backupData, filename, backupId } = response.data;

      //  Download locally
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update backup record with size
      const size = `${(blob.size / 1024 / 1024).toFixed(2)} MB`;
      await supabase.from('backups').update({ size }).eq('id', backupId);

      refetch();

      toast.success(` Full database backup created: ${filename}`);
    } catch (error) {
      console.error('Backup error:', error);
      toast.error(`Backup failed: ${error.message}`);
    } finally {
      setIsLoading((prev) => ({ ...prev, backup: false }));
    }
  };

  //  -------------------Restore full database-------------------
  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.data) throw new Error('Invalid backup file format');

        //  Ask user first before starting loading
        setConfirmAction({
          isOpen: true,
          message: `Are you sure you want to restore all tables from "${file.name}"? This will overwrite existing data.`,
          title: 'Confirm Full Restore',
          onConfirm: async () => {
            //  Only now start loading after confirmation
            setIsLoading((prev) => ({ ...prev, restore: true }));
            try {
              const response = await axios.post('/api/backup_restore/restore', {
                backupData,
              });

              if (!response.data.success) throw new Error('Failed to restore');

              toast.success('Full database restored successfully!');
              setConfirmAction({ isOpen: false, message: '' });
            } catch (restoreError) {
              console.error('Restore error:', restoreError);
              toast.error(`Restore failed: ${restoreError.message}`);
            } finally {
              setIsLoading((prev) => ({ ...prev, restore: false }));
            }
          },
        });
      } catch (error) {
        console.error('File read error:', error);
        toast.error(`Failed to read backup file: ${error.message}`);
      }
    };

    input.click();
  };

  // ---------------- Delete backups (with database + UI update) ----------------
  const confirmDelete = (ids, message) => {
    setConfirmAction({
      isOpen: true,
      backupsToDelete: ids,
      message,
      title: 'Confirm Delete',
      onConfirm: async () => {
        setIsDeleting(true); //  Start loading
        try {
          // Delete via backend API to log audit
          for (const id of ids) {
            await axios.delete(`/api/backup_restore/${id}`);
          }

          refetch();
          setSelectedBackups([]);

          toast.success('Backup(s) deleted successfully');
        } catch (err) {
          console.error('Delete backup error:', err);
          toast.error(`Failed to delete backup(s): ${err.message}`);
        } finally {
          setIsDeleting(false); // 🔹 Stop loading
          setConfirmAction({ isOpen: false, backupsToDelete: [], message: '' });
        }
      },
    });
  };

  const handleCancel = () => {
    setConfirmAction({ isOpen: false, backupsToDelete: [], message: '' });
    setSelectedBackups([]);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/*  Search +  Backup Button */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto lg:w-1/2">
            <SearchBar
              value={search}
              onChange={handleSearch}
              placeholder="Search backups..."
            />
            <Button
              label={'Create Full Backup'}
              onClick={handleBackup}
              className="bg-primary text-white hover:bg-primary/90"
              icon={<FaDownload />}
              disabled={isLoading.backup}
              isLoading={isLoading.backup}
              loadingText="Creating Backup..........."
            />
          </div>
        </div>

        {/*  Bulk Delete Notice */}
        {selectedBackups.length > 0 && (
          <div className="flex justify-between items-center bg-red-50 border border-red-200 px-4 py-3 rounded-lg mb-4">
            <span className="text-sm font-medium text-red-700">
              {selectedBackups.length} selected
            </span>
            <Button
              label="Delete "
              onClick={() =>
                confirmDelete(
                  selectedBackups,
                  `Are you sure you want to delete ${selectedBackups.length} backup(s)?`,
                )
              }
              className="bg-red-600 text-white hover:bg-red-700"
              icon={<FaTrash />}
            />
          </div>
        )}

        {/*  Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          Results:{' '}
          <span className="font-semibold">
            {filteredBackups.length} backup
            {filteredBackups.length !== 1 && 's'}
          </span>
        </div>

        {/*  Data Table */}
        <DataTable
          columns={columns}
          data={filteredBackups}
          selectable
          selected={selectedBackups}
          onSelect={setSelectedBackups}
          onSelectAll={setSelectedBackups}
          keyField="id"
          loading={loading}
          actions={(backup) => (
            <div className="flex gap-2">
              <Button
                title={'Restore from backup'}
                onClick={() => handleRestore(backup.filename)}
                className="bg-blue-100 text-blue-600 hover:bg-blue-200 p-2"
                icon={<FaUpload />}
                disabled={isLoading.restore}
              />
            </div>
          )}
        />
      </div>

      {confirmAction.isOpen && (
        <ConfirmationBox
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={handleCancel}
          label={
            confirmAction.title.toLowerCase().includes('delete')
              ? isDeleting
                ? 'Deleting......'
                : 'Yes, Delete'
              : isLoading.restore
              ? 'Restoring.......'
              : 'Yes, Restore'
          }
          isLoading={isDeleting || isLoading.restore}
        />
      )}
    </div>
  );
}
