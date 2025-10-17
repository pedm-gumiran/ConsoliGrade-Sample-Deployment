import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useHandledSubjects(user) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubjects = useCallback(async () => {
    if (!user?.user_id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('teachers_assigned_subjects') // view name
        .select('*')
        .eq('subject_teacher_id', user.user_id); // filter by logged-in teacher ID

      if (error) throw error;

      setSubjects(data || []);
    } catch (err) {
      console.error('Error fetching handled subjects:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return { subjects, loading, error, refetch: fetchSubjects };
}
