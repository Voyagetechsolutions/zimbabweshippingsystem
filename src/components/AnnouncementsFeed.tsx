
import React, { useState, useEffect } from 'react';
import { callRpcFunction } from '@/utils/supabaseUtils';
import { Announcement } from '@/types/admin';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
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
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const AnnouncementsFeed = () => {
  const { user } = useAuth();
  const { role } = useRole();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchAnnouncements();
  }, [user, role]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      // Get the user's role and location if available
      const userRole = role || null;
      // Since location isn't a property of User type, we'll get it from user_metadata or default to 'global'
      const userLocation = user?.user_metadata?.location || 'global';

      const { data, error } = await callRpcFunction<Announcement[]>('get_active_announcements', {
        p_user_role: userRole,
        p_user_location: userLocation
      });

      if (error) throw error;

      if (data) {
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(announcements.length / 1);
  const hasAnnouncements = announcements.length > 0;

  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Make sure currentAnnouncement doesn't cause issues if announcements is empty
  const currentAnnouncement = announcements.length > 0 ? announcements[currentPage] : null;

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

  if (!currentAnnouncement) {
    return null;
  }

  return (
    <Card className={`border-l-4 ${currentAnnouncement.is_critical ? 'border-l-red-500 bg-red-50/30' : 'border-l-zim-green'} overflow-hidden`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {currentAnnouncement.is_critical ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              <Megaphone className="h-5 w-5 text-zim-green" />
            )}
            {currentAnnouncement.is_critical ? 'Important Notice' : 'Latest Updates'}
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
            <Badge variant="outline" className={`text-xs ${currentAnnouncement.is_critical ? 'bg-red-100 text-red-800 border-red-300' : ''}`}>
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

export default AnnouncementsFeed;
