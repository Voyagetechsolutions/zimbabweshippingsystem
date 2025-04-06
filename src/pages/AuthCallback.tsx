
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    // When the session is available, navigate to the dashboard
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-zim-green mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Completing Authentication</h1>
        <p className="text-gray-600">Please wait while we complete your authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
