import React from 'react';
import BrandingAside from '../../components/Branding/BrandingAside';
import LoginForm from '../../components/Forms/LoginForm';

export default function LoginPage() {
  return (
    <main className=" mx-4 w-full border flex bg-white border-gray-300 max-w-6xl  shadow-3xl rounded-3xl overflow-hidden  flex-col md:flex-row">
      <BrandingAside />
      <LoginForm />
    </main>
  );
}
