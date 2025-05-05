import { supabase } from '@/integrations/supabase/client';

export const getImageUrl = (storageUrl: string) => {
  const { data } = supabase.storage.from('public').getPublicUrl(storageUrl)
  return data.publicUrl
}

export const uploadImage = async (image: File, imageName: string) => {
  const { data, error } = await supabase.storage
    .from('public')
    .upload(imageName, image, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading image: ', error)
    return null
  } else {
    console.log('Image uploaded successfully: ', data)
    return data.path
  }
}

export const deleteImage = async (imageName: string) => {
  const { error } = await supabase.storage
    .from('public')
    .remove([imageName])

  if (error) {
    console.error('Error deleting image: ', error)
    return false
  } else {
    console.log('Image deleted successfully')
    return true
  }
}

// Change any function calling audit_logs to use console.log instead
export const logSecurityEvent = async (event: {
  userId: string;
  action: string;
  details: any;
}) => {
  try {
    // Instead of using the audit_logs table, we'll just log to the console
    console.log('Security event logged:', {
      user_id: event.userId,
      action: event.action,
      timestamp: new Date().toISOString(),
      details: event.details
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error logging security event:', error);
    return { success: false, error };
  }
};

export const fetchAll = async (tableName: string) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching data: ', error)
    return null
  }
}
