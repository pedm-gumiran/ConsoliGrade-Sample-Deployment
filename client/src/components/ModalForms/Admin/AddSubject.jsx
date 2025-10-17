import React, { useState } from 'react';
import Input_Text from '../../InputFields/Input_Text';
import Dropdown from '../../InputFields/Dropdown';
import Button from '../../Buttons/Button';

export default function AddSubject({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    subject_name: '',
    grade_level: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // ----------------For handling change in value-----------

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ------------handle save  of the data--------------------
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true); // disable button + change label

    try {
      const success = await onSave(formData);

      if (success) {
        setFormData({
          subject_id: '',
          subject_name: '',
          grade_level: '',
        });
        onClose();
      }
    } finally {
      setIsSaving(false); // re-enable button
    }
  };

  const isFormValid = formData.subject_name && formData.grade_level;

  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      {/* Modal */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4"
      >
        {/* Header */}
        <div className="p-6 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold">Add Subject</h2>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input_Text
              label="Subject Name"
              name="subject_name"
              placeholder="Enter subject name"
              value={formData.subject_name || ''}
              onChange={handleChange}
              required
            />

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
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6">
          <Button
            label="Cancel"
            onClick={onClose}
            className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
            disabled={isSaving}
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
  );
}
