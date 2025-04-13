
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
  // Using 'as any' to bypass TypeScript's restriction on function names
  const { data, error } = await supabase.rpc(functionName as any, params);
  
  return { data: data as T, error };
};

/**
 * Check if the current user is an admin
 * @returns A boolean indicating if the user is an admin
 */
export const isUserAdmin = async (): Promise<boolean> => {
  try {
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
 * Helper function to get a valid user ID for database operations
 * If the user is logged in, returns their ID. Otherwise, returns null.
 */
export const getValidUserId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};
