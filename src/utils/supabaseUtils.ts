
import { supabase } from '@/integrations/supabase/client';

/**
 * A utility function to call Supabase RPC functions, bypassing TypeScript limitations
 * for custom functions that aren't in the generated types.
 */
export const callRpcFunction = async <T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    // @ts-ignore - Bypass TypeScript type checking for dynamic RPC function names
    const response = await supabase.rpc(functionName, params);
    
    if (response.error) {
      console.error(`Error calling RPC function ${functionName}:`, response.error);
      return { data: null, error: response.error };
    }
    
    return { data: response.data as T, error: null };
  } catch (error) {
    console.error(`Exception calling RPC function ${functionName}:`, error);
    return { data: null, error: error as Error };
  }
};
