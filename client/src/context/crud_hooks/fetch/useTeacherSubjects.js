import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useTeacherSubjects() {
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----------------- Fetch all teacher subject assignments -----------------
  const fetchTeacherSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('teacher_subjects')
        .select('teacher_id, subject_id, section_id');

      if (queryError) throw queryError;

      setTeacherSubjects(data || []);
      console.log('Fetched teacher subjects:', data);
    } catch (err) {
      setError(err);
      console.error('Error fetching teacher subjects:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherSubjects();
  }, [fetchTeacherSubjects]);

  return {
    teacherSubjects,
    loading,
    error,
    refetch: fetchTeacherSubjects
  };
}
