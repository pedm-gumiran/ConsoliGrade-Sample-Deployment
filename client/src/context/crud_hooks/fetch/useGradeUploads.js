// Create a new file at: src/context/crud_hooks/fetch/useGradeUploads.js
import { useState, useEffect, useCallback } from 'react';
import axios from '../../../api/axios';

export default function useGradeUploads(teacherId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/grades');
   

      if (response.data.success) {
        setGrades(response.data.grades);
      } else {
        throw new Error(response.data.message || 'Failed to fetch grades');
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (teacherId) {
      fetchGrades();
    }
  }, [fetchGrades, teacherId]);

  return { grades, loading, error, refetch: fetchGrades };
}
