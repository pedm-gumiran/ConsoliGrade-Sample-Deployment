import React from 'react';
import ResetPasswordForm from '../../components/Forms/ResetPasswordForm';
import BrandingAside from '../../components/Branding/BrandingAside';

export default function ResetPasswordPage() {
  return (
    <main className=" mx-4 w-full border flex bg-white border-gray-300 max-w-6xl  shadow-3xl rounded-3xl overflow-hidden  flex-col md:flex-row">
      <BrandingAside />
      <ResetPasswordForm/>
    </main>
  );
}
