// client/src/context/crud_hooks/fetch/useBackups.js
import { useState, useEffect, useCallback } from 'react';
import axios from '../../../api/axios';
import { toast } from 'react-toastify';

const useBackups = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---------- Fetch Backups ----------
  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/backup_restore/');
      if (response.data.success) {
        setBackups(response.data.backups);
        setError(null);
      } else {
        throw new Error('Failed to fetch backups');
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Delete Backups ----------
  const deleteBackups = async (backupIds) => {
    try {
      for (const id of backupIds) {
        await axios.delete(`/api/backup_restore/${id}`);
      }
      setBackups((prev) => prev.filter((b) => !backupIds.includes(b.id)));
    } catch (err) {
      console.error('Error deleting backups:', err);
      toast.error('Failed to delete backups');
    }
  };

  // ---------- Load Backups on Mount ----------
  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // ---------- Return State and Actions ----------
  return {
    backups,
    loading,
    error,
    refetch: fetchBackups,
    deleteBackups,
  };
};

export default useBackups;
