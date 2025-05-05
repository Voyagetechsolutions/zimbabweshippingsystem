
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRoleType = 'admin' | 'driver' | 'logistics' | 'customer' | 'anonymous';

interface RoleContextProps {
  userRole: string | null;
  requestRoleElevation: (role: string) => Promise<void>;
  isLoading: boolean;
  hasPermission: (role: string) => boolean;
  role: string | null; // For backward compatibility
  elevateToAdmin: (password: string) => Promise<boolean>;
  setUserRole?: (userId: string, role: string) => Promise<boolean>; // For admin usage
}

const RoleContext = createContext<RoleContextProps>({
  userRole: null,
  role: null,
  requestRoleElevation: async () => {},
  isLoading: true,
  hasPermission: () => false,
  elevateToAdmin: async () => false,
});

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole('anonymous');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole('anonymous');
        } else {
          setUserRole(data?.role || 'anonymous');
        }
      } catch (error) {
        console.error('Unexpected error fetching user role:', error);
        setUserRole('anonymous');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading]);

  // This is a simplified implementation that just logs the request
  const requestRoleElevation = async (role: string) => {
    if (!user) {
      console.error('User not authenticated.');
      return;
    }

    try {
      // Just log to console instead since audit_logs table was deleted
      console.log('Role elevation request:', {
        user_id: user.id,
        action: 'ROLE_ELEVATION_REQUEST',
        entity_type: 'USER',
        details: {
          requested_role: role,
          status: 'pending'
        }
      });

      // Optimistically update the user role
      setUserRole('pending');

      // Notify success (even though we're only logging)
      console.log('Role elevation request submitted successfully.');
    } catch (error) {
      console.error('Error requesting role elevation:', error);
    }
  };

  // New function to check if a user has permission
  const hasPermission = (requiredRole: string) => {
    if (!userRole) return false;
    
    // Admin has all permissions
    if (userRole === 'admin') return true;
    
    // Exact role match
    if (userRole === requiredRole) return true;
    
    // Add other role hierarchies if needed
    if (requiredRole === 'customer' && ['driver', 'logistics', 'admin'].includes(userRole)) {
      return true;
    }
    
    return false;
  };

  // New function to elevate to admin
  const elevateToAdmin = async (password: string): Promise<boolean> => {
    try {
      // This would normally call a Supabase function, but we'll mock the behavior
      console.log('Admin elevation with password', password);
      
      if (password === 'admin123') { // Demo password for testing
        setUserRole('admin');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during admin elevation:', error);
      return false;
    }
  };

  // For admin to set user roles
  const setRoleForUser = async (userId: string, role: string): Promise<boolean> => {
    try {
      if (!hasPermission('admin')) {
        console.error('Only admins can set user roles');
        return false;
      }

      // Update the user's role in the database
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting user role:', error);
      return false;
    }
  };

  return (
    <RoleContext.Provider 
      value={{ 
        userRole, 
        role: userRole, // For backward compatibility
        requestRoleElevation, 
        isLoading,
        hasPermission,
        elevateToAdmin,
        setUserRole: setRoleForUser
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
