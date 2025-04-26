
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse the URL for potential tokens from OAuth or magic link flows
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error messages in the URL (from OAuth providers or magic links)
        const errorMessage = hashParams.get('error_description') || 
                            queryParams.get('error_description') ||
                            hashParams.get('error') || 
                            queryParams.get('error');
                            
        if (errorMessage) {
          setError(errorMessage);
          toast({
            title: "Authentication Error",
            description: errorMessage,
            variant: "destructive"
          });
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

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
            setError("Authentication failed. Please try logging in again.");
            toast({
              title: "Authentication Failed",
              description: "There was a problem with the authentication process.",
              variant: "destructive"
            });
            setTimeout(() => navigate('/auth'), 3000);
          }
          setProcessingAuth(false);
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        setError("An unexpected error occurred during authentication.");
        toast({
          title: "Authentication Error",
          description: "There was a problem completing the authentication.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/auth'), 3000);
        setProcessingAuth(false);
      }
    };

    // Only run the callback handler if auth loading state changes or session changes
    handleCallback();
  }, [session, loading, navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {processingAuth && !error ? (
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-zim-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Completing Authentication</h1>
          <p className="text-gray-600">Please wait while we complete your authentication...</p>
        </div>
      ) : error ? (
        <div className="text-center max-w-md">
          <div className="rounded-full bg-red-100 p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">Redirecting you to the login page...</p>
        </div>
      ) : null}
    </div>
  );
};

export default AuthCallback;
