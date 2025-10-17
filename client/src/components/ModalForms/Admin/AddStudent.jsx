import React, { useState, useEffect } from 'react';
import Input_Text from '../../InputFields/Input_Text';
import Dropdown from '../../InputFields/Dropdown';
import Button from '../../Buttons/Button';
import useSections from '../../../context/crud_hooks/fetch/useSection.js';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
export default function AddStudent({ isOpen, onClose, onSave }) {
  const { sections, loading: loadingSections } = useSections();
  const { schoolYear } = useActiveSchoolYear();

  const [formData, setFormData] = useState({
    lrn: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    age: '',
    sex: '',
    status: 'Active',
    section_id: '',
    school_year_id: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // -----------fetch the current school year----------
  useEffect(() => {
    if (schoolYear?.school_year_id) {
      setFormData((prev) => ({
        ...prev,
        school_year_id: schoolYear.school_year_id,
      }));
      console.log('Fetched school year id:', schoolYear.school_year_id);
    }
  }, [schoolYear]);

  // ----------state of the modal-------------
  if (!isOpen) return null;
  // ------------handle value change-------------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setIsSaving(true); // disable button + change label

    try {
      const success = await onSave(formData);

      if (success) {
        setFormData({
          lrn: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          suffix: '',
          age: '',
          sex: '',
          status: '',
        });
        onClose();
      }
      console.log('Data to saved:', formData);
    } finally {
      setIsSaving(false); // re-enable button
    }
  };
  // ------------------Check if all required fields have data------
  const isFormValid =
    formData.lrn &&
    formData.first_name &&
    formData.middle_name &&
    formData.last_name &&
    formData.sex &&
    formData.section_id;

  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      {/* Modal */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4"
      >
        {/* Header */}
        <div className="p-6 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold">Add Student</h2>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input_Text
              label="LRN"
              name="lrn"
              placeholder="Enter LRN"
              value={formData.lrn}
              onChange={handleChange}
              required
            />
            <Input_Text
              label="First Name"
              name="first_name"
              placeholder="Enter first name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
            <Input_Text
              label="Middle Name"
              name="middle_name"
              placeholder="Enter middle name"
              value={formData.middle_name}
              onChange={handleChange}
              required
            />
            <Input_Text
              label="Last Name"
              name="last_name"
              placeholder="Enter last name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
            <Input_Text
              label="Suffix"
              name="suffix"
              placeholder="e.g. Jr"
              value={formData.suffix}
              onChange={handleChange}
            />

            <Dropdown
              label="Sex"
              name="sex"
              placeholder="Select sex"
              value={formData.sex}
              onChange={handleChange}
              options={['Male', 'Female']}
              required
            />
            <Dropdown
              label="Grade & Section"
              name="section_id"
              placeholder="Select grade & section"
              value={formData.section_id}
              onChange={handleChange}
              required
              options={sections.map((s) => ({
                value: s.section_id, //
                label: `${s.grade_level} - ${s.section_name}`,
              }))}
              loading={loadingSections}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6">
          <Button
            label="Cancel"
            onClick={onClose}
            className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
          />
          <Button
            label={isSaving ? 'Saving...' : 'Save'}
            type="submit"
            className={`btn-primary text-white `}
            isLoading={isSaving}
            loadingText="Saving......"
            disabled={isSaving || !isFormValid}
          />
        </div>
      </form>
    </div>
  );
}
