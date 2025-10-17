import React, { useState, useEffect } from 'react';
import Input_Password from '../../components/InputFields/Input_Password';
import Button from '../../components/Buttons/Button';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';

import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Handle Supabase reset link and restore session
  useEffect(() => {
    const hash = window.location.hash;
    const params = Object.fromEntries(new URLSearchParams(hash.substring(1)));

    if (params.access_token && params.refresh_token) {
      supabase.auth
        .setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        })
        .then(({ error }) => {
          if (error) {
            toast.error('Invalid or expired reset link.');
            console.error(error);

            navigate('/login');
          } else {
            setSessionReady(true);

            // (Optional) Clean the URL so tokens aren’t visible
            window.history.replaceState({}, document.title, '/reset-password');
          }
        });
    } else {
      toast.error('Invalid or expired reset link.');

      navigate('/login');
    }
  }, [navigate]);

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

    const { newPassword, confirmPassword } = formData;

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please fill out all fields.');

      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');

      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');

      return;
    }

    setLoading(true);

    try {
      // This now works because session is restored
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);

        return;
      }

      toast.success('Password updated successfully!');

      setFormData({ newPassword: '', confirmPassword: '' });

      // Redirect to login after success
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.newPassword.trim() && formData.confirmPassword.trim();

  //  Show loading while verifying reset link
  if (!sessionReady) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-center">
          Verifying reset link, please wait...
        </p>
      </section>
    );
  }

  return (
    <section className="md:w-1/2 flex items-center justify-center px-4 py-8 sm:px-6 md:px-10 border border-gray-300">
      <div className="w-full max-w-sm">
        <header className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral">
            Reset Password
          </h2>
          <p className="text-sm text-gray-500">
            Enter your new password below.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input_Password
            label="New Password"
            id="newPassword"
            name="newPassword"
            placeholder="Enter new password"
            required
            value={formData.newPassword}
            onChange={handleChange}
            disabled={loading}
            className="font-semibold"
          />

          <Input_Password
            label="Confirm Password"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm new password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            className="font-semibold"
          />

          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

          <Button
            label={'Update Password'}
            isLoading={loading}
            loadingText="Updating Password........."
            type="submit"
            className={`btn-primary w-full text-white ${
              !isFormValid || loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={!isFormValid || loading}
          />

          <p className="text-center text-sm text-gray-500 mt-4">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Back to Login
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
