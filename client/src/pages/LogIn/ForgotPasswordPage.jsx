import React from 'react';
import ForgotPasswordPageForm from '../../components/Forms/ForgotPasswordForm';
import BrandingAside from '../../components/Branding/BrandingAside';

export default function ForgotPasswordPage() {
  return (
    <main className=" mx-4 w-full border flex bg-white border-gray-300 max-w-6xl  shadow-3xl rounded-3xl overflow-hidden  flex-col md:flex-row">
      <BrandingAside />
      <ForgotPasswordPageForm />
    </main>
  );
}
