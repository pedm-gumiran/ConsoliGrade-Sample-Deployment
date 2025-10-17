import React, { useState } from 'react';
import Input_Text from '../InputFields/Input_Text';
import Button from '../Buttons/Button';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function ForgotPasswordForm() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      //  Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        // You can set your custom reset page route
      });

      if (error) {
        toast.error(error.message);

        return;
      }

      toast.success(
        'If this email is registered, a password reset link has been sent. Please check your inbox or spam folder.',
      );

      setEmail('');

      // Optional: redirect to login after a few seconds
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="md:w-1/2 flex items-center justify-center px-4 py-8 sm:px-6 md:px-10 border border-gray-300">
      <div className="w-full max-w-sm">
        <header className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral">
            Forgot Password
          </h2>
          <p className="text-sm text-gray-500">
            Enter your registered email to reset your password.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input_Text
            label="Email"
            id="email"
            name="email"
            placeholder="Enter your email address"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-semibold"
            text_ClassName={loading ? 'opacity-50 cursor-not-allowed' : ''}
            disabled={loading}
          />

          <Button
            label={ 'Send Reset Link'}
            isLoading={loading}
            loadingText='Sending link......Please wait.......'
            type="submit"
            className={`btn-primary w-full text-white ${
              !email.trim() || loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={!email.trim() || loading}
          />

          <p className="text-center text-sm text-gray-500 mt-4">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
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
