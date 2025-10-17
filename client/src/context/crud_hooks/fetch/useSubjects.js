import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useSubjects(gradeLevel = null) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('subjects')
      .select('subject_id, subject_name, grade_level, created_at, updated_at')
      .order('subject_id', { ascending: false});

    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      setError(error);
      console.error('Error fetching subjects:', error.message);
    } else {
      setSubjects(data || []);
      console.log('Fetched Subjects:', data);
    }


    // ---------for counting total subjects based on filters----------
    let countQuery = supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true }); // count only
    if (gradeLevel) {
      countQuery = countQuery.eq('grade_level', gradeLevel);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('Error fetching total count:', countError.message);
    }
    else {
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [gradeLevel]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  return { subjects,totalCount, loading, error, refetch: fetchSubjects };
}
