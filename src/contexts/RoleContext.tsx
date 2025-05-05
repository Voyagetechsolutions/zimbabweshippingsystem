
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define the user role types
export type UserRole = 'customer' | 'admin' | 'staff' | 'driver' | 'logistics' | 'support';

// Define permissions for each role
type RolePermissions = {
  [key in UserRole]: string[];
};

// Define structure for role context
interface RoleContextType {
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isDriver: boolean;
  isLogistics: boolean;
  isSupport: boolean;
  hasPermission: (permission: string) => boolean;
  checkRoleIncludes: (roles: UserRole[]) => boolean;
  refetchRole: () => Promise<void>;
  isLoading: boolean;
  elevateToAdmin: (password: string) => Promise<boolean>;
  setUserRole: (userId: string, role: UserRole) => Promise<boolean>;
}

// Create the context with a default value
const RoleContext = createContext<RoleContextType | undefined>(undefined);

// Define permissions for each role
const rolePermissions: RolePermissions = {
  customer: ['view_own_shipments', 'create_shipment', 'track_shipment'],
  admin: [
    'view_all_shipments',
    'manage_shipments',
    'manage_users',
    'manage_system',
    'view_reports',
    'manage_settings',
    'delete_data',
    'assign_roles',
    'view_own_shipments',
    'create_shipment',
    'track_shipment'
  ],
  staff: [
    'view_all_shipments',
    'manage_shipments',
    'view_reports',
    'view_own_shipments',
    'create_shipment',
    'track_shipment'
  ],
  driver: [
    'view_assigned_shipments',
    'update_shipment_status',
    'view_own_shipments',
    'create_shipment',
    'track_shipment'
  ],
  logistics: [
    'view_all_shipments',
    'manage_shipments',
    'view_reports',
    'update_shipment_status',
    'view_own_shipments',
    'create_shipment',
    'track_shipment'
  ],
  support: [
    'view_customer_data',
    'view_all_shipments',
    'respond_to_tickets',
    'view_own_shipments',
    'create_shipment',
    'track_shipment'
  ]
};

interface RoleProviderProps {
  children: React.ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setRole('customer');
        return;
      }
      
      // Fetch the user's profile which contains the role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setRole('customer');
        return;
      }
      
      // If the user is an admin in the profile, set role to admin
      if (profileData.is_admin) {
        setRole('admin');
        return;
      }
      
      // Otherwise, use the role from the profile, defaulting to customer if not set
      if (profileData.role && isValidRole(profileData.role)) {
        setRole(profileData.role as UserRole);
      } else {
        setRole('customer');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('customer');
    } finally {
      setLoading(false);
    }
  };

  // Check if a role string is a valid UserRole
  const isValidRole = (roleStr: string): boolean => {
    return ['customer', 'admin', 'staff', 'driver', 'logistics', 'support'].includes(roleStr);
  };

  useEffect(() => {
    // Fetch the role when the provider mounts
    fetchUserRole();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await fetchUserRole();
      } else if (event === 'SIGNED_OUT') {
        setRole('customer');
      }
    });
    
    return () => {
      // Clean up the listener
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return rolePermissions[role].includes(permission);
  };

  // Check if user's role is included in a list of roles
  const checkRoleIncludes = (roles: UserRole[]): boolean => {
    return roles.includes(role);
  };

  // Calculate derived role properties
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isDriver = role === 'driver';
  const isLogistics = role === 'logistics';
  const isSupport = role === 'support';

  // Log MFA verification attempts via console for now, since audit_logs table is gone
  const logMfaVerification = async (token: string) => {
    console.log('MFA verification attempt:', {
      token_provided: !!token,
      timestamp: new Date().toISOString(),
    });
  };

  // Add the elevateToAdmin function
  const elevateToAdmin = async (password: string): Promise<boolean> => {
    try {
      // For security, use a secure API call instead of checking password directly
      if (password === 'admin123') { // This is a simplified example; use a more secure method in production
        setRole('admin');
        
        // Log the elevation attempt - using console as audit_logs table is removed
        console.log("User elevated to admin role", new Date().toISOString());
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in elevateToAdmin:', error);
      return false;
    }
  };

  // Add the setUserRole function
  const setUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      // Update user's role in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          is_admin: newRole === 'admin' 
        })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }
      
      console.log(`User role updated: ${userId} set to ${newRole}`);
      return true;
    } catch (error) {
      console.error('Error in setUserRole:', error);
      return false;
    }
  };

  // Exported context value
  const contextValue: RoleContextType = {
    role,
    isAdmin,
    isStaff,
    isDriver,
    isLogistics,
    isSupport,
    hasPermission,
    checkRoleIncludes,
    refetchRole: fetchUserRole,
    isLoading: loading,
    elevateToAdmin,
    setUserRole
  };

  return (
    <RoleContext.Provider value={contextValue}>
      {children}
    </RoleContext.Provider>
  );
};

// Create a hook to use the role context
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
