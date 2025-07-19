import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';  // Adjust path if needed

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Optionally, you can show a spinner or loading text
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />; // Redirect to home (or wherever you want)
  }

  return children;
};

export default ProtectedRoute;
