import React, { useState, useEffect } from 'react';
import Btn_X from '../Buttons/Btn_X';
import Button from '../Buttons/Button';
import Input_Password from '../InputFields/Input_Password';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Disable scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  // Reset fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ newPassword: '', confirmPassword: '' });
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Check passwords match in real time
    if (updated.newPassword && updated.confirmPassword) {
      setError(
        updated.newPassword !== updated.confirmPassword
          ? 'Passwords do not match'
          : '',
      );
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      //  Ensure the user is logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('You must be logged in to change your password.');
        setLoading(false);
        return;
      }

      //  Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      //  Success
      toast.success('Password updated successfully!');
      setFormData({ newPassword: '', confirmPassword: '' });
      setError('');
      onClose();
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------For Inputs that trigger the submit button to be disabled------

  const isFormValid = formData.newPassword.trim() && formData.confirmPassword;

  return (
    <div className="fixed inset-0 bg-black/20 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold">Change Password</h2>
          <Btn_X onClick={onClose} />
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input_Password
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              placeholder="Enter new password"
            />

            <Input_Password
              label="Confirm New Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm new password"
            />

            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                label="Cancel"
                type="button"
                onClick={onClose}
                className="border border-gray-300 hover:bg-gray-200 bg-transparent text-gray-600"
              />
              <Button
                label={loading ? 'Saving...' : 'Save'}
                type="submit"
                disabled={loading || !isFormValid || error}
                className={`btn-primary  text-white ${
                  !isFormValid || loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
