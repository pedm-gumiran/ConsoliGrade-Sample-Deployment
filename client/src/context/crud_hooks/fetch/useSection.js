import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useSections(gradeLevel = null, status = null) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // ----------------- Fetch all sections -----------------
  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('sections')
        .select(
          'section_id, grade_level, section_name, status, created_at, updated_at'
        )
        .order('created_at', { ascending: false });

      if (gradeLevel) query = query.eq('grade_level', gradeLevel);
      if (status) query = query.eq('status', status);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setSections(data || []);
      console.log('Fetched Sections:', data);

      let countQuery = supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });
      if (gradeLevel) countQuery = countQuery.eq('grade_level', gradeLevel);
      if (status) countQuery = countQuery.eq('status', status);

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      setTotalCount(count || 0);
    } catch (err) {
      setError(err);
      console.error('Error fetching sections:', err.message);
    } finally {
      setLoading(false);
    }
  }, [gradeLevel, status]);

  // ----------------- Fetch sections NOT yet assigned -----------------
  const fetchUnhandledSections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all section IDs that already have a teacher assigned
      const { data: assigned, error: assignedError } = await supabase
        .from('section_advisers')
        .select('section_id')
        .eq('is_active', true);

      if (assignedError) throw assignedError;

      const assignedIds = assigned.map((s) => s.section_id);

      //  Get sections NOT in assignedIds
      let query = supabase
        .from('sections')
        .select('section_id, grade_level, section_name, status, created_at, updated_at');

      if (gradeLevel) query = query.eq('grade_level', gradeLevel);
      if (status) query = query.eq('status', status);

      if (assignedIds.length > 0) {
        query = query.not('section_id', 'in', `(${assignedIds.join(',')})`);
      }

      const { data: unhandledSections, error: queryError } = await query
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setSections(unhandledSections || []);
      setTotalCount(unhandledSections?.length || 0);
      console.log('Fetched unhandled sections:', unhandledSections);
    } catch (err) {
      setError(err);
      console.error('Error fetching unhandled sections:', err.message);
    } finally {
      setLoading(false);
    }
  }, [gradeLevel, status]);

  // ----------------- Fetch sections NOT assigned to a specific subject -----------------
  const fetchSectionsForSubject = useCallback(async (subjectId, gradeLevelFilter = null) => {
    setLoading(true);
    setError(null);

    try {
      // Get all section IDs that already have a teacher assigned to this subject
      const { data: assigned, error: assignedError } = await supabase
        .from('teacher_subjects')
        .select('section_id')
        .eq('subject_id', subjectId);

      if (assignedError) throw assignedError;

      const assignedIds = assigned.map((s) => s.section_id);

      // Get sections NOT in assignedIds and matching grade level if specified
      let query = supabase
        .from('sections')
        .select('section_id, grade_level, section_name, status, created_at, updated_at');

      if (gradeLevelFilter) query = query.eq('grade_level', gradeLevelFilter);
      if (status) query = query.eq('status', status);

      if (assignedIds.length > 0) {
        query = query.not('section_id', 'in', `(${assignedIds.join(',')})`);
      }

      const { data: availableSections, error: queryError } = await query
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setSections(availableSections || []);
      setTotalCount(availableSections?.length || 0);
      console.log('Fetched available sections for subject:', availableSections);
    } catch (err) {
      setError(err);
      console.error('Error fetching sections for subject:', err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchSections(); // default: fetch all sections on mount
  }, [fetchSections]);

  return {
    sections,
    totalCount,
    loading,
    error,
    refetch: fetchSections,
    fetchUnhandledSections, // new function to fetch only unassigned sections
    fetchSectionsForSubject // new function to fetch sections available for a specific subject
  };
}
