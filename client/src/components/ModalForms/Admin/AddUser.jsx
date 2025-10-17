import React, { useState, useEffect } from 'react';
import Input_Text from '../../InputFields/Input_Text';
import Input_Password from '../../InputFields/Input_Password';
import Dropdown from '../../InputFields/Dropdown';
import Button from '../../Buttons/Button';
import Role_CheckBox from '../../InputFields/Role_CheckBox';
import useSubjects from '../../../context/crud_hooks/fetch/useSubjects.js';
import useSections from '../../../context/crud_hooks/fetch/useSection.js'; // Add this hook
import useTeacherSubjects from '../../../context/crud_hooks/fetch/useTeacherSubjects.js'; // Add this hook
import SummaryModal from '../SummaryModal.jsx';
import { toast } from 'react-toastify';
import { IoClose } from 'react-icons/io5';
export default function AddUser({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    user_id: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    suffix: '',
    email: '', // Added email field
    role: '',
    status: 'Active',
    password: '',
    isAdviser: 0,
    isSubjectTeacher: 0,
    subjects: [], // Array of objects: [{subject_id, subject_name, grade_level, sections: [section_ids]}]
    adviser_section: '', // Single section ID for adviser
  });

  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [savedUserData, setSavedUserData] = useState(null);

  // -------------------Fetch subjects and sections-------------------
  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
  } = useSubjects();
  const {
    sections,
    loading: sectionsLoading,
    error: sectionsError,
    fetchUnhandledSections,
  } = useSections();
  const {
    teacherSubjects,
    loading: teacherSubjectsLoading,
    error: teacherSubjectsError,
  } = useTeacherSubjects();

  const isTeacher = formData.role === 'Teacher';
  const isAdmin = formData.role === 'Admin';
  const isSubjectTeacher = formData.isSubjectTeacher === 1;
  const isAdviser = formData.isAdviser === 1;

  useEffect(() => {
    if (isAdviser) {
      fetchUnhandledSections(); // fetch only sections without advisers
    }
  }, [isAdviser, fetchUnhandledSections]);

  // ----------------------Function to generate strong password----------------------
  function generateStrongPassword(first_Name) {
    if (!first_Name) return '';

    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%&*?';

    const allChars = upper + lower + numbers + symbols;

    // Random 6-character mix
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * allChars.length);
      randomPart += allChars[randomIndex];
    }

    const formattedName =
      first_Name.charAt(0).toUpperCase() + first_Name.slice(1).toLowerCase();

    // Combine name and random mix
    return `${formattedName}${randomPart}`;
  }

  // -------------------Filter sections without advisers-------------------

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let updatedData = { ...prev, [name]: value };

      // 👇 If typing in first name
      if (name === 'first_name') {
        if (value.trim() !== '') {
          //  Generate password automatically when first name has value
          updatedData.password = generateStrongPassword(value);
        } else {
          //  Clear password if first name is cleared
          updatedData.password = '';
        }
      }

      return updatedData;
    });
  };

  // -------------------Handle checkbox changes-------------------
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked ? 1 : 0,
      // Reset related fields when unchecking
      ...(name === 'isSubjectTeacher' && !checked ? { subjects: [] } : {}),
      ...(name === 'isAdviser' && !checked ? { adviser_section: '' } : {}),
    }));
  };

  //-------------------Handle role change-------------------
  const handleRoleChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      role: value,
      // Reset teacher-specific fields when changing to Admin
      ...(value === 'Admin'
        ? {
            isAdviser: 0,
            isSubjectTeacher: 0,
            subjects: [],
            adviser_section: '',
          }
        : {}),
    }));
  };

  // -------------------Handle subject selection-------------------
  const handleSubjectDropdownChange = (e) => {
    const subjectId = e.target.value;
    setSelectedSubjectToAdd(subjectId);

    if (subjectId) {
      const subject = subjects.find(
        (s) => s.subject_id.toString() === subjectId,
      );
      const alreadySelected = formData.subjects.find(
        (s) => s.subject_id === subjectId,
      );

      if (subject && !alreadySelected) {
        setFormData((prev) => ({
          ...prev,
          subjects: [
            ...prev.subjects,
            {
              subject_id: subjectId,
              subject_name: subject.subject_name,
              grade_level: subject.grade_level,
              sections: [], // Will be populated when sections are selected
            },
          ],
        }));
      }
      setSelectedSubjectToAdd(''); // Reset selection
    }
  };

  // -------------------Handle removing a subject-------------------
  const handleSubjectRemove = (subjectId) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter(
        (subject) => subject.subject_id !== subjectId,
      ),
    }));
  };

  // -------------------Handle section assignment for a subject-------------------
  const handleSectionChange = (subjectId, sectionId, checked) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((subject) =>
        subject.subject_id === subjectId
          ? {
              ...subject,
              sections: checked
                ? [...subject.sections, sectionId]
                : subject.sections.filter((id) => id !== sectionId),
            }
          : subject,
      ),
    }));
  };
  // -------------------Handle Save-------------------

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true); // disable Save button and show "Saving..."

    try {
      // EMAIL Teacher-specific validation
      if (formData.role === 'Teacher') {
        if (!formData.isAdviser && !formData.isSubjectTeacher) {
          alert(
            'Please select at least one teacher role (Subject Teacher or Adviser).',
          );
          return;
        }

        if (formData.isSubjectTeacher) {
          if (formData.subjects.length === 0) {
            alert('Please select at least one subject for Subject Teacher.');
            return;
          }

          const subjectsWithoutSections = formData.subjects.filter(
            (subject) => subject.sections.length === 0,
          );
          if (subjectsWithoutSections.length > 0) {
            alert('Please assign sections to all selected subjects.');
            return;
          }
        }

        if (formData.isAdviser && !formData.adviser_section) {
          alert('Please select a section to advise.');
          return;
        }
      }

      // EMAIL Prepare data for backend
      const userData = {
        ...formData,
        teacher_subjects: formData.subjects.flatMap((subject) =>
          subject.sections.map((section_id) => ({
            subject_id: parseInt(subject.subject_id),
            section_id: parseInt(section_id),
          })),
        ),
      };

      // EMAIL Save user
      const success = await onSave(userData);

      if (success) {
        //  Store data to display in summary modal
        setSavedUserData(userData);
        setShowSummary(true); // Show the modal
        console.log(' Saved user data for summary:', userData);
        console.log(' Showing summary modal...');

        // Reset form after successful save
        setFormData({
          user_id: '',
          first_name: '',
          middle_initial: '',
          last_name: '',
          suffix: '',
          email: '',
          role: '',
          status: 'Active',
          password: '',
          isAdviser: 0,
          isSubjectTeacher: 0,
          subjects: [],
          adviser_section: '',
        });
        setSelectedSubjectToAdd('');
      }

      console.log('User data saved:', userData);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('An unexpected error occurred while saving the user.');
    } finally {
      setIsSaving(false); // re-enable Save button
    }
  };

  // Prepare subject options for dropdown (excluding already selected ones)
  const availableSubjectOptions = subjects
    .filter(
      (subject) =>
        !formData.subjects.some(
          (s) => s.subject_id === subject.subject_id.toString(),
        ),
    )
    .map((subject) => ({
      label: `${subject.subject_name} (Grade ${subject.grade_level})`,
      value: subject.subject_id.toString(),
    }));

  const isFormValid = (() => {
    // Basic fields always required
    const basicFieldsFilled =
      formData.user_id.trim() &&
      formData.first_name.trim() &&
      formData.last_name.trim() &&
      formData.email.trim() &&
      formData.password.trim();

    if (!basicFieldsFilled) return false;

    if (isAdmin) {
      // Admin only needs basic fields
      return true;
    }

    if (isTeacher) {
      // Teacher must have at least one role
      if (!formData.isAdviser && !formData.isSubjectTeacher) return false;

      // If Subject Teacher, must have subjects with sections
      if (formData.isSubjectTeacher) {
        if (
          formData.subjects.length === 0 ||
          formData.subjects.some((s) => s.sections.length === 0)
        )
          return false;
      }

      // If Adviser, must select a section
      if (formData.isAdviser && !formData.adviser_section) return false;

      return true;
    }

    return false; // role not selected
  })();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
          {/* Modal */}
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col m-4"
          >
            {/* Header */}
            <div className="p-6 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold">Add User</h2>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input_Text
                  label="User ID"
                  name="user_id"
                  placeholder="Enter ID"
                  value={formData.user_id || ''}
                  onChange={handleChange}
                />
                <Input_Text
                  label="First Name"
                  name="first_name"
                  placeholder="Enter first name"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                />
                <Input_Text
                  label="Middle Initial"
                  name="middle_initial"
                  placeholder="M.I."
                  value={formData.middle_initial || ''}
                  onChange={handleChange}
                />
                <Input_Text
                  label="Last Name"
                  name="last_name"
                  placeholder="Enter last name"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                />
                <Input_Text
                  label="Suffix"
                  name="suffix"
                  placeholder="e.g. Jr"
                  value={formData.suffix || ''}
                  onChange={handleChange}
                />
                <Input_Text
                  label="Email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email || ''}
                  onChange={handleChange}
                  type="email"
                />

                <Dropdown
                  label="Role"
                  name="role"
                  placeholder="Select role"
                  value={formData.role || ''}
                  onChange={handleRoleChange}
                  options={[
                    { label: 'Admin', value: 'Admin' },
                    { label: 'Teacher', value: 'Teacher' },
                  ]}
                />

                <Input_Password
                  label="Password"
                  name="password"
                  placeholder="Enter password"
                  value={formData.password || ''}
                  onChange={handleChange}
                />
              </div>

              {/* Teacher Role Selection */}
              {isTeacher && (
                <div className="mt-6">
                  <label className="label text-lg text-gray-600 mb-2">
                    <span className="label-text font-semibold">
                      Select Teacher Role
                    </span>
                  </label>
                  <div className="flex gap-x-7 mb-4">
                    <Role_CheckBox
                      label="Subject Teacher"
                      id="subject-teacher"
                      name="isSubjectTeacher"
                      checked={formData.isSubjectTeacher === 1}
                      onChange={handleCheckboxChange}
                    />
                    <Role_CheckBox
                      label="Adviser"
                      id="adviser"
                      name="isAdviser"
                      checked={formData.isAdviser === 1}
                      onChange={handleCheckboxChange}
                    />
                  </div>

                  {/* Subject Selection for Subject Teachers */}
                  {isSubjectTeacher && (
                    <div className="mb-4">
                      <div>
                        <Dropdown
                          label="Add Subjects"
                          name="subjectSelection"
                          placeholder={
                            subjectsLoading
                              ? 'Loading subjects...'
                              : 'Select a subject to add'
                          }
                          value={selectedSubjectToAdd}
                          onChange={handleSubjectDropdownChange}
                          options={availableSubjectOptions}
                          disabled={
                            subjectsLoading ||
                            availableSubjectOptions.length === 0
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Choose subjects you will teach, then assign sections
                          for each
                        </p>
                      </div>

                      {/* Selected Subjects with Section Assignment */}
                      {formData.subjects.length > 0 && (
                        <div className="mt-4 space-y-4">
                          <p className="text-sm font-semibold text-gray-700">
                            Subject & Section Assignments:
                          </p>
                          {formData.subjects.slice().reverse().map((subject) => {
                            const subjectSections = sections.filter(
                              (section) => {
                                // Only show sections that match the grade level
                                if (section.grade_level !== subject.grade_level)
                                  return false;

                                // Check if this section is already assigned to this subject by another teacher
                                const isAlreadyAssigned = teacherSubjects.some(
                                  (ts) =>
                                    ts.subject_id ===
                                      parseInt(subject.subject_id) &&
                                    ts.section_id ===
                                      parseInt(section.section_id),
                                );

                                // Only include if not already assigned to another teacher
                                return !isAlreadyAssigned;
                              },
                            );

                            return (
                              <div
                                key={subject.subject_id}
                                className="p-4 border border-blue-200 rounded-lg bg-blue-50"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-blue-900">
                                    {subject.subject_name} (Grade{' '}
                                    {subject.grade_level})
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSubjectRemove(subject.subject_id)
                                    }
                                    className="text-red-600 hover:text-red-800 font-bold text-lg cursor-pointer"
                                  >
                                    <IoClose size={20} />
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <p className="text-sm text-gray-600 font-medium">
                                    Select sections to teach this subject:
                                  </p>

                                  {sectionsLoading || teacherSubjectsLoading ? (
                                    <p className="text-blue-600 text-sm">
                                      Loading sections...
                                    </p>
                                  ) : sectionsError || teacherSubjectsError ? (
                                    <p className="text-red-600 text-sm">
                                      Error loading sections:{' '}
                                      {sectionsError?.message ||
                                        teacherSubjectsError?.message}
                                    </p>
                                  ) : subjectSections.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {subjectSections.map((section) => (
                                        <label
                                          key={section.section_id}
                                          className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={subject.sections.includes(
                                              section.section_id.toString(),
                                            )}
                                            onChange={(e) =>
                                              handleSectionChange(
                                                subject.subject_id,
                                                section.section_id.toString(),
                                                e.target.checked,
                                              )
                                            }
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <span className="text-sm font-medium">
                                            {section.section_name}
                                          </span>
                                          {section.adviser_id && (
                                            <span className="text-xs text-gray-500">
                                              (Has Adviser)
                                            </span>
                                          )}
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                      <p className="text-yellow-800 text-sm font-medium">
                                        No available sections for Grade{' '}
                                        {subject.grade_level}
                                      </p>
                                      <p className="text-yellow-600 text-xs mt-1">
                                        All sections for this grade level are
                                        already assigned to other teachers for
                                        this subject.
                                      </p>
                                    </div>
                                  )}

                                  {/* Show selected sections */}
                                  {subject.sections.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 mb-1">
                                        Selected sections:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {subject.sections.map((sectionId) => {
                                          const section = sections.find(
                                            (s) =>
                                              s.section_id.toString() ===
                                              sectionId,
                                          );
                                          return section ? (
                                            <span
                                              key={sectionId}
                                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                              {section.section_name}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {subjectsError && (
                        <p className="text-red-500 text-sm mt-1">
                          Error loading subjects: {subjectsError.message}
                        </p>
                      )}

                      {availableSubjectOptions.length === 0 &&
                        !subjectsLoading &&
                        subjects.length > 0 && (
                          <p className="text-gray-500 text-sm mt-1">
                            All subjects have been selected.
                          </p>
                        )}
                    </div>
                  )}

                  {/* Section Selection for Advisers */}
                  {isAdviser && (
                    <div className="mb-4">
                      <Dropdown
                        label="Select Section"
                        name="adviser_section"
                        placeholder={
                          sectionsLoading
                            ? 'Loading sections...'
                            : 'Select a section'
                        }
                        value={formData.adviser_section}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            adviser_section: e.target.value,
                          }))
                        }
                        options={sections.map((section) => ({
                          label: `${section.section_name} (Grade ${section.grade_level})`,
                          value: section.section_id.toString(),
                        }))}
                        disabled={sectionsLoading || sections.length === 0}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Choose the section you will advise
                      </p>

                      {sectionsError && (
                        <p className="text-red-500 text-sm mt-1">
                          Error loading sections: {sectionsError.message}
                        </p>
                      )}
                      {!sectionsLoading && sections.length === 0 && (
                        <p className="text-yellow-600 text-sm mt-1">
                          All sections already have advisers assigned.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6">
              <Button
                type="button"
                label="Cancel"
                onClick={onClose}
                className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
              />
              <Button
                label={'Save'}
                type="submit"
                className={`btn-primary text-white `}
                isLoading={isSaving}
                loadingText="Saving......"
                disabled={isSaving || !isFormValid}
              />
            </div>
          </form>
        </div>
      )}
      {showSummary && savedUserData && (
        <SummaryModal
          isOpen={showSummary}
          onClose={() => {
            setShowSummary(false);
            onClose();
          }}
          hiddenKeys={[
            'isAdviser',
            'isSubjectTeacher',
            'status',
            'adviser_section',
            'subjects',
            'teacher_subjects',
            'adviser_section',
            'role',
          ]}
          title="Account Summary"
          data={savedUserData}
          countdownSeconds={10}
        />
      )}
    </>
  );
}
