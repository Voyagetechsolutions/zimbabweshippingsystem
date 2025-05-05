import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface RoleContextType {
  role: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isElevating: boolean;
  elevateToAdmin: (password: string) => Promise<boolean | undefined>;
  setRole: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  fetchUserRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export const RoleProvider: React.FC<Props> = ({ children }) => {
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isElevating, setIsElevating] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchUserRole = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user details from the profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_admin')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        // Set the role and admin status based on the fetched data
        setRole(profile?.role || 'user');
        setIsAdmin(profile?.is_admin || false);
      } else {
        // No user logged in, set default role
        setRole('guest');
        setIsAdmin(false);
      }
    } catch (error: any) {
      console.error('Error fetching user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch user role.",
        variant: "destructive"
      });
      setRole('guest');
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  const elevateToAdmin = async (password: string) => {
    try {
      setIsLoading(true);
      
      // Check if user is already admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
    // Here we would normally log to audit_logs, but we'll skip that since the table is gone
      
      // Call the function to elevate user to admin
      const { data, error } = await supabase.rpc('elevate_to_admin', {
        admin_password: password
      });
      
      if (error) {
        throw error;
      }
      
      if (data === true) {
        // User was successfully elevated to admin
        toast({
          title: "Success!",
          description: "You've been granted admin access.",
        });
        
        // Update the role state
        setRole('admin');
        setIsAdmin(true);
      } else {
        // Password was incorrect
        toast({
          title: "Access Denied",
          description: "Incorrect admin password.",
          variant: "destructive"
        });
      }
      
      return data;
    } catch (error: any) {
      console.error('Error in elevate to admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process admin access request.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value: RoleContextType = {
    role,
    isAdmin,
    isLoading,
    isElevating,
    elevateToAdmin,
    setRole,
    setIsAdmin,
    fetchUserRole,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
