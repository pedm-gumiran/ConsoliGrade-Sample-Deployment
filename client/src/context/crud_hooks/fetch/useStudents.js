import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useStudents({
  gradeLevel = null,
  status = null,
  schoolYear = null,
  handledSection = null, // <-- new param
} = {}) {
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Main student data query
    let query = supabase
      .from('student_info')
      .select(
        `*`
      )
      .order('created_at', { ascending: false });

    // Optional filtering
    if (gradeLevel) query = query.ilike('grade_and_section', `${gradeLevel}%`);
    if (status) query = query.eq('status', status);
    if (schoolYear) query = query.eq('school_year', schoolYear);
    if (handledSection) query = query.eq('grade_and_section', handledSection); // <-- filter by handled section

    const { data, error } = await query;

    if (error) {
      setError(error);
      console.error('Error fetching students:', error.message);
    } else {
      setStudents(data || []);
      console.log('Fetched Students:', data);
    }

    // Fetch total count (based on same filters)
    let countQuery = supabase
      .from('student_info')
      .select('*', { count: 'exact', head: true });

    if (gradeLevel)
      countQuery = countQuery.ilike('grade_and_section', `${gradeLevel}%`);
    if (status) countQuery = countQuery.eq('status', status);
    if (schoolYear) countQuery = countQuery.eq('school_year', schoolYear);
    if (handledSection)
      countQuery = countQuery.eq('grade_and_section', handledSection); // <-- same here

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error fetching total count:', countError.message);
    } else {
      setTotalCount(count || 0);
    }

    setLoading(false);
  }, [gradeLevel, status, schoolYear, handledSection]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, totalCount, loading, error, refetch: fetchStudents };
}
