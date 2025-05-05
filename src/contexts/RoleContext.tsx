
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { tableFrom } from '@/integrations/supabase/db-types';
import { useToast } from '@/hooks/use-toast';

export type UserRoleType = 'admin' | 'logistics' | 'driver' | 'support' | 'customer';

interface RoleContextType {
  user: User | null;
  isAdmin: boolean;
  role: string | null;
  isLoading: boolean;
  auditLog: (action: string, details: any) => Promise<void>;
  refreshRole: () => Promise<void>;
  hasPermission: (requiredRole: UserRoleType) => boolean;
  setUserRole: (userId: string, role: UserRoleType) => Promise<boolean>;
  elevateToAdmin: (adminPassword: string) => Promise<boolean>;
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
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRole = async () => {
      setIsLoading(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const { data, error } = await supabase
            .from(tableFrom('profiles'))
            .select('role, is_admin')
            .eq('id', currentUser.id)
            .single();

          if (error) {
            console.error('Error fetching user role:', error);
            setIsAdmin(false);
            setRole(null);
          } else {
            setIsAdmin(data?.is_admin || false);
            setRole(data?.role || 'customer');
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
          .from(tableFrom('profiles'))
          .select('role, is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error refreshing user role:', error);
          setIsAdmin(false);
          setRole(null);
        } else {
          setIsAdmin(data?.is_admin || false);
          setRole(data?.role || 'customer');
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

  // Check if user has a specific permission based on role
  const hasPermission = (requiredRole: UserRoleType): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // For other roles, check if the user has the required role
    if (requiredRole === 'admin') {
      return isAdmin;
    }
    
    return role === requiredRole;
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

  // Set a user's role
  const setUserRole = async (userId: string, newRole: UserRoleType): Promise<boolean> => {
    if (!user || !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You need admin privileges to change user roles",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from(tableFrom('profiles'))
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the role change
      await auditLog('ROLE_CHANGE', {
        target_user_id: userId,
        new_role: newRole,
        changed_by: user.id
      });

      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`,
      });

      return true;
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
      return false;
    }
  };

  // Elevate the current user to admin (requires admin password)
  const elevateToAdmin = async (adminPassword: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('elevate_to_admin', {
        admin_password: adminPassword
      });

      if (error) throw error;

      if (data) {
        // Update local state
        setIsAdmin(true);
        setRole('admin');
        
        // Log the elevation
        await auditLog('ADMIN_ELEVATION', {
          success: true,
          timestamp: new Date().toISOString()
        });
        
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Error elevating to admin:', error);
      return false;
    }
  };

  const value: RoleContextType = {
    user,
    isAdmin,
    role,
    isLoading,
    auditLog,
    refreshRole,
    hasPermission,
    setUserRole,
    elevateToAdmin
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
