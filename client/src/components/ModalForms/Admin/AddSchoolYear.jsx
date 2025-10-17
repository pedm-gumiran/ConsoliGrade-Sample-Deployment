// SchoolYearModal.jsx
import React, { useState, useEffect } from 'react';

import Button from '../../Buttons/Button';
import Btn_X from '../../Buttons/Btn_X';
import Input_Text from '../../InputFields/Input_Text';
import ModalLabel from '../../Label/ModalLabel';

export default function SchoolYearModal({ isOpen, onSave, onClose }) {
  const [formData, setFormData] = useState({
    school_year: '',
    status: 'Active',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // -------For handling onchange of value
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check if the new input contains letters
    if (/[a-zA-Z]/.test(value)) {
      setError('No letters are allowed');
    } else {
      setError('');
    }

    // Allow only numbers, space, and dash
    const formattedValue = value.replace(/[^0-9\- ]/g, '');

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  // Prevent body scroll when modal is isopen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // disable scroll
    } else {
      document.body.style.overflow = ''; // enable scroll
    }

    // Clean up when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ----------For saving the data---------------
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Wait for onSave to finish
      const success = await onSave(formData);

      if (success) {
        // Only reset and close if save was successful
        setFormData({
          school_year: '',
        });
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = formData.school_year;
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <form
        onSubmit={handleSave}
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
      >
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full relative">
          <div className="flex justify-between items-center  ">
            <ModalLabel label={'Add New School Year'} />
            {/* X Icon Close */}
            <Btn_X onClick={onClose} />
          </div>

          <div className="flex flex-col mb-3">
            <Input_Text
              type="text"
              value={formData.school_year || ''}
              name={'school_year'}
              onChange={handleChange}
              placeholder="e.g., 2025-2026"
              label={'School Year'}
              required
            />
            {error && (
              <span className="text-red-500 text-sm mt-1">{error}</span>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              onClick={() => {
                setFormData({
                  school_year: '',
                });
                onClose();
              }}
              className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
              label="Cancel"
            />
            <Button
              type="submit"
              className={`btn-primary text-white `}
              label={'Save'}
              isLoading={isSaving}
              loadingText="Saving......"
              disabled={isSaving || !isFormValid}
            />
          </div>
        </div>
      </form>
    </>
  );
}
