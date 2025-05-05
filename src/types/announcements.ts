

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at?: string;
  is_important?: boolean;
  author_id?: string;
}

// Helper function to adapt data to Announcement interface
export function adaptToAnnouncement(data: any): Announcement {
  // Map notification data to announcement format for compatibility
  if (data && 'title' in data) {
    return {
      id: data.id,
      title: data.title,
      content: data.message || '',
      category: data.type || 'general',
      created_at: data.created_at,
      is_important: data.is_important || false,
      author_id: data.user_id
    };
  }
  
  // Handle other data types as needed
  return {
    id: data.id || '',
    title: data.title || data.subject || 'Announcement',
    content: data.content || data.message || data.description || '',
    category: data.category || 'general',
    created_at: data.created_at || new Date().toISOString(),
    is_important: data.is_important || false,
    author_id: data.user_id || data.author_id
  };
}

// Helper function for casting arrays of data to Announcement[]
export function adaptToAnnouncements(data: any[]): Announcement[] {
  return data.map(item => adaptToAnnouncement(item));
}
