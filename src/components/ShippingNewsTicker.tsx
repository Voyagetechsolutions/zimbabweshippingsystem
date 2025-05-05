
import React, { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// Since the announcements table was deleted, we'll use mockup data
const MOCK_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Holiday Schedule Update',
    content: 'Our collection services will continue throughout the holiday season',
    category: 'schedule',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'New Routes Available',
    content: 'We now offer service in additional areas in Harare',
    category: 'service',
    created_at: new Date().toISOString(),
  }
];

const ShippingNewsTicker = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    // Use mock data instead of Supabase
    setAnnouncements(MOCK_ANNOUNCEMENTS);
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-gray-100 border-y border-gray-200 py-2">
      <div className="container mx-auto px-4">
        <div className="flex items-center overflow-x-auto whitespace-nowrap">
          <Badge variant="outline" className="mr-3 bg-white px-2 py-1">
            News
          </Badge>
          
          <div className="flex space-x-8">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-center">
                <span className="text-sm font-medium">
                  {announcement.title}:
                </span>
                <span className="text-sm text-gray-600 ml-1 mr-3">
                  {announcement.content}
                </span>
                <Separator orientation="vertical" className="h-4 mx-4" />
              </div>
            ))}
            
            <Link to="/announcements">
              <Button variant="ghost" size="sm" className="text-xs flex items-center">
                View All <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingNewsTicker;
