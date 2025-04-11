
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to call Supabase RPC functions
 * @param functionName The name of the function to call
 * @param params Parameters to pass to the function
 * @returns The result of the function call
 */
export const callRpcFunction = async <T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<T> => {
  const { data, error } = await supabase.rpc(functionName, params);
  
  if (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
  
  return data as T;
};

/**
 * Check if the current user is an admin
 * @returns A boolean indicating if the user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const result = await callRpcFunction<boolean>('is_admin');
    return result;
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
