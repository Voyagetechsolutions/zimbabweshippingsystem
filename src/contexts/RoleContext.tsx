import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { tableFrom } from '@/integrations/supabase/db-types';

interface RoleContextType {
  user: User | null;
  isAdmin: boolean;
  role: string | null;
  isLoading: boolean;
  auditLog: (action: string, details: any) => Promise<void>;
  refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: React.ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      setIsLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const { data, error } = await supabase
            .from(tableFrom('users'))
            .select('role, is_admin')
            .eq('id', currentUser.id)
            .single();

          if (error) {
            console.error('Error fetching user role:', error);
            setIsAdmin(false);
            setRole(null);
          } else {
            setIsAdmin(data?.is_admin || false);
            setRole(data?.role || 'user');
          }
        } else {
          setIsAdmin(false);
          setRole(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsAdmin(false);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserRole();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const refreshRole = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from(tableFrom('users'))
          .select('role, is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error refreshing user role:', error);
          setIsAdmin(false);
          setRole(null);
        } else {
          setIsAdmin(data?.is_admin || false);
          setRole(data?.role || 'user');
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
        setIsAdmin(false);
        setRole(null);
      }
    } else {
      setIsAdmin(false);
      setRole(null);
    }
  };

  // For the auditLog function
  const auditLog = async (action: string, details: any) => {
    try {
      // Check if the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Instead of trying to use a non-existent audit_logs table,
      // We'll use the notifications table to log actions
      const { error } = await supabase
        .from(tableFrom('notifications'))
        .insert({
          user_id: user.id,
          title: `Audit: ${action}`,
          message: JSON.stringify(details),
          type: 'audit_log',
          is_read: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const value: RoleContextType = {
    user,
    isAdmin,
    role,
    isLoading,
    auditLog,
    refreshRole,
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
