
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Calendar, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

// Define a minimal announcement interface
interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  is_active?: boolean;
  expiry_date?: string;
}

const Announcements = () => {
  // Since the announcements table has been deleted, we'll use static data instead
  const staticAnnouncements: Announcement[] = [
    {
      id: '1',
      title: 'New Shipping Routes Available',
      content: 'We are excited to announce new shipping routes between UK and Zimbabwe.',
      category: 'Service Update',
      created_at: new Date().toISOString(),
      is_active: true
    },
    {
      id: '2',
      title: 'Holiday Schedule Changes',
      content: 'Please note our modified operating hours during the upcoming holiday season.',
      category: 'Schedule',
      created_at: new Date().toISOString(),
      is_active: true
    },
    {
      id: '3',
      title: 'Important Shipping Information',
      content: 'All shipments during May will have extra security measures applied.',
      category: 'Information',
      created_at: new Date().toISOString(),
      is_active: true
    }
  ];
  
  const [announcements] = useState<Announcement[]>(staticAnnouncements);
  const [currentPage, setCurrentPage] = useState(0);

  // Filter out inactive announcements
  const activeAnnouncements = announcements.filter(announcement => announcement.is_active);

  const totalPages = Math.ceil(activeAnnouncements.length / 1);
  const hasAnnouncements = activeAnnouncements.length > 0;

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const currentAnnouncement = activeAnnouncements[currentPage];

  if (!hasAnnouncements) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-zim-green overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-zim-green" />
            Latest Updates
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToPrevPage}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-gray-500">
                {currentPage + 1} / {totalPages}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToNextPage}
                className="h-7 w-7"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{currentAnnouncement.title}</h3>
            <Badge variant="outline" className="text-xs">
              {currentAnnouncement.category}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{currentAnnouncement.content}</p>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-2">
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            {format(new Date(currentAnnouncement.created_at), 'MMM d, yyyy')}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Announcements;
