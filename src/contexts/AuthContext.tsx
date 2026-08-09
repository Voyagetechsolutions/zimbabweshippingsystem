
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({
    data: { session: null, user: null },
    error: null
  }),
  signOut: async () => {},
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const claimedForRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check active session
    const getInitialSession = async () => {
      setLoading(true);
      
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        if (initialSession?.user) {
          checkAdminStatus(initialSession.user.id);
          claimOnce(initialSession.user.id);
        }
      } catch (error) {
        logger.error("Error getting initial session:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to retrieve your session. Please try logging in again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    getInitialSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        logger.debug("Auth state changed:", event, newSession ? "Session exists" : "No session");
        setSession(newSession);
        setUser(newSession?.user || null);
        setLoading(false);
        
        if (newSession?.user) {
          checkAdminStatus(newSession.user.id);
          claimOnce(newSession.user.id);
        } else {
          setIsAdmin(false);
          claimedForRef.current = null;
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [toast]);

  // onAuthStateChange also fires on token refresh, so the claim is run at most
  // once per signed-in user rather than on every event.
  const claimOnce = (userId: string) => {
    if (claimedForRef.current === userId) return;
    claimedForRef.current = userId;
    claimGuestBookings();
  };

  // Bookings made before the customer had an account (or while signed out)
  // carry user_id = null. Matching them to this account by confirmed sender
  // email is what makes them appear on the dashboard. Best effort: a failure
  // here must never block signing in.
  const claimGuestBookings = async () => {
    try {
      // Cast: the generated Database types are stale and don't list this RPC.
      const { data, error } = await (supabase.rpc as any)('claim_guest_bookings');
      if (error) {
        logger.debug('Could not claim guest bookings:', error.message);
        return;
      }
      const claimed = Number((data as any)?.claimed || 0);
      if (claimed > 0) {
        toast({
          title: claimed === 1 ? 'Booking added to your account' : `${claimed} bookings added to your account`,
          description: 'Earlier bookings made with this email address are now in your dashboard.',
        });
      }
    } catch (error) {
      logger.debug('Could not claim guest bookings:', error);
    }
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_user_admin', { user_id: userId });
      
      if (error) {
        logger.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(data === true);
    } catch (error) {
      logger.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        toast({
          title: "Login Failed",
          description: response.error.message,
          variant: "destructive"
        });
      } else if (response.data.user) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${response.data.user.email}!`,
        });
      }
      
      return response;
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message || "An unexpected error occurred during login",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: error.message || "Failed to sign out properly",
        variant: "destructive"
      });
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
