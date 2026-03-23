import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parse, isValid } from 'date-fns';

interface CollectionSchedule {
  id: string;
  route: string;
  areas: string[];
  pickup_date: string;
  country?: string;
}

const UpcomingCollections: React.FC = () => {
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingCollections();
  }, []);

  const fetchUpcomingCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      // Filter to upcoming dates and take first 4
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming = (data || [])
        .filter(schedule => {
          try {
            // Try parsing the date
            const dateStr = schedule.pickup_date;
            const date = new Date(dateStr);
            return isValid(date) && date >= today;
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.pickup_date);
          const dateB = new Date(b.pickup_date);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 4);

      setSchedules(upcoming);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPickupDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isValid(date)) {
        return format(date, 'MMM d');
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isValid(date)) {
        return format(date, 'EEEE, MMMM d');
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zim-green" />
          </div>
        </div>
      </section>
    );
  }

  if (schedules.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-white dark:bg-gray-900 border-t border-b border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-zim-green" />
              Upcoming Collections
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Book now to catch these collection dates
            </p>
          </div>
          <Link to="/collection-schedule">
            <Button variant="outline" className="gap-2">
              View Full Schedule
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {schedules.map((schedule) => (
            <Link
              key={schedule.id}
              to="/book"
              className="group block p-5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-zim-green/5 dark:hover:bg-zim-green/10 transition-all border border-transparent hover:border-zim-green/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {schedule.country === 'Ireland' ? '🇮🇪' : '🇬🇧'} {schedule.route}
                  </span>
                </div>
                <div className="bg-zim-green/10 text-zim-green text-xs font-bold px-2 py-1 rounded">
                  {formatPickupDate(schedule.pickup_date)}
                </div>
              </div>

              <div className="mb-3">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatFullDate(schedule.pickup_date)}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">
                  {schedule.areas.slice(0, 3).join(', ')}
                  {schedule.areas.length > 3 && ` +${schedule.areas.length - 3} more`}
                </span>
              </div>

              <div className="mt-4 text-sm font-medium text-zim-green group-hover:underline">
                Book for this date →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingCollections;
