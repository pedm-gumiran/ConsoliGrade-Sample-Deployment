import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';

export default function useHandledSection(user) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSections = useCallback(async () => {
    if (!user?.isAdviser) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('handled_sections') // query the view directly
        .select('*')
        .eq('adviser_id', user.user_id); // filter by logged-in teacher

      if (error) throw error;

      setSections(data || []);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.isAdviser, user?.user_id]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  return { sections, loading, error, refetch: fetchSections };
}
