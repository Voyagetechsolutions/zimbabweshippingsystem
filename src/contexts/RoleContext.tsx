
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRoleType } from '@/types/admin';
import { callRpcFunction } from '@/utils/supabaseUtils';

interface RoleContextType {
  role: UserRoleType | null;
  isLoading: boolean;
  hasPermission: (requiredRole: UserRoleType) => boolean;
  elevateToAdmin: (password: string) => Promise<boolean>;
  setUserRole: (userId: string, newRole: UserRoleType) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, isAdmin } = useAuth();
  const [role, setRole] = useState<UserRoleType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        if (isAdmin) {
          setRole('admin');
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          
          if (error.message.includes("column 'role' does not exist")) {
            console.log('Role column not found, setting default role');
            setRole('customer');
          } else {
            setRole('customer');
          }
        } else if (data && 'role' in data) {
          // Temporarily restrict roles to only 'admin' and 'customer'
          const userRole = data.role as UserRoleType;
          if (userRole !== 'admin') {
            setRole('customer');
          } else {
            setRole(userRole);
          }
        } else {
          setRole('customer');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole('customer');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user, isAdmin]);

  const hasPermission = (requiredRole: UserRoleType): boolean => {
    if (!role) return false;
    
    if (role === 'admin' || isAdmin) return true;

    // Temporarily only check for 'admin' or 'customer' role
    switch (requiredRole) {
      case 'admin':
        return false; // Only admin roles can access admin features
      case 'customer':
        return true; // Everyone has customer access
      default:
        // Temporarily disable logistics, driver, and support roles
        return false;
    }
  };

  const elevateToAdmin = async (password: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to perform this action.',
        variant: 'destructive',
      });
      return false;
    }
    
    try {
      const { data, error } = await supabase.rpc('elevate_to_admin', {
        admin_password: password
      });

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

  const setUserRole = async (userId: string, newRole: UserRoleType): Promise<boolean> => {
    // Temporarily restrict role changes to only 'admin' and 'customer'
    if (newRole !== 'admin' && newRole !== 'customer') {
      toast({
        title: 'Role Change Failed',
        description: 'Only admin and customer roles are currently supported.',
        variant: 'destructive',
      });
      return false;
    }

    if (!hasPermission('admin')) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can change user roles.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Log the action before attempting the update for audit purposes
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'ROLE_CHANGE_ATTEMPT',
        entity_type: 'USER',
        entity_id: userId,
        details: { current_role: role, new_role: newRole }
      });

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        toast({
          title: 'Role Change Failed',
          description: error.message,
          variant: 'destructive',
        });
        
        // Log the failure
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          action: 'ROLE_CHANGE_FAILED',
          entity_type: 'USER',
          entity_id: userId,
          details: { error: error.message }
        });
        
        return false;
      }

      // Log the successful change
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'ROLE_CHANGED',
        entity_type: 'USER',
        entity_id: userId,
        details: { new_role: newRole }
      });

      toast({
        title: 'Role Updated',
        description: `User role has been changed to ${newRole}.`,
      });
      return true;
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

export type { UserRoleType };
