import React, { useState } from 'react';
import Input_Text from '../../InputFields/Input_Text';
import Button from '../../Buttons/Button';
import Dropdown from '../../InputFields/Dropdown';

export default function AddSection({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    section_id: '',
    grade_level: '',
    section_name: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Wait for onSave to finish
      const success = await onSave(formData);

      if (success) {
        // Only reset and close if save was successful
        setFormData({
          section_id: '',
          grade_level: '',
          section_name: '',
        });
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };
  //  -------for form value----------
  const isFormValid = formData.grade_level && formData.section_name;

  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      {/* Modal */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col m-4"
      >
        {/* Header */}
        <div className="p-6 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold">Add Section</h2>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4">
            <Dropdown
              label="Grade Level"
              name="grade_level"
              placeholder="Select grade level"
              value={formData.grade_level || ''}
              onChange={handleChange}
              required
              options={[
                { label: '4', value: '4' },
                { label: '5', value: '5' },
                { label: '6', value: '6' },
              ]}
            />
            <Input_Text
              label="Section Name"
              name="section_name"
              placeholder="Enter section name"
              value={formData.section_name || ''}
              onChange={handleChange}
              required
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
            label={isSaving ? 'Saving ......' : 'Save'}
            type="submit"
            className={`btn-primary text-white $`}
            isLoading={isSaving}
            loadingText="Saving......"
            disabled={isSaving || !isFormValid}
          />
        </div>
      </form>
    </div>
  );
}
