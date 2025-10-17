import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';

const normalizeSectionIds = (sectionIds = []) =>
  Array.from(
    new Set(
      sectionIds
        .map((id) => {
          if (id === null || id === undefined) return null;
          const numeric = Number(id);
          return Number.isNaN(numeric) ? null : numeric;
        })
        .filter((id) => id !== null),
    ),
  );

export default function useSectionStudents(sectionIds = []) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizedIds = useMemo(
    () => normalizeSectionIds(sectionIds),
    [sectionIds],
  );

  const fetchStudents = useCallback(async () => {
    console.log('Fetching students for section IDs:', normalizedIds);

    if (normalizedIds.length === 0) {
      console.log('No section IDs provided, returning empty students array');
      setStudents([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Querying student_info view with section IDs:', normalizedIds);
      // Fetch students from the student_info view
      const { data, error: fetchError } = await supabase
        .from('student_info')
        .select('*')
        .in('section_id', normalizedIds)
        .order('last_name', { ascending: true });

      if (fetchError) {
        console.error('Error fetching students:', fetchError);
        throw fetchError;
      }

      console.log('Raw student data from Supabase:', data);

      // The student_info view already includes grade_and_section,
      // so we can use it directly
      const enrichedStudents = data.map(student => ({
        ...student,
        // Ensure all required fields have default values
        first_name: student.first_name || '',
        middle_name: student.middle_name || '',
        last_name: student.last_name || '',
        suffix: student.suffix || '',
        lrn: student.lrn || '',
        grade_and_section: student.grade_and_section || 'N/A',
        status: student.status || 'Active'
      }));

      setStudents(enrichedStudents);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [normalizedIds]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, error };
}
