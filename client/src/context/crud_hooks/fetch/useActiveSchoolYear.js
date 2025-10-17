import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useSchoolYears() {
  const [schoolYear, setSchoolYear] = useState(''); // active year only
  const [allSchoolYears, setAllSchoolYears] = useState([]); // all rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch active school year
  const fetchSchoolYear = useCallback(async () => {
    const { data, error } = await supabase
      .from('school_years')
      .select('school_year_id, school_year, status, start_date, end_date')
      .eq('status', 'Active')
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(error);
      console.error('Error fetching active school_year:', error.message);
    } else {
      setSchoolYear(data || '');
    }
  }, []);

  // Fetch all school years
  const fetchAllSchoolYears = useCallback(async () => {
    const { data, error } = await supabase
      .from('school_years')
      .select('school_year_id, school_year, status, start_date, end_date')
      .order('start_date', { ascending: false });

    if (error) {
      setError(error);
      console.error('Error fetching all school_years:', error.message);
    } else {
      setAllSchoolYears(data || []);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchAllSchoolYears(); // fetch all first
      await fetchSchoolYear();     // then fetch active
      setLoading(false);
    };

    fetchData();
  }, [fetchAllSchoolYears, fetchSchoolYear]);

  return {
    schoolYear,      // active school year (string only)
    allSchoolYears,  // array of all school years
    loading,
    error,
    refetch: fetchSchoolYear,
    refetchAll: fetchAllSchoolYears,
  };
}
