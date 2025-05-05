
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Announcement, castTo } from '@/types/admin';
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
import { tableFrom } from '@/integrations/supabase/db-types';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableFrom('announcements'))
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAnnouncements(castTo<Announcement[]>(data));
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out expired announcements
  const activeAnnouncements = announcements.filter(announcement => {
    if (!announcement.expiry_date) return true;
    return new Date(announcement.expiry_date) >= new Date();
  });

  const totalPages = Math.ceil(activeAnnouncements.length / 1);
  const hasAnnouncements = activeAnnouncements.length > 0;

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const currentAnnouncement = activeAnnouncements[currentPage];

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-gray-50 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

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
