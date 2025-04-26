
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to call Supabase RPC functions
 * @param functionName The name of the function to call
 * @param params Parameters to pass to the function
 * @returns The result of the function call with data and error properties
 */
export const callRpcFunction = async <T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any }> => {
  try {
    // Using 'as any' to bypass TypeScript's restriction on function names
    const { data, error } = await supabase.rpc(functionName as any, params);
    
    return { data: data as T, error };
  } catch (err) {
    console.error(`Error calling RPC function ${functionName}:`, err);
    return { data: null, error: err };
  }
};

/**
 * Check if the current user is an admin
 * @returns A boolean indicating if the user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data, error } = await callRpcFunction<boolean>('is_admin');
    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Helper function to handle shipment access
 * @param userId User ID to check
 * @returns A boolean indicating if the user has access
 */
export const hasShipmentAccess = async (userId: string): Promise<boolean> => {
  // If no user ID, public shipment
  if (!userId) return true;
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // If no logged in user, deny access
  if (!user) return false;
  
  // If it's the user's own shipment, allow access
  if (user.id === userId) return true;
  
  // Check if the user is an admin
  const isAdmin = await isUserAdmin();
  
  return isAdmin;
};

/**
 * Securely log authentication events
 * @param event The event type
 * @param details Additional details about the event
 */
export const logAuthEvent = async (event: string, details: Record<string, any> = {}): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: event,
      entity_type: 'AUTH',
      details
    });
  } catch (error) {
    console.error('Error logging auth event:', error);
  }
};

/**
 * Check if a user has the required role
 * @param userId The user ID to check
 * @param requiredRole The role to check for
 * @returns A boolean indicating if the user has the required role
 */
export const userHasRole = async (userId: string, requiredRole: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (error || !data) return false;
    
    // Admin role has access to everything
    if (data.role === 'admin') return true;
    
    // Check specific role
    return data.role === requiredRole;
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

/**
 * Get user profile data
 * @param userId Optional user ID (defaults to current user)
 * @returns The user profile data
 */
export const getUserProfile = async (userId?: string): Promise<any> => {
  try {
    let id = userId;
    
    // If no user ID provided, get the current user
    if (!id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      id = user.id;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
