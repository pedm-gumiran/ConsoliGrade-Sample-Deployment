import React, { useEffect } from 'react';
import Btn_X from '../Buttons/Btn_X';
import { formatDate } from '../../components/utility/dateFormatter.js';

export default function ViewModal({
  isOpen,
  onClose,
  title = 'View Details',
  data = {},
  fields = [],
  hiddenKeys = [],
}) {
  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !data || Object.keys(data).length === 0) return null;

  // -------------------Helpers-------------------
  function formatLabel(key) {
    if (key.toLowerCase() === 'lrn') return 'LRN';
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function isDateField(key) {
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes('date') ||
      lowerKey.includes('time') ||
      lowerKey.includes('created') ||
      lowerKey.includes('updated') ||
      lowerKey.endsWith('_at')
    );
  }

  // -------------------Dynamic role-based filtering-------------------
  const role =
    data?.role?.toLowerCase?.() || data?.Role?.toLowerCase?.() || null;
  const isSubjectTeacher = data?.isSubjectTeacher === 1;
  const isAdviser = data?.isAdviser === 1;

  let roleHiddenFields = [];

  if (title.toLowerCase().includes('user') || data?.role) {
    if (role === 'admin') {
      // Admin → hide all teaching/advising info
      roleHiddenFields = [
        'handled_subject_ids',
        'handled_subjects',
        'handled_section_ids',
        'advised_section_ids',
        'advised_sections',
        'isSubjectTeacher',
        'isAdviser',
      ];
    } else if (role === 'teacher') {
      // Role: Teacher
      if (isSubjectTeacher && isAdviser) {
        // Both → show everything
        roleHiddenFields = [];
      } else if (isSubjectTeacher) {
        // Only subject teacher → hide adviser info
        roleHiddenFields = [
          'advised_section_ids',
          'advised_sections',
          'isAdviser',
          'isSubjectTeacher',
          'handled_section_ids',
          'handled_subject_ids'
        ];
      } else if (isAdviser) {
        // Only adviser → hide subject-teacher info
        roleHiddenFields = [
          'handled_subject_ids',
          'handled_subjects',
          'handled_section_ids',
          'isSubjectTeacher',
          'isAdviser',
        ];
      } else {
        // Neither → hide all teaching/advising info
        roleHiddenFields = [
          'handled_subject_ids',
          'handled_subjects',
          'handled_section_ids',
          'advised_section_ids',
          'advised_sections',
          'isSubjectTeacher',
          'isAdviser',
        ];
      }
    } else if (role === 'subject teacher') {
      // Only subject teacher
      roleHiddenFields = [
        'advised_section_ids',
        'advised_sections',
        'isAdviser',
      ];
    } else if (role === 'adviser') {
      // Only adviser
      roleHiddenFields = [
        'handled_subject_ids',
        'handled_subjects',
        'handled_section_ids',
        'isSubjectTeacher',
      ];
    }
  }

  // Combine manual + role-hidden keys safely
  const mergedHiddenKeys = [...new Set([...hiddenKeys, ...roleHiddenFields])];

  // -------------------Build fields to show-------------------
  const fieldsToShow =
    fields.length > 0
      ? fields
      : Object.keys(data).map((key) => ({
          key,
          label: formatLabel(key),
          value: data[key],
          hidden: mergedHiddenKeys.includes(key),
        }));

  // -------------------Render-------------------
  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold">{title}</h2>
          <Btn_X onClick={onClose} />
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldsToShow.map((field, index) => {
              if (field.hidden) return null;
              const value =
                field.value !== undefined ? field.value : data[field.key];

              return (
                <div
                  key={index}
                  className={`${field.fullWidth ? 'md:col-span-2' : ''}`}
                >
                  <label className="text-sm font-medium text-gray-600 block mb-1 underline">
                    {field.label}
                  </label>
                  <div className="text-gray-900">
                    {value !== null && value !== undefined && value !== '' ? (
                      isDateField(field.key) ? (
                        formatDate(value)
                      ) : (
                        String(value)
                      )
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
