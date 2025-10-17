// client/src/context/crud_hooks/fetch/useAudits.js
import { useState, useEffect, useCallback } from 'react';
import axios from '../../../api/axios';
import { toast } from 'react-toastify';

const useAudits = () => {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/audits');
      if (response.data.success) {
        setAudits(response.data.audits);
        setError(null);
        console.log('Fetch Audits', response.data.audits);
      } else {
        throw new Error('Failed to fetch audits');
      }
    } catch (err) {
      console.error('Error fetching audits:', err);
      setError(err.message);
      toast.error('Failed to load audits');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAudits = async (auditIds) => {
    try {
      await axios.delete('/api/audits/id', { data: { auditIds } });
      setAudits((prev) =>
        prev.filter((audit) => !auditIds.includes(audit.audit_id)),
      );
      toast.success('Audits deleted successfully');
    } catch (err) {
      console.error('Error deleting audits:', err);
      toast.error('Failed to delete audits');
      throw new Error(err.message);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  return { audits, loading, error, refetch: fetchAudits, deleteAudits };
};

export default useAudits;
