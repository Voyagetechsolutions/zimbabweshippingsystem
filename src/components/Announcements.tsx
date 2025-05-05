
import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, BellIcon, TagIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Since the announcements table was deleted, we'll use mockup data
const MOCK_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Holiday Schedule',
    content: 'We will be closed during the Christmas holidays from December 24th to December 26th.',
    category: 'schedule',
    created_at: new Date().toISOString(),
    author_name: 'Admin'
  },
  {
    id: '2',
    title: 'New Shipping Rates',
    content: 'Our shipping rates will be updated starting January 1st, 2026. Please check the pricing page for details.',
    category: 'pricing',
    created_at: new Date().toISOString(),
    author_name: 'Admin'
  }
];

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Instead of fetching from Supabase, we'll use mock data
        setAnnouncements(MOCK_ANNOUNCEMENTS);
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return <div className="h-32 flex items-center justify-center">Loading announcements...</div>;
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          className={`border-l-4 ${
            announcement.category === 'urgent' ? 'border-l-red-500 bg-red-50' : 
            announcement.category === 'schedule' ? 'border-l-blue-500 bg-blue-50' : 
            announcement.category === 'promotion' ? 'border-l-green-500 bg-green-50' : 
            announcement.category === 'pricing' ? 'border-l-amber-500 bg-amber-50' : 
            'border-l-gray-500 bg-gray-50'
          }`}
        >
          <div className="flex items-start">
            <div className="mr-3 mt-0.5">
              {announcement.category === 'urgent' ? <InfoIcon className="h-5 w-5 text-red-500" /> : 
               announcement.category === 'schedule' ? <InfoIcon className="h-5 w-5 text-blue-500" /> : 
               announcement.category === 'promotion' ? <TagIcon className="h-5 w-5 text-green-500" /> : 
               announcement.category === 'pricing' ? <TagIcon className="h-5 w-5 text-amber-500" /> : 
               <BellIcon className="h-5 w-5 text-gray-500" />}
            </div>
            <div>
              <AlertTitle className="text-base font-semibold mb-1">
                {announcement.title}
              </AlertTitle>
              <AlertDescription className="text-sm">
                {announcement.content}
                <div className="text-xs text-gray-500 mt-2">
                  Posted: {new Date(announcement.created_at).toLocaleDateString()}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default Announcements;
