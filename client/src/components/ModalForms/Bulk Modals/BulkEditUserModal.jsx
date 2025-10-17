import React, { useEffect, useState } from 'react';
import Button from '../../Buttons/Button';
import Input_Text from '../../InputFields/Input_Text';
import Input_Password from '../../InputFields/Input_Password';
import Dropdown from '../../InputFields/Dropdown';
import Role_CheckBox from '../../InputFields/Role_CheckBox';
import { FaUserEdit, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';
import useSubjects from '../../../context/crud_hooks/fetch/useSubjects.js';
import useSections from '../../../context/crud_hooks/fetch/useSection.js';
import useTeacherSubjects from '../../../context/crud_hooks/fetch/useTeacherSubjects.js';
import { toast } from 'react-toastify';

export default function BulkEditUserModal({
  isOpen,
  onClose,
  selectedUsers = [],
  onSave,
}) {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [openItems, setOpenItems] = useState({});

  const [removedSubjects, setRemovedSubjects] = useState({}); // TRACK REMOVED SUBJECTS

  const { subjects, loading: subjectsLoading } = useSubjects();
  const {
    sections,
    loading: sectionsLoading,
    error: sectionsError,
  } = useSections();
  const {
    teacherSubjects,
    loading: teacherSubjectsLoading,
    error: teacherSubjectsError,
  } = useTeacherSubjects();
  const isFormValid =
    Object.keys(formData).length > 0 &&
    Object.values(formData).every((user) => {
      const isTeacher = user.role === 'Teacher';

      if (
        !user.first_name?.trim() ||
        !user.last_name?.trim() ||
        !user.email?.trim()
      ) {
        return false;
      }

      if (isTeacher) {
        if (!user.isAdviser && !user.isSubjectTeacher) return false;

        if (user.isSubjectTeacher) {
          // Must have at least one subject
          if (!Array.isArray(user.subjects) || user.subjects.length === 0) {
            return false;
          }
          // All subjects must have at least one section assigned
          const allSubjectsHaveSections = user.subjects.every(
            (s) => Array.isArray(s.sections) && s.sections.length > 0,
          );
          if (!allSubjectsHaveSections) return false;
        }

        if (user.isAdviser && !user.adviser_section) return false;
      }

      return true;
    });

  // Initialize data and set all collapsed by default
  useEffect(() => {
    if (!selectedUsers || selectedUsers.length === 0) return;

    const data = {};
    const openState = {};

    selectedUsers.forEach((user) => {
      const isTeacher = user.role === 'Teacher';

      // Parse arrays from strings or keep as arrays
      const parseArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string' && value.trim()) {
          return value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
        }
        return [];
      };

      const handledSubjectsArr = parseArray(user.handled_subjects);
      const handledSubjectIdsArr = parseArray(user.handled_subject_ids);
      const handledSectionIdsArr = parseArray(user.handled_section_ids);
      const advisedSectionIdsArr = parseArray(user.advised_section_ids);

      // Detect roles
      const isAdviser = isTeacher && advisedSectionIdsArr.length > 0;

      const isSubjectTeacher =
        isTeacher &&
        (teacherSubjects && !teacherSubjectsLoading
          ? teacherSubjects.some(
              (ts) => ts.teacher_id.toString() === user.user_id.toString(),
            )
          : handledSubjectsArr.length > 0);

      // Build subjects if subject teacher
      // Normalize data (1 subject_id ↔ many section_ids) before setting formData
      let userSubjects = [];
      if (isSubjectTeacher) {
        if (teacherSubjects && !teacherSubjectsLoading) {
          // Prefer fetching subject-section pairs from teacherSubjects instead of strings
          const userTeacherSubjects = teacherSubjects.filter(
            (ts) => ts.teacher_id.toString() === user.user_id.toString(),
          );
          const subjectMap = {};
          userTeacherSubjects.forEach((ts) => {
            const sid = ts.subject_id.toString();
            if (!subjectMap[sid]) {
              const subj = subjects.find(
                (s) => s.subject_id.toString() === sid,
              );
              subjectMap[sid] = {
                subject_id: sid,
                subject_name: subj?.subject_name || '',
                grade_level: subj?.grade_level || '',
                sections: [],
              };
            }
            const secId = ts.section_id.toString();
            if (!subjectMap[sid].sections.includes(secId)) {
              subjectMap[sid].sections.push(secId);
            }
          });
          userSubjects = Object.values(subjectMap);
        } else {
          // Fallback to parsing strings if teacherSubjects not loaded
          // Use subjectMap grouping by subject_id instead of array index
          const subjectMap = {};
          handledSectionIdsArr.forEach((sectionId, i) => {
            const subjectId =
              handledSubjectIdsArr[
                Math.min(i, handledSubjectIdsArr.length - 1)
              ]?.toString() || '';
            const subjectWithFormat =
              handledSubjectsArr[Math.min(i, handledSubjectsArr.length - 1)] ||
              '';
            let subjectName = subjectWithFormat;
            if (
              typeof subjectWithFormat === 'string' &&
              subjectWithFormat.includes(' - ')
            ) {
              subjectName = subjectWithFormat.split(' - ')[0].trim();
            }
            if (subjectId && !subjectMap[subjectId]) {
              const subjectData = subjects.find(
                (s) => s.subject_id.toString() === subjectId,
              );
              subjectMap[subjectId] = {
                subject_id: subjectId,
                subject_name: subjectName,
                grade_level: subjectData?.grade_level || '',
                sections: [],
              };
            }
            const sectionIdStr = sectionId?.toString() || '';
            if (
              subjectId &&
              sectionIdStr &&
              !subjectMap[subjectId].sections.includes(sectionIdStr)
            ) {
              subjectMap[subjectId].sections.push(sectionIdStr);
            }
          });
          userSubjects = Object.values(subjectMap);
        }
      }

      // Adviser section (first advised section if multiple)
      const adviser_section =
        isAdviser && advisedSectionIdsArr.length > 0
          ? advisedSectionIdsArr[0]?.toString() || ''
          : '';

      // Save to data object
      data[user.user_id] = {
        ...user,
        password: user.password || '', // Optional: leave empty if not updating
        isAdviser: isAdviser, // boolean true/false
        isSubjectTeacher: isSubjectTeacher, // boolean true/false
        subjects: userSubjects || [],
        adviser_section,
      };

      // Open teacher forms by default for better UX
      openState[user.user_id] = false; // all collapsed
    });

    setFormData(data);
    setOpenItems(openState);
  }, [selectedUsers, subjects, teacherSubjects, teacherSubjectsLoading]);

  // Disable background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleCollapse = (id) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Handlers
  const handleChange = (id, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev };
      const user = { ...updated[id], [name]: value };
      updated[id] = user;
      return updated;
    });
  };

  const handleCheckboxChange = (id, e) => {
    const { name, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [name]: checked, // boolean
        ...(name === 'isSubjectTeacher' && !checked ? { subjects: [] } : {}),
        ...(name === 'isAdviser' && !checked ? { adviser_section: '' } : {}),
      },
    }));
  };

  const handleRoleChange = (id, e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        role: value,
        ...(value === 'Admin'
          ? {
              isAdviser: false,
              isSubjectTeacher: false,
              subjects: [],
              adviser_section: '',
            }
          : {}),
      },
    }));
  };

  const handleSubjectAdd = (id, e) => {
    const subjectId = e.target.value;
    if (!subjectId) return;
    const subject = subjects.find((s) => s.subject_id.toString() === subjectId);
    if (!subject) return;

    setFormData((prev) => {
      const user = prev[id];
      const alreadyAdded = user.subjects.some(
        (s) => s.subject_id.toString() === subjectId,
      );
      if (alreadyAdded) return prev;

      const updatedSubjects = [
        {
          subject_id: subjectId,
          subject_name: subject.subject_name,
          grade_level: subject.grade_level,
          sections: [],
        },
        ...user.subjects,
      ];

      return {
        ...prev,
        [id]: { ...user, subjects: updatedSubjects },
      };
    });
  };
  const handleSubjectRemove = (id, subjectId) => {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        subjects: prev[id].subjects.filter(
          (subj) => subj.subject_id !== subjectId,
        ),
      },
    }));

    setRemovedSubjects((prev) => ({
      ...prev,
      [id]: prev[id] ? [...prev[id], subjectId] : [subjectId],
    }));
  };
  const handleSectionToggle = (id, subjectId, sectionId, checked) => {
    setFormData((prev) => {
      const user = prev[id];
      const updatedSubjects = user.subjects.map((subj) => {
        if (subj.subject_id === subjectId) {
          const newSections = checked
            ? [...subj.sections, sectionId]
            : subj.sections.filter((sid) => sid !== sectionId);

          return { ...subj, sections: newSections };
        }
        return subj;
      });

      return {
        ...prev,
        [id]: { ...user, subjects: updatedSubjects },
      };
    });
  };

  const handleAdviserSectionChange = (id, e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: { ...prev[id], adviser_section: value },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = Object.values(formData).map((user) => {
        // Flatten subjects into parallel arrays for backend
        const handledSubjects = [];
        const handledSubjectIds = [];
        const handledSectionIds = [];

        user.subjects.forEach((subject) => {
          // Each subject can have multiple sections
          subject.sections.forEach((sectionId) => {
            handledSubjects.push(subject.subject_name);
            handledSubjectIds.push(subject.subject_id);
            handledSectionIds.push(sectionId);
          });
        });

        return {
          ...user,
          handled_subjects: handledSubjects,
          handled_subject_ids: handledSubjectIds,
          handled_section_ids: handledSectionIds,
        };
      });

      const success = await onSave(updates, removedSubjects); // send removedSubjects too
      console.log('Updates to save:', updates);
      console.log('Subjects to remove:', removedSubjects);

      if (success) {
        onClose(); // only close if save succeeded
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving updates.'); // modal stays open
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-base-200 flex justify-center items-center z-50">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col m-4"
      >
        {/* Header */}
        <div className="p-6 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Edit Users</h2>
            <p className="text-sm text-gray-600">
              Update multiple user accounts at once
            </p>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
            <FaUserEdit className="text-blue-600 text-base" />
            <span>
              {selectedUsers.length}{' '}
              {selectedUsers.length === 1 ? 'User' : 'Users'} selected
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {Object.entries(formData).map(([id, user]) => {
            const isTeacher = user.role === 'Teacher';
            const isSubjectTeacher = !!user.isSubjectTeacher;
            const isAdviser = !!user.isAdviser;

            let availableSubjects = subjects.filter(
              (s) =>
                !user.subjects.some(
                  (sel) => sel.subject_id === s.subject_id.toString(),
                ),
            );

            // Further filter to only show subjects not assigned to any teacher
            if (teacherSubjects && !teacherSubjectsLoading) {
              const assignedSubjectIds = new Set(
                teacherSubjects.map((ts) => ts.subject_id.toString()),
              );
              availableSubjects = availableSubjects.filter(
                (s) => !assignedSubjectIds.has(s.subject_id.toString()),
              );
            }

            const availableSections = sections.filter(
              (section) => !section.adviser_id,
            );

            const isOpen = openItems[id];

            return (
              <div
                key={id}
                className="border border-gray-200 rounded-xl shadow-sm transition-all duration-300"
              >
                {/* Collapsible Header */}
                <button
                  type="button"
                  className="w-full flex justify-between items-center px-4 py-3 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-t-xl transition"
                  onClick={() => toggleCollapse(id)}
                >
                  <h3 className="font-medium text-gray-800">
                    {user.first_name} {user.last_name} —{' '}
                    {user.role || 'No Role'}
                  </h3>
                  {isOpen ? (
                    <FaChevronUp className="text-gray-500" />
                  ) : (
                    <FaChevronDown className="text-gray-500" />
                  )}
                </button>

                {/* Smooth Transition Section */}
                <div
                  className={`transition-all duration-500 ease-in-out overflow-hidden bg-gray-50 rounded-b-xl ${
                    isOpen
                      ? 'max-h-[3000px] opacity-100 p-4 border-t border-gray-200'
                      : 'max-h-0 opacity-0 p-0'
                  }`}
                >
                  {/* Collapsible Content */}
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input_Text
                        label="User ID"
                        name="user_id"
                        value={user.user_id || ''}
                        onChange={(e) => handleChange(id, e)}
                        disabled={true}
                      />
                      <Input_Text
                        label="First Name"
                        name="first_name"
                        value={user.first_name || ''}
                        onChange={(e) => handleChange(id, e)}
                      />
                      <Input_Text
                        label="Middle Initial"
                        name="middle_initial"
                        value={user.middle_initial || ''}
                        onChange={(e) => handleChange(id, e)}
                      />
                      <Input_Text
                        label="Last Name"
                        name="last_name"
                        value={user.last_name || ''}
                        onChange={(e) => handleChange(id, e)}
                      />
                      <Input_Text
                        label="Suffix"
                        name="suffix"
                        value={user.suffix || ''}
                        onChange={(e) => handleChange(id, e)}
                      />

                      <Dropdown
                        label="Status"
                        name="status"
                        value={user.status || ''}
                        options={[
                          { label: 'Active', value: 'Active' },
                          { label: 'Inactive', value: 'Inactive' },
                        ]}
                        onChange={(e) => handleChange(id, e)}
                      />

                      <Input_Text
                        label="Email"
                        name="email"
                        type="email"
                        value={user.email || ''}
                        onChange={(e) => handleChange(id, e)}
                      />
                      <Dropdown
                        label="Role"
                        name="role"
                        value={user.role || ''}
                        options={[
                          { label: 'Admin', value: 'Admin' },
                          { label: 'Teacher', value: 'Teacher' },
                        ]}
                        onChange={(e) => handleRoleChange(id, e)}
                      />
                      <Input_Password
                        label="Password"
                        name="password"
                        value={user.password || ''}
                        onChange={(e) => handleChange(id, e)}
                      />
                    </div>

                    {/* Teacher Roles */}
                    {isTeacher && (
                      <div className="border-t border-gray-300 pt-4">
                        <p className="font-semibold text-gray-700 mb-3">
                          Select Teacher Role
                        </p>
                        <div className="flex gap-6">
                          <Role_CheckBox
                            label="Subject Teacher"
                            name="isSubjectTeacher"
                            checked={user.isSubjectTeacher}
                            onChange={(e) => handleCheckboxChange(id, e)}
                          />
                          <Role_CheckBox
                            label="Adviser"
                            name="isAdviser"
                            checked={user.isAdviser}
                            onChange={(e) => handleCheckboxChange(id, e)}
                          />
                        </div>

                        {/* Subject Teacher Section */}
                        {isSubjectTeacher && (
                          <div className="mt-4">
                            <Dropdown
                              label="Add Subject"
                              name="subjectAdd"
                              value={''}
                              onChange={(e) => handleSubjectAdd(id, e)}
                              options={availableSubjects.map((s) => ({
                                label: `${s.subject_name} (Grade ${s.grade_level})`,
                                value: s.subject_id.toString(),
                              }))}
                              placeholder={
                                subjectsLoading
                                  ? 'Loading subjects...'
                                  : 'Select subject to add'
                              }
                            />

                            {user.subjects.map((subject) => {
                              const subjectSections = sections.filter((section) => {
                                // Only show sections that match the grade level
                                if (section.grade_level !== subject.grade_level) return false;

                                // Always return true (so the section always appears)
                                return true;
                              });

                              return (
                                <div
                                  key={`${subject.subject_id}`}
                                  className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200"
                                >
                                  <div className="flex justify-between items-center">
                                    <p className="font-semibold text-blue-900">
                                      {subject.subject_name}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSubjectRemove(
                                          id,
                                          subject.subject_id,
                                        )
                                      }
                                      className="text-red-500 font-bold cursor-pointer"
                                    >
                                      <IoClose size={20} />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                                    {sectionsLoading ||
                                    teacherSubjectsLoading ? (
                                      <div className="col-span-full text-center py-4">
                                        <p className="text-blue-600 text-sm">
                                          Loading sections...
                                        </p>
                                      </div>
                                    ) : sectionsError ||
                                      teacherSubjectsError ? (
                                      <div className="col-span-full p-3 bg-red-50 border border-red-200 rounded">
                                        <p className="text-red-600 text-sm">
                                          Error loading sections:{' '}
                                          {sectionsError?.message ||
                                            teacherSubjectsError?.message}
                                        </p>
                                      </div>
                                    ) : subjectSections.length > 0 ? (
                                      subjectSections.map((section) => {
                                        const isAssignedToOtherTeacher = teacherSubjects?.some(
                                          (ts) =>
                                            ts.subject_id === parseInt(subject.subject_id) &&
                                            ts.section_id === parseInt(section.section_id) &&
                                            ts.teacher_id !== parseInt(user.user_id),
                                        );
                                        return (
                                          <Role_CheckBox
                                            key={section.section_id}
                                            label={`${section.section_name} (G${section.grade_level})`}
                                            checked={subject.sections.includes(
                                              section.section_id.toString(),
                                            )}
                                            disabled={isAssignedToOtherTeacher} // disable if assigned to another teacher
                                            onChange={(e) =>
                                              handleSectionToggle(
                                                id,
                                                subject.subject_id,
                                                section.section_id.toString(),
                                                e.target.checked,
                                              )
                                            }
                                          />
                                        );
                                      })
                                    ) : (
                                      <div className="col-span-full p-3 bg-yellow-50 border border-yellow-200 rounded">
                                        <p className="text-yellow-800 text-sm font-medium">
                                          No sections found for Grade {subject.grade_level}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Adviser Section */}
                        {isAdviser && (
                          <div className="mt-4">
                            <Dropdown
                              label="Section to Advise"
                              name="adviser_section"
                              value={user.adviser_section || ''}
                              onChange={(e) =>
                                handleAdviserSectionChange(id, e)
                              }
                              options={availableSections.map((s) => ({
                                label: `${s.section_name}(G${s.grade_level})`,
                                value: s.section_id.toString(),
                              }))}
                              placeholder={
                                sectionsLoading || teacherSubjectsLoading
                                  ? 'Loading sections...'
                                  : 'Select section to advise'
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <Button
            className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
            label="Cancel"
            onClick={onClose}
            type="button"
          />
          <Button
            label={'Save'}
            type="submit"
            isLoading={isSaving}
            loadingText="Saving..."
            className="btn-primary text-white"
            disabled={isSaving || !isFormValid}
          />
        </div>
      </form>
    </div>
  );
}
