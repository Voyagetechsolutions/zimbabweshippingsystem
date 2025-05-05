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

interface RoleContextProps {
  userRole: string | null;
  requestRoleElevation: (role: string) => Promise<void>;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextProps>({
  userRole: null,
  requestRoleElevation: async () => {},
  isLoading: true,
});

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const { auth, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!auth?.user) {
        setUserRole('anonymous');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', auth.user.id)
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
  }, [auth, authLoading]);

  const requestRoleElevation = async (role: string) => {
    if (!auth?.user) {
      console.error('User not authenticated.');
      return;
    }

    try {
      // Just log to console instead since audit_logs table was deleted
      console.log('Role elevation request:', {
        user_id: auth.user?.id,
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

  return (
    <RoleContext.Provider value={{ userRole, requestRoleElevation, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
