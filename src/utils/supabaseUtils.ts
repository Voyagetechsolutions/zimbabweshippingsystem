
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

/**
 * Call a Supabase RPC function with parameters
 * @param functionName The name of the function to call
 * @param params Optional parameters to pass to the function
 * @returns The function result
 */
export const callRpcFunction = async (functionName: string, params?: Record<string, any>) => {
  return supabase.rpc(functionName, params || {});
};

/**
 * Upload a file to Supabase storage
 * @param bucket The storage bucket
 * @param path The path within the bucket
 * @param file The file to upload
 * @returns The upload result
 */
export const uploadStorageFile = async (bucket: string, path: string, file: File) => {
  const fileName = `${path}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);
    
  if (error) throw error;
  
  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
};

/**
 * Delete a file from Supabase storage
 * @param bucket The storage bucket
 * @param path The path of the file to delete
 * @returns The delete result
 */
export const deleteStorageFile = async (bucket: string, path: string) => {
  return supabase.storage
    .from(bucket)
    .remove([path]);
};
