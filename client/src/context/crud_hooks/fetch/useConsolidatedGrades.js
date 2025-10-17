import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { toast } from 'react-toastify';

export default function useConsolidatedGrades(adviserSections = []) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  const fetchConsolidatedGrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all teacher assigned subjects to know what subjects belong to each section
      const { data: teacherSubjectsData, error: teacherSubjectsError } = await supabase
        .from('teachers_assigned_subjects')
        .select('*');

        if (teacherSubjectsError) {
          console.warn('Teacher assigned subjects not available, falling back to grade-based subjects:', teacherSubjectsError);
        }

        // Group teacher assigned subjects by section_name
        const sectionSubjectMap = {};
        if (teacherSubjectsData) {
          teacherSubjectsData.forEach((item) => {
            const sectionName = item.section_name;
            if (!sectionSubjectMap[sectionName]) {
              sectionSubjectMap[sectionName] = new Set();
            }
            sectionSubjectMap[sectionName].add(item.subject_name);
          });

          // Convert sets to arrays
          Object.keys(sectionSubjectMap).forEach(sectionName => {
            sectionSubjectMap[sectionName] = Array.from(sectionSubjectMap[sectionName]);
          });

          console.log('Teacher assigned subjects mapping:', sectionSubjectMap);
        }

        // Get consolidated grades
        const { data, error: fetchError } = await supabase
          .from('consolidated_grades')
          .select('*');

        if (fetchError) {
          throw fetchError;
        }

        // Always collect grade-based subjects as fallback/additional subjects
        const gradeBasedSectionSubjectMap = {};
        data.forEach((row) => {
          const { section_name, subject_name } = row;
          const sectionNameOnly = section_name.includes(' - ')
            ? section_name.split(' - ')[1]
            : section_name;

          if (!gradeBasedSectionSubjectMap[sectionNameOnly]) {
            gradeBasedSectionSubjectMap[sectionNameOnly] = new Set();
          }
          gradeBasedSectionSubjectMap[sectionNameOnly].add(subject_name);
        });

        Object.keys(gradeBasedSectionSubjectMap).forEach(sectionName => {
          gradeBasedSectionSubjectMap[sectionName] = Array.from(gradeBasedSectionSubjectMap[sectionName]);
        });

        // Merge grade-based subjects into teacher subjects map
        Object.keys(gradeBasedSectionSubjectMap).forEach(sectionName => {
          if (!sectionSubjectMap[sectionName]) {
            sectionSubjectMap[sectionName] = [];
          }
          // Add any subjects from grades that aren't already in teacher subjects
          gradeBasedSectionSubjectMap[sectionName].forEach(subject => {
            if (!sectionSubjectMap[sectionName].includes(subject)) {
              sectionSubjectMap[sectionName].push(subject);
            }
          });
        });

        // Transform the flat data into the expected nested structure
        // Second pass: create student data with all section subjects
        const groupedData = {};

        data.forEach((row) => {
          const { lrn, student_name, sex, subject_name, quarter_code, grade, section_name, grade_id } = row;

          // Extract just the section name from grade_and_section (e.g., "6 - Mapagmahal" -> "Mapagmahal")
          const sectionNameOnly = section_name.includes(' - ')
            ? section_name.split(' - ')[1]
            : section_name;

          // Initialize student if not exists
          if (!groupedData[lrn]) {
            groupedData[lrn] = {
              lrn,
              name: student_name,
              sex,
              section_name: sectionNameOnly, // Store the cleaned section name
              grades: {
                Q1: {},
                Q2: {},
                Q3: {},
                Q4: {},
              },
            };

            // Initialize all section subjects with null grades
            if (sectionSubjectMap[sectionNameOnly]) {
              sectionSubjectMap[sectionNameOnly].forEach((subject) => {
                ['Q1', 'Q2', 'Q3', 'Q4'].forEach((quarter) => {
                  groupedData[lrn].grades[quarter][subject] = null; // No grade yet
                });
              });
            }
          }

          // Add actual grade for this subject and quarter
          if (groupedData[lrn].grades[quarter_code]) {
            groupedData[lrn].grades[quarter_code][subject_name] = parseFloat(grade);
          }
        });

        // Convert to array and sort by sex (Male first, then Female)
        let transformedData = Object.values(groupedData).sort((a, b) => {
          if (a.sex === b.sex) return 0;
          return a.sex === 'Male' ? -1 : 1;
        });

        // Filter by adviser sections if provided
        if (adviserSections.length > 0) {
          transformedData = transformedData.filter(student =>
            adviserSections.includes(student.section_name)
          );
        }

        setGrades(transformedData);
        console.log('Fetched consolidated grades:', transformedData.length, 'students');
        console.log('Section subjects mapping:', sectionSubjectMap);
      } catch (err) {
        console.error('Error fetching consolidated grades:', err);
        setError(err.message);
        toast.error('Failed to load consolidated grades');
      } finally {
        setLoading(false);
      }
  }, [adviserSections]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchConsolidatedGrades();
    }
  }, [fetchConsolidatedGrades]);

  return { grades, loading, error };
}
