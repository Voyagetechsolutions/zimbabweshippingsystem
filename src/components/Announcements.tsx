
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Announcement, adaptToAnnouncements } from '@/types/announcements';
import { formatDistanceToNow } from 'date-fns';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Use notifications table for announcements
        const { data, error } = await supabase
          .from(tableFrom('notifications'))
          .select('*')
          .eq('type', 'announcement')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Convert the data to our Announcement format
        setAnnouncements(adaptToAnnouncements(data || []));
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="p-4 text-gray-600">Loading announcements...</div>;
  }

  if (announcements.length === 0) {
    return <div className="p-4 text-gray-600">No announcements at this time.</div>;
  }

  return (
    <div className="bg-white shadow rounded-md p-4">
      <h2 className="text-lg font-semibold mb-2">Announcements</h2>
      <ul>
        {announcements.map((announcement) => (
          <li key={announcement.id} className="mb-2 border-b pb-2 last:border-b-0">
            <h3 className="text-md font-medium">{announcement.title}</h3>
            <p className="text-sm text-gray-700">{announcement.content}</p>
            <p className="text-xs text-gray-500">
              Posted{' '}
              {formatDistanceToNow(new Date(announcement.created_at), {
                addSuffix: true,
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Announcements;
