
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // When the auth is done loading and we have a session, navigate to dashboard
        if (!loading) {
          if (session) {
            toast({
              title: "Authentication Successful",
              description: "You have been successfully logged in."
            });
            navigate('/dashboard');
          } else {
            // If there's no session after loading is complete, something went wrong
            toast({
              title: "Authentication Failed",
              description: "There was a problem with the authentication process.",
              variant: "destructive"
            });
            navigate('/auth');
          }
          setProcessingAuth(false);
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        toast({
          title: "Authentication Error",
          description: "There was a problem completing the authentication.",
          variant: "destructive"
        });
        navigate('/auth');
        setProcessingAuth(false);
      }
    };

    // Only run the callback handler if auth loading state changes or session changes
    handleCallback();
  }, [session, loading, navigate, toast]);

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
