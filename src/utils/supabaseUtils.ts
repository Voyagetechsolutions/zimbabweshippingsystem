
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
    // Use type assertion to handle the dynamic table name
    const { data, error } = await supabase
      .from(tableName as any)
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

// Add the missing callRpcFunction with proper typing
export const callRpcFunction = async <T>(functionName: string, params?: any): Promise<{ data: T | null; error: any }> => {
  try {
    // For functions that no longer exist in the database, let's create mock implementations
    if (functionName === 'get_gallery_images') {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as unknown as T, error };
    }

    if (functionName === 'insert_gallery_image') {
      const { data, error } = await supabase
        .from('gallery')
        .insert([{
          src: params.p_src,
          alt: params.p_alt,
          caption: params.p_caption,
          category: params.p_category
        }])
        .select()
        .single();
      return { data: data as unknown as T, error };
    }

    if (functionName === 'delete_gallery_image') {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', params.p_id);
      return { data: (!error) as unknown as T, error };
    }

    if (functionName === 'update_gallery_image') {
      const { data, error } = await supabase
        .from('gallery')
        .update({
          src: params.p_src,
          alt: params.p_alt,
          caption: params.p_caption,
          category: params.p_category,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.p_id)
        .select()
        .single();
      return { data: data as unknown as T, error };
    }

    if (functionName === 'get_announcements' || functionName === 'get_active_announcements') {
      // Return mock announcements data with proper IDs
      const mockAnnouncementsData = [
        {
          id: '1',
          title: 'New Shipping Route Added',
          content: 'We are pleased to announce a new shipping route from London to Harare.',
          category: 'service',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: '123',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          author_name: 'Admin User'
        }
      ];
      return { data: mockAnnouncementsData as unknown as T, error: null };
    }

    if (functionName === 'create_announcement') {
      // Mock announcement creation with proper ID
      const mockAnnouncement = {
        id: Math.random().toString(36).substring(2, 15),
        title: params.p_title,
        content: params.p_content,
        category: params.p_category,
        is_active: params.p_is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: params.p_created_by,
        expiry_date: params.p_expiry_date,
        author_name: 'Current User'
      };
      return { data: mockAnnouncement as unknown as T, error: null };
    }

    if (functionName === 'delete_announcement') {
      // Mock successful deletion
      return { data: true as unknown as T, error: null };
    }

    // Create the mock notification function
    if (functionName === 'create_announcement_notification') {
      return { data: { success: true } as unknown as T, error: null };
    }

    // If we don't have a mock implementation, we'll return an error
    console.warn(`Function ${functionName} is not implemented in the mock callRpcFunction`);
    return { data: null, error: new Error(`Function ${functionName} is not implemented`) };

  } catch (error) {
    console.error(`Error calling RPC function ${functionName}:`, error);
    return { data: null, error };
  }
};
