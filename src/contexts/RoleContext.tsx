
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRoleType } from '@/types/admin';

interface RoleContextType {
  role: UserRoleType | null;
  isLoading: boolean;
  hasPermission: (requiredRole: UserRoleType) => boolean;
  elevateToAdmin: (password: string) => Promise<boolean>;
  setUserRole: (userId: string, newRole: UserRoleType) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch the user's role from the profiles table
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // First try to get role directly
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          
          // If the column doesn't exist yet, set default role
          if (error.message.includes("column 'role' does not exist")) {
            console.log('Role column not found, setting default role');
            setRole('customer' as UserRoleType); // Default role
          } else {
            setRole('customer' as UserRoleType); // Default fallback for other errors
          }
        } else if (data && data.role) {
          setRole(data.role as UserRoleType);
        } else {
          // If no role found, default to customer
          setRole('customer' as UserRoleType);
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole('customer' as UserRoleType); // Default role
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  // Check if the user has permission for a specific role
  const hasPermission = (requiredRole: UserRoleType): boolean => {
    if (!role) return false;

    // Role hierarchy: admin > logistics > driver/support > customer
    switch (requiredRole) {
      case 'admin':
        return role === 'admin';
      case 'logistics':
        return role === 'admin' || role === 'logistics';
      case 'driver':
        return role === 'admin' || role === 'logistics' || role === 'driver';
      case 'support':
        return role === 'admin' || role === 'logistics' || role === 'support';
      case 'customer':
        return true; // Everyone has customer access
      default:
        return false;
    }
  };

  // Function to elevate a user to admin with the secret password
  const elevateToAdmin = async (password: string): Promise<boolean> => {
    try {
      // Try to call the RPC function via raw query instead of typed RPC
      const { data, error } = await supabase
        .rpc('elevate_to_admin', {
          admin_password: password
        } as any);

      if (error) {
        toast({
          title: 'Elevation Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      if (data) {
        toast({
          title: 'Admin Access Granted',
          description: 'You now have administrative privileges.',
        });
        setRole('admin');
        return true;
      }
      
      toast({
        title: 'Elevation Failed',
        description: 'Invalid admin password.',
        variant: 'destructive',
      });
      return false;
    } catch (error: any) {
      toast({
        title: 'Elevation Error',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Function to set another user's role (admin only)
  const setUserRole = async (userId: string, newRole: UserRoleType): Promise<boolean> => {
    try {
      if (role !== 'admin') {
        toast({
          title: 'Permission Denied',
          description: 'Only administrators can change user roles.',
          variant: 'destructive',
        });
        return false;
      }

      // Try to call the RPC function via raw query instead of typed RPC
      const { data, error } = await supabase
        .rpc('set_user_role', {
          target_user_id: userId,
          new_role: newRole
        } as any);

      if (error) {
        toast({
          title: 'Role Change Failed',
          description: error.message,
          variant: 'destructive',
        });
        return false;
      }

      if (data) {
        toast({
          title: 'Role Updated',
          description: `User role has been changed to ${newRole}.`,
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      toast({
        title: 'Role Change Error',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const contextValue: RoleContextType = {
    role,
    isLoading,
    hasPermission,
    elevateToAdmin,
    setUserRole
  };

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// Re-export UserRoleType for convenience
export type { UserRoleType };
