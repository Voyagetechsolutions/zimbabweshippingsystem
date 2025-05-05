
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { tableFrom } from '@/integrations/supabase/db-types';
import { Announcement, adaptToAnnouncements } from '@/types/announcements';

const ShippingNewsTicker: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Using notifications table instead of announcements
        const { data, error } = await supabase
          .from(tableFrom('notifications'))
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        // Adapt the notification data to our announcement interface
        const formattedAnnouncements = adaptToAnnouncements(data || []);
        setAnnouncements(formattedAnnouncements);
      } catch (error) {
        console.error('Error fetching shipping news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="p-2 text-gray-500">Loading latest updates...</div>;
  }

  if (announcements.length === 0) {
    return <div className="p-2 text-gray-500">No shipping updates available at this time.</div>;
  }

  return (
    <div className="bg-gray-100 p-2 rounded-md shadow-sm">
      <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap">
        {announcements.map((announcement, index) => (
          <div key={announcement.id} className="flex-shrink-0">
            <a
              href={`/notifications`}
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              <span className="font-semibold">{announcement.title}:</span>
              {announcement.content.length > 50 ? `${announcement.content.substring(0, 50)}...` : announcement.content}
              <span className="ml-1 text-gray-500">
                ({formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })})
              </span>
              <ArrowRight className="inline-block w-4 h-4 ml-1 align-middle" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShippingNewsTicker;
