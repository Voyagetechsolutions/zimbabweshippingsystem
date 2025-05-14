
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [session, setSession] = useState<any>(null); // Type according to the expected session data
  const [user, setUser] = useState<any>(null); // Type accordingly
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

  // Sign-in method with error handling
  const signIn = async (email: string, password: string): Promise<{
    data?: any;
    error?: any;
  }> => {
    try {
      // Clean up any stale session data before signing in
      const cleanupAuthState = () => {
        // Remove standard auth tokens
        localStorage.removeItem('supabase.auth.token');
        // Remove all Supabase auth keys from localStorage
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // Remove from sessionStorage if in use
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      };
      
      // First clean up any stale auth state
      cleanupAuthState();
      
      // Then attempt to sign out globally (ignoring errors)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log("Global sign out failed, continuing with sign in");
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data };
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  // Sign-out method
  const signOut = async () => {
    try {
      // Clean up any auth state before signing out
      const cleanupAuthState = () => {
        // Remove standard auth tokens
        localStorage.removeItem('supabase.auth.token');
        // Remove all Supabase auth keys from localStorage
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        // Remove from sessionStorage if in use
        Object.keys(sessionStorage || {}).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      };
      
      // First clean up the auth state
      cleanupAuthState();
      
      // Then sign out (with global scope)
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear state
      setSession(null);
      setUser(null);
      
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
        variant: 'default',
      });
      
      // Force a page reload for a clean state
      window.location.href = '/auth';
      
    } catch (error) {
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
