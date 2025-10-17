// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../context/supabase_auth/supabaseAuth.js';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useSupabaseAuth();

  // While checking (avoid flash)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // If not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
