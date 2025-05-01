
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthError, Session } from '@supabase/supabase-js';

// Define return type for signIn function
interface SignInResponse {
  data: any;
  error: AuthError | null;
}

export const useAuth = () => {
  const [session, setSession] = useState<any>(null); 
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Function to fetch initial session data
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    fetchSession();

    // Listen for changes to authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign-in method
  const signIn = async (email: string, password: string): Promise<SignInResponse> => {
    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) throw response.error;

      // No custom email - using Supabase's built-in email service
      return response;
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  // Sign-out method
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    session,
    user,
    loading,
    signIn,
    signOut, // Exposing signOut function
  };
};
